
export const quat_rotate = /* wgsl */`
    fn quat_rotate(q: vec4<f32>, v: vec3<f32>) -> vec3<f32> {
        // q.xyz = vector part, q.w = scalar part
        let t = 2.0 * cross(q.xyz, v);
        return v + q.w * t + cross(q.xyz, t);
    }
`

export const point_in_obb = /* wgsl */`
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