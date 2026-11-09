import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PerformanceMonitor } from '@react-three/drei';

/*
 * Kit de detalle para las maquetas 3D:
 *  - Cajas con aristas redondeadas y UV a escala real (la textura no se estira según el tamaño)
 *  - Texturas procedurales (madera, duela, concreto, tela, mármol, pasto) generadas en canvas
 *  - Mobiliario (sofá, silla, mesa, cama, lámparas, plantas) y vegetación (árboles, arbustos)
 *  - Postproceso: oclusión ambiental (N8AO) + antialias + tone mapping
 */

/* ───────── Aleatorio determinista ───────── */
const rng = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/* ───────── Texturas procedurales (en gris claro: el color del material las tiñe) ───────── */
const texCache = new Map();
function canvasTex(key, size, draw, meters = 1) {
  if (texCache.has(key)) return texCache.get(key);
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  draw(g, size, rng(key.length * 9973 + size));
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.repeat.set(1 / meters, 1 / meters);
  texCache.set(key, t);
  return t;
}

const grain = (g, s, r, x0, y0, w, h, lines = 60) => {
  for (let i = 0; i < lines; i++) {
    const y = y0 + r() * h;
    const amp = 1 + r() * 4;
    const f = 0.004 + r() * 0.01;
    const ph = r() * 10;
    g.strokeStyle = `rgba(60,40,20,${0.03 + r() * 0.09})`;
    g.lineWidth = 0.6 + r() * 1.8;
    g.beginPath();
    for (let x = x0; x <= x0 + w; x += 6) {
      const yy = y + Math.sin(x * f + ph) * amp + Math.sin(x * f * 3.1) * amp * 0.3;
      x === x0 ? g.moveTo(x, yy) : g.lineTo(x, yy);
    }
    g.stroke();
  }
};
const speckle = (g, s, r, n, a = 0.06, dark = true) => {
  for (let i = 0; i < n; i++) {
    const v = dark ? 0 : 255;
    g.fillStyle = `rgba(${v},${v},${v},${r() * a})`;
    const sz = 1 + r() * 2.5;
    g.fillRect(r() * s, r() * s, sz, sz);
  }
};
const blotch = (g, s, r, n, a = 0.05) => {
  for (let i = 0; i < n; i++) {
    const x = r() * s;
    const y = r() * s;
    const rad = 30 + r() * 120;
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    const dark = r() > 0.5;
    grd.addColorStop(0, `rgba(${dark ? '0,0,0' : '255,255,255'},${a * r()})`);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
};

export const TEX = {
  wood: () =>
    canvasTex('wood', 512, (g, s, r) => {
      g.fillStyle = '#f1ece6';
      g.fillRect(0, 0, s, s);
      grain(g, s, r, 0, 0, s, s, 140);
    }, 0.9),
  planks: () =>
    canvasTex('planks', 1024, (g, s, r) => {
      g.fillStyle = '#efe9e2';
      g.fillRect(0, 0, s, s);
      const rows = 8;
      const h = s / rows;
      for (let i = 0; i < rows; i++) {
        let x = -r() * s * 0.5;
        while (x < s) {
          const w = s * (0.45 + r() * 0.5);
          const l = 225 + r() * 30;
          g.fillStyle = `rgb(${l},${l - 4},${l - 9})`;
          g.fillRect(x, i * h, w, h);
          grain(g, s, r, x, i * h + 2, w, h - 4, 14);
          g.fillStyle = 'rgba(40,25,10,0.28)';
          g.fillRect(x + w - 1.5, i * h, 1.5, h);
          x += w;
        }
        g.fillStyle = 'rgba(40,25,10,0.3)';
        g.fillRect(0, i * h, s, 2);
      }
    }, 1.8),
  concrete: () =>
    canvasTex('concrete', 512, (g, s, r) => {
      g.fillStyle = '#ebe9e5';
      g.fillRect(0, 0, s, s);
      blotch(g, s, r, 40, 0.07);
      speckle(g, s, r, 5000, 0.12);
      speckle(g, s, r, 1500, 0.2, false);
      // juntas de formaleta
      g.strokeStyle = 'rgba(0,0,0,0.07)';
      g.lineWidth = 2;
      g.strokeRect(1, 1, s - 2, s - 2);
      [0.25, 0.75].forEach((a) => [0.25, 0.75].forEach((b) => {
        g.fillStyle = 'rgba(0,0,0,0.12)';
        g.beginPath();
        g.arc(a * s, b * s, 3, 0, Math.PI * 2);
        g.fill();
      }));
    }, 2.4),
  plaster: () =>
    canvasTex('plaster', 512, (g, s, r) => {
      g.fillStyle = '#f7f6f3';
      g.fillRect(0, 0, s, s);
      blotch(g, s, r, 30, 0.035);
      speckle(g, s, r, 2500, 0.05);
    }, 2),
  fabric: () =>
    canvasTex('fabric', 256, (g, s, r) => {
      g.fillStyle = '#f2f0ec';
      g.fillRect(0, 0, s, s);
      for (let i = 0; i < s; i += 2) {
        g.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.04})`;
        g.fillRect(i, 0, 1, s);
        g.fillStyle = `rgba(0,0,0,${0.02 + r() * 0.04})`;
        g.fillRect(0, i, s, 1);
      }
      speckle(g, s, r, 800, 0.06);
    }, 0.25),
  marble: () =>
    canvasTex('marble', 512, (g, s, r) => {
      g.fillStyle = '#fbfaf8';
      g.fillRect(0, 0, s, s);
      blotch(g, s, r, 20, 0.04);
      g.filter = 'blur(1.2px)';
      for (let i = 0; i < 9; i++) {
        g.strokeStyle = `rgba(90,90,100,${0.08 + r() * 0.16})`;
        g.lineWidth = 0.6 + r() * 1.8;
        g.beginPath();
        let x = r() * s;
        let y = 0;
        g.moveTo(x, y);
        while (y < s) {
          x += (r() - 0.5) * 60;
          y += 20 + r() * 40;
          g.lineTo(x, y);
        }
        g.stroke();
      }
      g.filter = 'none';
    }, 1.2),
  grass: () =>
    canvasTex('grass', 512, (g, s, r) => {
      g.fillStyle = '#eef0e6';
      g.fillRect(0, 0, s, s);
      blotch(g, s, r, 50, 0.08);
      for (let i = 0; i < 9000; i++) {
        const x = r() * s;
        const y = r() * s;
        g.strokeStyle = `rgba(${r() > 0.5 ? '20,40,0' : '255,255,230'},${r() * 0.12})`;
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + (r() - 0.5) * 3, y - 2 - r() * 4);
        g.stroke();
      }
    }, 3),
};

/* ───────── Materiales ───────── */
const matCache = new Map();
/** Material estándar cacheado por clave (color + textura + opciones) */
export function mat(color, { map, ...o } = {}) {
  const key = `${color}|${map || ''}|${JSON.stringify(o)}`;
  if (matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, map: map ? TEX[map]() : null, ...o });
  matCache.set(key, m);
  return m;
}
/** Material nuevo (no cacheado) para colores que se animan */
export const freshMat = (color, { map, ...o } = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, map: map ? TEX[map]() : null, ...o });

export const glassMat = (color = '#cfe0dc', o = {}) =>
  new THREE.MeshPhysicalMaterial({ color, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.32, depthWrite: false, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.4, ...o });

/* ───────── Geometrías ───────── */
/** UV proyectadas por cara a escala métrica: 1 unidad de UV = 1 m */
function boxUV(geo) {
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const ax = Math.abs(nor.getX(i));
    const ay = Math.abs(nor.getY(i));
    const az = Math.abs(nor.getZ(i));
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (ax >= ay && ax >= az) uv.setXY(i, z, y);
    else if (ay >= az) uv.setXY(i, x, z);
    else uv.setXY(i, x, y);
  }
  uv.needsUpdate = true;
  return geo;
}

const geoCache = new Map();
export function rbox(w, h, d, radius = 0.03) {
  const r = Math.min(radius, Math.min(w, h, d) / 2 - 0.0005);
  const key = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}|${r.toFixed(3)}`;
  if (geoCache.has(key)) return geoCache.get(key);
  const geo = r < 0.004 ? new THREE.BoxGeometry(w, h, d) : new RoundedBoxGeometry(w, h, d, 3, r);
  boxUV(geo);
  geoCache.set(key, geo);
  return geo;
}

/** Caja redondeada: s = dimensiones reales en metros */
export function RB({ p, s, m, r, radius = 0.03, cast = true, receive = true, ...rest }) {
  return <mesh geometry={rbox(s[0], s[1], s[2], radius)} position={p} rotation={r} material={m} castShadow={cast} receiveShadow={receive} {...rest} />;
}

const lathe = (key, pts, seg = 32) => {
  if (geoCache.has(key)) return geoCache.get(key);
  const g = new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
  geoCache.set(key, g);
  return g;
};
const cylCache = new Map();
export const cylinder = (rt, rb, h, seg = 20) => {
  const k = `${rt}|${rb}|${h}|${seg}`;
  if (!cylCache.has(k)) cylCache.set(k, new THREE.CylinderGeometry(rt, rb, h, seg));
  return cylCache.get(k);
};

/** Copa orgánica: icosaedro subdividido con desplazamiento suave */
const blobCache = new Map();
function blob(seed, rough = 0.2) {
  const k = `${seed}|${rough}`;
  if (blobCache.has(k)) return blobCache.get(k);
  let g = new THREE.IcosahedronGeometry(1, 3);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n =
      Math.sin(v.x * 3.1 + seed) * Math.sin(v.y * 2.7 + seed * 1.3) * Math.sin(v.z * 3.3 + seed * 0.7) * 0.6 +
      Math.sin(v.x * 7.3 + seed * 2.1) * Math.sin(v.y * 6.1 + seed) * Math.sin(v.z * 6.9) * 0.4;
    v.multiplyScalar(1 + n * rough);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  blobCache.set(k, g);
  return g;
}

/** Hoja alargada (elipsoide aplanado) */
const leafGeo = (() => {
  let g;
  return () => {
    if (!g) {
      g = new THREE.SphereGeometry(1, 14, 10);
      g.translate(0, 1, 0);
    }
    return g;
  };
})();

const shade = (hex, f) => {
  const c = new THREE.Color(hex);
  const hsl = {};
  c.getHSL(hsl);
  c.setHSL(hsl.h + f * 0.02, Math.min(1, hsl.s * (1 + f * 0.1)), THREE.MathUtils.clamp(hsl.l * (1 + f * 0.16), 0, 1));
  return `#${c.getHexString()}`;
};
const leafMats = (hex) => [-1, 0, 1].map((f) => mat(shade(hex, f), { roughness: 0.92 }));

/* ───────── Vegetación ───────── */
const treeCache = new Map();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
/** Hornea las piezas (posición/rotación/escala) y las fusiona por material */
function mergeTree(key, out) {
  const byMat = new Map();
  [...out.trunk.map((t) => ({ ...t, leaf: false })), ...out.leaves.map((l) => ({ ...l, leaf: true }))].forEach((pc) => {
    const g = pc.g.clone();
    if (g.attributes.uv) g.deleteAttribute('uv');
    const [rx, ry, rz] = pc.r || [0, 0, 0];
    _e.set(rx, ry, rz, 'XYZ');
    _m.compose(new THREE.Vector3(...pc.p), _q.setFromEuler(_e), new THREE.Vector3(...(pc.s || [1, 1, 1])));
    g.applyMatrix4(_m);
    if (!byMat.has(pc.m)) byMat.set(pc.m, { list: [], leaf: pc.leaf });
    byMat.get(pc.m).list.push(g);
  });
  const parts = [...byMat.entries()].map(([m, { list, leaf }]) => ({ g: mergeGeometries(list), m, leaf }));
  treeCache.set(key, parts);
  return parts;
}

/** Pausa el render del canvas cuando sale de pantalla */
export function useInView(margin = '120px') {
  const ref = useRef(null);
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);
  return [ref, inView];
}

/**
 * Resolución adaptativa: si el equipo no sostiene los FPS baja la densidad de píxeles
 * (1.5 → 1.15 → 0.85) y la recupera cuando hay margen. Devuelve [dpr, <Monitor/>].
 */
const DPR_STEPS = [0.85, 1.15, 1.5];
export function useAdaptiveDpr() {
  const [i, setI] = useState(2);
  const monitor = (
    <PerformanceMonitor
      bounds={() => [45, 58]}
      flipflops={4}
      onDecline={() => setI((v) => Math.max(0, v - 1))}
      onIncline={() => setI((v) => Math.min(2, v + 1))}
    />
  );
  return [Math.min(DPR_STEPS[i], typeof window !== 'undefined' ? window.devicePixelRatio : 1.5), monitor];
}

/** Sombras estáticas: el mapa solo se recalcula cuando algo marca needsUpdate */
export function StaticShadows({ frames = 2 }) {
  const n = useRef(frames);
  useFrame(({ gl, invalidate }) => {
    gl.shadowMap.autoUpdate = false;
    if (n.current > 0) {
      gl.shadowMap.needsUpdate = true;
      n.current--;
      invalidate();
    }
  });
  return null;
}

/**
 * Render bajo demanda: la escena solo se dibuja cuando algo cambia.
 * Despierta el canvas con el scroll, el puntero y el tamaño de ventana; cada animación
 * en curso pide el siguiente cuadro con invalidate() hasta que se asienta.
 * Quieta, la escena no consume GPU ni batería.
 */
export function DemandDriver() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const wake = () => invalidate();
    const opts = { passive: true };
    window.addEventListener('scroll', wake, opts);
    window.addEventListener('pointermove', wake, opts);
    window.addEventListener('touchmove', wake, opts);
    window.addEventListener('resize', wake, opts);
    return () => {
      window.removeEventListener('scroll', wake);
      window.removeEventListener('pointermove', wake);
      window.removeEventListener('touchmove', wake);
      window.removeEventListener('resize', wake);
    };
  }, [invalidate]);
  return null;
}
/** dt acotado: tras una pausa (render bajo demanda) el primer cuadro no salta de golpe */
export const stepDt = (dt) => Math.min(dt, 1 / 30);
/**
 * Árbol: tronco cónico con ramas y copa por racimos.
 * kind: 'round' (frondoso) · 'tall' (columnar) · 'olive' (copa ligera plateada)
 */
