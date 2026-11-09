import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mat, rbox, TEX } from './kit';

/*
 * Fotos de producto de las piezas de construcción, renderizadas una sola vez en un canvas
 * fuera de pantalla (estudio con luz suave y sombra de contacto) y devueltas como imágenes.
 */

const shape = (pts) => {
  const s = new THREE.Shape();
  pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  s.closePath();
  return s;
};
const mesh = (g, m, p = [0, 0, 0], r = [0, 0, 0]) => {
  const o = new THREE.Mesh(g, m);
  o.position.set(...p);
  o.rotation.set(...r);
  o.castShadow = true;
  o.receiveShadow = true;
  return o;
};

const BUILD = {
  /** Ladrillo tolete: tres piezas apiladas */
  brick() {
    const g = new THREE.Group();
    const m = mat('#B4552F', { map: 'concrete', roughness: 0.95 });
    const m2 = mat('#A84A28', { map: 'concrete', roughness: 0.95 });
    g.add(mesh(rbox(2.4, 0.6, 1.15, 0.04), m, [0, 0.3, 0]));
    g.add(mesh(rbox(2.4, 0.6, 1.15, 0.04), m2, [0.5, 0.92, 0.05], [0, 0.12, 0]));
    g.add(mesh(rbox(2.4, 0.6, 1.15, 0.04), m, [-0.1, 1.54, -0.02], [0, -0.08, 0]));
    return g;
  },
  /** Bloque de concreto con dos celdas */
  block() {
    const s = shape([[-1.95, -0.95], [1.95, -0.95], [1.95, 0.95], [-1.95, 0.95]]);
    [[-1.65, -0.15], [0.15, 1.65]].forEach(([a, b]) => s.holes.push(new THREE.Path(shape([[a, -0.62], [b, -0.62], [b, 0.62], [a, 0.62]]).getPoints())));
    const geo = new THREE.ExtrudeGeometry(s, { depth: 1.9, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, 0);
    const g = new THREE.Group();
    g.add(mesh(geo, mat('#A9A59C', { map: 'concrete', roughness: 1 }), [0, 0, 0], [0, 0.35, 0]));
    return g;
  },
  /** Perfil de acero IPE */
  steel() {
    const s = shape([[-0.75, -1], [0.75, -1], [0.75, -0.86], [0.08, -0.86], [0.08, 0.86], [0.75, 0.86], [0.75, 1], [-0.75, 1], [-0.75, 0.86], [-0.08, 0.86], [-0.08, -0.86], [-0.75, -0.86]]);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 5, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 1 });
    geo.translate(0, 1, -2.5);
    const g = new THREE.Group();
    g.add(mesh(geo, mat('#6B7078', { roughness: 0.38, metalness: 0.85 }), [0, 0, 0], [0, 0.9, 0]));
    return g;
  },
  /** Varillas corrugadas */
  rebar() {
    const parts = [new THREE.CylinderGeometry(0.2, 0.2, 5, 18)];
    for (let i = 0; i < 30; i++) {
      const t = new THREE.TorusGeometry(0.205, 0.04, 6, 18);
      t.rotateX(Math.PI / 2 + 0.35);
      t.translate(0, -2.4 + i * 0.165, 0);
      parts.push(t);
    }
    parts.forEach((p) => p.deleteAttribute('uv'));
    const bar = mergeGeometries(parts);
    bar.rotateZ(Math.PI / 2);
    const m = mat('#5B4A40', { roughness: 0.55, metalness: 0.7 });
    const g = new THREE.Group();
    [-0.6, 0, 0.6].forEach((z, i) => g.add(mesh(bar, m, [i * 0.2, 0.22 + (i === 1 ? 0.38 : 0), z], [0, 0.55 + i * 0.05, 0])));
    return g;
  },
  /** Viga de madera laminada */
  glulam() {
    const g = new THREE.Group();
    const shades = ['#C9A27A', '#BF9570', '#CDA982', '#C29A73', '#C79F77'];
    shades.forEach((c, i) => g.add(mesh(rbox(5, 0.3, 0.9, 0.01), mat(c, { map: 'wood', roughness: 0.6 }), [0, 0.15 + i * 0.3, 0])));
    g.rotation.y = 0.75;
    return g;
  },
  /** Teja de barro (media caña) */
  tile() {
    const geo = new THREE.CylinderGeometry(0.62, 0.78, 3.2, 32, 1, true, 0, Math.PI);
    const m = mat('#C0643F', { map: 'concrete', roughness: 0.9, side: THREE.DoubleSide });
    const g = new THREE.Group();
    [0, 1].forEach((i) => {
      const t = new THREE.Group();
      t.add(mesh(geo, m));
      t.rotation.set(Math.PI / 2, 0, Math.PI / 2);
      t.position.set(i * 1.25 - 0.6, 0.02, i * 0.4);
      g.add(t);
    });
    g.rotation.y = 0.5;
    return g;
  },
  /** Panel de vidrio templado con marco de aluminio */
  glass() {
    const g = new THREE.Group();
    const frame = mat('#2B2E33', { roughness: 0.35, metalness: 0.8 });
    const glass = new THREE.MeshPhysicalMaterial({ color: '#cfe3e2', roughness: 0.02, transmission: 0.9, thickness: 0.1, ior: 1.5, transparent: true, opacity: 0.55, envMapIntensity: 1.6 });
    g.add(mesh(new THREE.BoxGeometry(2.8, 3.8, 0.06), glass, [0, 2.0, 0]));
    [[0, 0.08, 3, 0.16], [0, 3.92, 3, 0.16]].forEach(([x, y, w, h]) => g.add(mesh(rbox(w, h, 0.16, 0.02), frame, [x, y, 0])));
    [-1.42, 1.42].forEach((x) => g.add(mesh(rbox(0.16, 4, 0.16, 0.02), frame, [x, 2, 0])));
    g.rotation.y = 0.35;
    return g;
  },
  /** Adoquín de concreto en espina de pescado */
  paver() {
    const g = new THREE.Group();
    const cols = ['#8F8A82', '#9A948B', '#86817A'];
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) {
        const rot = (i + j) % 2 ? Math.PI / 4 : -Math.PI / 4;
        g.add(mesh(rbox(1.0, 0.36, 0.5, 0.05), mat(cols[(i * 3 + j) % 3], { map: 'concrete' }), [i * 0.72 - 1.1, 0.18, j * 0.72 - 1.1], [0, rot, 0]));
      }
    return g;
  },
};

