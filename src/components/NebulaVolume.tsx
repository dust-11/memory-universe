import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = /* glsl */`
  varying vec3 vRayOrigin;
  varying vec3 vRayDir;
  uniform vec3 uCameraPos;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vRayOrigin = uCameraPos;
    vRayDir = normalize(worldPos.xyz - uCameraPos);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const fragmentShader = /* glsl */`
  uniform float uTime;
  uniform vec3 uCameraPos;
  varying vec3 vRayOrigin;
  varying vec3 vRayDir;

  // ---- 噪声函数 ----
  float hash(float n) { return fract(sin(n) * 43758.5453123); }
  float hash3(vec3 p) {
    p = fract(p * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yxz + 33.33);
    return fract((p.x + p.y) * p.z);
  }
  float noise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f*f*(3.0-2.0*f);
    return mix(
      mix(mix(hash3(i),           hash3(i+vec3(1,0,0)), f.x),
          mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x), f.y),
      mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),
          mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x), f.y),
      f.z);
  }
  float fbm(vec3 p, int oct) {
    float v=0., a=0.5;
    for(int i=0;i<oct;i++){ v+=a*noise(p); p=p*2.1+vec3(1.7,9.2,8.3); a*=0.5; }
    return v;
  }

  // ---- 星系密度场 ----
  // 坐标系：y 是星系盘法线方向
  float galaxyDensity(vec3 p, float t) {
    float R = length(p.xz);         // 盘面半径
    float H = abs(p.y);             // 盘面高度

    // 盘形截止
    float diskFade = smoothstep(120.0, 0.0, R) * smoothstep(18.0, 0.0, H * (1.0 + R*0.04));
    if(diskFade < 0.001) return 0.0;

    // 核球密度（中心密集球）
    float coreDist = length(p);
    float core = smoothstep(25.0, 0.0, coreDist) * 1.8;

    // 螺旋臂角度场
    float angle = atan(p.z, p.x);
    float armPhase = angle - R * 0.055 + t * 0.04;  // 缓慢旋转
    float arm = pow(max(0.0, cos(armPhase * 3.0)), 6.0); // 3条臂
    float armFade = smoothstep(15.0, 40.0, R) * smoothstep(120.0, 70.0, R);

    // fbm 云雾扰动
    vec3 np = p * 0.025 + vec3(t * 0.008, 0.0, t * 0.005);
    float cloud = fbm(np * 3.0, 5) * 0.8 + fbm(np * 6.5 + 4.3, 4) * 0.2;

    float density = (core * 0.6 + arm * armFade * 1.4 + cloud * 0.5) * diskFade;
    return max(0.0, density);
  }

  // ---- 颜色映射 ----
  vec3 galaxyColor(vec3 p, float density, float t) {
    float R = length(p.xz);
    float angle = atan(p.z, p.x) - R * 0.055 + t * 0.04;

    // 区域色彩
    vec3 coreCol  = vec3(1.0,  0.80, 0.35);  // 核心：暖黄橙
    vec3 arm1Col  = vec3(0.45, 0.65, 1.0);   // 旋臂：蓝白
    vec3 arm2Col  = vec3(0.9,  0.35, 0.55);  // 部分旋臂：粉红（HII区）
    vec3 arm3Col  = vec3(0.35, 0.9,  0.6);   // 旋臂末端：青绿
    vec3 outerCol = vec3(0.3,  0.3,  0.65);  // 外围：冷蓝紫

    float tCore = smoothstep(30.0, 0.0, R);
    float tOuter= smoothstep(50.0, 90.0, R);

    // 旋臂颜色随角度变化
    float armAngle = fract((angle / (2.0*3.14159)) + 1.0);
    vec3 armCol = mix(arm1Col, mix(arm2Col, arm3Col, smoothstep(0.3,0.7,armAngle)), step(0.5, armAngle));

    // 噪声扰动色彩
    float nc = fbm(p * 0.04 + t*0.02, 3);
    armCol += vec3(nc*0.15, -nc*0.05, nc*0.1);

    vec3 col = mix(mix(armCol, outerCol, tOuter), coreCol, tCore);
    return col * (0.6 + density * 0.8);
  }

  // ---- 射线步进（Raymarching） ----
  void main() {
    vec3 ro = vRayOrigin;
    vec3 rd = normalize(vRayDir);

    // 步进参数
    const int STEPS = 48;
    const float STEP_SIZE = 5.0;

    vec4 color = vec4(0.0);
    float t = 0.0;

    // 跳过相机前方很近的地方，从一定距离开始步进
    float tMin = 0.0;
    // 简单球包围盒求交
    float b = dot(ro, rd);
    float c = dot(ro,ro) - 150.0*150.0;
    float disc = b*b - c;
    if(disc < 0.0) { discard; return; }
    tMin = max(0.0, -b - sqrt(disc));
    t = tMin;

    for(int i=0; i<STEPS; i++) {
      if(color.a > 0.95) break;

      vec3 p = ro + rd * t;
      float density = galaxyDensity(p, uTime);

      if(density > 0.01) {
        vec3 col = galaxyColor(p, density, uTime);
        float alpha = density * 0.055;
        alpha = clamp(alpha, 0.0, 1.0);

        // 前向混合（Over compositing）
        color.rgb += (1.0 - color.a) * col * alpha;
        color.a   += (1.0 - color.a) * alpha;
      }

      t += STEP_SIZE;
      if(t > tMin + STEPS * STEP_SIZE) break;
    }

    if(color.a < 0.005) discard;
    gl_FragColor = vec4(color.rgb, color.a * 0.9);
  }
`;

export function NebulaVolume() {
  const matRef = useRef<THREE.ShaderMaterial>(null!);

  useFrame(({ clock, camera }) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = clock.getElapsedTime();
      matRef.current.uniforms.uCameraPos.value.copy(camera.position);
    }
  });

  return (
    // 大球体作为射线步进容器——相机在球外时从球面开始射线
    <mesh>
      <sphereGeometry args={[150, 32, 32]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
        uniforms={{
          uTime: { value: 0 },
          uCameraPos: { value: new THREE.Vector3() },
        }}
      />
    </mesh>
  );
}