export function Tree({ position = [0, 0, 0], scale = 1, kind = 'round', leaf = '#7c9a4e', bark = '#7a6450', seed = 1, lite = false, cast = true }) {
  const parts = useMemo(() => {
    const key = `${kind}|${leaf}|${bark}|${seed}|${lite}`;
    if (treeCache.has(key)) return treeCache.get(key);
    const r = rng(seed * 7919 + kind.length);
    const L = leafMats(leaf);
    const out = { trunk: [], leaves: [] };
    const barkM = mat(bark, { roughness: 1 });
    if (kind === 'tall') {
      out.trunk.push({ g: cylinder(0.05, 0.11, 1.2, 10), p: [0, 0.6, 0], m: barkM });
      const n = lite ? 4 : 7;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const rad = 0.75 * (1 - t * 0.7) + r() * 0.08;
        out.leaves.push({ g: blob(i + seed, 0.16), p: [(r() - 0.5) * 0.15, 1.3 + t * 3.4, (r() - 0.5) * 0.15], s: [rad, rad * 1.25, rad], m: L[i % 3] });
      }
      return mergeTree(key, out);
    }
    const olive = kind === 'olive';
    const H = olive ? 1.6 : 2.4;
    out.trunk.push({ g: cylinder(olive ? 0.08 : 0.07, olive ? 0.17 : 0.15, H, 10), p: [0, H / 2, 0], r: [0.04 * (r() - 0.5), 0, 0.08 * (r() - 0.5)], m: barkM });
    if (!lite) {
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + r();
        const len = olive ? 1 : 1.2;
        const tilt = 0.7 + r() * 0.3;
        out.trunk.push({
          g: cylinder(0.025, 0.06, len, 8),
          p: [Math.cos(a) * Math.sin(tilt) * len * 0.5, H * 0.82 + Math.cos(tilt) * len * 0.5, Math.sin(a) * Math.sin(tilt) * len * 0.5],
          r: [Math.sin(a) * tilt, 0, -Math.cos(a) * tilt],
          m: barkM,
        });
      }
    }
    const top = H + (olive ? 0.55 : 0.95);
    const n = lite ? 4 : olive ? 9 : 8;
    out.leaves.push({ g: blob(seed, 0.22), p: [0, top, 0], s: olive ? [0.7, 0.45, 0.7] : [1.05, 0.95, 1.05], m: L[1] });
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r() * 0.6;
      const d = (olive ? 0.85 : 0.82) + r() * 0.25;
      const y = top + (r() - 0.6) * (olive ? 0.4 : 0.7) + (i % 3 === 0 ? 0.45 : 0);
      const rad = (olive ? 0.42 : 0.62) + r() * 0.2;
      out.leaves.push({ g: blob(seed + i + 1, 0.22), p: [Math.cos(a) * d, y, Math.sin(a) * d], s: [rad, rad * (olive ? 0.72 : 0.9), rad], m: L[(i + seed) % 3] });
    }
    return mergeTree(key, out);
  }, [kind, leaf, bark, seed, lite]);

  // un solo draw call por material (tronco + 3 tonos de follaje)
  return (
    <group position={position} scale={scale}>
      {parts.map((pt, i) => (
        <mesh key={i} geometry={pt.g} material={pt.m} castShadow={cast} receiveShadow={pt.leaf} />
      ))}
    </group>
  );
}

