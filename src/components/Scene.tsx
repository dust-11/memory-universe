import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Galaxy } from './Galaxy';
import { CoreGlow } from './CoreGlow';
import { NebulaParticles } from './NebulaParticles';

export function Scene() {
  return (
    <Canvas
      camera={{ position: [0, 60, 150], fov: 55, near: 0.1, far: 2000 }}
      style={{ background: '#07080f', width: '100%', height: '100%' }}
      gl={{ antialias: true, toneMappingExposure: 1.5 }}
    >
      <ambientLight intensity={0.08} />
      <pointLight position={[0, 0, 0]} intensity={5} color="#fff4d0" distance={250} decay={1.1} />

      <Stars radius={600} depth={100} count={10000} factor={6} fade speed={0.2} />

      <CoreGlow />

      {/* 星云粒子层（替代Raymarching，更稳定） */}
      <NebulaParticles />
      {/* <NebulaVolume /> */}

      <Galaxy />

      <OrbitControls
        enableDamping
        dampingFactor={0.06}
        minDistance={10}
        maxDistance={600}
        autoRotate
        autoRotateSpeed={0.18}
        makeDefault
      />

      <EffectComposer>
        <Bloom
          intensity={2.5}
          luminanceThreshold={0.08}
          luminanceSmoothing={0.92}
          mipmapBlur
          radius={0.75}
        />
      </EffectComposer>
    </Canvas>
  );
}
