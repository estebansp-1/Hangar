import { motion } from 'motion/react';
import { PLANS } from './data';
import { useI18n } from '../../i18n';

/** Plano 2D vectorial del nivel activo (lote 26 × 18 m), con cotas y norte */
export default function Blueprint({ phaseId }) {
  const { l } = useI18n();
  const plan = PLANS[phaseId] || PLANS.done;
  const S = 30; // px por metro
  const W = 26 * S;
  const H = 18 * S;
  const draw = { hidden: { pathLength: 0, opacity: 0 }, show: (i) => ({ pathLength: 1, opacity: 1, transition: { duration: 0.9, delay: 0.1 + i * 0.06, ease: [0.22, 1, 0.36, 1] } }) };

  return (
    <svg viewBox={`-40 -40 ${W + 80} ${H + 90}`} className="bp" role="img" aria-label="Plano">
      <defs>
        <pattern id="bp-grid" width={S} height={S} patternUnits="userSpaceOnUse">
          <path d={`M ${S} 0 L 0 0 0 ${S}`} fill="none" className="bp__cell" />
        </pattern>
        <pattern id="bp-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" className="bp__hatch" />
        </pattern>
      </defs>
      <rect x="0" y="0" width={W} height={H} fill="url(#bp-grid)" className="bp__lot" />

      {/* ejes estructurales */}
      {['A', 'B', 'C', 'D', 'E'].map((a, i) => {
        const x = (1 + i * 6) * S;
        return (
          <g key={a}>
            <line x1={x} y1={-18} x2={x} y2={H} className={plan.axes ? 'bp__axis bp__axis--on' : 'bp__axis'} />
            <circle cx={x} cy={-26} r="11" className="bp__bubble" />
            <text x={x} y={-22} className="bp__axis-label">
              {a}
            </text>
          </g>
        );
      })}
      {[1, 2, 3, 4].map((n, i) => {
        const y = (1 + i * 5) * S;
        return (
          <g key={n}>
            <line x1={-18} y1={y} x2={W} y2={y} className={plan.axes ? 'bp__axis bp__axis--on' : 'bp__axis'} />
            <circle cx={-26} cy={y} r="11" className="bp__bubble" />
            <text x={-26} y={y + 4} className="bp__axis-label">
              {n}
            </text>
          </g>
        );
      })}

      {(plan.green || []).map(([x, y, w, h, label], i) => (
        <g key={`g${i}`}>
          <motion.rect x={x * S} y={y * S} width={w * S} height={h * S} className="bp__green" variants={draw} initial="hidden" animate="show" custom={i} />
          {label && (
            <text x={(x + w / 2) * S} y={(y + h / 2) * S + 4} className="bp__label bp__label--green">
              {l(label)}
            </text>
          )}
        </g>
      ))}
      {(plan.water || []).map(([x, y, w, h, label], i) => (
        <g key={`w${i}`}>
          <motion.rect x={x * S} y={y * S} width={w * S} height={h * S} className="bp__water" variants={draw} initial="hidden" animate="show" custom={i} />
          <text x={(x + w / 2) * S} y={(y + h / 2) * S + 4} className="bp__label">
            {l(label)}
          </text>
        </g>
      ))}
      {plan.rooms.map(([x, y, w, h, label], i) => (
        <g key={`r${i}`}>
          <motion.rect x={x * S} y={y * S} width={w * S} height={h * S} className="bp__room" variants={draw} initial="hidden" animate="show" custom={i + 2} />
          <text x={(x + w / 2) * S} y={(y + h / 2) * S} className="bp__label">
            {l(label)}
          </text>
          <text x={(x + w / 2) * S} y={(y + h / 2) * S + 16} className="bp__area">
            {Math.round(w * h)} m²
          </text>
        </g>
      ))}
      {(plan.glass || []).map(([x, y, w], i) => (
        <motion.line key={`gl${i}`} x1={x * S} y1={y * S} x2={(x + w) * S} y2={y * S} className="bp__glass" variants={draw} initial="hidden" animate="show" custom={i} />
      ))}
      {plan.axes && (
        <motion.rect x={0} y={0} width={W} height={H} fill="url(#bp-hatch)" className="bp__slab" variants={draw} initial="hidden" animate="show" custom={0} />
      )}

      {/* cotas generales */}
      <g className="bp__dim">
        <line x1={0} y1={H + 26} x2={W} y2={H + 26} />
        <line x1={0} y1={H + 18} x2={0} y2={H + 34} />
        <line x1={W} y1={H + 18} x2={W} y2={H + 34} />
        <text x={W / 2} y={H + 44}>
          26,00 m
        </text>
      </g>
      {/* norte */}
      <g transform={`translate(${W - 10}, -10)`} className="bp__north">
        <circle r="16" />
        <path d="M0 -12 L6 8 L0 4 L-6 8 Z" />
        <text y="32">N</text>
      </g>
    </svg>
  );
}
