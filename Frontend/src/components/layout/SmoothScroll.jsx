import { useEffect } from 'react';
import Lenis from 'lenis';
import { useLocation } from 'react-router-dom';
import { gsap, ScrollTrigger, prefersReducedMotion } from '../../lib/gsap';

let lenis = null;
export const getLenis = () => lenis;

/** Lenis sincronizado con el ticker de GSAP para que ScrollTrigger y el scroll suave vayan al mismo frame */
export default function SmoothScroll() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (prefersReducedMotion()) return;
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenis = null;
    };
  }, []);

  // En el panel admin (sin cortina) volvemos arriba al cambiar de ruta;
  // en el resto lo hace PageTransition cuando termina la salida
  useEffect(() => {
    if (pathname.startsWith('/admin')) {
      if (lenis) lenis.scrollTo(0, { immediate: true });
      else window.scrollTo(0, 0);
    }
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return null;
}
