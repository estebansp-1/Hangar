import { useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Orbit } from './env';
import * as THREE from 'three';
import { mat, Post, RB, StaticShadows, useAdaptiveDpr, useInView } from './kit';

/*
 * Solo estructura (sin muros ni acabados): zapatas, columnas, vigas, losas, escaleras,
 * núcleos de muros y cerchas. Al cambiar de tipología la estructura sube nivel por nivel.
 */

const C = 0.35; // sección de columna
const B = 0.3; // sección de viga

/** Pórtico de concreto: rejilla de columnas por nivel, vigas y losa */
function frame({ nx, nz, sx, sz, levels, h = 3, slab = true, ox = 0, oz = 0 }) {
  const lv = [];
  const W = (nx - 1) * sx;
  const D = (nz - 1) * sz;
  const xs = Array.from({ length: nx }, (_, i) => ox - W / 2 + i * sx);
  const zs = Array.from({ length: nz }, (_, j) => oz - D / 2 + j * sz);
  // nivel 0: zapatas y vigas de cimentación
  lv.push([
    ...xs.flatMap((x) => zs.map((z) => ({ k: 'c', p: [x, -0.15, z], s: [1.2, 0.4, 1.2] }))),
    ...zs.map((z) => ({ k: 'c', p: [ox, 0.1, z], s: [W + C, 0.35, B] })),
    ...xs.map((x) => ({ k: 'c', p: [x, 0.1, oz], s: [B, 0.35, D + C] })),
  ]);
  for (let l = 0; l < levels; l++) {
    const y0 = 0.3 + l * h;
    const items = [];
    xs.forEach((x) => zs.forEach((z) => items.push({ k: 'c', p: [x, y0 + h / 2, z], s: [C, h, C] })));
    zs.forEach((z) => items.push({ k: 'b', p: [ox, y0 + h - B / 2, z], s: [W + C, B + 0.1, B] }));
    xs.forEach((x) => items.push({ k: 'b', p: [x, y0 + h - B / 2, oz], s: [B, B + 0.1, D + C] }));
    if (slab) items.push({ k: 's', p: [ox, y0 + h + 0.08, oz], s: [W + 0.8, 0.16, D + 0.8] });
    lv.push(items);
  }
  return { lv, xs, zs, W, D };
}

function stairs(x, z, levels, h = 3) {
  const out = [];
  for (let l = 0; l < levels; l++) {
    const y0 = 0.3 + l * h;
    for (let i = 0; i < 9; i++) out.push({ lvl: l + 1, item: { k: 'c', p: [x + (l % 2 ? -1 : 1) * (i * 0.28 - 1.1), y0 + 0.17 + i * (h / 9), z + (l % 2 ? 0.55 : -0.55)], s: [0.3, 0.17, 1.0] } });
  }
  return out;
}

/** Núcleo de muros estructurales (punto fijo: escaleras y ascensores) */
function core(w, d, levels, h = 3, ox = 0, oz = 0) {
  const out = [];
  for (let l = 0; l < levels; l++) {
    const y = 0.3 + l * h + h / 2;
    out.push(
      { lvl: l + 1, item: { k: 'w', p: [ox, y, oz - d / 2], s: [w, h, 0.25] } },
      { lvl: l + 1, item: { k: 'w', p: [ox, y, oz + d / 2], s: [w * 0.45, h, 0.25] } },
      { lvl: l + 1, item: { k: 'w', p: [ox - w / 2, y, oz], s: [0.25, h, d] } },
      { lvl: l + 1, item: { k: 'w', p: [ox + w / 2, y, oz], s: [0.25, h, d] } },
    );
  }
  return out;
}

const TYPES = {
  house: () => {
    const f = frame({ nx: 4, nz: 3, sx: 4, sz: 4.5, levels: 2 });
    stairs(-2, 0, 1).forEach(({ lvl, item }) => f.lv[lvl].push(item));
    return f.lv;
  },
  apartments: () => {
    const f = frame({ nx: 5, nz: 4, sx: 4.5, sz: 4, levels: 5 });
    core(4, 4.4, 5, 3, 0, 0).forEach(({ lvl, item }) => f.lv[lvl].push(item));
    // balcones en voladizo
    for (let l = 1; l <= 5; l++) f.lv[l].push({ k: 's', p: [-4.5, 0.3 + l * 3 + 0.08, f.D / 2 + 1.3], s: [8, 0.16, 1.8] }, { k: 's', p: [4.5, 0.3 + l * 3 + 0.08, -f.D / 2 - 1.3], s: [8, 0.16, 1.8] });
    return f.lv;
  },
  tower: () => {
    const f = frame({ nx: 4, nz: 4, sx: 5, sz: 5, levels: 12 });
    core(5.2, 5.2, 12, 3, 0, 0).forEach(({ lvl, item }) => f.lv[lvl].push(item));
    return f.lv;
  },
  finca: () => {
    const h = 2.8;
    const f = frame({ nx: 5, nz: 3, sx: 4, sz: 4, levels: 1, h, slab: false });
    // corredor perimetral: postes de madera y viga de borde
    const W = f.W + 6;
    const D = f.D + 6;
    const posts = [];
    for (let i = 0; i <= 6; i++) posts.push({ k: 't', p: [-W / 2 + (i * W) / 6, 0.3 + h / 2, D / 2], s: [0.22, h, 0.22] }, { k: 't', p: [-W / 2 + (i * W) / 6, 0.3 + h / 2, -D / 2], s: [0.22, h, 0.22] });
    posts.push({ k: 't', p: [0, 0.3 + h + 0.12, D / 2], s: [W + 0.3, 0.25, 0.2] }, { k: 't', p: [0, 0.3 + h + 0.12, -D / 2], s: [W + 0.3, 0.25, 0.2] });
    f.lv[1].push(...posts);
    // cerchas de madera a dos aguas, correas y cumbrera
    const roof = [];
    const rise = 3.8;
    const y = 0.3 + h + 0.25;
    const half = D / 2 + 0.4;
    const slope = Math.atan2(rise, half);
    const raft = Math.hypot(rise, half);
    for (let i = 0; i <= 8; i++) {
      const x = -W / 2 + (i * W) / 8;
      roof.push(
        { k: 't', p: [x, y + 0.08, 0], s: [0.16, 0.2, half * 2] },
        { k: 't', p: [x, y + rise / 2, half / 2], s: [0.16, 0.22, raft], r: [slope, 0, 0] },
        { k: 't', p: [x, y + rise / 2, -half / 2], s: [0.16, 0.22, raft], r: [-slope, 0, 0] },
        { k: 't', p: [x, y + rise / 2, 0], s: [0.12, rise, 0.12] },
      );
    }
    for (let j = 1; j < 5; j++) {
      const t = j / 5;
      [1, -1].forEach((sgn) => roof.push({ k: 't', p: [0, y + rise * (1 - t) + 0.18, sgn * half * t], s: [W + 0.6, 0.12, 0.12] }));
    }
    roof.push({ k: 't', p: [0, y + rise + 0.12, 0], s: [W + 0.6, 0.2, 0.2] });
    f.lv.push(roof);
    return f.lv;
  },
};

