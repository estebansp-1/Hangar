import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Bed, Chair, cylinder, FloorLamp, freshMat, glassMat, mat, Pendant, PottedPlant, RB, rbox, Shrub, Sofa, Table, Tree, Vase } from './kit';

/*
 * Maqueta arquitectónica procedural (sin archivos externos):
 *  - Tower: torre de N pisos con losas, vidrio, aletas verticales y balcones con jardineras
 *  - Apartment: el piso amoblado (sala, cocina con isla, comedor, alcoba y baño)
 *  - House: casa moderna de dos volúmenes con piscina
 *  - Site: lote con pasto, plazoleta, sendero y vegetación
 * Geometría con aristas redondeadas, texturas procedurales y mobiliario detallado (ver kit.jsx).
 */

export const FLOOR_H = 3.2;
export const SLAB = 0.3;
export const TOWER = { w: 12, d: 9, floors: 12, apt: 7 };
export const APT_Y = TOWER.apt * FLOOR_H + SLAB; // nivel del piso terminado del apartamento

export const THEMES = {
  light: {
    bg: '#EEF0EA',
    fog: '#EEF0EA',
    ground: '#E4E0D6',
    road: '#CFCAC0',
    mass: '#F4F1EA',
    slab: '#E6E1D8',
    glass: '#A9C2C0',
    glassEmissive: '#000000',
    fin: '#E9E4DA',
    neighbor: '#E3DED4',
    tree: '#7E9A4F',
    trunk: '#7B6552',
    water: '#8CC9CF',
    sun: 2.8,
    ambient: 0.5,
    lights: 0,
    window: 0,
  },
  dark: {
    bg: '#0E1320',
    fog: '#0E1320',
    ground: '#171C26',
    road: '#1F2430',
    mass: '#4A5060',
    slab: '#3A404D',
    glass: '#1E2A2C',
    glassEmissive: '#F2B66B',
    fin: '#434957',
    neighbor: '#232936',
    tree: '#33472A',
    trunk: '#3A3127',
    water: '#1E3B45',
    sun: 1.1,
    ambient: 0.7,
    lights: 1,
    window: 1,
  },
};

const box = new THREE.BoxGeometry(1, 1, 1);

