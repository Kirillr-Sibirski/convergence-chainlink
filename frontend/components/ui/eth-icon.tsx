interface EthIconProps {
  className?: string;
}

export function EthIcon({ className }: EthIconProps) {
  return (
    <svg
      viewBox="0 0 256 417"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Ethereum"
      className={className}
      role="img"
    >
      <path fill="#343434" d="M127.9 0L124.6 11.2v273.1l3.3 3.3 127.9-75.6z" />
      <path fill="#8C8C8C" d="M127.9 0L0 212 127.9 287.6V154.9z" />
      <path fill="#3C3C3B" d="M127.9 311.9l-1.9 2.3v97.3l1.9 5.5L256 236.3z" />
      <path fill="#8C8C8C" d="M127.9 417v-105.1L0 236.3z" />
      <path fill="#141414" d="M127.9 287.6L256 212l-128.1-57.1z" />
      <path fill="#393939" d="M0 212l127.9 75.6v-132.7z" />
    </svg>
  );
}
