
type ValueType =
    | "f32"
    | "vec2"
    | "vec3"
    | "vec4"
    | "mat3x3"
    | "mat4x4"

type OptionType = {
    workgroupSize?: [number, number, number]
    workgroupCount: [number, number?, number?]
    globalInvocationIdName?: string
    workgroupIndexName?: string
    synchronize?: string[]
    beforeCodes?: string[]
}

type BufferType = {
    buffer: number[]
    stride: number
    layout: {
        name: string
        type: ValueType
        offset: number
        size: number
    }[]
    count: number
}

const TYPE_SIZE: Record<ValueType, number> = {
    f32: 1,
    vec2: 2,
    vec3: 3,
    vec4: 4,
    mat3x3: 12,
    mat4x4: 16,
}

const TYPE_ALIGN_SIZE: Record<any, any> = {
    f32: 1,
    vec2: 2,
    vec3: 4,
    vec4: 4,
    mat3x3: 4,
    mat4x4: 4,
}

function align(offset: number, type: ValueType) {
    const alignment = TYPE_ALIGN_SIZE[type]
    return (alignment - (offset % alignment)) % alignment
}

let adapter: GPUAdapter | null = null
let device: GPUDevice  | null = null
export class GpuComputed {
    constructor() { }

    static async init() {
        if(!navigator.gpu) throw new Error("该环境不支持webgpu")
        adapter = await navigator.gpu.requestAdapter({})
        if(!adapter) throw new Error("获取适配器失败")
        device = await adapter.requestDevice() as GPUDevice
        if(!adapter) throw new Error("获取设备失败")
    }

    async getDevice() {
        if(!adapter || !device) throw new Error("webgpu未初始化或不可用")
        return { adapter, device }
    }

    async createPipeline(code: string, buffers: Record<string, BufferType | number[]>) {
        const { device } = await this.getDevice()

        const bufferInfoList = Object.keys(buffers).map((k, index) => {
            const bufferData = buffers[k]
            const float32Array = new Float32Array( Array.isArray(bufferData) ? bufferData : bufferData.buffer)
            
            const buffer = device.createBuffer({
                size: float32Array.byteLength,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | GPUBufferUsage.STORAGE
            })
            device.queue.writeBuffer(buffer, 0, float32Array)

            return {
                name: k,
                buffer,
                float32Array, 
                groupLayoutItem: {
                    binding: index, // 绑定到组里的0号位插槽
                    visibility: GPUShaderStage.COMPUTE, // 数据在哪些阶段可以使用, 计算着色器、片元着色器、顶点着色器
                    buffer: {
                        type: "storage"
                    }
                } as GPUBindGroupLayoutEntry,
                groupItem: {
                    binding: index,
                    resource: { buffer }
                }
            }
        })
        
        const groupLayout = device.createBindGroupLayout({
            entries: bufferInfoList.map(item => item.groupLayoutItem)
        })

        const group = device.createBindGroup({
            layout: groupLayout,
            entries: bufferInfoList.map(item => item.groupItem)
        })

        const pipeline = device.createComputePipeline({
            layout: device.createPipelineLayout({
                bindGroupLayouts: [groupLayout]
            }),
            compute: {
                module: device.createShaderModule({ code, label: '' }),
                entryPoint: "main"
            }
        })
        return { pipeline, group, device, bufferInfoList }
    }

    private buildCode(buffers: Record<string, BufferType | number[]>, code: string, option?: OptionType) {
        const {
            workgroupSize = [32, 1, 1],
            globalInvocationIdName = "grid",
            workgroupIndexName = "index",
        } = option ?? {}

        const capitalize = (str: string) => {
            if (!str) return str
            return str[0].toUpperCase() + str.slice(1)
        }

        const structs = Object.keys(buffers).map(k => {
            const buffer = buffers[k]
            if(Array.isArray(buffer)) return
            const struct = `struct ${capitalize(k)}Struct { ${buffer.layout.map((item: any) => `${item.name}: ${item.type === 'f32' ? 'f32' : `${item.type}<f32>`}`).join(",")} };`
            return struct
        }).filter(i => !!i).join("\n")
        
        const storages = Object.keys(buffers).map((k, i) => {
            const buffer = buffers[k]
            const mode = "read_write"
            if(Array.isArray(buffer)) return `@group(0) @binding(${i}) var<storage, ${mode}> ${k}: array<f32>;`
            return `@group(0) @binding(${i}) var<storage, ${mode}> ${k}: array<${capitalize(k)}Struct>;`
        }).join("\n")
        
        const gIIName = globalInvocationIdName
        const defaultCode = /*wgsl*/`
            ${structs}\n${storages}

            ${ option?.beforeCodes?.join(' ') ?? '' }

            @compute @workgroup_size(${workgroupSize.join(',')})
            fn main(@builtin(global_invocation_id) ${gIIName}: vec3<u32>) {
                var ${workgroupIndexName} = ${gIIName}.x;
                ${code}
            }
        `
        
        return defaultCode
    }