/* ───────────────────────── Torre ───────────────────────── */
// fades: { facade: {current}, upper: {current} } → opacidades 0..1 controladas desde fuera
export function Tower({ theme = 'light', fades, floors = TOWER.floors, w = TOWER.w, d = TOWER.d, apt = TOWER.apt, interior = null }) {
  const T = THEMES[theme];
  // Materiales por grupo: inferior (siempre visible), fachada del piso del apto y superior (se desvanecen)
  const mats = useMemo(() => {
    const make = () => ({
      mass: freshMat(T.mass, { map: 'plaster', roughness: 0.8 }),
      slab: freshMat(T.slab, { map: 'concrete', roughness: 0.85 }),
      fin: freshMat(T.fin, { map: 'plaster', roughness: 0.7 }),
      plant: freshMat(T.tree, { roughness: 0.95 }),
    });
    return { low: make(), apt: make(), up: make() };
  }, [T]);

  // Ventanas encendidas de noche: intensidad aleatoria por piso
  const lit = useMemo(() => Array.from({ length: floors }, (_, i) => (Math.sin(i * 12.9898) * 43758.5453) % 1), [floors]);
  const glassByFloor = useMemo(
    () =>
      Array.from({ length: floors }, (_, i) =>
        glassMat(T.glass, { opacity: 0.5, metalness: 0.3, emissive: T.glassEmissive, emissiveIntensity: T.window * (Math.abs(lit[i]) > 0.6 ? 0.14 : 0.02) }),
      ),
    [floors, T, lit],
  );

  useFrame(() => {
    if (!fades) return;
    const f = fades.facade.current;
    const u = fades.upper.current;
    const set = (group, o, glass = []) => {
      for (const k of ['mass', 'slab', 'fin', 'plant']) {
        const m = mats[group][k];
        m.transparent = o < 0.999;
        m.opacity = o;
        m.depthWrite = o > 0.5;
        m.visible = o > 0.01;
      }
      glass.forEach((g) => {
        g.opacity = 0.5 * o;
        g.visible = o > 0.01;
      });
    };
    // el vidrio del apartamento nunca se oculta: las ventanas siguen ahí al entrar
    set('apt', f);
    set('up', u, glassByFloor.slice(apt + 1));
  });

  // Aletas verticales (instanciadas por grupo)
  const fins = useMemo(() => {
    const spots = [];
    const step = 1.5;
    for (let x = -w / 2 + 0.75; x <= w / 2 - 0.7; x += step) spots.push([x, d / 2 + 0.28, 0], [x, -d / 2 - 0.28, 0]);
    for (let z = -d / 2 + 0.75; z <= d / 2 - 0.7; z += step) spots.push([w / 2 + 0.28, z, Math.PI / 2], [-w / 2 - 0.28, z, Math.PI / 2]);
    return spots;
  }, [w, d]);
  const finGeo = useMemo(() => rbox(0.1, FLOOR_H - SLAB, 0.55, 0.03), []);

  const finsRef = { low: useRef(), apt: useRef(), up: useRef() };
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    const fill = (ref, from, to) => {
      if (!ref.current) return;
      let i = 0;
      for (let f = from; f < to; f++)
        for (const [a, b, rot] of fins) {
          o.position.set(a, f * FLOOR_H + SLAB + (FLOOR_H - SLAB) / 2, b);
          o.rotation.set(0, rot, 0);
          o.updateMatrix();
          ref.current.setMatrixAt(i++, o.matrix);
        }
      ref.current.count = i;
      ref.current.instanceMatrix.needsUpdate = true;
    };
    fill(finsRef.low, 0, Math.min(apt, floors));
    fill(finsRef.apt, apt, Math.min(apt + 1, floors));
    fill(finsRef.up, apt + 1, floors);
  });

  const floorEls = [];
  for (let i = 0; i <= floors; i++) {
    const g = i < apt ? 'low' : i === apt ? 'apt' : 'up';
    const y = i * FLOOR_H;
    floorEls.push(<RB key={`s${i}`} p={[0, y + SLAB / 2, 0]} s={[w + 0.6, SLAB, d + 0.6]} m={mats[i === floors ? 'up' : g].slab} radius={0.05} />);
    if (i === floors) break;
    // vidrio perimetral con perfilería
    {
      const gy = y + SLAB + (FLOOR_H - SLAB) / 2;
      const gh = FLOOR_H - SLAB;
      floorEls.push(<mesh key={`gf${i}`} geometry={box} position={[0, gy, d / 2 - 0.06]} scale={[w - 0.1, gh, 0.03]} material={glassByFloor[i]} />);
      floorEls.push(<mesh key={`gb${i}`} geometry={box} position={[0, gy, -d / 2 + 0.06]} scale={[w - 0.1, gh, 0.03]} material={glassByFloor[i]} />);
      floorEls.push(<mesh key={`gl${i}`} geometry={box} position={[-w / 2 + 0.06, gy, 0]} scale={[0.03, gh, d - 0.1]} material={glassByFloor[i]} />);
      floorEls.push(<mesh key={`gr${i}`} geometry={box} position={[w / 2 - 0.06, gy, 0]} scale={[0.03, gh, d - 0.1]} material={glassByFloor[i]} />);
    }
    // perfil superior de la ventanería (solo el perímetro, no una placa)
    [[0, d / 2 - 0.06, w - 0.04, 0.1], [0, -d / 2 + 0.06, w - 0.04, 0.1], [w / 2 - 0.06, 0, 0.1, d - 0.04], [-w / 2 + 0.06, 0, 0.1, d - 0.04]].forEach(([px, pz, sx, sz], k) =>
      floorEls.push(<RB key={`t${i}${k}`} p={[px, y + FLOOR_H - 0.06, pz]} s={[sx, 0.1, sz]} m={mats[g].fin} radius={0.02} cast={false} />),
    );
    // balcón con jardinera en la fachada frontal (pisos alternos más largos)
    if (i > 0) {
      const bw = i % 2 ? w * 0.62 : w * 0.38;
      const bx = i % 2 ? -w * 0.19 : w * 0.31;
      floorEls.push(<RB key={`b${i}`} p={[bx, y + SLAB / 2, d / 2 + 1]} s={[bw, SLAB, 1.4]} m={mats[g].slab} radius={0.05} />);
      floorEls.push(<RB key={`p${i}`} p={[bx, y + SLAB + 0.35, d / 2 + 1.55]} s={[bw, 0.7, 0.3]} m={mats[g].mass} radius={0.04} />);
      floorEls.push(<RB key={`v${i}`} p={[bx, y + SLAB + 0.82, d / 2 + 1.55]} s={[bw * 0.96, 0.34, 0.34]} m={mats[g].plant} radius={0.16} cast={false} />);
    }
  }

  return (
    <group>
      {floorEls}
      {/* núcleo de escaleras / ascensores y cubierta verde */}
      <RB p={[-w / 2 + 2.2, floors * FLOOR_H + 1.4, -d / 2 + 2]} s={[3.2, 2.2, 2.8]} m={mats.up.mass} radius={0.06} />
      <RB p={[w / 2 - 3, floors * FLOOR_H + 0.55, 0]} s={[4, 0.5, d - 2]} m={mats.up.plant} radius={0.2} />
      <instancedMesh ref={finsRef.low} args={[finGeo, mats.low.fin, Math.max(1, fins.length * floors)]} castShadow receiveShadow />
      <instancedMesh ref={finsRef.apt} args={[finGeo, mats.apt.fin, Math.max(1, fins.length)]} castShadow />
      <instancedMesh ref={finsRef.up} args={[finGeo, mats.up.fin, Math.max(1, fins.length * floors)]} castShadow />
      {interior && <group position={[0, apt * FLOOR_H + SLAB, 0]}>{interior}</group>}
    </group>
  );
}

