# webgpu-computed

🌐 Other language versions:
- [中文](https://github.com/xiaguochuqiu/webgpu-computed/blob/main/README.zh.md)

A simplified WebGPU compute library that encapsulates tedious initialization and buffer management, allowing developers to focus on WGSL shader logic.

## Features

- 🚀 Simplified WebGPU initialization
- 📦 Automatic buffer management and layout calculation
- 🔧 Support for complex data structures (vectors, matrices)
- ⚡ High-performance GPU computing
- 📚 Built-in common WGSL functions
- ✅ Support for Node.js environment
- 🛠️ TypeScript support
- 📖 Detailed Chinese documentation and examples
- 🔄 Support for buffer reuse
- ⚛️ Support for atomic operations (u32)

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

// In Node.js environment, call after use:
// GpuComputed.destroy()
```

### 2. Perform Simple Computation

Here's a simple vector addition example:

```javascript
import { GpuComputed } from 'webgpu-computed';

// Prepare data
const data = {
  inputA: [1.0, 2.0, 3.0, 4.0],
  inputB: [0.5, 1.5, 2.5, 3.5],
  output: new Array(4).fill(0) // Output buffer
};

// WGSL compute code
const code = `
  output[index] = inputA[index] + inputB[index];
`;

// Execute computation
GpuComputed.computed({
  code,
  data,
  synchronize: ["output"], // Fields to return
  workgroupCount: [1] // Workgroup count
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
  workgroupCount: [1] // Workgroup count
}).then(results => {
    console.log(results); // [[1.100000023841858,2.200000047683716,3.299999952316284,0,0.20000000298023224,0.4000000059604645,0.6000000238418579,0,4.400000095367432,5.5,6.599999904632568,0,0.800000011920929,1,1.2000000476837158,0]]
})
```

### 4. Using Different Data Types

#### Using Unsigned Integers (u32)

```javascript
import { GpuComputed } from 'webgpu-computed';

const data = {
  counters: new Uint32Array([0, 1, 2, 3]), // u32 array
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

#### Using Atomic Operations

```javascript
import { GpuComputed, AtomicUint32Array } from 'webgpu-computed';

const data = {
  atomicCounter: new AtomicUint32Array([0]), // Atomic counter
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

If you need finer control, you can create a GpuComputed instance directly:

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
  workgroupSize: [32, 1, 1] // Optional: Custom workgroup size
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

#### Buffer Reuse

```javascript
// First computation
const data1 = { input: [1, 2, 3], output: [0, 0, 0] };
const bindGroup1 = gpuComputed.createBindGroup(data1);
const results1 = await gpuComputed.computed(bindGroup1, [1], ['output']);

// Reuse the output buffer from the first computation for the second
// Note: The template must still include output to build the compute code
// const template = {
//   input: [] as number[],
//   output: [] as number[]
// };
const data2 = { input: [4, 5, 6]};
const bindGroup2 = gpuComputed.createBindGroup(data2, bindGroup1); // Reuse output buffer
const results2 = await gpuComputed.computed(bindGroup2, [1], ['output']);

console.log(results2[0]); // [4, 5, 6] output buffer reused
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

**Throws**: If the browser does not support WebGPU or fails to get adapter/device

##### `GpuComputed.computed(options)`

Executes a GPU compute task.

**Parameters**:

- `code` (string): WGSL compute code
- `data` (object): Input/output data object
- `workgroupCount` (array): Workgroup count [x, y?, z?]
- `workgroupSize` (array, optional): Workgroup size, default [32, 1, 1]
- `globalInvocationIdName` (string, optional): Global invocation ID variable name, default "grid"
- `workgroupIndexName` (string, optional): Workgroup index variable name, default "index"
- `synchronize` (array, optional): Array of buffer names to sync back to CPU
- `beforeCodes` (array, optional): WGSL code snippets before the compute function
- `onSuccess` (function, optional): Success callback function

**Returns**: `Promise<Array<Float32Array | Uint32Array | Int32Array>>` - Data of synchronized buffers

### Data Types

Supports the following WGSL types:

- `f32`: Single-precision float
- `u32`: Unsigned 32-bit integer
- `vec2`: 2D vector
- `vec3`: 3D vector
- `vec4`: 4D vector
- `mat3x3`: 3x3 matrix
- `mat4x4`: 4x4 matrix

### Supported JavaScript Types

- `number[]`: Number array (automatically converted to Float32Array)
- `Float32Array`: 32-bit float array
- `Uint32Array`: 32-bit unsigned integer array
- `Int32Array`: 32-bit signed integer array
- `AtomicUint32Array`: Atomic unsigned integer array

### Built-in WGSL Functions

The library provides some common WGSL helper functions:

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

### Buffer Reuse

```javascript
// Create initial bind group
const initialData = { buffer: new Float32Array(1000) };
const bindGroup = gpuComputed.createBindGroup(initialData);

// Reuse buffer for multiple computations
for (let i = 0; i < 10; i++) {
  const newData = { buffer: new Float32Array(1000).fill(i) };
  const reusedBindGroup = gpuComputed.createBindGroup(newData, bindGroup);
  const results = await gpuComputed.computed(reusedBindGroup, [32], ['buffer']);
  // Process results...
}
```

### Synchronizing Data Back to CPU

```javascript
const results = await GpuComputed.computed({
  code: '...',
  data: {...},
  synchronize: ['output'], // Specify buffers to sync
  workgroupCount: [1]
});

// results contains synchronized data
```

### Callback Functions

```javascript
await GpuComputed.computed({
  code: '...',
  data: {...},
  workgroupCount: [1],
  onSuccess: ({ gpuComputed, group, results }) => {
    console.log('Computation complete', results);
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

console.log('Simple computation results:', simpleResults[0]); // [1.5, 3.5, 5.5, 7.5]

// 3. Using u32 type example
console.log('\n=== Using u32 Type ===');
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

console.log('u32 computation results:', u32Results[0]); // [15, 25, 35, 45]

// 4. Atomic operations example
console.log('\n=== Atomic Operations Example ===');
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

console.log('Atomic operation results:', atomicResults[0]); // [0, 1, 2, 3]

// 5. Complex data structure example (structs)
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

console.log('Complex computation results:', complexResults[0]);

// 6. Using built-in WGSL functions example
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

console.log('OBB detection results:', wgslFunResults[0]); // [1, 1, 1] All points inside OBB

// 7. Custom workgroup configuration example
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

console.log('Large array computation results (first 10):', largeResults[0].slice(0, 10));

// 8. Using callback functions example
console.log('\n=== Using Callback Functions ===');
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
        console.log('Callback triggered, square computation results:', results[0]); // [100, 400, 900]
    }
});

// 9. Multi-dimensional workgroups example
console.log('\n=== Multi-dimensional Workgroups ===');
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

console.log('Matrix computation results:', matrixResults[0]);

console.log('\nAll feature examples completed!');
```

## Browser Support

- Chrome 113+
- Edge 113+
- Firefox (partial support)
- Safari (partial support)

Ensure the browser supports the WebGPU API.

## Contributing

Issues and Pull Requests are welcome!

## License

ISC License