# webgpu-computed

🌐 Other languages:

* [中文](https://github.com/xiaguochuqiu/webgpu-computed/blob/main/README.zh.md)

A simplified WebGPU compute library that wraps verbose initialization and buffer management, allowing developers to focus on WGSL shader logic.

## Features

* 🚀 Simplified WebGPU initialization
* 📦 Automatic buffer management and layout calculation
* 🔧 Supports complex data structures (vectors, matrices)
* ⚡ High-performance GPU computation
* 📚 Built-in common WGSL functions
* ✅ Node.js environment support
* 🛠️ TypeScript support
* 📖 Detailed documentation and examples
* 🔄 Buffer reuse support
* ⚛️ Atomic operations support (u32)

## Installation

```bash
npm install webgpu-computed
```

## Quick Start

### 1. Initialize WebGPU

Before using any compute features, you need to initialize the WebGPU environment:

```javascript
import { GpuComputed } from 'webgpu-computed';

// Initialize WebGPU
await GpuComputed.init();

// In Node.js, call this after usage:
// GpuComputed.destroy()
```

### 2. Execute a Simple Computation

Below is a simple vector addition example:

```javascript
import { GpuComputed } from 'webgpu-computed';

// Prepare data
const data = {
  inputA: [1.0, 2.0, 3.0, 4.0],
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

GpuComputed.computed({
  code,
  data,
  synchronize: ["output"],
  workgroupCount: [1]
}).then(results => {
    console.log(results);
})
```

### 4. Using Different Data Types

#### Unsigned Integer (u32)

```javascript
import { GpuComputed } from 'webgpu-computed';

const data = {
  counters: new Uint32Array([0, 1, 2, 3]),
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

#### Atomic Operations

```javascript
import { GpuComputed, AtomicUint32Array } from 'webgpu-computed';

const data = {
  atomicCounter: new AtomicUint32Array([0]),
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

### 5. Manually Creating a GpuComputed Instance

If you need more fine-grained control, you can create a GpuComputed instance directly:

```javascript
import { GpuComputed } from 'webgpu-computed';

const template = {
  inputA: [] as number[],
  inputB: [] as number[],
  output: [] as number[]
};

const gpuComputed = new GpuComputed(template, {
  code: `
    output[index] = inputA[index] + inputB[index];
  `,
  workgroupSize: [32, 1, 1]
});

await gpuComputed.initPipeline();

const data = {
  inputA: [1.0, 2.0, 3.0, 4.0],
  inputB: [0.5, 1.5, 2.5, 3.5],
  output: new Array(4).fill(0)
};

const bindGroup = gpuComputed.createBindGroup(data);
const results = await gpuComputed.computed(bindGroup, [1], ['output']);

console.log(results[0]);
```

## API Reference

### GpuComputed Class

#### Static Methods

##### `GpuComputed.init()`

Initializes the WebGPU environment. Must be called before using other features.

##### `GpuComputed.computed(options)`

Executes a GPU computation task.

**Parameters**:

* `code`: WGSL computation code
* `data`: Input/output data object
* `workgroupCount`: Workgroup count
* `workgroupSize`: Workgroup size
* `globalInvocationIdName`: Global invocation ID variable name
* `workgroupIndexName`: Workgroup index variable name
* `synchronize`: Buffers to synchronize back to CPU
* `beforeCodes`: WGSL code snippets before the main code
* `onSuccess`: Success callback

## Supported Types

* `f32`
* `u32`
* `vec2`
* `vec3`
* `vec4`
* `mat3x3`
* `mat4x4`

## Browser Support

* Chrome 113+
* Edge 113+
* Firefox (partial)
* Safari (partial)

Ensure the browser supports the WebGPU API.

## License

ISC License