export function Shrub({ position = [0, 0, 0], scale = 1, leaf = '#7c9a4e', seed = 3 }) {
  const items = useMemo(() => {
    const r = rng(seed * 131);
    const L = leafMats(leaf);
    return Array.from({ length: 4 }, (_, i) => {
      const a = (i / 4) * Math.PI * 2 + r();
      const rad = 0.32 + r() * 0.16;
      return { g: blob(seed + i * 3, 0.24), p: [Math.cos(a) * 0.32, rad * 0.75, Math.sin(a) * 0.32], s: [rad, rad * 0.85, rad], m: L[i % 3] };
    });
  }, [leaf, seed]);
  const parts = useMemo(() => (treeCache.get(`shrub|${leaf}|${seed}`) || mergeTree(`shrub|${leaf}|${seed}`, { trunk: [], leaves: items })), [items, leaf, seed]);
  return (
    <group position={position} scale={scale}>
      {parts.map((pt, i) => (
        <mesh key={i} geometry={pt.g} material={pt.m} castShadow receiveShadow />
      ))}
    </group>
  );
}

/** Planta de interior en matera: hojas alargadas que se abren desde el centro */
export function PottedPlant({ position = [0, 0, 0], scale = 1, potM, leafM, seed = 5, tall = false }) {
  const leaves = useMemo(() => {
    const r = rng(seed * 17);
    const n = tall ? 14 : 11;
    const leaves0 = Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + r() * 0.5;
      const tilt = (tall ? 0.15 : 0.35) + r() * (tall ? 0.35 : 0.55);
      const len = (tall ? 0.55 : 0.32) + r() * (tall ? 0.35 : 0.2);
      return { a, tilt, s: [0.06 + r() * 0.03, len / 2, 0.012], y: 0.44 + r() * 0.04 };
    });
    const k = `plant|${seed}|${tall}`;
    if (!geoCache.has(k)) {
      const list = leaves0.map((l) => {
        const g = leafGeo().clone();
        g.applyMatrix4(_m.compose(new THREE.Vector3(0, l.y, 0), _q.setFromEuler(_e.set(0, l.a, l.tilt, 'YZX')), new THREE.Vector3(...l.s)));
        return g;
      });
      geoCache.set(k, mergeGeometries(list));
    }
    return geoCache.get(k);
  }, [seed, tall]);
  const pot = lathe('pot', [[0, 0], [0.14, 0], [0.17, 0.02], [0.2, 0.4], [0.215, 0.42], [0.215, 0.44], [0.19, 0.44], [0.18, 0.42], [0, 0.42]]);
  return (
    <group position={position} scale={scale}>
      <mesh geometry={pot} material={potM} castShadow receiveShadow />
      <mesh geometry={leaves} material={leafM} castShadow />
    </group>
  );
}

