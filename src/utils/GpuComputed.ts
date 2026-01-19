import { include } from "./include"

type WGSl_TYPE =
    | "f32"
    | "vec2"
    | "vec3"
    | "vec4"
    | "mat3x3"
    | "mat4x4"

type GpuComputedOption = {
    workgroupSize?: [number, number, number]
    globalInvocationIdName?: string
    workgroupIndexName?: string
    beforeCodes?: string[]
    code?: string
}

// 数据组
type BufferGroup = {
    buffers: {
        name: string
        buffer: GPUBuffer
    }[]
    group: GPUBindGroup
}

// 结构体基础类型
interface IStructBaseType {
    name: string
    type: WGSl_TYPE
    offset?: number
    size?: number
}

// 结构体
type IStruct = IStructBaseType[]

// 结构体数组
interface IStructArray {
    buffer?: number[]
    stride?: number
    layout: IStruct
}

type BufferDataType = Record<string, (number[]) | IStruct | IStructArray>

/** 首字母大写
 * @param str 
 * @returns 
 */
function capitalize(str: string) {
    if (!str) return str
    return str[0].toUpperCase() + str.slice(1)
}

/**
 *  类型是支持的类型
 */
function isWgslType(type: string) {
    return wgslTypes.includes(type)
}

/** 值是 struct 类型
 * @param s 
 */
function isStruct(s: any) {
    if (s && Array.isArray(s) && s.length) {
        return s.every(v => v && typeof v === 'object' && 'name' in v && 'type' in v && isWgslType(v.type as string))
    }
    return false
}

/** 值是 struct 数组 类型
 * @param s 
 */
function isStructArray(s: any) {
    return s && 'layout' in s && isStruct(s.layout)
}

/** wgsl struct 偏移
 * @param offset 
 * @param type 
 * @returns 
 */
function padding(offset: number, type: WGSl_TYPE) {
    const alignment = TYPE_ALIGN[type]
    return (alignment - (offset % alignment)) % alignment
}

/** 
 * @param offset 
 * @param align 
 * @returns 
 */
function roundUp(offset: number, align: number) {
    return offset + ((align - (offset % align)) % align)
}

/** 数据构造结构体类型
 * @param data 
 * @param keys 
 * @param types 
 * @returns 
 */
function buildStructTypeByData(data: Record<string, any>) {
    const keys = Object.keys(data)
    const types = keys.map(k => {
        const v = data[k]
        if (Array.isArray(v)) {
            for (const t of ["vec2", "vec3", "vec4", "mat3x3", "mat4x4"] as WGSl_TYPE[]) {
                if (TYPE_SIZE[t] === v.length) return t
            }
            throw new Error(`${k} 不支持的数组长度 ${v.length}`)
        }
        if (typeof v === "number") return "f32"
        throw new Error(`${k} 不支持的类型`)
    })

    if (keys.length !== types.length) throw new Error("keys 与 types 长度不一致")

    // === 计算 layout & stride ===
    let offset = 0
    const layout = keys.map((k, i) => {
        const type = types![i]
        offset += padding(offset, type)
        const info = {
            name: k, type, offset, size: TYPE_SIZE[type],
        }
        offset += TYPE_SIZE[type]
        return info
    })

    const structAlign = Math.max(...types.map(t => TYPE_ALIGN[t]))
    const stride = offset + ((structAlign - (offset % structAlign)) % structAlign)

    return {
        stride,
        layout: layout
    }
}

// 大小为f32数量，并非字节，方便计算(项目用于js的数值计算，全部以f32为主)
const TYPE_SIZE: Record<WGSl_TYPE, number> = {
    f32: 1,
    vec2: 2,
    vec3: 3,
    vec4: 4,
    mat3x3: 12,
    mat4x4: 16,
}

// 大小为f32数量，并非字节，方便计算(项目用于js的数值计算，全部以f32为主)
const TYPE_ALIGN: Record<any, any> = {
    f32: 1,
    vec2: 2,
    vec3: 4,
    vec4: 4,
    mat3x3: 4,
    mat4x4: 4,
}

