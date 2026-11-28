import type { SVGProps } from 'react';

/**
 * Shared inline SVG icon set (R0). Stroke icons on a 24×24 grid using
 * currentColor, so they inherit the semantic token colors of their context.
 * Shared components must not depend on an app-level icon package (the
 * Portal does not declare lucide-react), hence this repo-native set.
 */

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 24, ...props }: IconProps, children: React.ReactNode) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function HomeIcon(props: IconProps) {
  return base(props, <path d="M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5" />);
}

export function MarketsIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-8" />
      <path d="M22 20H2" />
    </>,
  );
}

export function PlanIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 13 9 5 9-5" />
    </>,
  );
}

export function JournalIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14Z" />
      <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
    </>,
  );
}

export function MoreIcon(props: IconProps) {
  return (
    <svg width={props.size ?? 24} height={props.size ?? 24} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

export function RefreshIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </>,
  );
}

export function ArrowRightIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </>,
  );
}

export function ChevronRightIcon(props: IconProps) {
  return base(props, <path d="m9 6 6 6-6 6" />);
}

export function CalendarIcon(props: IconProps) {
  return base(
    props,
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>,
  );
}

export function CalendarCheckIcon(props: IconProps) {
  return base(
    props,
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      <path d="m9 16 2 2 4-4" />
    </>,
  );
}

export function CrosshairIcon(props: IconProps) {
  return base(
    props,
    <>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </>,
  );
}

export function SearchIcon(props: IconProps) {
  return base(
    props,
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.8-3.8" />
    </>,
  );
}

export function CheckIcon(props: IconProps) {
  return base(props, <path d="m4 12.5 5 5L20 6.5" />);
}

export function ClockIcon(props: IconProps) {
  return base(
    props,
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>,
  );
}

export function MapPinIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M12 21s-7-5.6-7-11a7 7 0 0 1 14 0c0 5.4-7 11-7 11Z" />
      <circle cx="12" cy="10" r="2.6" />
    </>,
  );
}

export function CoinsIcon(props: IconProps) {
  return base(
    props,
    <>
      <ellipse cx="9" cy="6" rx="6" ry="3" />
      <path d="M3 6v6c0 1.7 2.7 3 6 3s6-1.3 6-3V6" />
      <path d="M3 12v6c0 1.7 2.7 3 6 3 1 0 2-.1 2.8-.4M15.5 12.6c2.9.3 5 1.5 5 2.9v3c0 1.7-2.7 3-6 3" />
    </>,
  );
}

export function BookmarkIcon(props: IconProps) {
  return base(props, <path d="M6 3h12v18l-6-4.5L6 21z" />);
}

export function TrendingUpIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="m3 16 6-6 4 4 8-8" />
      <path d="M15 6h6v6" />
    </>,
  );
}

export function ArrowUpDownIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="m7 4-3 3 3 3" />
      <path d="M4 7h13" />
      <path d="m17 20 3-3-3-3" />
      <path d="M20 17H7" />
    </>,
  );
}