/* ───────── Mobiliario ───────── */
/** Sofá de n puestos, mirando a +z. Origen en el centro del piso. */
export function Sofa({ position, rotation, w = 2.4, d = 0.95, n = 3, body, cushion, legs }) {
  const seatW = (w - 0.36) / n;
  return (
    <group position={position} rotation={rotation}>
      <RB p={[0, 0.2, 0]} s={[w, 0.2, d]} m={body} radius={0.05} />
      {Array.from({ length: n }, (_, i) => (
        <RB key={`s${i}`} p={[-w / 2 + 0.18 + seatW * (i + 0.5), 0.39, 0.06]} s={[seatW - 0.02, 0.18, d - 0.2]} m={cushion} radius={0.07} />
      ))}
      <RB p={[0, 0.58, -d / 2 + 0.09]} s={[w, 0.56, 0.18]} m={body} radius={0.06} />
      {Array.from({ length: n }, (_, i) => (
        <RB key={`b${i}`} p={[-w / 2 + 0.18 + seatW * (i + 0.5), 0.66, -d / 2 + 0.27]} s={[seatW - 0.04, 0.4, 0.18]} r={[-0.14, 0, 0]} m={cushion} radius={0.08} />
      ))}
      {[-1, 1].map((sx) => (
        <RB key={sx} p={[sx * (w / 2 - 0.08), 0.42, 0]} s={[0.16, 0.44, d]} m={body} radius={0.07} />
      ))}
      {[-1, 1].map((sx) => [-1, 1].map((sz) => <mesh key={`${sx}${sz}`} geometry={cylinder(0.025, 0.018, 0.1, 10)} position={[sx * (w / 2 - 0.1), 0.05, sz * (d / 2 - 0.1)]} material={legs} />))}
    </group>
  );
}

