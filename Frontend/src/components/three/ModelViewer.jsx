import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei';
import { House, THEMES, Tower } from './models';
import { Post, StaticShadows, useInView, useAdaptiveDpr } from './kit';

/** Visor 3D de la maqueta exterior de una propiedad (casa o torre), con órbita automática */
export default function ModelViewer({ type, floors = 8, theme = 'light', accent }) {
  const [ref, inView] = useInView();
  const [dpr, monitor] = useAdaptiveDpr();
  const T = THEMES[theme];
  const isHouse = type === 'house';
  const h = isHouse ? 7 : Math.min(floors, 14) * 3.2;
  return (
    <Canvas ref={ref} frameloop={inView ? 'always' : 'never'} shadows="soft" dpr={dpr} gl={{ antialias: false, stencil: false }} camera={{ fov: 32, position: isHouse ? [26, 16, 30] : [34, h * 0.9, 42] }}>
      {monitor}
      <color attach="background" args={[T.bg]} />
      <hemisphereLight args={[theme === 'dark' ? '#3b4a5a' : '#fff8ee', theme === 'dark' ? '#14160f' : '#d9cdb8', T.ambient + 0.15]} />
      <directionalLight position={[20, 40, 20]} intensity={T.sun} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={40} shadow-camera-bottom={-20} />
      <Suspense fallback={null}>
        <Environment resolution={64}>
          <Lightformer intensity={theme === 'dark' ? 0.4 : 1.4} position={[0, 10, 10]} scale={[30, 8, 1]} />
        </Environment>
      </Suspense>
      {isHouse ? (
        <House theme={theme} accent={accent} />
      ) : (
        <group>
          <mesh position={[0, -0.05, 0]} receiveShadow>
            <boxGeometry args={[60, 0.1, 60]} />
            <meshStandardMaterial color={T.ground} roughness={1} />
          </mesh>
          <Tower theme={theme} floors={Math.min(floors, 14)} apt={99} />
        </group>
      )}
      <StaticShadows key={theme} />
      <ContactShadows frames={1} position={[0, 0.02, 0]} opacity={0.35} scale={60} blur={2.5} far={10} />
      <Post radius={1.2} intensity={2} />
      <OrbitControls target={[0, isHouse ? 3 : h * 0.42, 0]} enablePan={false} minDistance={18} maxDistance={90} maxPolarAngle={Math.PI / 2.1} autoRotate autoRotateSpeed={0.8} />
    </Canvas>
  );
}
