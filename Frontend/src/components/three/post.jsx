import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { DepthOfField, EffectComposer, N8AO, SMAA, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';

/*
 * Postproceso (oclusión ambiental, antialias, tone mapping y profundidad de campo).
 * Vive en su propio paquete: la escena se ve primero y el postproceso entra un instante después.
 */

export default function Post({ radius = 1.2, intensity = 2.4, color = 'black' }) {
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <N8AO halfRes aoRadius={radius} intensity={intensity} distanceFalloff={0.8} quality="performance" color={color} />
      <SMAA />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}

const ramp = (x, a, b) => THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);

/** Recorrido: AO + profundidad de campo que desenfoca el exterior en la vista de planta */
export function TourPost({ progress, focusY }) {
  const dof = useRef();
  const s = useRef(0);
  const focus = useRef(new THREE.Vector3(0, focusY, 0));
  useFrame((_, dt) => {
    s.current = THREE.MathUtils.damp(s.current, progress.current, 4, Math.min(dt, 1 / 30));
    const e = dof.current;
    if (!e) return;
    e.bokehScale = ramp(s.current, 0.78, 0.95) * 7;
    e.target = focus.current;
  });
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <N8AO halfRes aoRadius={0.9} intensity={2.2} distanceFalloff={0.8} quality="performance" />
      <DepthOfField ref={dof} target={[0, focusY, 0]} worldFocusRange={7} bokehScale={0} resolutionScale={0.5} />
      <SMAA />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
