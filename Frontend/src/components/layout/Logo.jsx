/*
 * Logo HANGAR: una bóveda de hangar (arco) que contiene una "H" construida por pisos,
 * con la viga central y la línea de horizonte en verde lima.
 */
export function LogoMark({ size = 38, animate = false }) {
  return (
    <svg className={`logo-mark ${animate ? 'is-anim' : ''}`} width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      {/* bóveda */}
      <path className="lm__vault" d="M7 40V22.5C7 13.4 14.6 6 24 6s17 7.4 17 16.5V40" />
      <path className="lm__vault lm__vault--inner" d="M11.5 40V23c0-6.9 5.6-12.5 12.5-12.5S36.5 16.1 36.5 23v17" />
      {/* "H" por pisos */}
      <path className="lm__stem" d="M17 40V19M31 40V19" />
      <path className="lm__floor" d="M14.5 34.5h5M14.5 29h5M28.5 34.5h5M28.5 29h5" />
      {/* viga en voladizo */}
      <path className="lm__beam" d="M17 25h18.5" />
      {/* horizonte */}
      <path className="lm__ground" d="M3 40h42" />
      <circle className="lm__sun" cx="38.5" cy="12" r="2.2" />
    </svg>
  );
}

export default function Logo({ tagline = true, size = 38 }) {
  return (
    <span className="logo">
      <LogoMark size={size} />
      <span className="logo__text">
        <span className="logo__word">Hangar</span>
        {tagline && <span className="logo__tag">Architecture · Interiors</span>}
      </span>
    </span>
  );
}