let cache = null;
/** Devuelve { id: dataURL } con la foto de cada pieza (se calcula una vez) */
export function renderPieces(ids, { w = 720, h = 540 } = {}) {
  if (cache) return cache;
  const canvas = document.createElement('canvas');
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1);
  r.setSize(w, h, false);
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  const pmrem = new THREE.PMREMGenerator(r);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const out = {};
  ids.forEach((id) => {
    const scene = new THREE.Scene();
    scene.environment = env;
    scene.add(new THREE.HemisphereLight('#ffffff', '#d8d2c6', 0.6));
    const key = new THREE.DirectionalLight('#fff4e6', 2.4);
    key.position.set(4, 9, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.radius = 6;
    Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 });
    scene.add(key);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.22 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const piece = BUILD[id]();
    scene.add(piece);
    // encuadre automático
    const box = new THREE.Box3().setFromObject(piece);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const radius = size.length() / 2;
    const cam = new THREE.PerspectiveCamera(28, w / h, 0.1, 100);
    const dist = radius / Math.sin(THREE.MathUtils.degToRad(14)) * 0.82;
    cam.position.set(center.x + dist * 0.62, center.y + dist * 0.5, center.z + dist * 0.6);
    cam.lookAt(center);
    r.render(scene, cam);
    out[id] = canvas.toDataURL('image/webp', 0.9);
  });
  pmrem.dispose();
  r.dispose();
  r.forceContextLoss();
  cache = out;
  return out;
}
export const PIECE_IDS = Object.keys(BUILD);
// las texturas procedurales deben existir antes del primer render
export const warm = () => Object.values(TEX).forEach((f) => f());
