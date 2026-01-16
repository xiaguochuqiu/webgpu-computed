🌐 Read this in other languages:
- [简体中文](./build/README.zh-CN.md)

# webgpu-computed

A simplified WebGPU computing library that encapsulates tedious initialization and buffer management, allowing developers to focus on WGSL shader logic.

## Features

- 🚀 Simplified WebGPU initialization
- 📦 Automatic buffer management and layout calculation
- 🔧 Support for complex data structures (vectors, matrices)
- ⚡ High-performance GPU computing
- 📚 Built-in common WGSL functions

## Installation

```bash
npm install webgpu-computed
```

## Node.js Environment Configuration

You can install the webgpu package

```bash
npm install webgpu
```

Then initialize the environment

```js
import { create, globals } from 'webgpu'

Object.assign(globalThis, globals)
const navigator = { gpu: create([]) }
```

## Quick Start

### 1. Initialize WebGPU

Before using any computing features, you need to initialize the WebGPU environment:

```javascript
import { GpuComputed } from 'webgpu-computed';

// Initialize WebGPU
await GpuComputed.init();
```

### 2. Perform Simple Computation

Here is a simple vector addition example:

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
const results = await GpuComputed.computed({
  code,
  data,
  workgroupCount: [1] // Number of workgroups
});

console.log(results); // [[1.5, 3.5, 5.5, 7.5]]
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

const results = await GpuComputed.computed({
  code,
  data,
  workgroupCount: [1]
});
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
  onSuccess: ({ code, bufferInfoList, results }) => {
    console.log('Computation completed', results);
  }
});
```

## Browser Support

- Chrome 113+
- Edge 113+
- Firefox (partial support)
- Safari (partial support)

Ensure the browser supports the WebGPU API.

## Example Project

```js
    import { GpuComputed } from "webgpu-computed"

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
        onSuccess: ({ code, bufferInfoList, results }) => {
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

## License

ISC License

---

