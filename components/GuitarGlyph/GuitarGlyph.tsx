type GuitarGlyphProps = {
  size?: number;
};

const DEFAULT_SIZE = 32;

export function GuitarGlyph({ size = DEFAULT_SIZE }: GuitarGlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--pink)"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M14.5 9.5 20 4" />
      <path d="M18.5 2.5l3 3" />
      <path d="M11 9.5c-1.6-1.6-4.6-1.3-6.2.9-1 1.3-.8 3-1.8 4-1.4 1.4-1.4 3.7 0 5.1l1.5 1.5c1.4 1.4 3.7 1.4 5.1 0 1-1 2.7-.8 4-1.8 2.2-1.6 2.5-4.6.9-6.2z" />
      <circle cx="9.5" cy="14.5" r="1.6" />
    </svg>
  );
}