/** Silla de comedor mirando a +z */
export function Chair({ position, rotation, seat, frame }) {
  return (
    <group position={position} rotation={rotation}>
      <RB p={[0, 0.455, 0.01]} s={[0.46, 0.05, 0.44]} m={seat} radius={0.02} />
      <RB p={[0, 0.78, -0.2]} s={[0.44, 0.3, 0.035]} r={[-0.12, 0, 0]} m={seat} radius={0.015} />
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} geometry={cylinder(0.017, 0.012, sz < 0 ? 0.9 : 0.44, 8)} position={[sx * 0.19, sz < 0 ? 0.45 : 0.22, sz * 0.18]} rotation={[sz * 0.05, 0, -sx * 0.04]} material={frame} castShadow />
        )),
      )}
    </group>
  );
}

export function Table({ position, rotation, w = 2, d = 0.95, h = 0.75, top, legs, round = false }) {
  return (
    <group position={position} rotation={rotation}>
      {round ? (
        <mesh geometry={cylinder(w / 2, w / 2, 0.05, 48)} position={[0, h - 0.025, 0]} material={top} castShadow receiveShadow />
      ) : (
        <RB p={[0, h - 0.025, 0]} s={[w, 0.05, d]} m={top} radius={0.02} />
      )}
      {round ? (
        <>
          <mesh geometry={cylinder(0.05, 0.07, h - 0.05, 16)} position={[0, (h - 0.05) / 2, 0]} material={legs} castShadow />
          <mesh geometry={cylinder(w * 0.22, w * 0.24, 0.03, 32)} position={[0, 0.015, 0]} material={legs} />
        </>
      ) : (
        [-1, 1].map((sx) => [-1, 1].map((sz) => <mesh key={`${sx}${sz}`} geometry={cylinder(0.028, 0.018, h - 0.05, 10)} position={[sx * (w / 2 - 0.12), (h - 0.05) / 2, sz * (d / 2 - 0.1)]} material={legs} castShadow />))
      )}
    </group>
  );
}

