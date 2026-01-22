# webgpu-computed

🌐 其他语言版本：
- [English](https://github.com/xiaguochuqiu/webgpu-computed/blob/main/README.md)

一个简化的 WebGPU 计算库，封装了繁琐的初始化和缓冲区管理，让开发者专注于 WGSL 着色器逻辑。

## 特性

- 🚀 简化的 WebGPU 初始化
- 📦 自动缓冲区管理和布局计算
- 🔧 支持复杂数据结构（向量、矩阵）
- ⚡ 高性能 GPU 计算
- 📚 内置常用 WGSL 函数
- ✅ 支持 Node.js 环境
- 🛠️ TypeScript 支持
- 📖 详细的中文文档和示例
- 🔄 支持缓冲区重用
- ⚛️ 支持原子操作（u32）

## 安装

```bash
npm install webgpu-computed
```

## 快速开始

### 1. 初始化 WebGPU

在使用任何计算功能之前，需要初始化 WebGPU 环境：

```javascript
import { GpuComputed } from 'webgpu-computed';

// 初始化 WebGPU
await GpuComputed.init();

// 在 Node.js 环境中使用后，请调用：
// GpuComputed.destroy()
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
GpuComputed.computed({
  code,
  data,
  synchronize: ["output"], // 需要返回的数据字段
  workgroupCount: [1] // 工作组数量
}).then(results => {
    console.log(results); // [[1.5, 3.5, 5.5, 7.5]]
})
```

### 3. 使用复杂数据结构

该库支持向量和矩阵类型：

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

// 执行计算
GpuComputed.computed({
  code,
  data,
  synchronize: ["output"], // 需要返回的数据字段
  workgroupCount: [1] // 工作组数量
}).then(results => {
    console.log(results); // [[1.100000023841858,2.200000047683716,3.299999952316284,0,0.20000000298023224,0.4000000059604645,0.6000000238418579,0,4.400000095367432,5.5,6.599999904632568,0,0.800000011920929,1,1.2000000476837158,0]]
})
```

### 4. 使用不同数据类型

#### 使用无符号整数 (u32)

```javascript
import { GpuComputed } from 'webgpu-computed';

const data = {
  counters: new Uint32Array([0, 1, 2, 3]), // u32 数组
  output: new Uint32Array(4)
};

const code = `
  output[index] = counters[index] * 2u;
`;

const results = await GpuComputed.computed({
  code,
  data,
  synchronize: ["output"],
  workgroupCount: [1]
});

console.log(results[0]); // [0, 2, 4, 6]
```

#### 使用原子操作

```javascript
import { GpuComputed, AtomicUint32Array } from 'webgpu-computed';

const data = {
  atomicCounter: new AtomicUint32Array([0]), // 原子计数器
  output: new Uint32Array(4)
};

const code = `
  let old = atomicAdd(&atomicCounter[0], 1u);
  output[index] = old + 1u;
`;

const results = await GpuComputed.computed({
  code,
  data,
  synchronize: ["output"],
  workgroupCount: [1]
});

console.log(results[0]); // [1, 2, 3, 4]
```

### 5. 手动创建 GpuComputed 实例

如果您需要更精细的控制，可以直接创建 GpuComputed 实例：

```javascript
import { GpuComputed } from 'webgpu-computed';

// 1. 定义数据模板
const template = {
  inputA: [] as number[],
  inputB: [] as number[],
  output: [] as number[]
};

// 2. 创建实例
const gpuComputed = new GpuComputed(template, {
  code: `
    output[index] = inputA[index] + inputB[index];
  `,
  workgroupSize: [32, 1, 1] // 可选：自定义工作组大小
});

// 3. 初始化管线
await gpuComputed.initPipeline();

// 4. 准备数据
const data = {
  inputA: [1.0, 2.0, 3.0, 4.0],
  inputB: [0.5, 1.5, 2.5, 3.5],
  output: new Array(4).fill(0)
};

// 5. 创建绑定组
const bindGroup = gpuComputed.createBindGroup(data);

// 6. 执行计算
const results = await gpuComputed.computed(bindGroup, [1], ['output']);

console.log(results[0]); // [1.5, 3.5, 5.5, 7.5]
```

#### 缓冲区重用

```javascript
// 第一次计算
const data1 = { input: [1, 2, 3], output: [0, 0, 0] };
const bindGroup1 = gpuComputed.createBindGroup(data1);
const results1 = await gpuComputed.computed(bindGroup1, [1], ['output']);

// 重用第一次缓冲区里的output进行第二次计算
// 注意，模版里还得写上output，以便构建计算代码
// const template = {
//   input: [] as number[],
//   output: [] as number[]
// };
const data2 = { input: [4, 5, 6]};
const bindGroup2 = gpuComputed.createBindGroup(data2, bindGroup1); // 重用 output 缓冲区
const results2 = await gpuComputed.computed(bindGroup2, [1], ['output']);

console.log(results2[0]); // [4, 5, 6] output 缓冲区被重用
```

#### 使用结构体数据

```javascript
// 定义结构体模板
const structTemplate = {
  particles: {
    layout: [
      { name: 'position', type: 'vec3' },
      { name: 'velocity', type: 'vec3' },
      { name: 'mass', type: 'f32' }
    ]
  },
  output: {
    layout: [
      { name: 'position', type: 'vec3' },
      { name: 'velocity', type: 'vec3' },
      { name: 'mass', type: 'f32' }
    ]
  }
};

const gpuComputed = new GpuComputed(structTemplate, {
  code: `
    output[index].position = particles[index].position + particles[index].velocity;
    output[index].velocity = particles[index].velocity * 2.0;
    output[index].mass = particles[index].mass * 1.5;
  `
});

await gpuComputed.initPipeline();

const data = {
  particles: [
    { position: [1, 2, 3], velocity: [0.1, 0.2, 0.3], mass: 1.0 },
    { position: [4, 5, 6], velocity: [0.4, 0.5, 0.6], mass: 2.0 }
  ],
  output: [
    { position: [0, 0, 0], velocity: [0, 0, 0], mass: 0 },
    { position: [0, 0, 0], velocity: [0, 0, 0], mass: 0 }
  ]
};

const bindGroup = gpuComputed.createBindGroup(data);
const results = await gpuComputed.computed(bindGroup, [1], ['output']);

console.log(results[0]); // 映射后的数据
```

#### 数据映射

当使用结构体时，可以使用 `dataMap` 方法将结果映射回原始结构：

```javascript
const mappedData = gpuComputed.dataMap(results[0], 'output');
console.log(mappedData); // 返回结构化的对象数组
```

## API 参考

### GpuComputed 类

#### 静态方法

##### `GpuComputed.init()`

初始化 WebGPU 环境。必须在使用其他功能之前调用。

**返回值**: `Promise<void>`

**抛出异常**: 如果浏览器不支持 WebGPU 或获取适配器/设备失败

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
- `beforeCodes` (array, 可选): 计算函数之前的 WGSL 代码片段
- `onSuccess` (function, 可选): 成功回调函数

**返回值**: `Promise<Array<Float32Array | Uint32Array | Int32Array>>` - 同步缓冲区的数据

### 数据类型

支持以下 WGSL 类型：

- `f32`: 单精度浮点数
- `u32`: 无符号 32 位整数
- `vec2`: 2D 向量
- `vec3`: 3D 向量
- `vec4`: 4D 向量
- `mat3x3`: 3x3 矩阵
- `mat4x4`: 4x4 矩阵

### 支持的 JavaScript 类型

- `number[]`: 数字数组（自动转换为 Float32Array）
- `Float32Array`: 32 位浮点数组
- `Uint32Array`: 32 位无符号整数数组
- `Int32Array`: 32 位有符号整数数组
- `AtomicUint32Array`: 原子操作的无符号整数数组

### 内置 WGSL 函数

该库提供了一些常用的 WGSL 辅助函数：

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

### 缓冲区重用

```javascript
// 创建初始绑定组
const initialData = { buffer: new Float32Array(1000) };
const bindGroup = gpuComputed.createBindGroup(initialData);

// 重用缓冲区进行多次计算
for (let i = 0; i < 10; i++) {
  const newData = { buffer: new Float32Array(1000).fill(i) };
  const reusedBindGroup = gpuComputed.createBindGroup(newData, bindGroup);
  const results = await gpuComputed.computed(reusedBindGroup, [32], ['buffer']);
  // 处理结果...
}
```

### 将数据同步回 CPU

```javascript
const results = await GpuComputed.computed({
  code: '...',
  data: {...},
  synchronize: ['output'], // 指定要同步的缓冲区
  workgroupCount: [1]
});

// results 包含同步的数据
```

### 回调函数

```javascript
await GpuComputed.computed({
  code: '...',
  data: {...},
  workgroupCount: [1],
  onSuccess: ({ gpuComputed, group, results }) => {
    console.log('计算完成', results);
  }
});
```

## 示例项目

```js
import { GpuComputed } from "webgpu-computed"
import * as WGSL_Fun from "webgpu-computed"

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

// 3. 使用 u32 类型示例
console.log('\n=== 使用 u32 类型 ===');
const u32Data = {
    counters: new Uint32Array([10, 20, 30, 40]),
    output: new Uint32Array(4)
};

const u32Code = `
    output[index] = counters[index] + 5u;
`;

const u32Results = await GpuComputed.computed({
    code: u32Code,
    data: u32Data,
    workgroupCount: [1],
    synchronize: ['output']
});

console.log('u32 计算结果:', u32Results[0]); // [15, 25, 35, 45]

// 4. 原子操作示例
console.log('\n=== 原子操作示例 ===');
const atomicData = {
    counter: new AtomicUint32Array([0]),
    results: new Uint32Array(4)
};

const atomicCode = `
    let oldValue = atomicAdd(&counter[0], 1u);
    results[index] = oldValue;
`;

const atomicResults = await GpuComputed.computed({
    code: atomicCode,
    data: atomicData,
    workgroupCount: [1],
    synchronize: ['results']
});

console.log('原子操作结果:', atomicResults[0]); // [0, 1, 2, 3]

// 5. 复杂数据结构示例（结构体）
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

// 6. 使用内置 WGSL 函数示例
console.log('\n=== 使用内置 WGSL 函数 ===');
const wgslFunData = {
    points: [
        {
            x: 1.0, y: 0.0, z: 0.0
        },
        {
            x: 0.0, y: 1.0, z: 0.0
        },
        {
            x: -1.0, y: 0.0, z: 0.0
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

// 7. 自定义工作组配置示例
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

console.log('大数组计算结果 (前 10 个):', largeResults[0].slice(0, 10));

// 8. 使用回调函数示例
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
    onSuccess: ({ gpuComputed, group, results }) => {
        console.log('回调触发，平方计算结果:', results[0]); // [100, 400, 900]
    }
});

// 9. 多维工作组示例
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

console.log('\n所有功能示例完成！');
```

## 浏览器支持

- Chrome 113+
- Edge 113+
- Firefox (部分支持)
- Safari (部分支持)

确保浏览器支持 WebGPU API。

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

ISC License
  inputB: [0.5, 1.5, 2.5, 3.5],
  output: new Array(4).fill(0) // Output buffer
};

// WGSL computation code
const code = `
  output[index] = inputA[index] + inputB[index];
`;

// Execute computation
GpuComputed.computed({
  code,
  data,
  synchronize: ["output"], // Fields to return
  workgroupCount: [1] // Number of workgroups
}).then(results => {
    console.log(results); // [[1.5, 3.5, 5.5, 7.5]]
})
```

### 3. Using Complex Data Structures

The library supports vector and matrix types:

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

// Execute computation
GpuComputed.computed({
  code,
  data,
  synchronize: ["output"], // Fields to return
  workgroupCount: [1] // Number of workgroups
}).then(results => {
    console.log(results); // [[1.100000023841858,2.200000047683716,3.299999952316284,0,0.20000000298023224,0.4000000059604645,0.6000000238418579,0,4.400000095367432,5.5,6.599999904632568,0,0.800000011920929,1,1.2000000476837158,0]]
})
```

### 4. Manually Create GpuComputed Instance

If you need more fine-grained control, you can directly create a GpuComputed instance:

```javascript
import { GpuComputed } from 'webgpu-computed';

// 1. Define data template
const template = {
  inputA: [] as number[],
  inputB: [] as number[],
  output: [] as number[]
};

// 2. Create instance
const gpuComputed = new GpuComputed(template, {
  code: `
    output[index] = inputA[index] + inputB[index];
  `,
  workgroupSize: [32, 1, 1] // Optional: custom workgroup size
});

// 3. Initialize pipeline
await gpuComputed.initPipeline();

// 4. Prepare data
const data = {
  inputA: [1.0, 2.0, 3.0, 4.0],
  inputB: [0.5, 1.5, 2.5, 3.5],
  output: new Array(4).fill(0)
};

// 5. Create bind group
const bindGroup = gpuComputed.createBindGroup(data);

// 6. Execute computation
const results = await gpuComputed.computed(bindGroup, [1], ['output']);

console.log(results[0]); // [1.5, 3.5, 5.5, 7.5]
```

#### Using Struct Data

```javascript
// Define struct template
const structTemplate = {
  particles: {
    layout: [
      { name: 'position', type: 'vec3' },
      { name: 'velocity', type: 'vec3' },
      { name: 'mass', type: 'f32' }
    ]
  },
  output: {
    layout: [
      { name: 'position', type: 'vec3' },
      { name: 'velocity', type: 'vec3' },
      { name: 'mass', type: 'f32' }
    ]
  }
};

const gpuComputed = new GpuComputed(structTemplate, {
  code: `
    output[index].position = particles[index].position + particles[index].velocity;
    output[index].velocity = particles[index].velocity * 2.0;
    output[index].mass = particles[index].mass * 1.5;
  `
});

await gpuComputed.initPipeline();

const data = {
  particles: [
    { position: [1, 2, 3], velocity: [0.1, 0.2, 0.3], mass: 1.0 },
    { position: [4, 5, 6], velocity: [0.4, 0.5, 0.6], mass: 2.0 }
  ],
  output: [
    { position: [0, 0, 0], velocity: [0, 0, 0], mass: 0 },
    { position: [0, 0, 0], velocity: [0, 0, 0], mass: 0 }
  ]
};

const bindGroup = gpuComputed.createBindGroup(data);
const results = await gpuComputed.computed(bindGroup, [1], ['output']);

console.log(results[0]); // Mapped data
```

#### Data Mapping

When using structs, you can use the `dataMap` method to map results back to the original structure:

```javascript
const mappedData = gpuComputed.dataMap(results[0], 'output');
console.log(mappedData); // Returns structured object array
```

## API Reference

### GpuComputed Class

#### Static Methods

##### `GpuComputed.init()`

Initializes the WebGPU environment. Must be called before using other features.

**Returns**: `Promise<void>`

**Throws**: If the browser does not support WebGPU or fails to obtain adapter/device

##### `GpuComputed.computed(options)`

Executes a GPU computation task.

**Parameters**:

- `code` (string): WGSL computation code
- `data` (object): Input/output data object
- `workgroupCount` (array): Number of workgroups [x, y?, z?]
- `workgroupSize` (array, optional): Workgroup size, default [32, 1, 1]
- `globalInvocationIdName` (string, optional): Global invocation ID variable name, default "grid"
- `workgroupIndexName` (string, optional): Workgroup index variable name, default "index"
- `synchronize` (array, optional): Array of buffer names to synchronize back to CPU
- `beforeCodes` (array, optional): WGSL code snippets before the computation function
- `onSuccess` (function, optional): Success callback function

**Returns**: `Promise<Array<Float32Array>>` - Data from synchronized buffers

### Data Types

Supports the following WGSL types:

- `f32`: Single-precision float
- `vec2`: 2D vector
- `vec3`: 3D vector
- `vec4`: 4D vector
- `mat3x3`: 3x3 matrix
- `mat4x4`: 4x4 matrix

### Built-in WGSL Functions

The library provides some commonly used WGSL helper functions:

#### Quaternion Rotation

```wgsl
fn quat_rotate(q: vec4<f32>, v: vec3<f32>) -> vec3<f32>
```

Usage example:

```javascript
import { WGSL_Fun } from 'webgpu-computed';

await GpuComputed.computed({
    code: "",
    data: {....},
    beforeCodes:[WGSL_Fun.quat_rotate]
})
```

#### Point in OBB Detection

```wgsl
fn point_in_obb(point: vec3<f32>, center: vec3<f32>, halfSize: vec3<f32>, quat: vec4<f32>) -> bool
```

## Advanced Usage

### Custom Workgroup Configuration

```javascript
await GpuComputed.computed({
  code: '...',
  data: {...},
  workgroupCount: [4, 4], // 16 workgroups
  workgroupSize: [16, 16], // 256 threads per workgroup
});
```

### Synchronizing Data Back to CPU

```javascript
const results = await GpuComputed.computed({
  code: '...',
  data: {...},
  synchronize: ['output'], // Specify buffers to synchronize
  workgroupCount: [1]
});

// results contains synchronized data
```

### Callback Function

```javascript
await GpuComputed.computed({
  code: '...',
  data: {...},
  workgroupCount: [1],
  onSuccess: ({ gpuComputed, group, results }) => {
    console.log('Computation completed', results);
  }
});
```

## Example Project

```js
import { GpuComputed } from "webgpu-computed"
import * as WGSL_Fun from "webgpu-computed"

// 1. Initialize WebGPU
console.log('Initializing WebGPU...');
await GpuComputed.init();
console.log('WebGPU initialized successfully');

// 2. Simple array computation example
console.log('\n=== Simple Array Computation ===');
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

console.log('Simple computation result:', simpleResults[0]); // [1.5, 3.5, 5.5, 7.5]

// 3. Complex data structure example (struct)
console.log('\n=== Complex Data Structure Computation ===');
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

console.log('Complex computation result:', complexResults[0]);

// 4. Using built-in WGSL functions example
console.log('\n=== Using Built-in WGSL Functions ===');
const wgslFunData = {
    points: [
        {
            x: 1.0, y: 0.0, z: 0.0
        },
        {
            x: 0.0, y: 1.0, z: 0.0
        },
        {
            x: -1.0, y: 0.0, z: 0.0
        }
    ],
    obbCenter: [0.0, 0.0, 0.0],
    obbHalfSize: [2.0, 2.0, 2.0],
    obbRotation: [0.0, 0.0, 0.0, 1.0], // Unit quaternion, no rotation
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
    beforeCodes: [WGSL_Fun.quat_rotate, WGSL_Fun.point_in_obb, /** Add your own function code */],
    synchronize: ['results']
});

console.log('OBB detection result:', wgslFunResults[0]); // [1, 1, 1] All points are inside the OBB

// 5. Custom workgroup configuration example
console.log('\n=== Custom Workgroup Configuration ===');
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
    workgroupCount: [32], // 32 workgroups
    workgroupSize: [32, 1, 1], // 32 threads per workgroup, total 1024 threads
    synchronize: ['output']
});

console.log('Large array computation result (first 10):', largeResults[0].slice(0, 10));

// 6. Using callback function example
console.log('\n=== Using Callback Function ===');
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
    onSuccess: ({ gpuComputed, group, results }) => {
        console.log('Callback triggered, square computation result:', results[0]); // [100, 400, 900]
    }
});

// 7. Multi-dimensional workgroup example
console.log('\n=== Multi-dimensional Workgroup ===');
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
    workgroupCount: [4, 4], // 4x4 workgroup grid
    workgroupSize: [1, 1, 1], // 1 thread per workgroup
    synchronize: ['result']
});

console.log('Matrix computation result:', matrixResults[0]);

console.log('\nAll feature examples completed!');
```

## Browser Support

- Chrome 113+
- Edge 113+
- Firefox (partial support)
- Safari (partial support)

Ensure the browser supports the WebGPU API.

## Contributing

Welcome to submit Issues and Pull Requests!

## License

ISC License