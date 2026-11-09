import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls as OrbitControlsImpl } from 'three/examples/jsm/controls/OrbitControls.js';

/*
 * Reemplazos livianos de drei: misma apariencia, sin arrastrar los cargadores HDR/EXR
 * ni la copia de OrbitControls de three-stdlib (~270 KB menos de código 3D).
 */

/**
 * Iluminación de estudio para los reflejos: paneles emisivos (como los Lightformer de drei)
 * horneados una sola vez en un mapa de entorno PMREM.
 * formers: [{ intensity, position: [x,y,z], scale: [w,h], rotationY }]
 */
export function StudioEnv({ formers }) {
  const { gl, scene } = useThree();
  const key = JSON.stringify(formers);
  useEffect(() => {
    const env = new THREE.Scene();
    env.background = new THREE.Color('#000000');
    const geo = new THREE.PlaneGeometry(1, 1);
    const mats = [];
    formers.forEach(({ intensity = 1, position = [0, 10, 10], scale = [30, 8], rotationY = 0 }) => {
      const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(intensity), side: THREE.DoubleSide, toneMapped: false });
      mats.push(m);
      const p = new THREE.Mesh(geo, m);
      p.position.set(...position);
      p.scale.set(scale[0], scale[1], 1);
      p.rotation.y = rotationY;
      p.lookAt(0, 0, 0);
      env.add(p);
    });
    const pmrem = new THREE.PMREMGenerator(gl);
    const rt = pmrem.fromScene(env, 0.02);
    const prev = scene.environment;
    scene.environment = rt.texture;
    pmrem.dispose();
    geo.dispose();
    mats.forEach((m) => m.dispose());
    return () => {
      scene.environment = prev;
      rt.dispose();
    };
  }, [gl, scene, key]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** OrbitControls oficial de three.js con las mismas props que usábamos de drei */
export function Orbit({ target = [0, 0, 0], ...props }) {
  const { camera, gl, invalidate } = useThree();
  const controls = useMemo(() => new OrbitControlsImpl(camera, gl.domElement), [camera, gl]);
  useEffect(() => {
    Object.assign(controls, props);
    controls.target.set(...target);
    controls.update();
  });
  useEffect(() => {
    const onChange = () => invalidate();
    controls.addEventListener('change', onChange);
    return () => {
      controls.removeEventListener('change', onChange);
      controls.dispose();
    };
  }, [controls, invalidate]);
  useFrame((_, dt) => controls.update(dt));
  return null;
}
