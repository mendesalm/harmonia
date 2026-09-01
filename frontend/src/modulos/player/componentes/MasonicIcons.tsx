import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
  strokeWidth?: number | string;
}

const defaultProps = {
  size: 24,
  color: 'currentColor',
  strokeWidth: 1,
  fill: 'none',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export const IconKey: React.FC<IconProps> = (props) => (
  <svg width={props.size || defaultProps.size} height={props.size || defaultProps.size} viewBox="0 0 24 24" {...defaultProps} {...props}>
    <circle cx="7" cy="17" r="4" />
    <path d="M10 14l9 -9" />
    <path d="M14 10l3 3" />
    <path d="M17 7l3 3" />
  </svg>
);

export const IconLyre: React.FC<IconProps> = (props) => (
  <svg width={props.size || defaultProps.size} height={props.size || defaultProps.size} viewBox="0 0 24 24" {...defaultProps} {...props}>
    <path d="M12 18V6" />
    <path d="M9 17V7" />
    <path d="M15 17V7" />
    <path d="M5 8c0-3 2-4 4-4" />
    <path d="M19 8c0-3-2-4-4-4" />
    <path d="M5 8c0 4 2 9 7 13 5-4 7-9 7-13" />
    <path d="M7 19h10" />
  </svg>
);

export const IconScroll: React.FC<IconProps> = (props) => (
  <svg width={props.size || defaultProps.size} height={props.size || defaultProps.size} viewBox="0 0 24 24" {...defaultProps} {...props}>
    <path d="M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
    <path d="M9 8h6" />
    <path d="M9 12h6" />
    <path d="M9 16h4" />
    <path d="M4 6v12" />
    <path d="M20 6v12" />
    <circle cx="6" cy="4" r="2" />
    <circle cx="6" cy="20" r="2" />
  </svg>
);

export const IconGavel: React.FC<IconProps> = (props) => (
  <svg width={props.size || defaultProps.size} height={props.size || defaultProps.size} viewBox="0 0 24 24" {...defaultProps} {...props}>
    <path d="M13 13l-8 8" />
    <path d="M13 13l3 -3" />
    <path d="M17 7l2 2" />
    <path d="M14 6l4 4" />
    <path d="M12 8l4 4" />
    <path d="M14 6l-2 2" />
    <path d="M16 4l4 4" />
    <path d="M20 8l-2 2" />
    <path d="M4 21h4" />
    <path d="M2 21h10" />
  </svg>
);

export const IconPillar: React.FC<IconProps> = (props) => (
  <svg width={props.size || defaultProps.size} height={props.size || defaultProps.size} viewBox="0 0 24 24" {...defaultProps} {...props}>
    <path d="M5 4h14" />
    <path d="M6 4v16" />
    <path d="M10 4v16" />
    <path d="M14 4v16" />
    <path d="M18 4v16" />
    <path d="M4 20h16" />
    <path d="M4 2h16" />
    <path d="M2 22h20" />
  </svg>
);

export const IconTrowel: React.FC<IconProps> = (props) => (
  <svg width={props.size || defaultProps.size} height={props.size || defaultProps.size} viewBox="0 0 24 24" {...defaultProps} {...props}>
    <path d="M12 10l8 -8 -4 12 -4 -4" />
    <path d="M12 10l-4 4" />
    <path d="M8 14l-4 4" />
    <path d="M3 19a2 2 0 1 0 4-4" />
  </svg>
);

export const IconEyePyramid: React.FC<IconProps> = (props) => (
  <svg width={props.size || defaultProps.size} height={props.size || defaultProps.size} viewBox="0 0 24 24" {...defaultProps} {...props}>
    <path d="M12 2L2 20h20L12 2z" />
    <path d="M12 14c-1.5 0-3-1-3-1s1.5-3 3-3 3 3 3 3-1.5 1-3 1z" />
    <circle cx="12" cy="12" r="1" />
  </svg>
);

// Map of icons by their name/type
export const getMasonicIcon = (name: string, props?: IconProps) => {
  const lower = name.toLowerCase();
  if (lower.includes('entrada')) return <IconKey {...props} />;
  if (lower.includes('abertura') || lower.includes('harmonia')) return <IconLyre {...props} />;
  if (lower.includes('grau')) return <IconScroll {...props} />;
  if (lower.includes('encerramento')) return <IconGavel {...props} />;
  if (lower.includes('coluna')) return <IconPillar {...props} />;
  if (lower.includes('trolha')) return <IconTrowel {...props} />;
  return <IconEyePyramid {...props} />; // Fallback
};
