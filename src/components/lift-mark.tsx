export function LiftMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <rect x="2" y="18" width="20" height="8" rx="1" stroke="currentColor" strokeWidth="2" />
      <path d="M6 18V14h8l4 4" stroke="currentColor" strokeWidth="2" />
      <circle cx="8" cy="26" r="2.2" fill="currentColor" />
      <circle cx="18" cy="26" r="2.2" fill="currentColor" />
      <path d="M24 20V8M20 12l4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
    </svg>
  );
}
