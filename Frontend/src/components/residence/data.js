/* Contenido de cada fase de la Residencia HANGAR (bilingüe) y los planos 2D por nivel */
export const PHASES = [
  {
    id: 'f1',
    h: '+0.00 m',
    kicker: { es: 'Fase 01', en: 'Phase 01' },
    title: { es: 'Cimentación & Terreno', en: 'Foundation & Site' },
    sub: { es: 'Excavación y estructura sismo-resistente', en: 'Excavation and seismic-resistant structure' },
    text: {
      es: 'Placa de concreto sobre zapatas aisladas. Los ejes de nivelación marcan la retícula estructural que ordena toda la casa.',
      en: 'Concrete slab on isolated footings. Levelling axes mark the structural grid that organises the whole house.',
    },
    specs: [
      [{ es: 'Lote', en: 'Lot' }, '1.200 m²'],
      [{ es: 'Placa', en: 'Slab' }, '4.000 psi'],
      [{ es: 'Retícula', en: 'Grid' }, 'A–E · 1–5'],
    ],
  },
  {
    id: 'n1',
    h: '+3.40 m',
    kicker: { es: 'Fase 02 · Nivel 01', en: 'Phase 02 · Level 01' },
    title: { es: 'Zona Social & Galería', en: 'Living & Gallery' },
    sub: { es: 'Ventanales de piso a techo hacia el jardín', en: 'Floor-to-ceiling glazing onto the garden' },
    text: {
      es: '180 m² abiertos con techos a 3,40 m, galería para arte y una fachada de vidrio que integra la sala con el jardín exterior.',
      en: '180 m² of open space with 3.40 m ceilings, an art gallery and a glass façade that merges the living room with the garden.',
    },
    specs: [
      [{ es: 'Área', en: 'Area' }, '180 m²'],
      [{ es: 'Altura libre', en: 'Ceiling' }, '3,40 m'],
      [{ es: 'Jardín', en: 'Garden' }, { es: 'Integrado', en: 'Integrated' }],
    ],
  },
  {
    id: 'n2',
    h: '+6.80 m',
    kicker: { es: 'Fase 03 · Nivel 02', en: 'Phase 03 · Level 02' },
    title: { es: 'Master Suites', en: 'Master Suites' },
    sub: { es: 'Volumen en voladizo flotante', en: 'Floating cantilevered volume' },
    text: {
      es: 'Tres habitaciones en suite dentro de un volumen que vuela 6 m sobre el jardín, protegido por una celosía de madera clara.',
      en: 'Three en-suite bedrooms in a volume cantilevering 6 m over the garden, shaded by a light-wood screen.',
    },
    specs: [
      [{ es: 'Suites', en: 'Suites' }, '3'],
      [{ es: 'Voladizo', en: 'Cantilever' }, '6 m'],
      [{ es: 'Terraza', en: 'Terrace' }, { es: 'Bioclimática', en: 'Bioclimatic' }],
    ],
  },
  {
    id: 'n3',
    h: '+10.20 m',
    kicker: { es: 'Fase 04 · Nivel 03', en: 'Phase 04 · Level 03' },
    title: { es: 'Sky Lounge & Infinity Pool', en: 'Sky Lounge & Infinity Pool' },
    sub: { es: 'Cubierta habitable con vista 360°', en: 'Habitable roof with 360° views' },
    text: {
      es: 'Piscina de borde infinito, pérgola verde y una zona lounge exterior con vista panorámica sobre el valle.',
      en: 'Infinity pool, green pergola and an outdoor lounge with panoramic views over the valley.',
    },
    specs: [
      [{ es: 'Vista', en: 'View' }, '360°'],
      [{ es: 'Piscina', en: 'Pool' }, '7,4 × 6,4 m'],
      [{ es: 'Pérgola', en: 'Pergola' }, { es: 'Verde', en: 'Green' }],
    ],
  },
  {
    id: 'done',
    h: '+12.00 m',
    kicker: { es: 'Vista global', en: 'Overview' },
    title: { es: 'Residencia HANGAR Completada', en: 'HANGAR Residence Completed' },
    sub: { es: 'Volumen total con luz natural', en: 'Full volume in natural light' },
    text: {
      es: 'Tres niveles, 540 m² construidos y certificación verde A++. Diseñada, construida y entregada por un solo equipo.',
      en: 'Three levels, 540 m² built and A++ green certification. Designed, built and delivered by a single team.',
    },
    specs: [
      [{ es: 'Área total', en: 'Total area' }, '540 m²'],
      [{ es: 'Certificación', en: 'Certification' }, 'A++'],
      [{ es: 'Entrega', en: 'Delivery' }, '2027'],
    ],
  },
];

/*
 * Planos 2D por fase (unidades en metros, origen arriba-izquierda del lote 26 × 18).
 * rooms: [x, y, ancho, alto, etiqueta{es,en}]  · kind 'glass' dibuja ventanal, 'lime' resalta verde
 */
export const PLANS = {
  f1: {
    rooms: [],
    axes: true,
  },
  n1: {
    rooms: [
      [2, 3, 10, 9, { es: 'Sala', en: 'Living' }],
      [12, 3, 8, 5, { es: 'Galería', en: 'Gallery' }],
      [12, 8, 8, 4, { es: 'Comedor', en: 'Dining' }],
      [20, 3, 4, 5, { es: 'Cocina', en: 'Kitchen' }],
      [20, 8, 4, 4, { es: 'Estudio', en: 'Study' }],
    ],
    glass: [[2, 15, 22, 0]],
    green: [[0, 15, 26, 3, { es: 'Jardín', en: 'Garden' }]],
  },
  n2: {
    rooms: [
      [4, 4, 7, 5, { es: 'Suite 1', en: 'Suite 1' }],
      [11, 4, 7, 5, { es: 'Suite 2', en: 'Suite 2' }],
      [18, 4, 8, 5, { es: 'Master', en: 'Master' }],
      [4, 9, 22, 3, { es: 'Circulación', en: 'Hall' }],
    ],
    glass: [[6, 13.5, 20, 0]],
    green: [[0, 9, 4, 6, { es: 'Terraza', en: 'Terrace' }]],
  },
  n3: {
    rooms: [
      [3, 5, 11, 6, { es: 'Pérgola · Lounge', en: 'Pergola · Lounge' }],
      [14, 8, 4, 4, { es: 'Bar', en: 'Bar' }],
    ],
    water: [[18.5, 5, 7, 6.5, { es: 'Piscina', en: 'Pool' }]],
    green: [[0.5, 4, 2, 2, ''], [0.5, 11, 2, 2, '']],
  },
  done: {
    rooms: [[2, 3, 22, 12, { es: 'Huella total · 540 m²', en: 'Total footprint · 540 m²' }]],
    green: [[0, 15, 26, 3, { es: 'Jardín', en: 'Garden' }]],
  },
};