/* ───────────────────────── Apartamento ───────────────────────── */
const KEYS = ['floor', 'wall', 'sofa', 'accent', 'wood', 'metal', 'rug', 'stone', 'plant'];
const MAPS = { floor: 'planks', wall: 'plaster', sofa: 'fabric', accent: 'fabric', wood: 'wood', rug: 'fabric', stone: 'marble' };
const ROUGH = { metal: { roughness: 0.38, metalness: 0.75 }, stone: { roughness: 0.25 }, floor: { roughness: 0.55 }, wood: { roughness: 0.6 }, plant: { roughness: 0.9 } };

export function Apartment({ scene, theme = 'light' }) {
  const T = THEMES[theme];
  const m = useMemo(() => Object.fromEntries(KEYS.map((k) => [k, freshMat(scene?.[k] || '#ddd', { map: MAPS[k], roughness: 0.85, ...(ROUGH[k] || {}) })])), []); // eslint-disable-line react-hooks/exhaustive-deps
  const x = useMemo(
    () => ({
      glow: new THREE.MeshStandardMaterial({ color: '#FFF4DF', emissive: '#FFD9A0', emissiveIntensity: 0.4, toneMapped: false }),
      glass: glassMat('#d7e6e3', { opacity: 0.22 }),
      mirror: new THREE.MeshStandardMaterial({ color: '#c9d2d4', roughness: 0.02, metalness: 1 }),
      dark: mat('#1f2328', { roughness: 0.4, metalness: 0.4 }),
      ceramic: mat('#f6f4f0', { roughness: 0.18 }),
      water: new THREE.MeshPhysicalMaterial({ color: '#cfe7ea', roughness: 0.02, transmission: 0, transparent: true, opacity: 0.7 }),
      books: ['#c9b8a0', '#8a9a7a', '#d9d2c5', '#b07a5a', '#5f6b73'].map((c) => mat(c, { roughness: 0.8 })),
      art: mat('#e8dccb', { map: 'plaster', roughness: 0.9 }),
    }),
    [],
  );
  const target = useMemo(() => Object.fromEntries(KEYS.map((k) => [k, new THREE.Color()])), []);

  useLayoutEffect(() => {
    KEYS.forEach((k) => target[k].set(scene?.[k] || '#dddddd'));
  }, [scene, target]);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    const a = 1 - Math.pow(0.003, dt); // transición suave entre estilos
    let changing = false;
    KEYS.forEach((k) => {
      const c = m[k].color;
      if (Math.abs(c.r - target[k].r) + Math.abs(c.g - target[k].g) + Math.abs(c.b - target[k].b) > 0.002) changing = true;
      c.lerp(target[k], a);
    });
    if (changing) state.invalidate();
    x.glow.emissiveIntensity = THREE.MathUtils.lerp(x.glow.emissiveIntensity, 0.6 + T.lights * 2.4, a);
  });

  const H = 2.7;
  const t = 0.12;
  const wall = (x1, z1, x2, z2, k) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const horiz = z1 === z2;
    return <RB key={k} p={[(x1 + x2) / 2, H / 2, (z1 + z2) / 2]} s={horiz ? [len, H, t] : [t, H, len]} m={m.wall} radius={0.02} />;
  };

  return (
    <group>
      {/* pisos: duela de madera y piedra en el baño */}
      <RB p={[0, 0.01, 0]} s={[TOWER.w - 0.2, 0.02, TOWER.d - 0.2]} m={m.floor} radius={0.004} cast={false} />
      <RB p={[4, 0.022, 3]} s={[3.9, 0.012, 2.9]} m={m.stone} radius={0.004} cast={false} />

      {/* muros interiores con zócalo */}
      {wall(2, -4.4, 2, -1.4, 'w1')}
      {wall(2, -0.4, 2, 0.5, 'w2')}
      {wall(2, 0.5, 5.95, 0.5, 'w3')}
      {wall(3.1, 1.5, 5.95, 1.5, 'w4')}
      {wall(2, 1.5, 2, 4.4, 'w5')}

      {/* ── Cocina ── */}
      <group>
        <RB p={[-3.85, 0.06, -4.08]} s={[2.86, 0.12, 0.54]} m={x.dark} radius={0.01} cast={false} />
        {[0, 1, 2, 3].map((i) => (
          <group key={`kc${i}`}>
            <RB p={[-5.27 + 0.36 + i * 0.72, 0.51, -3.8]} s={[0.7, 0.76, 0.04]} m={m.wood} radius={0.012} />
            <RB p={[-5.27 + 0.36 + i * 0.72, 0.82, -3.77]} s={[0.4, 0.015, 0.02]} m={m.metal} radius={0.006} cast={false} />
          </group>
        ))}
        <RB p={[-3.85, 0.5, -4.12]} s={[2.88, 0.8, 0.56]} m={m.wood} radius={0.01} />
        <RB p={[-3.85, 0.92, -4.08]} s={[2.95, 0.04, 0.66]} m={m.stone} radius={0.012} />
        <RB p={[-4.4, 0.905, -4.05]} s={[0.55, 0.02, 0.38]} m={x.dark} radius={0.01} cast={false} />
        <mesh geometry={cylinder(0.012, 0.014, 0.32, 10)} position={[-4.4, 1.08, -4.3]} material={m.metal} />
        <RB p={[-4.4, 1.23, -4.2]} s={[0.025, 0.025, 0.22]} m={m.metal} radius={0.01} cast={false} />
        {[0, 1, 2, 3].map((i) => (
          <RB key={`ku${i}`} p={[-5.27 + 0.36 + i * 0.72, 2.05, -4.22]} s={[0.7, 0.7, 0.34]} m={m.wood} radius={0.012} />
        ))}
        <RB p={[-3.85, 1.55, -4.37]} s={[2.88, 0.5, 0.03]} m={m.stone} radius={0.004} cast={false} />
        <RB p={[-5.62, 1.2, -4.1]} s={[0.66, 2.4, 0.6]} m={m.wood} radius={0.015} />
        <RB p={[-5.32, 1.25, -3.8]} s={[0.02, 0.9, 0.025]} m={m.metal} radius={0.008} cast={false} />
        {/* isla */}
        <RB p={[-3.8, 0.45, -2.4]} s={[2.2, 0.86, 0.95]} m={m.wood} radius={0.02} />
        <RB p={[-3.8, 0.9, -2.4]} s={[2.36, 0.05, 1.08]} m={m.stone} radius={0.015} />
        {[-4.5, -3.8, -3.1].map((sx, i) => (
          <group key={`st${i}`} position={[sx, 0, -1.65]}>
            <mesh geometry={cylinder(0.19, 0.17, 0.06, 28)} position={[0, 0.66, 0]} material={m.accent} castShadow />
            <mesh geometry={cylinder(0.018, 0.018, 0.64, 8)} position={[0, 0.32, 0]} material={m.metal} />
            <mesh geometry={cylinder(0.14, 0.16, 0.02, 24)} position={[0, 0.01, 0]} material={m.metal} />
            <mesh geometry={cylinder(0.13, 0.13, 0.012, 24)} position={[0, 0.3, 0]} material={m.metal} />
          </group>
        ))}
        <Vase position={[-3.2, 0.925, -2.35]} m={x.ceramic} />
        <Pendant position={[-4.4, 1.95, -2.4]} metal={m.metal} glow={x.glow} cord={0.55} />
        <Pendant position={[-3.2, 1.95, -2.4]} metal={m.metal} glow={x.glow} cord={0.55} />
      </group>

      {/* ── Comedor ── */}
      <Table position={[-0.5, 0, -2.5]} w={2} d={0.95} top={m.wood} legs={m.metal} />
      {[-1.1, -0.5, 0.1].map((cx, i) => (
        <Chair key={`ca${i}`} position={[cx, 0, -3.2]} seat={m.accent} frame={m.metal} />
      ))}
      {[-1.1, -0.5, 0.1].map((cx, i) => (
        <Chair key={`cb${i}`} position={[cx, 0, -1.8]} rotation={[0, Math.PI, 0]} seat={m.accent} frame={m.metal} />
      ))}
      <Pendant position={[-0.5, 1.9, -2.5]} metal={m.metal} glow={x.glow} cord={0.6} />
      <Vase position={[-0.7, 0.75, -2.45]} m={x.ceramic} h={0.32} />
      {/* cuadro sobre el muro del comedor */}
      <RB p={[1.92, 1.55, -2.9]} s={[0.04, 0.95, 1.3]} m={m.wood} radius={0.01} />
      <RB p={[1.9, 1.55, -2.9]} s={[0.02, 0.85, 1.2]} m={x.art} radius={0.004} cast={false} />

      {/* ── Sala ── */}
      <RB p={[-3, 0.025, 2.7]} s={[3.8, 0.015, 2.6]} m={m.rug} radius={0.006} cast={false} />
      <Sofa position={[-3, 0, 1.62]} w={2.5} d={0.95} n={3} body={m.sofa} cushion={m.sofa} legs={m.metal} />
      <RB p={[-3.6, 0.62, 1.42]} s={[0.46, 0.42, 0.13]} r={[-0.25, 0.1, 0]} m={m.accent} radius={0.06} />
      <RB p={[-2.4, 0.62, 1.42]} s={[0.46, 0.42, 0.13]} r={[-0.25, -0.1, 0]} m={m.rug} radius={0.06} />
      <Table position={[-3, 0, 2.75]} w={1.1} h={0.38} round top={m.wood} legs={m.wood} />
      <RB p={[-2.85, 0.4, 2.7]} s={[0.32, 0.04, 0.24]} m={x.books[3]} radius={0.008} />
      <Vase position={[-3.2, 0.38, 2.85]} m={x.ceramic} h={0.22} />
      <group position={[-0.9, 0, 2.9]} rotation={[0, -0.7, 0]}>
        <Sofa w={0.92} d={0.88} n={1} body={m.accent} cushion={m.accent} legs={m.wood} />
      </group>
      <FloorLamp position={[-4.75, 0, 1.25]} metal={m.metal} shade={m.stone} glow={x.glow} />
      {/* biblioteca */}
      <group>
        <RB p={[1.75, 1.1, 3]} s={[0.36, 2.2, 2.6]} m={m.wood} radius={0.015} />
        {[0.45, 1.05, 1.65].map((y) => (
          <RB key={`sh${y}`} p={[1.55, y, 3]} s={[0.06, 0.03, 2.5]} m={m.wood} radius={0.005} cast={false} />
        ))}
        {[0.45, 1.05, 1.65].map((y, row) =>
          Array.from({ length: 9 }, (_, i) => {
            const h = 0.2 + ((i * 7 + row * 3) % 5) * 0.025;
            if ((i + row) % 4 === 3) return null;
            return <RB key={`bk${row}${i}`} p={[1.5, y + 0.015 + h / 2, 1.95 + i * 0.12 + row * 0.08]} s={[0.18, h, 0.05]} m={x.books[(i + row) % 5]} radius={0.006} cast={false} />;
          }),
        )}
        <Vase position={[1.5, 1.665, 3.95]} m={x.ceramic} h={0.24} />
      </group>
      <PottedPlant position={[-5.45, 0, 3.9]} scale={1.3} potM={x.ceramic} leafM={m.plant} tall seed={2} />
      <PottedPlant position={[1.2, 0, 4.0]} scale={1} potM={m.stone} leafM={m.plant} seed={7} />
      <PottedPlant position={[-5.5, 0, -1.2]} scale={1.1} potM={x.ceramic} leafM={m.plant} tall seed={4} />

      {/* ── Alcoba ── */}
      <RB p={[4.1, 0.025, -2]} s={[3, 0.015, 2.6]} m={m.rug} radius={0.006} cast={false} />
      <Bed position={[4.1, 0, -0.66]} w={1.8} l={2.1} frame={m.wood} linen={m.stone} duvet={m.sofa} accent={m.accent} />
      {[2.85, 5.35].map((nx) => (
        <group key={nx}>
          <RB p={[nx, 0.25, 0.15]} s={[0.46, 0.5, 0.4]} m={m.wood} radius={0.02} />
          <RB p={[nx, 0.38, -0.055]} s={[0.4, 0.008, 0.01]} m={x.dark} radius={0.003} cast={false} />
          <mesh geometry={cylinder(0.07, 0.09, 0.04, 20)} position={[nx, 0.52, 0.18]} material={m.metal} />
          <mesh geometry={cylinder(0.008, 0.008, 0.28, 6)} position={[nx, 0.68, 0.18]} material={m.metal} />
          <mesh geometry={cylinder(0.08, 0.12, 0.16, 24, 1)} position={[nx, 0.86, 0.18]} material={m.stone} />
          <mesh geometry={cylinder(0.04, 0.04, 0.04, 10)} position={[nx, 0.82, 0.18]} material={x.glow} />
        </group>
      ))}
      {/* clóset */}
      <RB p={[2.37, 1.2, -3]} s={[0.6, 2.4, 2.6]} m={m.wood} radius={0.015} />
      {[-0.65, 0, 0.65].map((dz) => (
        <RB key={dz} p={[2.68, 1.2, -3 + dz]} s={[0.02, 2.3, 0.008]} m={x.dark} radius={0.003} cast={false} />
      ))}

      {/* ── Baño ── */}
      <group>
        <RB p={[4.95, 0.28, 3.9]} s={[1.75, 0.56, 0.85]} m={x.ceramic} radius={0.12} />
        <RB p={[4.95, 0.5, 3.9]} s={[1.55, 0.06, 0.65]} m={x.water} radius={0.1} cast={false} />
        <RB p={[4.6, 0.5, 1.85]} s={[1.3, 0.62, 0.5]} m={m.wood} radius={0.015} />
        <RB p={[4.6, 0.83, 1.85]} s={[1.35, 0.04, 0.55]} m={m.stone} radius={0.012} />
        <mesh geometry={cylinder(0.2, 0.15, 0.13, 28)} position={[4.6, 0.915, 1.85]} material={x.ceramic} castShadow />
        <mesh geometry={cylinder(0.01, 0.01, 0.3, 8)} position={[4.6, 1.0, 1.66]} material={m.metal} />
        <RB p={[4.6, 1.65, 1.6]} s={[0.92, 0.92, 0.03]} m={m.metal} radius={0.012} />
        <RB p={[4.6, 1.65, 1.615]} s={[0.86, 0.86, 0.01]} m={x.mirror} radius={0.004} cast={false} />
        <mesh geometry={box} position={[3.2, 1, 3.6]} scale={[0.02, 2, 1.6]} material={x.glass} />
        <RB p={[3.2, 2, 3.6]} s={[0.035, 0.03, 1.6]} m={m.metal} radius={0.01} cast={false} />
        <PottedPlant position={[5.55, 0, 2.3]} scale={0.7} potM={x.ceramic} leafM={m.plant} seed={11} />
      </group>

      {/* luces cálidas interiores (de noche) */}
      <pointLight position={[-3.5, 2.2, 0]} intensity={T.lights * 9} distance={9} color="#FFD3A1" />
      <pointLight position={[4, 2.2, -2]} intensity={T.lights * 5} distance={6} color="#FFD3A1" />
    </group>
  );
}

