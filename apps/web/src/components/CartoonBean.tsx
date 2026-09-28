import { useId } from 'react';

type Props = {
  color?: string;
  size?: number | string;
  variant?: 'small' | 'big';
  className?: string;
  style?: React.CSSProperties;
  face?: 'happy' | 'sparkle' | 'wink';
};

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
  const uid = useId().replace(/:/g, '');
  const id = `bean-${uid}`;
  const gold = isBig ? '#F5C518' : color;

  if (isBig) {
    return (
      <svg
        className={className}
        width={size}
        height={size}
        viewBox="0 0 80 80"
        style={style}
        aria-hidden
      >
        <defs>
          <radialGradient id={`${id}-body`} cx="32%" cy="28%" r="72%">
            <stop offset="0%" stopColor="#FFF6C2" />
            <stop offset="35%" stopColor="#FFD54F" />
            <stop offset="70%" stopColor="#F5A623" />
            <stop offset="100%" stopColor="#B7791F" />
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

        {/* sunburst rays */}
        <g opacity="0.55">
          {[0, 30, 60, 90, 120, 150].map((deg) => (
            <rect
              key={deg}
              x="38"
              y="4"
              width="4"
              height="16"
              rx="2"
              fill="#FFE082"
              transform={`rotate(${deg} 40 40)`}
            />
          ))}
        </g>

        {/* outer rim */}
        <ellipse
          cx="40"
          cy="44"
          rx="30"
          ry="32"
          fill={`url(#${id}-rim)`}
          transform="rotate(-14 40 44)"
          filter={`url(#${id}-glow)`}
        />
        {/* body */}
        <ellipse
          cx="40"
          cy="44"
          rx="26"
          ry="28"
          fill={`url(#${id}-body)`}
          transform="rotate(-14 40 44)"
        />

        {/* crown */}
        <path
          d="M26 18 L30 28 L36 18 L40 28 L44 18 L50 28 L54 18 L52 32 L28 32 Z"
          fill="#FFD54F"
          stroke="#B7791F"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <circle cx="30" cy="20" r="2.2" fill="#FF5252" />
        <circle cx="40" cy="18" r="2.4" fill="#42A5F5" />
        <circle cx="50" cy="20" r="2.2" fill="#66BB6A" />

        {/* shine */}
        <ellipse cx="30" cy="36" rx="9" ry="7" fill={`url(#${id}-shine)`} transform="rotate(-18 30 36)" />

        {/* cheeks */}
        <ellipse cx="26" cy="50" rx="5" ry="3" fill="#FF8A65" opacity="0.5" />
        <ellipse cx="54" cy="52" rx="5" ry="3" fill="#FF8A65" opacity="0.5" />

        {/* confident eyes */}
        <ellipse cx="32" cy="46" rx="3.2" ry="3.6" fill="#3d2e1a" />
        <ellipse cx="50" cy="47" rx="3.2" ry="3.6" fill="#3d2e1a" />
        <circle cx="33.2" cy="44.8" r="1.1" fill="#fff" />
        <circle cx="51.2" cy="45.8" r="1.1" fill="#fff" />

        {/* grin */}
        <path
          d="M33 56 Q41 64 51 56"
          fill="none"
          stroke="#3d2e1a"
          strokeWidth="2.8"
          strokeLinecap="round"
        />

        {/* sparkles */}
        <path d="M62 28 L64 32 L68 34 L64 36 L62 40 L60 36 L56 34 L60 32 Z" fill="#FFF59D" />
        <path d="M14 34 L15.5 37 L18.5 38.5 L15.5 40 L14 43 L12.5 40 L9.5 38.5 L12.5 37 Z" fill="#FFF59D" opacity="0.85" />
      </svg>
    );
  }

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      style={style}
      aria-hidden
    >
      <defs>
        <radialGradient id={`${id}-body`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fff8e7" stopOpacity="0.85" />
          <stop offset="45%" stopColor={gold} />
          <stop offset="100%" stopColor={shade(gold, -0.28)} />
        </radialGradient>
        <radialGradient id={`${id}-shine`} cx="30%" cy="25%" r="40%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-soft`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" floodOpacity="0.22" />
        </filter>
      </defs>

      <g filter={`url(#${id}-soft)`}>
        <ellipse
          cx="32"
          cy="34"
          rx="20"
          ry="22"
          fill={`url(#${id}-body)`}
          transform="rotate(-18 32 34)"
        />
      </g>

      <ellipse
        cx="38"
        cy="40"
        rx="9"
        ry="11"
        fill={shade(gold, -0.18)}
        opacity="0.2"
        transform="rotate(-12 38 40)"
      />

      <ellipse cx="24" cy="24" rx="7" ry="5" fill={`url(#${id}-shine)`} transform="rotate(-20 24 24)" />

      <ellipse cx="18" cy="38" rx="3.5" ry="2.2" fill="#ff8a80" opacity="0.5" />
      <ellipse cx="44" cy="40" rx="3.5" ry="2.2" fill="#ff8a80" opacity="0.5" />

      {face === 'wink' ? (
        <>
          <path d="M20 32 Q24 28 28 32" fill="none" stroke="#3d2e1a" strokeWidth="2" strokeLinecap="round" />
          <circle cx="40" cy="32" r="2.2" fill="#3d2e1a" />
        </>
      ) : (
        <>
          <circle cx="24" cy="32" r="2.2" fill="#3d2e1a" />
          <circle cx="40" cy="33" r="2.2" fill="#3d2e1a" />
          <circle cx="25" cy="31.2" r="0.65" fill="#fff" />
          <circle cx="41" cy="32.2" r="0.65" fill="#fff" />
        </>
      )}

      <path
        d="M26 42 Q32 47 40 42"
        fill="none"
        stroke="#3d2e1a"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function shade(hex: string, amount: number): string {
  const raw = hex.replace('#', '');
  if (raw.length !== 6) return hex;
  const num = parseInt(raw, 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) * (1 + amount)));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) * (1 + amount)));
  const b = Math.min(255, Math.max(0, (num & 0xff) * (1 + amount)));
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}