/** Cama con cabecero en +z, pies hacia -z */
export function Bed({ position, rotation, w = 1.8, l = 2.1, frame, linen, duvet, accent }) {
  return (
    <group position={position} rotation={rotation}>
      <RB p={[0, 0.17, 0]} s={[w + 0.08, 0.26, l]} m={frame} radius={0.03} />
      <RB p={[0, 0.39, -0.02]} s={[w - 0.04, 0.2, l - 0.1]} m={linen} radius={0.07} />
      <RB p={[0, 0.47, -0.32]} s={[w + 0.02, 0.08, l * 0.66]} m={duvet} radius={0.04} />
      <RB p={[0, 0.52, -l / 2 + 0.38]} s={[w + 0.04, 0.07, 0.5]} m={accent} radius={0.035} />
      {[-1, 1].map((sx) => (
        <RB key={sx} p={[sx * w * 0.24, 0.57, l / 2 - 0.3]} s={[w * 0.4, 0.15, 0.36]} r={[0.25, 0, 0]} m={linen} radius={0.07} />
      ))}
      <RB p={[0, 0.72, l / 2 + 0.04]} s={[w + 0.3, 1.1, 0.1]} m={frame} radius={0.04} />
    </group>
  );
}

export function Pendant({ position, metal, glow, cord = 0.5 }) {
  const shadeG = lathe('pendant', [[0.0, 0.2], [0.05, 0.2], [0.13, 0.16], [0.19, 0.08], [0.22, 0.0], [0.21, 0.0], [0.18, 0.07], [0.12, 0.145], [0.045, 0.185], [0.0, 0.185]]);
  return (
    <group position={position}>
      <mesh geometry={cylinder(0.004, 0.004, cord, 6)} position={[0, 0.2 + cord / 2, 0]} material={metal} />
      <mesh geometry={shadeG} material={metal} castShadow />
      <mesh geometry={cylinder(0.05, 0.05, 0.05, 16)} position={[0, 0.03, 0]} material={glow} />
    </group>
  );
}

