type SparkleIconProps = {
  size?: number;
  className?: string;
};

/**
 * AI "sparkle" glyph — a large 4-point star with a small companion.
 * Used on every CTA that opens the Pumpkin chat page.
 */
export default function SparkleIcon({ size = 14, className }: SparkleIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M11 1.5l1.7 5.9a3 3 0 0 0 1.9 1.9l5.9 1.7-5.9 1.7a3 3 0 0 0-1.9 1.9L11 20.5l-1.7-5.9a3 3 0 0 0-1.9-1.9L1.5 11l5.9-1.7a3 3 0 0 0 1.9-1.9z" />
      <path d="M18.5 14.5l.62 2.13a1.4 1.4 0 0 0 .87.87l2.13.62-2.13.62a1.4 1.4 0 0 0-.87.87l-.62 2.13-.62-2.13a1.4 1.4 0 0 0-.87-.87l-2.13-.62 2.13-.62a1.4 1.4 0 0 0 .87-.87z" />
    </svg>
  );
}