    private buildBuffer( data: Record<string, any>[], keys?: string[], types?: ValueType[] ) {
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error("数据必须是非空数组")
        }

        if (!keys) keys = Object.keys(data[0])

        if (!types) {
            types = keys.map(k => {
                const v = data[0][k]
                if (Array.isArray(v)) {
                    for (const t of ["vec2", "vec3", "vec4", "mat3x3", "mat4x4"] as ValueType[]) {
                        if (TYPE_SIZE[t] === v.length) return t
                    }
                    throw new Error(`${k} 不支持的数组长度 ${v.length}`)
                }
                if (typeof v === "number") return "f32"
                throw new Error(`${k} 不支持的类型`)
            })
        }

        if (keys.length !== types.length) throw new Error("keys 与 types 长度不一致")

        // === 计算 layout & stride ===
        let offset = 0
        const layout = keys.map((k, i) => {
            const type = types![i]
            offset += align(offset, type)
            const info = {
                name: k, type, offset, size: TYPE_SIZE[type],
            }
            offset += TYPE_SIZE[type]
            return info
        })

        const structAlign = Math.max(...types.map(t => TYPE_ALIGN_SIZE[t]))
        const stride = offset + ((structAlign - (offset % structAlign)) % structAlign)

        // === 写 buffer ===
        const buffer: number[] = new Array(stride * data.length).fill(0)

        data.forEach((item, idx) => {
            const base = idx * stride
            layout.forEach(({ name, offset, size }) => {
                let v = item[name]
                if (!Array.isArray(v)) v = [v]
                for (let i = 0; i < size; i++) {
                    buffer[base + offset + i] = Number(v[i] ?? 0)
                }
            })
        })

        return {
            buffer,
            stride,
            layout,
            count: data.length,
        }
    }

    async computed(opt: {
        code: string
        data: Record<string, any[]>
        onSuccess?: (opt: {code: string, bufferInfoList: any[], results: any}) => void
    } & OptionType) {
        let { code, data, ...option } = opt
        const buffers = Object.keys(data).reduce((obj, k) => {
            const value = data[k]
            if(typeof value[0] === 'number') obj[k] = value
            else {
                const buffer = this.buildBuffer(value)
                obj[k] = buffer
            }
            return obj
        }, {} as Record<string, BufferType | number[]>)

        code = this.buildCode(buffers, code, option)
        const { pipeline, group, device, bufferInfoList } = await this.createPipeline(code, buffers)

        const encoder = device.createCommandEncoder()
        const pass = encoder.beginComputePass()
        pass.setPipeline(pipeline)
        pass.setBindGroup(0, group)
        
        pass.dispatchWorkgroups(option.workgroupCount[0], option.workgroupCount[1], option.workgroupCount[2])
        pass.end()
        const syncBuffers = bufferInfoList?.map(item => {
            if(option.synchronize?.includes(item.name)) {
                const stagingBuffer = device.createBuffer({
                    size: item.float32Array.byteLength,
                    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
                })
                encoder.copyBufferToBuffer(item.buffer, 0, stagingBuffer, 0, stagingBuffer.size)
                return {buffer: stagingBuffer, name: item.name}
            }
        }).filter(i => !!i)

        device.queue.submit([encoder.finish()])
        await device.queue.onSubmittedWorkDone()

        const results = await  Promise.all(
            syncBuffers.map(async item => {
                await item.buffer.mapAsync(GPUMapMode.READ)
                const mappedRange = item.buffer.getMappedRange()
                const result = [...new Float32Array(mappedRange)]
                return result
            })
        )
        option?.onSuccess && option.onSuccess({code, bufferInfoList, results})
        return results
    }

    static instance: GpuComputed
    static get computed() {
        if(!this.instance) this.instance = new GpuComputed()
        return this.instance.computed.bind(this.instance)
    }
}

export const WGSL_Fun = Object.freeze({
    quat_rotate: /* wgsl */`
        fn quat_rotate(q: vec4<f32>, v: vec3<f32>) -> vec3<f32> {
            // q.xyz = vector part, q.w = scalar part
            let t = 2.0 * cross(q.xyz, v);
            return v + q.w * t + cross(q.xyz, t);
        }
    `,

    point_in_obb: /* wgsl */`
        fn point_in_obb(
            point: vec3<f32>,
            center: vec3<f32>,
            halfSize: vec3<f32>,
            quat: vec4<f32>
        ) -> bool {
            // 世界空间 → OBB 局部空间
            let local = point - center;

            // 逆旋转（共轭四元数）
            let invQuat = vec4<f32>(-quat.xyz, quat.w);
            let pLocal = quat_rotate(invQuat, local);

            // AABB 判断
            return all(abs(pLocal) <= halfSize);
        }
    `
})