/* ───────────────────────── Casa moderna ───────────────────────── */
export function House({ theme = 'light', accent = '#7E9A4F' }) {
  const T = THEMES[theme];
  const night = theme === 'dark';
  const mm = useMemo(
    () => ({
      mass: mat(T.mass, { map: 'plaster', roughness: 0.75 }),
      base: mat(T.slab, { map: 'concrete' }),
      dark: mat(night ? '#2B2C26' : '#3B3A35', { roughness: 0.5, metalness: 0.3 }),
      wood: mat(night ? '#5A4634' : '#A07C58', { map: 'wood', roughness: 0.65 }),
      glass: glassMat(T.glass, { opacity: 0.45, emissive: T.glassEmissive, emissiveIntensity: T.window * 0.6 }),
      water: new THREE.MeshPhysicalMaterial({ color: T.water, roughness: 0.03, metalness: 0.1, clearcoat: 1, emissive: night ? '#2a6d70' : '#000', emissiveIntensity: night ? 0.5 : 0 }),
      lawn: mat(night ? '#232a1a' : '#AEB985', { map: 'grass', roughness: 1 }),
      stone: mat(night ? '#3a3a36' : '#DDD7CB', { map: 'concrete' }),
    }),
    [T, night],
  );
  const leaf = accent || T.tree;
  return (
    <group>
      <RB p={[0, 0.05, 0]} s={[26, 0.1, 18]} m={mm.lawn} radius={0.04} cast={false} />
      <RB p={[-1, 0.22, 0]} s={[16, 0.3, 9]} m={mm.base} radius={0.05} />
      {/* volumen inferior acristalado */}
      <mesh geometry={box} position={[-3, 1.87, 0]} scale={[10, 3, 7]} material={mm.glass} />
      {[-7.5, -5, -2.5, 0, 2].map((mx) => (
        <RB key={mx} p={[mx, 1.87, 3.52]} s={[0.07, 3, 0.07]} m={mm.dark} radius={0.015} />
      ))}
      <RB p={[-7.6, 1.87, 0]} s={[0.8, 3, 7]} m={mm.wood} radius={0.04} />
      <Sofa position={[-4, 0.37, 1.4]} rotation={[0, 0, 0]} w={2.6} body={mm.mass} cushion={mm.mass} legs={mm.dark} />
      {/* volumen superior en voladizo */}
      <RB p={[0.5, 3.55, -0.5]} s={[12, 0.4, 8]} m={mm.base} radius={0.05} />
      <RB p={[0.5, 5.25, -0.5]} s={[12, 3, 8]} m={mm.mass} radius={0.06} />
      <mesh geometry={box} position={[0.5, 5.25, 3.53]} scale={[10, 2.2, 0.06]} material={mm.glass} />
      <RB p={[0.5, 6.85, -0.5]} s={[12.4, 0.3, 8.4]} m={mm.dark} radius={0.04} />
      {Array.from({ length: 14 }, (_, i) => (
        <RB key={`l${i}`} p={[-4.6 + i * 0.32, 5.25, 3.62]} s={[0.08, 2.6, 0.16]} m={mm.wood} radius={0.02} />
      ))}
      {/* piscina, deck y camino */}
      <RB p={[5.5, 0.14, 6]} s={[8.4, 0.22, 4]} m={mm.wood} radius={0.03} />
      <RB p={[5.5, 0.18, 6]} s={[7, 0.2, 2.6]} m={mm.stone} radius={0.03} cast={false} />
      <RB p={[5.5, 0.24, 6]} s={[6.7, 0.06, 2.3]} m={mm.water} radius={0.02} cast={false} />
      {[0, 1].map((i) => (
        <group key={`ln${i}`} position={[2.2 + i * 1.1, 0.25, 8.4]}>
          <RB p={[0, 0.12, 0]} s={[0.7, 0.1, 1.8]} m={mm.mass} radius={0.04} />
          <RB p={[0, 0.35, -0.75]} s={[0.7, 0.45, 0.08]} r={[-0.5, 0, 0]} m={mm.mass} radius={0.03} />
        </group>
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <RB key={`pv${i}`} p={[-3 + (i % 2) * 0.2, 0.11, 5.4 + i * 0.9]} s={[1.2, 0.04, 0.6]} m={mm.stone} radius={0.02} cast={false} />
      ))}
      {/* vegetación */}
      <Tree position={[-10, 0, -6]} kind="round" leaf={leaf} bark={T.trunk} seed={1} scale={1.15} />
      <Tree position={[10, 0, -5]} kind="tall" leaf={leaf} bark={T.trunk} seed={2} />
      <Tree position={[-11, 0, 5]} kind="olive" leaf="#8FA07A" bark={T.trunk} seed={3} scale={1.2} />
      <Tree position={[11, 0, 2]} kind="round" leaf={leaf} bark={T.trunk} seed={4} />
      <Tree position={[11.2, 0, -1.4]} kind="tall" leaf={leaf} bark={T.trunk} seed={5} scale={0.85} />
      {[[-9, 2], [-9.4, 3.2], [8.8, 4.2], [9.6, 7.4], [-6, 6.6], [0.5, 7.6]].map(([sx, sz], i) => (
        <Shrub key={i} position={[sx, 0.1, sz]} leaf={leaf} seed={i + 2} scale={0.9 + (i % 3) * 0.15} />
      ))}
    </group>
  );
}

