/**
 * Decorative radar illustration for the Page Not Found study (27):
 * concentric mint rings, crosshair lines, a sweep wedge and blips.
 * Purely decorative artwork — it carries no data.
 */
export function RadarArt({ size = 240, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 240 240"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <radialGradient id="tb-radar-fill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#eafaf1" />
          <stop offset="100%" stopColor="#d9f3e4" />
        </radialGradient>
        <linearGradient id="tb-radar-sweep" x1="120" y1="120" x2="205" y2="35" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00a870" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#00a870" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <circle cx="120" cy="120" r="104" fill="url(#tb-radar-fill)" />
      <circle cx="120" cy="120" r="104" stroke="#bfe8d2" strokeWidth="2" />
      <circle cx="120" cy="120" r="76" stroke="#bfe8d2" strokeWidth="1.5" />
      <circle cx="120" cy="120" r="48" stroke="#bfe8d2" strokeWidth="1.5" />
      <path d="M120 16v208M16 120h208" stroke="#bfe8d2" strokeWidth="1.5" />
      <path d="M120 120 205 35A104 104 0 0 1 218 78Z" fill="url(#tb-radar-sweep)" />
      <path d="M120 120 205 35" stroke="#00a870" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="82" cy="82" r="6" fill="#0aa96f" />
      <circle cx="176" cy="152" r="6" fill="#0aa96f" />
      <circle cx="88" cy="168" r="6" fill="#0aa96f" />
      <circle cx="120" cy="120" r="11" fill="#ffffff" />
      <circle cx="120" cy="120" r="7" fill="#00a870" />
    </svg>
  );
}
