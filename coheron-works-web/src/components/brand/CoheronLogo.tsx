import React from 'react';

export interface CoheronLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'color' | 'light' | 'dark' | 'mono';
  showWordmark?: boolean;
  animated?: boolean;
  className?: string;
}

const SIZES: Record<string, number> = { xs: 24, sm: 32, md: 48, lg: 64, xl: 96 };

const COLORS: Record<string, { left: string; right: string; text: string }> = {
  color: { left: '#4169E1', right: '#03E1AC', text: '#4169E1' },
  light: { left: '#FFFFFF', right: '#FFFFFF', text: '#FFFFFF' },
  dark: { left: '#1E3A8A', right: '#1E3A8A', text: '#1E3A8A' },
  mono: { left: '#4169E1', right: '#4169E1', text: '#4169E1' },
};

export const CoheronLogo: React.FC<CoheronLogoProps> = ({
  size = 'md',
  variant = 'color',
  showWordmark = false,
  animated = false,
  className,
}) => {
  const px = SIZES[size];
  const { left, right, text } = COLORS[variant];
  const rightOpacity = variant === 'mono' ? 0.5 : 1;
  const id = React.useId();

  const totalWidth = showWordmark ? px * 4 : px;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={totalWidth}
      height={px}
      viewBox={`0 0 ${showWordmark ? 200 : 50} 50`}
      className={className}
      role="img"
      aria-label="Coheron logo"
    >
      <defs>
        {/* Clip to show the right circle passing "behind" the left circle's right edge,
            then "in front" at the bottom — creating intertwined depth */}
        <clipPath id={`${id}-clip-right`}>
          {/* Full area minus left circle's right half overlap at top */}
          <rect x="0" y="0" width="50" height="50" />
        </clipPath>
      </defs>

      <g transform="translate(5, 5)">
        {/* Left circle — bottom layer */}
        <circle
          cx="15"
          cy="20"
          r="14"
          fill="none"
          stroke={left}
          strokeWidth="3"
          style={animated ? {
            transition: 'transform 0.3s ease',
            transformOrigin: '15px 20px',
          } : undefined}
          className={animated ? 'coheron-circle-left' : undefined}
        />

        {/* Right circle — behind left at top, in front at bottom */}
        {/* Back portion: the top arc of the right circle behind the left circle */}
        <path
          d={describeArc(25, 20, 14, -90, 90)}
          fill="none"
          stroke={right}
          strokeWidth="3"
          opacity={rightOpacity}
        />

        {/* Re-draw the left circle's overlapping segment on top of the right circle's top arc */}
        <path
          d={describeArc(15, 20, 14, -40, 40)}
          fill="none"
          stroke={left}
          strokeWidth="3"
        />

        {/* Front portion: the bottom arc of the right circle in front of the left circle */}
        <path
          d={describeArc(25, 20, 14, 90, 270)}
          fill="none"
          stroke={right}
          strokeWidth="3"
          opacity={rightOpacity}
          style={animated ? {
            transition: 'transform 0.3s ease',
            transformOrigin: '25px 20px',
          } : undefined}
          className={animated ? 'coheron-circle-right' : undefined}
        />
      </g>

      {showWordmark && (
        <g>
          <text
            x="62"
            y="32"
            fill={text}
            fontFamily="'Inter', sans-serif"
            fontWeight="600"
            fontSize="14"
            letterSpacing="0.15em"
            textAnchor="start"
          >
            COHERON
          </text>
          <text
            x="155"
            y="24"
            fill={text}
            fontFamily="'Inter', sans-serif"
            fontWeight="400"
            fontSize="7"
          >
            ®
          </text>
        </g>
      )}

      {animated && (
        <style>{`
          .coheron-circle-left:hover,
          svg:hover .coheron-circle-left {
            transform: rotate(8deg);
          }
          .coheron-circle-right:hover,
          svg:hover .coheron-circle-right {
            transform: rotate(-8deg);
          }
        `}</style>
      )}
    </svg>
  );
};

/**
 * Describe an SVG arc path from startAngle to endAngle (degrees) on a circle.
 */
function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const x1 = cx + r * Math.cos(rad(startAngle));
  const y1 = cy + r * Math.sin(rad(startAngle));
  const x2 = cx + r * Math.cos(rad(endAngle));
  const y2 = cy + r * Math.sin(rad(endAngle));
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

export default CoheronLogo;