/** Sube la estructura nivel por nivel cada vez que cambia la tipología */
function Levels({ kind, m }) {
  const levels = useMemo(() => TYPES[kind](), [kind]);
  const refs = useRef([]);
  const t = useRef(0);
  useLayoutEffect(() => {
    t.current = 0;
  }, [kind]);
  useFrame(({ gl }, dt) => {
    if (t.current >= levels.length + 1) return;
    t.current += dt * (levels.length > 6 ? 7 : 3.2);
    gl.shadowMap.needsUpdate = true;
    refs.current.forEach((g, i) => {
      if (!g) return;
      const e = THREE.MathUtils.clamp(t.current - i, 0, 1);
      const k = 1 - Math.pow(1 - e, 3);
      g.visible = k > 0.01;
      g.scale.set(1, Math.max(0.001, k), 1);
    });
  });
  return levels.map((items, i) => {
    const base = Math.min(...items.map((it) => it.p[1] - it.s[1] / 2));
    return (
      <group key={`${kind}${i}`} ref={(el) => (refs.current[i] = el)} position={[0, base, 0]} visible={false}>
        <group position={[0, -base, 0]}>
          {items.map((it, j) => (
            <RB key={j} p={it.p} s={it.s} r={it.r} m={m[it.k]} radius={it.k === 's' ? 0.04 : 0.025} />
          ))}
        </group>
      </group>
    );
  });
}

const FRAMING = { house: [24, 12, 0], apartments: [38, 20, 0], tower: [80, 34, 0], finca: [32, 10, 0] };
function Cam({ kind }) {
  const { camera } = useThree();
  useLayoutEffect(() => {
    const [dist, y] = FRAMING[kind];
    const dir = camera.position.clone().setY(0).normalize();
    if (!dir.lengthSq()) dir.set(0.7, 0, 0.7);
    camera.position.set(dir.x * dist, y, dir.z * dist);
  }, [kind, camera]);
  return null;
}
const TARGET = { house: 3, apartments: 8, tower: 17, finca: 2.4 };

export default function StructureViewer({ kind = 'house', theme = 'light' }) {
  const night = theme === 'dark';
  const [ref, inView] = useInView();
  const [dpr, monitor] = useAdaptiveDpr();
  const m = useMemo(
    () => ({
      c: mat(night ? '#8C8F94' : '#D2CDC4', { map: 'concrete', roughness: 0.95 }), // concreto
      b: mat(night ? '#7F8389' : '#C6C0B5', { map: 'concrete', roughness: 0.95 }), // vigas
      s: mat(night ? '#9A9DA2' : '#DEDAD2', { map: 'concrete', roughness: 0.95 }), // losas
      w: mat(night ? '#787C82' : '#BDB7AC', { map: 'concrete', roughness: 0.95 }), // muros estructurales
      t: mat(night ? '#7A5E44' : '#A9805A', { map: 'wood', roughness: 0.7 }), // madera
    }),
    [night],
  );
  return (
    <Canvas ref={ref} frameloop={inView ? 'always' : 'never'} shadows="soft" dpr={dpr} gl={{ antialias: false, alpha: true, stencil: false }} camera={{ fov: 32, near: 0.5, far: 400, position: [17, 12, 17] }}>
      {monitor}
      <hemisphereLight args={[night ? '#64748b' : '#ffffff', night ? '#1e293b' : '#d9cfbf', night ? 1 : 0.85]} />
      <directionalLight position={[-22, 34, 18]} intensity={night ? 1.4 : 2.6} color={night ? '#c7d2fe' : '#fff1dc'} castShadow shadow-mapSize={[2048, 2048]} shadow-radius={5} shadow-bias={-0.0004} shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={44} shadow-camera-bottom={-20} shadow-camera-far={120} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]} receiveShadow>
        <circleGeometry args={[60, 64]} />
        <shadowMaterial opacity={night ? 0.45 : 0.2} />
      </mesh>
      <Levels kind={kind} m={m} />
      <Cam kind={kind} />
      <Orbit target={[0, TARGET[kind], 0]} enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.7} minPolarAngle={0.6} maxPolarAngle={1.42} />
      <StaticShadows key={`${kind}${theme}`} />
      <Post radius={1} intensity={2} />
    </Canvas>
  );
}
