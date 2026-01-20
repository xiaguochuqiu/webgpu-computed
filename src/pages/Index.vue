<template>
    <div style="width: 100%; height: 100%; float: right;" class=" overflow-hidden">

    </div>
</template>

<style scoped></style>

<script setup lang="ts">
// import "./GpuComputedExample"
import { GpuComputed } from "@/utils/GpuComputed"

// GpuComputed.computed({
//     data: {
//         data: new Array(100).fill(100),
//         person: {
//             nameIndex: 5,
//             color: [500, 501, 502]
//         },
//         items: [
//             {
//                 nameIndex: 5,
//                 color: [100, 101, 102]
//             },
//             {
//                 nameIndex: 6,
//                 color: [100, 101, 102]
//             }
//         ]
//     },
//     workgroupCount: [1],
//     synchronize: ["items"],
//     map: true,
//     code: `
//         person.nameIndex = 10086;
//         person.color = vec3<f32>(11,11,11);
//         items[0].color.z = 119;
//     `
// }).then(results => {
//     console.log(results[0])
// })

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
</script>
