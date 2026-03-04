"use client";

interface BrandNameProps {
  className?: string;
  highlightVowels?: boolean;
  italic?: boolean;
}

export function BrandName({ className = "", highlightVowels = false, italic = false }: BrandNameProps) {
  if (highlightVowels) {
    return (
      <span className={`brand-name ${italic ? "italic" : ""}  ${className}`}>
        <span className="underline decoration-2 underline-offset-4">A</span>l
        <span className="underline decoration-2 underline-offset-4">e</span>th
        <span className="underline decoration-2 underline-offset-4">e</span>
        <span className="underline decoration-2 underline-offset-4">i</span>
        <span className="underline decoration-2 underline-offset-4">a</span>
      </span>
    );
  }

  return <span className={`brand-name ${italic ? "italic" : ""} ${className}`}>Aletheia</span>;
}