const wgslTypes = ["f32", "vec2", "vec3", "vec4", "mat3x3", "mat4x4"]
let adapter: GPUAdapter | null = null
let device: GPUDevice | null = null
export class GpuComputed {
    template?: BufferDataType
    option?: GpuComputedOption
    pipeline?: GPUComputePipeline
    device?: GPUDevice
    groupLayout?: any
    code?: string

    constructor(template: BufferDataType, option?: GpuComputedOption) {
        this.template = template
        this.option = option
        this.improveTemplateOption(this.template)
    }

    /** 完善模版数据
     * @param template 
     */
    private improveTemplateOption(template: BufferDataType) {
        const improveStruct = (struct: IStruct) => {
            let offset = 0
            struct.forEach(item => {
                offset += padding(offset, item.type)
                item.offset = offset
                item.size = TYPE_SIZE[item.type]
                offset += item.size
            })
        }

        const improveStructArray = (structArr: IStructArray) => {
            improveStruct(structArr.layout)
            const last = structArr.layout[structArr.layout.length - 1] as IStructBaseType
                , stride = last.offset! + last.size!

            let maxAlign = 1
            for (const item of structArr.layout) maxAlign = Math.max(maxAlign, TYPE_ALIGN[item.type])
            structArr.stride = roundUp(stride, maxAlign)
        }

        const keys = Object.keys(template)
        keys.forEach(key => {
            const value = template[key]
            if (isStruct(value)) improveStruct(value as IStruct)
            else if (isStructArray(value)) improveStructArray(value as IStructArray)
        })
    }

    /** 获取Gpu设备
     * @returns 
     */
    async getDevice() {
        if (!adapter || !device) throw new Error("webgpu未初始化或不可用")
        return { adapter, device }
    }

    /**
     * 初始化计算管线
     */
    async initPipeline() {
        if (!this.template) throw new Error("初始化计算管线错误，未找到可用数据模版")
        await GpuComputed.init()
        const template = this.template
        const { device } = await this.getDevice()
            , structCodes: string[] = []
            , groupCodes: string[] = []
            , groupLayoutOption: GPUBindGroupLayoutEntry[] = []

        this.device = device

        Object.keys(template).forEach((name, index) => {
            groupLayoutOption.push({
                binding: index, // 绑定到组里的0号位插槽
                visibility: GPUShaderStage.COMPUTE, // 数据在哪些阶段可以使用, 计算着色器、片元着色器、顶点着色器
                buffer: {
                    type: "storage"
                }
            })
            if (isStruct(template[name])) {
                const value = template[name] as IStruct
                    , code = value.map(item => `${item.name}:${item.type === 'f32' ? 'f32' : item.type + '<f32>'}`).join(",")
                    , structName = `${capitalize(name)}Struct`
                structCodes.push(`struct ${capitalize(name)}Struct {${code}};`)
                groupCodes.push(`@group(0) @binding(${index}) var<storage, read_write> ${name}: ${structName};`)
            }
            else if (isStructArray(template[name])) {
                const value = template[name] as IStructArray
                    , code = value.layout.map(item => `${item.name}:${item.type === 'f32' ? 'f32' : item.type + '<f32>'}`).join(",")
                    , structName = `${capitalize(name)}Struct`
                structCodes.push(`struct ${structName} {${code}};`)
                groupCodes.push(`@group(0) @binding(${index}) var<storage, read_write> ${name}: array<${structName}>;`)
            }
            else {
                groupCodes.push(`@group(0) @binding(${index}) var<storage, read_write> ${name}: array<f32>;`)
            }
        })

        const {
            beforeCodes = [],
            workgroupSize = [32, 1, 1],
            globalInvocationIdName = "grid",
            workgroupIndexName = "index",
            code = ''

        } = this.option ?? {}

        const completeCode = /*wgsl*/`
            ${structCodes.join('')}\n${groupCodes.join('')}
            ${beforeCodes.join(' ') ?? ''}

            @compute @workgroup_size(${workgroupSize.join(',')})
            fn main(@builtin(global_invocation_id) ${globalInvocationIdName}: vec3<u32>) {
                var ${workgroupIndexName} = ${globalInvocationIdName}.x;
                ${code}
            }
        `

        this.code = completeCode

        const groupLayout = device.createBindGroupLayout({
            entries: groupLayoutOption
        })

        this.groupLayout = groupLayout

        this.pipeline = device.createComputePipeline({
            layout: device.createPipelineLayout({
                bindGroupLayouts: [groupLayout]
            }),
            compute: {
                module: device.createShaderModule({ code: completeCode, label: '' }),
                entryPoint: "main"
            }
        })
    }