export function FloorLamp({ position, metal, shade, glow }) {
  const shadeG = lathe('floorshade', [[0.12, 0], [0.2, 0], [0.13, 0.3], [0.12, 0.3]]);
  return (
    <group position={position}>
      <mesh geometry={cylinder(0.14, 0.15, 0.025, 32)} position={[0, 0.012, 0]} material={metal} castShadow />
      <mesh geometry={cylinder(0.012, 0.012, 1.42, 8)} position={[0, 0.72, 0]} material={metal} />
      <mesh geometry={shadeG} position={[0, 1.36, 0]} material={shade} castShadow />
      <mesh geometry={cylinder(0.06, 0.06, 0.08, 12)} position={[0, 1.42, 0]} material={glow} />
    </group>
  );
}

export function Vase({ position, m, h = 0.28 }) {
  const g = lathe(`vase${h}`, [[0, 0], [0.05, 0], [0.08, h * 0.25], [0.085, h * 0.5], [0.04, h * 0.9], [0.045, h], [0.035, h], [0, h * 0.9]]);
  return <mesh geometry={g} position={position} material={m} castShadow />;
}

/* ───────── Postproceso ───────── */
const LazyPost = lazy(() => import('./post'));
const LazyTourPost = lazy(() => import('./post').then((m) => ({ default: m.TourPost })));
/** Postproceso diferido: mientras llega, la escena se dibuja igual con el tone mapping del renderer */
export function Post(props) {
  return (
    <Suspense fallback={null}>
      <LazyPost {...props} />
    </Suspense>
  );
}
export function TourPost(props) {
  return (
    <Suspense fallback={null}>
      <LazyTourPost {...props} />
    </Suspense>
  );
}
