import { createContext, Suspense, useContext, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Edges, Environment, Grid, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { glassMat, mat, Post, rbox, Shrub, Sofa, StaticShadows, Table, Tree, useInView, useAdaptiveDpr } from './kit';

/*
 * Residencia HANGAR — construcción procedural guiada por scroll.
 * Fases (progreso 0..1):
 *   0.00–0.15  Cimentación: placa de concreto y ejes de nivelación en verde lima
 *   0.15–0.40  Nivel 01: zona social y galería con ventanales de piso a techo
 *   0.40–0.70  Nivel 02: master suites en voladizo con celosía de madera
 *   0.70–0.90  Nivel 03: rooftop, piscina de borde infinito y pérgola verde
 *   0.90–1.00  Vista global terminada
 * Modos: 'real' (render diurno/nocturno), 'blueprint' (plano técnico sobre arena) y 'wire' (alambre).
 * Cámara y fases se interpolan con lerp 0.07 por frame (60 FPS).
 */

export const PHASES = [0, 0.15, 0.4, 0.7, 0.9, 1];
export const LEVELS = [0, 3.4, 6.8, 10.2]; // cotas en metros

const LERP = 0.07;
const box = new THREE.BoxGeometry(1, 1, 1);
const cyl = new THREE.CylinderGeometry(1, 1, 1, 20);
const ball = new THREE.IcosahedronGeometry(1, 1);

/* ── Paletas por modo y tema ── */
const PAL = {
  real: {
    light: { bg: '#FBF9F5', concrete: '#E9E5DD', white: '#FFFFFF', glass: '#B9D3D0', wood: '#C9A57A', lime: '#84CC16', tree: '#7E9C4C', olive: '#9AAC86', bark: '#7B6552', dark: '#334155', water: '#7DD3FC', ground: '#F4F1EA', lawn: '#C7D9A1', grid: ['#E2DDD2', '#CFC8BA'] },
    dark: { bg: '#0B1120', concrete: '#5E6778', white: '#7F889A', glass: '#2A4A4C', wood: '#8F6E4C', lime: '#84CC16', tree: '#4E6B38', olive: '#66745E', bark: '#4A3F33', dark: '#2A3446', water: '#0E5E70', ground: '#111827', lawn: '#2A3A22', grid: ['#1E293B', '#334155'] },
  },
  blueprint: { bg: '#F4F1EA', fill: '#F4F1EA', edge: '#4D7C0F', edge2: '#64748B', grid: ['#E2DCCD', '#C9C1AF'] },
  wire: { bg: '#FBF9F5', fill: '#FFFFFF', edge: '#84CC16', edge2: '#334155', grid: ['#ECE8E0', '#D6D0C4'] },
};

const Ctx = createContext(null);

/** Bloque arquitectónico: cambia material y aristas según el modo de visualización */
function Part({ p, s, k = 'white', r, geo = box, cast = true, round = 0.035 }) {
  const { mode, mats } = useContext(Ctx);
  const isLine = mode !== 'real';
  const accentEdge = k === 'lime' || k === 'tree' || k === 'glass' || k === 'water';
  if (!isLine && geo === box) {
    return <mesh geometry={rbox(s[0], s[1], s[2], round)} position={p} rotation={r} material={mats[k]} castShadow={cast} receiveShadow />;
  }
  return (
    <mesh geometry={geo} position={p} scale={s} rotation={r} material={isLine ? mats.fill : mats[k]} castShadow={!isLine && cast} receiveShadow={!isLine}>
      {isLine && <Edges threshold={20} color={accentEdge ? mats.edge : mats.edge2} />}
    </mesh>
  );
}

/** Grupo que "se construye": sube desde abajo y aparece según el progreso de su fase */
function Build({ from, to, children, rise = 2.5, base = 0 }) {
  const ref = useRef();
  const { progress } = useContext(Ctx);
  const t = useRef(0);
  useFrame(({ gl }) => {
    const target = THREE.MathUtils.clamp((progress.current - from) / (to - from), 0, 1);
    const step = (target - t.current) * LERP * 1.6;
    t.current += step;
    // sombras: solo se recalculan mientras el nivel se está construyendo
    if (Math.abs(step) > 0.0004) gl.shadowMap.needsUpdate = true;
    const e = 1 - Math.pow(1 - t.current, 3);
    if (!ref.current) return;
    ref.current.visible = t.current > 0.01;
    ref.current.position.y = base + (1 - e) * -rise;
    ref.current.scale.set(1, Math.max(0.001, e), 1);
  });
  return (
    <group ref={ref} position={[0, base, 0]}>
      <group position={[0, -base, 0]}>{children}</group>
    </group>
  );
}

/** Solo en el render realista (en plano/alambre se omite el detalle fino) */
function RealOnly({ children }) {
  const { mode } = useContext(Ctx);
  return mode === 'real' ? children : null;
}

/** Árbol: detallado en render, esquemático (copa + tronco con aristas) en plano/alambre */
function SiteTree({ x, z, kind = 'round', seed = 1, scale = 1, y = 0 }) {
  const { mode, pal } = useContext(Ctx);
  if (mode === 'real') return <Tree position={[x, y, z]} kind={kind} seed={seed} scale={scale} leaf={kind === 'olive' ? pal.olive : pal.tree} bark={pal.bark} />;
  return (
    <group>
      <Part p={[x, y + 1.2 * scale, z]} s={[0.15 * scale, 2.4 * scale, 0.15 * scale]} geo={cyl} k="dark" />
      <Part p={[x, y + 3 * scale, z]} s={[1.1 * scale, 1.35 * scale, 1.1 * scale]} geo={ball} k="tree" />
    </group>
  );
}

function LoungeSet({ y }) {
  const { mats } = useContext(Ctx);
  return (
    <group position={[0, y, 0]}>
      <Sofa position={[-2.5, 0, 3.8]} rotation={[0, Math.PI, 0]} w={3} body={mats.white} cushion={mats.fabric} legs={mats.dark} />
      <Table position={[-2.5, 0, 2.4]} w={1.2} h={0.38} round top={mats.wood} legs={mats.wood} />
      <Table position={[6.5, 0, -2.5]} w={2.4} d={1} top={mats.wood} legs={mats.dark} />
    </group>
  );
}

/* ───────────── Modelo ───────────── */
function Foundation() {
  const axes = [];
  for (let x = -12; x <= 12; x += 6) axes.push(<Part key={`ax${x}`} p={[x, 0.66, 0]} s={[0.08, 0.04, 20]} k="lime" cast={false} />);
  for (let z = -8; z <= 8; z += 4) axes.push(<Part key={`az${z}`} p={[0, 0.66, z]} s={[28, 0.04, 0.08]} k="lime" cast={false} />);
  const footings = [];
  for (let x = -12; x <= 12; x += 6) for (let z = -6; z <= 6; z += 6) footings.push(<Part key={`f${x}${z}`} p={[x, 0.85, z]} s={[0.7, 0.4, 0.7]} k="concrete" />);
  return (
    <>
      <Part p={[0, 0.3, 0]} s={[26, 0.6, 18]} k="concrete" />
      {axes}
      {footings}
    </>
  );
}

function Level1() {
  const y = 0.6;
  const H = 3.4;
  const mullions = [];
  for (let x = -9; x <= 9; x += 2.25) mullions.push(<Part key={`m${x}`} p={[x, y + H / 2, 6.02]} s={[0.08, H, 0.08]} k="dark" />);
  return (
    <>
      {/* ventanal de piso a techo hacia el jardín */}
      <Part p={[0, y + H / 2, 6]} s={[20, H, 0.06]} k="glass" cast={false} />
      {mullions}
      <Part p={[-11, y + H / 2, 0]} s={[0.3, H, 12]} k="wood" />
      <Part p={[11, y + H / 2, -2]} s={[0.3, H, 8]} k="white" />
      <Part p={[0, y + H / 2, -6]} s={[22, H, 0.3]} k="white" />
      <Part p={[11, y + H / 2, 4]} s={[0.06, H, 4]} k="glass" cast={false} />
      {/* columnas */}
      {[-6, 0, 6].map((x) => (
        <Part key={x} p={[x, y + H / 2, 2]} s={[0.35, H, 0.35]} k="concrete" />
      ))}
      {/* galería: muros de exhibición y piezas */}
      <Part p={[-4, y + 1.3, -3]} s={[6, 2.6, 0.2]} k="white" />
      <Part p={[5, y + 0.45, 1]} s={[3.6, 0.9, 1.6]} k="dark" />
      <Part p={[-7.5, y + 0.38, 2.5]} s={[3, 0.75, 1.2]} k="wood" />
      <RealOnly>
        <LoungeSet y={y} />
      </RealOnly>
      {/* losa del nivel 2 */}
      <Part p={[0, y + H + 0.18, 0]} s={[24, 0.36, 14]} k="concrete" />
    </>
  );
}

function Level2() {
  const y = 0.6 + 3.4 + 0.36;
  const H = 3.2;
  const slats = [];
  for (let x = -6; x <= 14; x += 0.7) slats.push(<Part key={`s${x.toFixed(1)}`} p={[x, y + H / 2, 4.82]} s={[0.12, H - 0.3, 0.2]} k="wood" />);
  return (
    <>
      {/* volumen en voladizo desplazado sobre el jardín */}
      <Part p={[4, y + H / 2, -0.5]} s={[22, H, 9]} k="white" />
      <Part p={[4, y + H / 2, 4.05]} s={[20, H * 0.62, 0.06]} k="glass" cast={false} />
      {slats}
      {/* terraza bioclimática con jardineras lima */}
      <Part p={[-9, y + 0.12, 2]} s={[6, 0.24, 6]} k="wood" />
      <Part p={[-11.6, y + 0.45, 2]} s={[0.8, 0.6, 5.6]} k="lime" />
      <Part p={[-9, y + 0.45, 4.6]} s={[5.2, 0.6, 0.8]} k="lime" />
      {/* losa de cubierta */}
      <Part p={[3, y + H + 0.18, -0.5]} s={[24, 0.36, 10]} k="concrete" />
    </>
  );
}

function Rooftop() {
  const y = 0.6 + 3.4 + 0.36 + 3.2 + 0.36;
  const beams = [];
  for (let x = -6; x <= 4; x += 1) beams.push(<Part key={`b${x}`} p={[x, y + 2.8, -1.5]} s={[0.12, 0.18, 6]} k="lime" />);
  return (
    <>
      {/* piscina de borde infinito */}
      <Part p={[9.5, y + 0.4, -0.5]} s={[8, 0.8, 7]} k="concrete" />
      <Part p={[9.5, y + 0.82, -0.5]} s={[7.4, 0.06, 6.4]} k="water" cast={false} />
      {/* pérgola verde */}
      {[[-6.5, -4], [-6.5, 1], [4.5, -4], [4.5, 1]].map(([x, z]) => (
        <Part key={`c${x}${z}`} p={[x, y + 1.4, z]} s={[0.18, 2.8, 0.18]} k="dark" />
      ))}
      {beams}
      <Part p={[-1, y + 2.95, -4]} s={[11.4, 0.14, 0.18]} k="dark" />
      <Part p={[-1, y + 2.95, 1]} s={[11.4, 0.14, 0.18]} k="dark" />
      {/* lounge exterior */}
      <Part p={[-2, y + 0.3, -1.5]} s={[4.5, 0.6, 1.6]} k="wood" />
      <Part p={[-2, y + 0.75, -2.4]} s={[4.5, 0.6, 0.3]} k="wood" />
      <Part p={[-2, y + 0.25, 0.4]} s={[1.6, 0.5, 1]} k="white" />
      {/* jardineras y árboles en cubierta */}
      <Part p={[-8.6, y + 0.4, -4]} s={[1.6, 0.8, 1.6]} k="concrete" />
      <SiteTree x={-8.6} z={-4} y={y + 0.8} kind="olive" seed={21} scale={0.75} />
      <Part p={[-8.6, y + 0.4, 3]} s={[1.6, 0.8, 1.6]} k="concrete" />
      <SiteTree x={-8.6} z={3} y={y + 0.8} kind="olive" seed={22} scale={0.65} />
      <RealOnly>
        {[0, 1, 2].map((i) => (
          <group key={i} position={[6.6 + i * 1.3, y, 3.6]}>
            <Part p={[0, 0.2, 0]} s={[0.75, 0.12, 1.9]} k="white" round={0.05} />
            <Part p={[0, 0.48, -0.78]} s={[0.75, 0.55, 0.1]} r={[-0.55, 0, 0]} k="white" round={0.04} />
          </group>
        ))}
      </RealOnly>
      {/* barandal de vidrio */}
      <Part p={[3, y + 0.6, 4.4]} s={[23.6, 1.2, 0.05]} k="glass" cast={false} />
    </>
  );
}

function Landscape() {
  const { mode } = useContext(Ctx);
  const trees = [
    [-17, 8, 'round', 1.1], [-18, -4, 'tall', 1], [16, 10, 'round', 1], [18, -7, 'tall', 1.1], [-6, 12.5, 'olive', 1.2], [8, 13, 'round', 0.9], [-15, 13, 'olive', 1],
    [-19.5, 2.5, 'tall', 0.9], [19, 2, 'round', 0.85],
  ];
  const shrubs = [[-12.5, 8.6], [-11.4, 9.2], [12.6, 8.4], [13.4, 9.4], [3.5, 8.8], [-8.5, 8.7], [15, 6.5]];
  return (
    <>
      <Part p={[0, 0.02, 11]} s={[34, 0.04, 6]} k="lawn" cast={false} round={0.01} />
      <RealOnly>
        {Array.from({ length: 6 }, (_, i) => (
          <Part key={`pv${i}`} p={[-3 + (i % 2 ? 0.25 : -0.25), 0.07, 8.6 + i * 1]} s={[1.6, 0.06, 0.7]} k="concrete" cast={false} round={0.02} />
        ))}
        {shrubs.map(([x, z], i) => (
          <Shrub key={i} position={[x, 0.04, z]} leaf={i % 2 ? '#8DAA5B' : '#6F8F45'} seed={i + 4} scale={0.9 + (i % 3) * 0.2} />
        ))}
      </RealOnly>
      {mode !== 'real' && <Part p={[-3, 0.05, 11]} s={[3, 0.06, 6]} k="concrete" cast={false} />}
      {trees.map(([x, z, kind, sc], i) => (
        <SiteTree key={i} x={x} z={z} kind={kind} scale={sc} seed={i + 1} />
      ))}
    </>
  );
}

/* ───────────── Cámara ───────────── */
const SHOTS = [
  { p: [34, 21, 40], t: [8, 1, 2] }, // cimentación
  { p: [38, 18, 34], t: [8, 3, 2] }, // nivel 1
  { p: [-30, 24, 40], t: [10, 5.5, 2] }, // nivel 2
  { p: [-4, 48, 36], t: [8, 8.5, -1] }, // rooftop
  { p: [50, 38, 56], t: [9, 5, 2] }, // vista global
];
const SHOT_AT = [0.0, 0.27, 0.55, 0.8, 1.0];

export const telemetry = { x: 0, y: 0, z: 0 }; // lo lee el HUD sin re-render

function Rig() {
  const { camera, size } = useThree();
  const { progress } = useContext(Ctx);
  const pos = useRef(new THREE.Vector3(...SHOTS[0].p));
  const tgt = useRef(new THREE.Vector3(...SHOTS[0].t));
  const a = useMemo(() => new THREE.Vector3(), []);
  const b = useMemo(() => new THREE.Vector3(), []);
  useFrame((state) => {
    const p = progress.current;
    let i = 0;
    while (i < SHOT_AT.length - 2 && p > SHOT_AT[i + 1]) i++;
    const k = THREE.MathUtils.smoothstep(p, SHOT_AT[i], SHOT_AT[i + 1]);
    a.fromArray(SHOTS[i].p).lerp(b.fromArray(SHOTS[i + 1].p), k);
    // leve paralaje con el puntero
    a.x += state.pointer.x * 1.5;
    a.y += state.pointer.y * 0.8;
    pos.current.lerp(a, LERP);
    a.fromArray(SHOTS[i].t).lerp(b.fromArray(SHOTS[i + 1].t), k);
    tgt.current.lerp(a, LERP);
    camera.position.copy(pos.current);
    camera.lookAt(tgt.current);
    const fov = size.width < size.height ? 62 : 36;
    if (Math.abs(camera.fov - fov) > 0.1) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    telemetry.x = camera.position.x;
    telemetry.y = camera.position.y;
    telemetry.z = camera.position.z;
  });
  return null;
}

/* ───────────── Escena ───────────── */
export default function Residence({ progress, mode = 'real', theme = 'light' }) {
  const night = theme === 'dark' && mode === 'real';
  const P = mode === 'real' ? PAL.real[night ? 'dark' : 'light'] : PAL[mode];
  const mats = useMemo(() => {
    const m = (c, o = {}) => mat(c, { roughness: 0.85, ...o });
    if (mode !== 'real') {
      return {
        fill: new THREE.MeshBasicMaterial({ color: P.fill, transparent: true, opacity: mode === 'wire' ? 0.0 : 0.82, depthWrite: mode !== 'wire' }),
        edge: P.edge,
        edge2: P.edge2,
      };
    }
    return {
      concrete: m(P.concrete, { map: 'concrete' }),
      white: m(P.white, { map: 'plaster', roughness: 0.7 }),
      fabric: m(night ? '#6B6458' : '#E8E1D5', { map: 'fabric', roughness: 0.95 }),
      glass: glassMat(P.glass, { opacity: 0.4, metalness: 0.2, emissive: night ? '#F6C177' : '#000', emissiveIntensity: night ? 0.45 : 0 }),
      wood: m(P.wood, { map: 'wood', roughness: 0.65 }),
      lime: m(P.lime, { roughness: 0.6 }),
      tree: m(P.tree, { roughness: 0.9 }),
      dark: m(P.dark, { roughness: 0.5, metalness: 0.2 }),
      water: new THREE.MeshPhysicalMaterial({ color: P.water, roughness: 0.03, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.02, emissive: night ? '#22D3EE' : '#000', emissiveIntensity: night ? 0.12 : 0 }),
      lawn: m(P.lawn, { map: 'grass', roughness: 1 }),
    };
  }, [mode, night, P]);

  const [ref, inView] = useInView();
  const gridRef = useRef();
  useEffect(() => {
    const m = gridRef.current?.material;
    if (m) m.depthWrite = false;
  }, [mode, night]);
  const [dpr, monitor] = useAdaptiveDpr();
  const ctx = useMemo(() => ({ progress, mode, mats, pal: P }), [progress, mode, mats, P]);

  return (
    <Canvas ref={ref} frameloop={inView ? 'always' : 'never'} shadows="soft" dpr={dpr} camera={{ fov: 36, near: 1, far: 400, position: SHOTS[0].p }} gl={{ antialias: true }}>
      {monitor}
      <color attach="background" args={[P.bg]} />
      <fog attach="fog" args={[P.bg, 70, 150]} />
      <hemisphereLight args={[night ? '#64748b' : '#ffffff', night ? '#1e293b' : '#e7e1d6', night ? 1.1 : 0.9]} />
      <directionalLight
        position={[24, 40, 18]}
        intensity={night ? 1.3 : 2.4}
        color={night ? '#a5b4fc' : '#fff4e2'}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-radius={5}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-bias={-0.0005}
      />
      {night && <pointLight position={[0, 3, 2]} intensity={40} distance={20} color="#fcd34d" />}
      <Suspense fallback={null}>
        <Environment resolution={64}>
          <Lightformer intensity={night ? 0.3 : 1.4} position={[0, 10, 10]} scale={[30, 8, 1]} />
        </Environment>
      </Suspense>
      <Ctx.Provider value={ctx}>
        {/* Grid y plano de sombras sin escribir profundidad: evita el z-fighting a distancia (parpadeo) */}
        <Grid
          ref={gridRef}
          renderOrder={-1}
          position={[0, 0.002, 0]}
          args={[200, 200]}
          cellSize={1}
          sectionSize={6}
          cellColor={P.grid[0]}
          sectionColor={mode === 'real' ? P.grid[1] : P.edge}
          cellThickness={night ? 0.8 : 0.6}
          sectionThickness={1}
          fadeDistance={110}
          fadeStrength={1.5}
          infiniteGrid
        />
        {mode === 'real' && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow renderOrder={-2}>
            <planeGeometry args={[400, 400]} />
            <shadowMaterial opacity={night ? 0.5 : 0.18} depthWrite={false} />
          </mesh>
        )}
        <Build from={-0.12} to={0.1} rise={1}>
          <Foundation />
        </Build>
        <Build from={0.02} to={0.14} rise={1}>
          <Landscape />
        </Build>
        <Build from={0.15} to={0.36} base={0.6}>
          <Level1 />
        </Build>
        <Build from={0.4} to={0.64} base={4.36}>
          <Level2 />
        </Build>
        <Build from={0.7} to={0.86} base={7.92}>
          <Rooftop />
        </Build>
        <Rig />
        <StaticShadows key={mode + theme} />
      </Ctx.Provider>
      {mode === 'real' && <Post radius={1.4} intensity={night ? 1.6 : 2.4} />}
    </Canvas>
  );
}