    /** 根据数据创建buffer组
     * @param data 
     */
    createBindGroup(data: Record<string, any>) {
        if (!this.template) throw new Error("创建buffer组错误，未找到可用数据模版")
        if (!this.device) throw new Error("创建buffer组错误，未找到可用的gpu设备，请确保初始化完计算管线")

        const device = this.device!
            , template = this.template
            , buffers: { name: string, buffer: GPUBuffer }[] = []

        function buildStruct(valueObj: any, tem: IStruct, offset = 0, data?: number[]) {
            if (!data) {
                const last = tem[tem.length - 1] as IStructBaseType
                    , stride = last.offset! + last.size!

                let maxAlign = 1
                for (const item of tem) maxAlign = Math.max(maxAlign, TYPE_ALIGN[item.type])
                data = data ?? new Array(roundUp(stride, maxAlign)).fill(0)
            }

            tem.forEach(item => {
                let value = valueObj[item.name]
                if (!Array.isArray(value)) value = [value]
                for (let i = 0; i < item.size!; i++) {
                    data![offset + item.offset! + i] = Number(value[i] ?? 0)
                }
            })

            return data
        }

        function buildStructArray(values: any[], tem: IStructArray) {
            const data: number[] = new Array(tem.stride! * values.length).fill(0)
            values.forEach((value, i) => {
                const offset = i * tem.stride!
                buildStruct(value, tem.layout, offset, data)
            })
            return data
        }

        Object.keys(template).forEach((name) => {
            if (!(name in data)) throw new Error(`传入的数据中，不存在${name}字段`)
            const tem = template[name]
            const value = data[name]
            let array: number[] = []
            if (isStruct(tem)) array = buildStruct(value, tem as IStruct)
            else if (isStructArray(tem)) array = buildStructArray(value, tem as IStructArray)
            else if (Array.isArray(value)) array.push(...value)

            const float32Array = new Float32Array(array)
            const buffer = device.createBuffer({
                size: float32Array.byteLength,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | GPUBufferUsage.STORAGE
            })
            device.queue.writeBuffer(buffer, 0, float32Array)
            buffers.push({ name, buffer })
        })

        const group = device.createBindGroup({
            layout: this.groupLayout!,
            entries: buffers.map((item, index) => ({
                binding: index,
                resource: { buffer: item.buffer }
            }))
        })

        return {
            group, buffers
        }
    }

    /** 数据映射回模版数据
     * @param array 
     * @param key 
     */
    dataMap(array: number[], key: string) {
        if (!(key in this.template!)) throw new Error("未找到数据字段：" + key)
        if (isStructArray(this.template![key])) {
            const tems = this.template![key] as IStructArray
                , count = array.length / tems.stride!
                , list: Record<string, number | number[]>[] = []

            for (let i = 0; i < count; i++) {
                const base = i * tems.stride! 
                const obj: Record<string, number | number[]> = {}
                tems.layout.forEach(item => {
                    const data = array.slice(base + item.offset!, base + item.offset! + item.size!)
                    obj[item.name] = data.length === 1 ? data[0] : data
                })
                list.push(obj)
            }
            return list
        }

        if (isStruct(this.template![key])) {
            const tem = this.template![key] as IStruct
            const obj: Record<string, number | number[]> = {}
            tem.forEach(item => {
                const data = array.slice(item.offset!, item.offset! + item.size!)
                obj[item.name] = data.length === 1 ? data[0] : data
            })
            return obj
        }

        return array
    }

