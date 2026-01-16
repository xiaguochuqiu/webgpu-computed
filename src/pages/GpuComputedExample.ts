import { GpuComputed, WGSL_Fun } from '../utils/GpuComputed';

// 示例：展示 GpuComputed 的所有功能
async function runAllFeaturesExample() {
    try {
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

    } catch (error) {
        console.error('示例运行出错:', error);
    }
}

// 运行示例
runAllFeaturesExample();