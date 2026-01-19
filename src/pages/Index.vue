<template>
    <div style="width: 100%; height: 100%; float: right;" class=" overflow-hidden">

    </div>
</template>

<style scoped></style>

<script setup lang="ts">
import "./GpuComputedExample"
// import { GpuComputed } from "@/utils/GpuComputed"

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

</script>