    /** 开始计算
     * @param group 数据组
     * @param workgroupCount 工作组大小
     * @param synchronize 需要同步的数据字段
     * @returns 
     */
    async computed(group: BufferGroup, workgroupCount: [number, number?, number?], synchronize?: string[]) {
        if (!this.pipeline) throw new Error("未找到可用计算管线，请确保计算管线已经创建成功")
        const device = this.device!
        const pipeline = this.pipeline!

        const encoder = device.createCommandEncoder()
        const pass = encoder.beginComputePass()
        pass.setPipeline(pipeline)
        pass.setBindGroup(0, group.group)

        pass.dispatchWorkgroups(workgroupCount[0], workgroupCount[1], workgroupCount[2])
        pass.end()
        const syncBuffers = group.buffers?.map(item => {
            if (synchronize?.includes(item.name)) {
                const stagingBuffer = device.createBuffer({
                    size: item.buffer.size,
                    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
                })
                encoder.copyBufferToBuffer(item.buffer, 0, stagingBuffer, 0, stagingBuffer.size)
                return { buffer: stagingBuffer, name: item.name }
            }
        }).filter(i => !!i)

        device.queue.submit([encoder.finish()])
        await device.queue.onSubmittedWorkDone()

        const results = await Promise.all(
            syncBuffers.map(async item => {
                await item.buffer.mapAsync(GPUMapMode.READ)
                const mappedRange = item.buffer.getMappedRange()
                const result = [...new Float32Array(mappedRange)]
                return result
            })
        )
        return results
    }

    /** 初始化gpu设备
     * @returns 
     */
    static async init() {
        if (adapter && device) return

        // 非浏览器环境
        if (typeof globalThis !== "undefined" && typeof window === 'undefined') {
            const { create, globals } = await include("webgpu", false)
            Object.assign(globalThis, globals)
            if (!globalThis.navigator) (globalThis as any).navigator = {}
            Object.assign(globalThis.navigator, { gpu: create([]) })
        }

        if (!navigator.gpu) throw new Error("该环境不支持webgpu")
        if (!adapter) adapter = await navigator.gpu.requestAdapter({})
        if (!adapter) throw new Error("获取适配器失败")
        device = await adapter.requestDevice() as GPUDevice
        if (!adapter) throw new Error("获取设备失败")
    }

    /** 注销gpu设备
     */
    static destroy() {
        if (device) device.destroy()
        device = null
    }

    /** 
     * @param data 
     */
    static buildBufferTypeByData(data: Record<string, any>) {
        const bufferDataType = Object.keys(data).reduce((obj, k) => {
            const value = data[k]
            if (Array.isArray(value)) {
                if (typeof value[0] === 'number') obj[k] = []
                else if (typeof value[0] === "object" || value.length) {
                    const buffer = buildStructTypeByData(value[0])
                    obj[k] = buffer
                }
                else console.log(`字段：${k}， 不支持该值对应数据类型或数组为空`)
            } else if (typeof value === "object") {
                const buffer = buildStructTypeByData(value)
                obj[k] = buffer.layout
            } else console.log(`字段：${k}， 不支持的数据类型`)
            return obj
        }, {} as Record<string, IStructArray | IStruct | number[]>)
        return bufferDataType
    }

    /** 通过数据创建
     * @param opt 
     * @returns 
     */
    static async fromByData(opt: { data: Record<string, any> } & GpuComputedOption) {
        let { data, ...option } = opt
        const bufferDataType = this.buildBufferTypeByData(data)
        const gpuComputed = new GpuComputed(bufferDataType, option)
        await gpuComputed.initPipeline()
        return gpuComputed
    }

    /** 快捷计算方法
     * @param opt 
     * @returns 
     */
    static async computed(opt: {
        data: Record<string, any>
        workgroupCount: [number, number?, number?]
        synchronize?: string[]
        map?: boolean
        onSuccess?: (opt: { gpuComputed: GpuComputed, group: BufferGroup, results: number[][] }) => void
    } & GpuComputedOption) {
        let { data, map = false, workgroupCount, synchronize, onSuccess, ...option } = opt
        const gpuComputed = await this.fromByData({ data, ...option })
            , group = gpuComputed.createBindGroup(data)
            , results = await gpuComputed.computed(group, workgroupCount, synchronize)
        onSuccess && onSuccess({ gpuComputed: gpuComputed, group, results })
        if (map) return results.map((data, i) => gpuComputed.dataMap(data, synchronize![i]))
        return results
    }
}
