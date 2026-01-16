# webgpu-computed

一个简化的 WebGPU 计算库，封装了繁琐的初始化和缓冲区管理，让开发者专注于 WGSL 着色器逻辑。

## 特性

- 🚀 简化 WebGPU 初始化
- 📦 自动缓冲区管理和布局计算
- 🔧 支持复杂数据结构（向量、矩阵）
- ⚡ 高性能 GPU 计算
- 📚 内置常用 WGSL 函数

## 安装

```bash
npm install webgpu-computed
```

## node 环境配置
可安装webgpu包
```bash
npm install webgpu
```
然后初始化环境
```js
import { create, globals } from 'webgpu'

Object.assign(globalThis, globals)
const navigator = { gpu: create([]) }
```

## 快速开始

### 1. 初始化 WebGPU

在使用任何计算功能前，需要先初始化 WebGPU 环境：

```javascript
import { GpuComputed } from 'webgpu-computed';

// 初始化 WebGPU
await GpuComputed.init();
```

### 2. 执行简单计算

以下是一个简单的向量加法示例：

```javascript
import { GpuComputed } from 'webgpu-computed';

// 准备数据
const data = {
  inputA: [1.0, 2.0, 3.0, 4.0],
  inputB: [0.5, 1.5, 2.5, 3.5],
  output: new Array(4).fill(0) // 输出缓冲区
};

// WGSL 计算代码
const code = `
  output[index] = inputA[index] + inputB[index];
`;

// 执行计算
const results = await GpuComputed.computed({
  code,
  data,
  workgroupCount: [1] // 工作组数量
});

console.log(results); // [[1.5, 3.5, 5.5, 7.5]]
```

### 3. 使用复杂数据结构

库支持向量和矩阵类型：

```javascript
const data = {
  positions: [
    { pos: [1.0, 2.0, 3.0], vel: [0.1, 0.2, 0.3] },
    { pos: [4.0, 5.0, 6.0], vel: [0.4, 0.5, 0.6] }
  ],
  output: new Array(2).fill({ pos: [0,0,0], vel: [0,0,0] })
};

const code = `
  output[index].pos = positions[index].pos + positions[index].vel;
  output[index].vel = positions[index].vel * 2.0;
`;

const results = await GpuComputed.computed({
  code,
  data,
  workgroupCount: [1]
});
```

## API 参考

### GpuComputed 类

#### 静态方法

##### `GpuComputed.init()`

初始化 WebGPU 环境。必须在使用其他功能前调用。

**返回值**: `Promise<void>`

**抛出**: 如果浏览器不支持 WebGPU 或获取适配器/设备失败

##### `GpuComputed.computed(options)`

执行 GPU 计算任务。

**参数**:

- `code` (string): WGSL 计算代码
- `data` (object): 输入/输出数据对象
- `workgroupCount` (array): 工作组数量 [x, y?, z?]
- `workgroupSize` (array, 可选): 工作组大小，默认 [32, 1, 1]
- `globalInvocationIdName` (string, 可选): 全局调用 ID 变量名，默认 "grid"
- `workgroupIndexName` (string, 可选): 工作组索引变量名，默认 "index"
- `synchronize` (array, 可选): 需要同步回 CPU 的缓冲区名称数组
- `beforeCodes` (array, 可选): 计算函数前的 WGSL 代码片段
- `onSuccess` (function, 可选): 计算成功回调函数

**返回值**: `Promise<Array<Float32Array>>` - 同步缓冲区的数据

### 数据类型

支持以下 WGSL 类型：

- `f32`: 单精度浮点数
- `vec2`: 二维向量
- `vec3`: 三维向量
- `vec4`: 四维向量
- `mat3x3`: 3x3 矩阵
- `mat4x4`: 4x4 矩阵

### 内置 WGSL 函数

库提供了一些常用的 WGSL 辅助函数：

#### 四元数旋转

```wgsl
fn quat_rotate(q: vec4<f32>, v: vec3<f32>) -> vec3<f32>
```

使用示例：

```javascript
import { WGSL_Fun } from 'webgpu-computed';

await GpuComputed.computed({
    code: "",
    data: {....},
    beforeCodes:[WGSL_Fun.quat_rotate]
})

```

#### 点在 OBB 中的检测

```wgsl
fn point_in_obb(point: vec3<f32>, center: vec3<f32>, halfSize: vec3<f32>, quat: vec4<f32>) -> bool
```

## 高级用法

### 自定义工作组配置

```javascript
await GpuComputed.computed({
  code: '...',
  data: {...},
  workgroupCount: [4, 4], // 16 个工作组
  workgroupSize: [16, 16], // 每个工作组 256 个线程
});
```

### 同步数据回 CPU

```javascript
const results = await GpuComputed.computed({
  code: '...',
  data: {...},
  synchronize: ['output'], // 指定需要同步的缓冲区
  workgroupCount: [1]
});

// results 包含同步回的数据
```

### 回调函数

```javascript
await GpuComputed.computed({
  code: '...',
  data: {...},
  workgroupCount: [1],
  onSuccess: ({ code, bufferInfoList, results }) => {
    console.log('计算完成', results);
  }
});
```

## 浏览器支持

- Chrome 113+
- Edge 113+
- Firefox (部分支持)
- Safari (部分支持)

确保浏览器支持 WebGPU API。

## 示例项目

