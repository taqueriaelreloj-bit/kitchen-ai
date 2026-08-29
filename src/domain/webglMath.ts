export type Mat4 = number[];
export type Vec3 = [number, number, number];
export type Vec4 = [number, number, number, number];
export type SceneBoxLike = { center: Vec3; size: Vec3 };
export type SceneBounds3D = {
  min: Vec3;
  max: Vec3;
  center: Vec3;
  size: Vec3;
  radius: number;
};

const finite = (value: number, fallback = 0) => Number.isFinite(value) ? value : fallback;

export function multiplyMat4(a: Mat4, b: Mat4): Mat4 {
  const out = new Array<number>(16).fill(0);
  // WebGL receives matrices in column-major order. This computes a × b for
  // column vectors, matching GLSL's `uMatrix * vec4(...)` convention.
  for (let column = 0; column < 4; column++) {
    for (let row = 0; row < 4; row++) {
      out[column * 4 + row] =
        a[0 * 4 + row] * b[column * 4 + 0] +
        a[1 * 4 + row] * b[column * 4 + 1] +
        a[2 * 4 + row] * b[column * 4 + 2] +
        a[3 * 4 + row] * b[column * 4 + 3];
    }
  }
  return out;
}

export function perspectiveMatrix(fovRadians: number, aspectValue: number, nearValue: number, farValue: number): Mat4 {
  const aspect = Math.max(.01, finite(aspectValue, 1));
  const near = Math.max(.001, finite(nearValue, .05));
  const far = Math.max(near + .01, finite(farValue, 100));
  const f = 1 / Math.tan(Math.max(.01, fovRadians) / 2);
  const range = 1 / (near - far);
  return [
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * range, -1,
    0, 0, 2 * far * near * range, 0,
  ];
}

function normalize3(value: Vec3): Vec3 {
  const length = Math.hypot(value[0], value[1], value[2]) || 1;
  return [value[0] / length, value[1] / length, value[2] / length];
}

function cross3(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function lookAtMatrix(eye: Vec3, target: Vec3, up: Vec3 = [0, 1, 0]): Mat4 {
  const z = normalize3([eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]]);
  let x = normalize3(cross3(up, z));
  // Looking almost straight up/down can make the usual up vector parallel to
  // the view direction. Use a stable alternate axis instead of producing NaN.
  if (Math.hypot(x[0], x[1], x[2]) < .0001) x = normalize3(cross3([0, 0, 1], z));
  const y = cross3(z, x);
  return [
    x[0], y[0], z[0], 0,
    x[1], y[1], z[1], 0,
    x[2], y[2], z[2], 0,
    -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]),
    -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]),
    -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2]),
    1,
  ];
}

export const translationMatrix = (x: number, y: number, z: number): Mat4 => [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  x, y, z, 1,
];

export const scaleMatrix = (x: number, y: number, z: number): Mat4 => [
  x, 0, 0, 0,
  0, y, 0, 0,
  0, 0, z, 0,
  0, 0, 0, 1,
];

export function rotationYMatrix(angleRadians: number): Mat4 {
  const cosine = Math.cos(angleRadians);
  const sine = Math.sin(angleRadians);
  return [
    cosine, 0, -sine, 0,
    0, 1, 0, 0,
    sine, 0, cosine, 0,
    0, 0, 0, 1,
  ];
}

export function transformPoint(matrix: Mat4, point: Vec3): Vec4 {
  return [
    matrix[0] * point[0] + matrix[4] * point[1] + matrix[8] * point[2] + matrix[12],
    matrix[1] * point[0] + matrix[5] * point[1] + matrix[9] * point[2] + matrix[13],
    matrix[2] * point[0] + matrix[6] * point[1] + matrix[10] * point[2] + matrix[14],
    matrix[3] * point[0] + matrix[7] * point[1] + matrix[11] * point[2] + matrix[15],
  ];
}

export function sceneBounds3D(boxes: SceneBoxLike[]): SceneBounds3D {
  if (!boxes.length) {
    return { min: [-5, 0, -5], max: [5, 4, 5], center: [0, 2, 0], size: [10, 4, 10], radius: Math.hypot(5, 2, 5) };
  }
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const box of boxes) {
    for (let axis = 0; axis < 3; axis++) {
      const half = Math.max(0, finite(box.size[axis], 0)) / 2;
      const center = finite(box.center[axis], 0);
      min[axis] = Math.min(min[axis], center - half);
      max[axis] = Math.max(max[axis], center + half);
    }
  }
  const center: Vec3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  const size: Vec3 = [Math.max(.01, max[0] - min[0]), Math.max(.01, max[1] - min[1]), Math.max(.01, max[2] - min[2])];
  return { min, max, center, size, radius: Math.hypot(size[0] / 2, size[1] / 2, size[2] / 2) };
}
