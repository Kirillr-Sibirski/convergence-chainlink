interface UsdcIconProps {
  className?: string;
}

export function UsdcIcon({ className }: UsdcIconProps) {
  return (
    <svg
      viewBox="0 0 256 256"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="USDC"
      className={className}
      role="img"
    >
      <circle cx="128" cy="128" r="120" fill="#2775CA" />
      <circle cx="128" cy="128" r="92" fill="none" stroke="#FFFFFF" strokeWidth="10" />
      <path
        d="M140 84h-24c-10.5 0-19 8.5-19 19s8.5 19 19 19h24c10.5 0 19 8.5 19 19s-8.5 19-19 19h-24"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <path d="M128 70v116" stroke="#FFFFFF" strokeWidth="14" strokeLinecap="round" />
      <path d="M75 91a56 56 0 0 0 0 74" fill="none" stroke="#FFFFFF" strokeWidth="12" strokeLinecap="round" />
      <path d="M181 91a56 56 0 0 1 0 74" fill="none" stroke="#FFFFFF" strokeWidth="12" strokeLinecap="round" />
    </svg>
  );
}
