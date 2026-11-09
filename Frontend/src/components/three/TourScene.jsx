import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { APT_Y, Apartment, Site, THEMES, Tower } from './models';
import { DepthOfField, EffectComposer, N8AO, SMAA, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { StaticShadows, useInView, useAdaptiveDpr } from './kit';

/*
 * Recorrido con scroll: la cámara sigue una curva Catmull-Rom por 6 puntos clave.
 *   0 vista aérea → 1 aproximación → 2 frente al piso 7 → 3 sala → 4 cocina/comedor → 5 planta (vista superior)
 * `progress` es un ref (0..1) que actualiza ScrollTrigger; aquí se suaviza por frame.
 */
const Y = APT_Y;
const KEYS = [
  { p: [40, 30, 62], t: [-11, 17, 0] },
  { p: [20, 27, 30], t: [-2, 21.5, 0] },
  { p: [6.5, Y + 1.9, 13.5], t: [-0.5, Y + 1.1, 0] },
  { p: [1.4, Y + 1.55, 3.7], t: [-3.4, Y + 0.6, 1.9] },
  { p: [1.6, Y + 1.8, 1.3], t: [-4.3, Y + 0.6, -3.3] },
  { p: [-3, Y + 19, 3.4], t: [-3, Y, 0.3] },
];

const ramp = (x, a, b) => THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);

function Rig({ progress, fades }) {
  const { camera, size } = useThree();
  const curves = useMemo(
    () => ({
      pos: new THREE.CatmullRomCurve3(KEYS.map((k) => new THREE.Vector3(...k.p)), false, 'centripetal'),
      tgt: new THREE.CatmullRomCurve3(KEYS.map((k) => new THREE.Vector3(...k.t)), false, 'centripetal'),
    }),
    [],
  );
  const s = useRef(0);
  const look = useMemo(() => new THREE.Vector3(), []);
  const pos = useMemo(() => new THREE.Vector3(), []);
  const mouse = useRef({ x: 0, y: 0 });

  useFrame((state, dt) => {
    // suavizado independiente del framerate
    s.current = THREE.MathUtils.damp(s.current, progress.current, 4, dt);
    const u = s.current;
    curves.pos.getPoint(u, pos);
    curves.tgt.getPoint(u, look);
    // paralaje leve con el puntero (menos dentro del apartamento)
    mouse.current.x = THREE.MathUtils.damp(mouse.current.x, state.pointer.x, 2, dt);
    mouse.current.y = THREE.MathUtils.damp(mouse.current.y, state.pointer.y, 2, dt);
    // sin paralaje al final: en vista cenital cualquier desplazamiento lateral gira la imagen
    const k = (u < 0.45 ? 1.6 : 0.35) * (1 - ramp(u, 0.8, 0.95));
    pos.x += mouse.current.x * k;
    pos.y += mouse.current.y * k * 0.5;
    // en vertical (celular) el titular ocupa la parte de arriba: al inicio la cámara centra el edificio
    // y mira más arriba para que la torre quede en la mitad inferior, sin dejar vacío abajo
    const portrait = size.width < size.height;
    if (portrait) {
      const w = 1 - ramp(u, 0.18, 0.36);
      look.x += 11 * w;
      look.y += 13 * w;
    }
    camera.position.copy(pos);
    camera.lookAt(look);
    // en pantallas angostas abrimos el lente para que el edificio quepa
    const fov = portrait ? 60 : 38;
    if (Math.abs(camera.fov - fov) > 0.1) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    // fachada del piso 7 se desvanece al cruzarla; los pisos de arriba antes de la vista en planta
    // la fachada se abre solo mientras la cámara la atraviesa y vuelve cuando ya está adentro
    const f = Math.min(1, 1 - ramp(u, 0.36, 0.46) + ramp(u, 0.62, 0.7));
    const up = 1 - ramp(u, 0.72, 0.88);
    // las sombras solo se recalculan mientras la fachada o los pisos superiores se desvanecen
    if (Math.abs(f - fades.facade.current) > 0.002 || Math.abs(up - fades.upper.current) > 0.002) state.gl.shadowMap.needsUpdate = true;
    fades.facade.current = f;
    fades.upper.current = up;
  });
  return null;
}

function Lights({ theme }) {
  const T = THEMES[theme];
  return (
    <>
      <hemisphereLight args={[theme === 'dark' ? '#3b4a5a' : '#fff8ee', theme === 'dark' ? '#14160f' : '#d9cdb8', T.ambient]} />
      <directionalLight
        position={[30, 50, 26]}
        intensity={T.sun}
        color={theme === 'dark' ? '#9fb4d6' : '#fff1dc'}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-radius={4}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={44}
        shadow-camera-bottom={-20}
        shadow-camera-far={140}
        shadow-bias={-0.0004}
      />
    </>
  );
}

export default function TourScene({ progress, theme = 'light', styleScene }) {
  const T = THEMES[theme];
  const fades = useMemo(() => ({ facade: { current: 1 }, upper: { current: 1 } }), []);
  const [ref, inView] = useInView();
  const [dpr, monitor] = useAdaptiveDpr();
  return (
    <Canvas ref={ref} frameloop={inView ? 'always' : 'never'} shadows="soft" dpr={dpr} camera={{ fov: 38, near: 0.1, far: 400, position: KEYS[0].p }} gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}>
      {monitor}
      <color attach="background" args={[T.bg]} />
      <fog attach="fog" args={[T.fog, 60, 170]} />
      <Lights theme={theme} />
      <Suspense fallback={null}>
        <Environment resolution={128}>
          <Lightformer intensity={theme === 'dark' ? 0.4 : 1.6} position={[0, 10, 10]} scale={[30, 8, 1]} />
          <Lightformer intensity={theme === 'dark' ? 0.2 : 0.8} position={[-20, 5, -10]} rotation-y={Math.PI / 2} scale={[30, 8, 1]} />
        </Environment>
      </Suspense>
      <Site theme={theme} fade={fades.upper} />
      <Tower theme={theme} fades={fades} interior={<Apartment scene={styleScene} theme={theme} />} />
      <Rig progress={progress} fades={fades} />
      <StaticShadows key={theme} />
      <TourPost progress={progress} />
    </Canvas>
  );
}

/** Postproceso del recorrido: AO + profundidad de campo que desenfoca el exterior en la vista de planta */
const FOCUS = new THREE.Vector3(0, Y + 0.6, 0);
function TourPost({ progress }) {
  const dof = useRef();
  const s = useRef(0);
  useFrame((_, dt) => {
    s.current = THREE.MathUtils.damp(s.current, progress.current, 4, dt);
    const e = dof.current;
    if (!e) return;
    const end = ramp(s.current, 0.78, 0.95);
    e.bokehScale = end * 7;
    e.target = FOCUS;
  });
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <N8AO halfRes aoRadius={0.9} intensity={2.2} distanceFalloff={0.8} quality="performance" />
      <DepthOfField ref={dof} target={[0, Y + 0.6, 0]} worldFocusRange={7} bokehScale={0} resolutionScale={0.5} />
      <SMAA />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