/* ───────────────────────── Entorno del edificio ───────────────────────── */
// Solo el lote: pasto, plazoleta, sendero y vegetación (sin edificios vecinos, más liviano)
const SITE_TREES = [
  [-13, 9, 'round', 1.15], [-16, -3, 'tall', 1.1], [-12, -11, 'round', 1], [12, -10, 'olive', 1.2], [15, 2, 'tall', 1],
  [13, 11, 'round', 1.1], [3, 15, 'olive', 1], [-5, 16, 'round', 0.95], [-19, 6, 'olive', 0.9], [19, -6, 'round', 0.9],
  [-8, -15, 'tall', 0.9], [7, -16, 'round', 1],
];
export function Site({ theme = 'light', fade }) {
  const root = useRef();
  const fadeMats = useRef([]);
  // materiales propios (clonados) para poder desvanecer el entorno sin tocar los compartidos
  useLayoutEffect(() => {
    const list = [];
    root.current?.traverse((o) => {
      if (!o.isMesh) return;
      o.material = o.material.clone();
      o.material.userData.base = o.material.color.clone();
      list.push(o.material);
    });
    fadeMats.current = list;
  }, [theme]);
  // en la vista de planta el entorno se oscurece (el desenfoque lo pone la profundidad de campo)
  useFrame(() => {
    if (!fade) return;
    const k = 1 - 0.55 * (1 - fade.current);
    for (const m of fadeMats.current) m.color.copy(m.userData.base).multiplyScalar(k);
  });
  const T = THEMES[theme];
  const night = theme === 'dark';
  const m = useMemo(
    () => ({
      lawn: mat(night ? '#1d2618' : '#B8C292', { map: 'grass', roughness: 1 }),
      plaza: mat(T.slab, { map: 'concrete' }),
      path: mat(night ? '#3a3f48' : '#DCD6CA', { map: 'concrete' }),
      water: new THREE.MeshPhysicalMaterial({ color: T.water, roughness: 0.03, clearcoat: 1, emissive: night ? '#2a6d70' : '#000', emissiveIntensity: night ? 0.25 : 0 }),
    }),
    [T, night],
  );
  return (
    <group ref={root}>
      <mesh geometry={box} position={[0, -0.05, 0]} scale={[260, 0.1, 260]} material={m.lawn} receiveShadow />
      <RB p={[0, 0.04, 1]} s={[20, 0.08, 16]} m={m.plaza} radius={0.03} cast={false} />
      {Array.from({ length: 8 }, (_, i) => (
        <RB key={i} p={[(i % 2 ? 0.3 : -0.3), 0.06, 10 + i * 1.2]} s={[2, 0.05, 0.8]} m={m.path} radius={0.02} cast={false} />
      ))}
      <RB p={[-6.5, 0.1, 7.2]} s={[4.5, 0.14, 2.2]} m={m.path} radius={0.04} cast={false} />
      <RB p={[-6.5, 0.15, 7.2]} s={[4.1, 0.05, 1.8]} m={m.water} radius={0.03} cast={false} />
      {SITE_TREES.map(([x, z, kind, sc], i) => (
        <Tree key={i} position={[x, 0, z]} kind={kind} scale={sc} seed={i + 3} leaf={kind === 'olive' ? (night ? '#3f4a38' : '#97A57F') : T.tree} bark={T.trunk} />
      ))}
      {[[-9, 7], [-10.2, 4.5], [9.5, 6.8], [10.4, 3.2], [8.8, -6.5], [-9.2, -6], [2.5, 9.8], [-2.6, 9.6]].map(([x, z], i) => (
        <Shrub key={i} position={[x, 0.08, z]} leaf={i % 2 ? '#8DAA5B' : T.tree} seed={i + 9} scale={1 + (i % 3) * 0.2} />
      ))}
    </group>
  );
}
