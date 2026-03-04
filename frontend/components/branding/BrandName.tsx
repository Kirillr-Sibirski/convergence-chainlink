"use client";

interface BrandNameProps {
  className?: string;
}

export function BrandName({ className = "" }: BrandNameProps) {
  return <span className={`brand-aeeia underline decoration-2 underline-offset-4 ${className}`}>AEEIA</span>;
}