```js
    import { GpuComputed } from "webgpu-computed"

    // 1. 初始化 WebGPU
    console.log('初始化 WebGPU...');
    await GpuComputed.init();
    console.log('WebGPU 初始化成功');

    // 2. 简单数组计算示例
    console.log('\n=== 简单数组计算 ===');
    const simpleData = {
        inputA: [1.0, 2.0, 3.0, 4.0],
        inputB: [0.5, 1.5, 2.5, 3.5],
        output: new Array(4).fill(0)
    };

    const simpleCode = `
        output[index] = inputA[index] + inputB[index];
    `;

    const simpleResults = await GpuComputed.computed({
        code: simpleCode,
        data: simpleData,
        workgroupCount: [1],
        synchronize: ['output']
    });

    console.log('简单计算结果:', simpleResults[0]); // [1.5, 3.5, 5.5, 7.5]

    // 3. 复杂数据结构示例（结构体）
    console.log('\n=== 复杂数据结构计算 ===');
    const complexData = {
        particles: [
            { position: [1.0, 2.0, 3.0], velocity: [0.1, 0.2, 0.3], mass: 1.0 },
            { position: [4.0, 5.0, 6.0], velocity: [0.4, 0.5, 0.6], mass: 2.0 }
        ],
        output: [
            { position: [0, 0, 0], velocity: [0, 0, 0], mass: 0 },
            { position: [0, 0, 0], velocity: [0, 0, 0], mass: 0 }
        ]
    };

    const complexCode = `
        output[index].position = particles[index].position + particles[index].velocity;
        output[index].velocity = particles[index].velocity * 2.0;
        output[index].mass = particles[index].mass * 1.5;
    `;

    const complexResults = await GpuComputed.computed({
        code: complexCode,
        data: complexData,
        workgroupCount: [1],
        synchronize: ['output']
    });

    console.log('复杂计算结果:', complexResults[0]);

    // 4. 使用内置 WGSL 函数示例
    console.log('\n=== 使用内置 WGSL 函数 ===');
    const wgslFunData = {
        points: [
            {
                x: 1.0, y: 0.0,  z: 0.0
            },
            {
                x: 0.0, y: 1.0,  z: 0.0
            },
            {
                x: -1.0, y: 0.0,  z: 0.0
            }
        ],
        obbCenter: [0.0, 0.0, 0.0],
        obbHalfSize: [2.0, 2.0, 2.0],
        obbRotation: [0.0, 0.0, 0.0, 1.0], // 单位四元数，无旋转
        results: new Array(3).fill(0)
    };

    const wgslFunCode = `
        let point = vec3(points[index].x, points[index].y, points[index].z);
        let center = vec3<f32>(obbCenter[0], obbCenter[1], obbCenter[2]);
        let halfSize = vec3<f32>(obbHalfSize[0], obbHalfSize[1], obbHalfSize[2]);
        let quat = vec4<f32>(obbRotation[0], obbRotation[1], obbRotation[2], obbRotation[3]);

        if (point_in_obb(point, center, halfSize, quat)) {
            results[index] = 1.0;
        } else {
            results[index] = 0.0;
        }
    `;

    const wgslFunResults = await GpuComputed.computed({
        code: wgslFunCode,
        data: wgslFunData,
        workgroupCount: [1],
        beforeCodes: [WGSL_Fun.quat_rotate, WGSL_Fun.point_in_obb, /** 可添加自己的函数代码 */],
        synchronize: ['results']
    });

    console.log('OBB 检测结果:', wgslFunResults[0]); // [1, 1, 1] 所有点都在 OBB 内

    // 5. 自定义工作组配置示例
    console.log('\n=== 自定义工作组配置 ===');
    const largeData = {
        largeArray: new Array(1024).fill(0).map((_, i) => i * 1.0),
        output: new Array(1024).fill(0)
    };

    const largeCode = `
        output[index] = largeArray[index] * 2.0;
    `;

    const largeResults = await GpuComputed.computed({
        code: largeCode,
        data: largeData,
        workgroupCount: [32], // 32 个工作组
        workgroupSize: [32, 1, 1], // 每个工作组 32 个线程，总共 1024 个线程
        synchronize: ['output']
    });

    console.log('大数组计算结果 (前10个):', largeResults[0].slice(0, 10));

    // 6. 使用回调函数示例
    console.log('\n=== 使用回调函数 ===');
    const callbackData = {
        values: [10.0, 20.0, 30.0],
        squares: new Array(3).fill(0)
    };

    const callbackCode = `
        squares[index] = values[index] * values[index];
    `;

    await GpuComputed.computed({
        code: callbackCode,
        data: callbackData,
        workgroupCount: [1],
        synchronize: ['squares'],
        onSuccess: ({ code, bufferInfoList, results }) => {
            console.log('回调函数触发，计算平方结果:', results[0]); // [100, 400, 900]
        }
    });

    // 7. 多维工作组示例
    console.log('\n=== 多维工作组 ===');
    const matrixData = {
        matrixA: new Array(16).fill(0).map((_, i) => i * 1.0),
        matrixB: new Array(16).fill(0).map((_, i) => (i + 1) * 1.0),
        result: new Array(16).fill(0)
    };

    const matrixCode = `
        let x = index % 4u;
        let y = index / 4u;
        let idx = y * 4u + x;
        result[idx] = matrixA[idx] + matrixB[idx];
    `;

    const matrixResults = await GpuComputed.computed({
        code: matrixCode,
        data: matrixData,
        workgroupCount: [4, 4], // 4x4 工作组网格
        workgroupSize: [1, 1, 1], // 每个工作组 1 个线程
        synchronize: ['result']
    });

    console.log('矩阵计算结果:', matrixResults[0]);

    console.log('\n所有功能示例运行完成！');
```

## 许可证

ISC License

---
