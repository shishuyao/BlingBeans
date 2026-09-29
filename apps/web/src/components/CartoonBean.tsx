import { useEffect, useId, useState } from 'react';

type Props = {
  color?: string;
  size?: number | string;
  variant?: 'small' | 'big';
  className?: string;
  style?: React.CSSProperties;
  face?: 'happy' | 'sparkle' | 'wink';
};

function usePrefersDark() {
  const [dark, setDark] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setDark(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return dark;
}

/** Cute cartoon bean; `big` is a flashier golden champion bean. */
export function CartoonBean({
  color = '#C9A227',
  size = 36,
  variant = 'small',
  className,
  style,
  face = 'happy',
}: Props) {
  const isBig = variant === 'big';
  const dark = usePrefersDark();
  const uid = useId().replace(/:/g, '');
  const id = `bean-${uid}`;
  const gold = isBig ? (dark ? '#FFD56A' : '#F5C518') : dark ? mixHex(color, '#FFF3D6', 0.22) : color;
  const eye = dark ? '#5A4330' : '#3d2e1a';
  const cheek = dark ? '#FFAB91' : '#ff8a80';
  const cheekOpacity = dark ? 0.62 : 0.5;

  if (isBig) {
    return (
      <svg
        className={className}
        width={size}
        height={size}
        viewBox="0 0 80 80"
        style={{ colorScheme: 'only light', ...style }}
        aria-hidden
      >
        <defs>
          <radialGradient id={`${id}-body`} cx="32%" cy="28%" r="72%">
            <stop offset="0%" stopColor={dark ? '#FFFBE6' : '#FFF6C2'} />
            <stop offset="35%" stopColor={dark ? '#FFE082' : '#FFD54F'} />
            <stop offset="70%" stopColor={dark ? '#FFCA28' : '#F5A623'} />
            <stop offset="100%" stopColor={dark ? '#C68A1A' : '#B7791F'} />
          </radialGradient>
          <linearGradient id={`${id}-rim`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFE082" />
            <stop offset="50%" stopColor="#FFB300" />
            <stop offset="100%" stopColor="#8D6A12" />
          </linearGradient>
          <radialGradient id={`${id}-shine`} cx="30%" cy="22%" r="38%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <filter id={`${id}-glow`} x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#F5A623" floodOpacity="0.55" />
          </filter>
        </defs>

        {/* halo */}
        <ellipse cx="40" cy="44" rx="34" ry="34" fill="#FFE082" opacity="0.28" />

        {/* symmetric rays around the bean center */}
        <g fill="#FFE082" opacity="0.7">
          {Array.from({ length: 8 }, (_, i) => i * 45).map((deg) => (
            <path
              key={deg}
              d="M39 10 L41 10 L40.6 20 L39.4 20 Z"
              transform={`rotate(${deg} 40 44)`}
            />
          ))}
        </g>

        {/* matching sparkles, mirrored */}
        <path d="M16 28 L17.6 31.4 L21 33 L17.6 34.6 L16 38 L14.4 34.6 L11 33 L14.4 31.4 Z" fill="#FFF6B0" />
        <path d="M64 28 L65.6 31.4 L69 33 L65.6 34.6 L64 38 L62.4 34.6 L59 33 L62.4 31.4 Z" fill="#FFF6B0" />

        {/* outer rim */}
        <circle
          cx="40"
          cy="44"
          r="27"
          fill={`url(#${id}-rim)`}
          filter={`url(#${id}-glow)`}
        />
        {/* body */}
        <circle cx="40" cy="44" r="24" fill={`url(#${id}-body)`} />

        {/* crown — 3 peaks, mirrored on x=40 */}
        <path
          d="M26 31 L28 16 L34.5 27 L40 12 L45.5 27 L52 16 L54 31 Z"
          fill="#FFD54F"
          stroke="#B7791F"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <rect x="26" y="29" width="28" height="5" rx="1.5" fill="#F5C518" stroke="#B7791F" strokeWidth="1" />
        <circle cx="28" cy="16" r="2.3" fill="#FF5252" />
        <circle cx="40" cy="12" r="2.5" fill="#42A5F5" />
        <circle cx="52" cy="16" r="2.3" fill="#66BB6A" />

        {/* shine */}
        <ellipse cx="32" cy="36" rx="9" ry="7" fill={`url(#${id}-shine)`} />

        {/* cheeks */}
        <ellipse cx="27" cy="52" rx="5" ry="3" fill={cheek} opacity={cheekOpacity} />
        <ellipse cx="53" cy="52" rx="5" ry="3" fill={cheek} opacity={cheekOpacity} />

        {/* eyes */}
        <ellipse cx="32" cy="46" rx="3.2" ry="3.6" fill={eye} />
        <ellipse cx="48" cy="46" rx="3.2" ry="3.6" fill={eye} />
        <circle cx="33.2" cy="44.8" r="1.1" fill="#fff" />
        <circle cx="49.2" cy="44.8" r="1.1" fill="#fff" />

        {/* grin */}
        <path
          d="M32 55 Q40 62 48 55"
          fill="none"
          stroke={eye}
          strokeWidth="2.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      style={{ colorScheme: 'only light', ...style }}
      aria-hidden
    >
      <defs>
        <radialGradient id={`${id}-body`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor={dark ? '#fffdf6' : '#fff8e7'} stopOpacity={dark ? 0.55 : 0.85} />
          <stop offset="45%" stopColor={gold} />
          <stop offset="100%" stopColor={shade(gold, dark ? -0.12 : -0.28)} />
        </radialGradient>
        <radialGradient id={`${id}-shine`} cx="30%" cy="25%" r="40%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={dark ? 0.55 : 0.9} />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse
        cx="32"
        cy="34"
        rx="20"
        ry="22"
        fill={`url(#${id}-body)`}
        transform="rotate(-18 32 34)"
      />

      <ellipse
        cx="38"
        cy="40"
        rx="9"
        ry="11"
        fill={dark ? '#fff6e0' : shade(gold, -0.18)}
        opacity={dark ? 0.18 : 0.2}
        transform="rotate(-12 38 40)"
      />

      <ellipse cx="24" cy="24" rx="7" ry="5" fill={`url(#${id}-shine)`} transform="rotate(-20 24 24)" />

      <ellipse cx="18" cy="38" rx="3.5" ry="2.2" fill={cheek} opacity={cheekOpacity} />
      <ellipse cx="44" cy="40" rx="3.5" ry="2.2" fill={cheek} opacity={cheekOpacity} />

      {face === 'wink' ? (
        <>
          <path d="M20 32 Q24 28 28 32" fill="none" stroke={eye} strokeWidth="2" strokeLinecap="round" />
          <circle cx="40" cy="32" r="2.2" fill={eye} />
        </>
      ) : (
        <>
          <circle cx="24" cy="32" r="2.2" fill={eye} />
          <circle cx="40" cy="33" r="2.2" fill={eye} />
          <circle cx="25" cy="31.2" r="0.65" fill="#fff" />
          <circle cx="41" cy="32.2" r="0.65" fill="#fff" />
        </>
      )}

      <path
        d="M26 42 Q32 47 40 42"
        fill="none"
        stroke={eye}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function shade(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(rgb[0] * (1 + amount), rgb[1] * (1 + amount), rgb[2] * (1 + amount));
}

function mixHex(hex: string, other: string, t: number): string {
  const a = hexToRgb(hex);
  const b = hexToRgb(other);
  if (!a || !b) return hex;
  return rgbToHex(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
}

function hexToRgb(hex: string): [number, number, number] | null {
  const raw = hex.replace('#', '');
  if (raw.length !== 6) return null;
  const num = parseInt(raw, 16);
  return [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff];
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((n) => clamp(n).toString(16).padStart(2, '0')).join('')}`;
}

function clamp(n: number) {
  return Math.min(255, Math.max(0, Math.round(n)));
}
