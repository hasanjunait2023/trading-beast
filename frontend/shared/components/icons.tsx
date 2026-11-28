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

export function BookmarkIcon({ filled, ...props }: IconProps & { filled?: boolean }) {
  return base(
    filled ? { ...props, fill: 'currentColor' } : props,
    <path d="M6 3h12v18l-6-4.5L6 21z" />,
  );
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

export function BellIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
      <path d="M10.3 21a2 2 0 0 0 3.4 0" />
    </>,
  );
}

export function GearIcon(props: IconProps) {
  return base(
    props,
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M18.5 5.5l-2.1 2.1M7.6 16.4l-2.1 2.1" />
    </>,
  );
}

export function UsersIcon(props: IconProps) {
  return base(
    props,
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5" />
      <path d="M16 5.2a3.5 3.5 0 0 1 0 5.9M18.6 15.6c1.6.8 2.6 2.2 3 4.4" />
    </>,
  );
}

export function HelpCircleIcon(props: IconProps) {
  return base(
    props,
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.3A2.6 2.6 0 0 1 12 7.5c1.4 0 2.5 1 2.5 2.3 0 1.7-2.4 2-2.4 3.7" />
      <circle cx="12" cy="17.2" r="0.6" fill="currentColor" />
    </>,
  );
}

export function SlidersIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2.2" />
      <circle cx="9" cy="17" r="2.2" />
    </>,
  );
}

export function ListIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <circle cx="4.5" cy="6" r="1" fill="currentColor" />
      <circle cx="4.5" cy="12" r="1" fill="currentColor" />
      <circle cx="4.5" cy="18" r="1" fill="currentColor" />
    </>,
  );
}

export function CardIcon(props: IconProps) {
  return base(
    props,
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M3 10h18" />
    </>,
  );
}

export function GiftIcon(props: IconProps) {
  return base(
    props,
    <>
      <rect x="4" y="10" width="16" height="4" />
      <path d="M6 14v6h12v-6M12 10v10" />
      <path d="M12 10a2.4 2.4 0 1 1 2.4-2.4c0 1.5-2.4 2.4-2.4 2.4Zm0 0a2.4 2.4 0 1 0-2.4-2.4C9.6 9.1 12 10 12 10Z" />
    </>,
  );
}

export function WalletIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M3 7a2.5 2.5 0 0 1 2.5-2.5H18a1 1 0 0 1 1 1V8" />
      <path d="M3 7v10A2.5 2.5 0 0 0 5.5 19.5h13A2.5 2.5 0 0 0 21 17v-6a2.5 2.5 0 0 0-2.5-2.5H5A2 2 0 0 1 3 6.5Z" />
      <circle cx="16.8" cy="14" r="1.1" fill="currentColor" />
    </>,
  );
}

export function ShieldCheckIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M12 3 5 5.8v5.4c0 4.3 2.9 7.4 7 9 4.1-1.6 7-4.7 7-9V5.8Z" />
      <path d="m9 11.6 2.2 2.2 4-4.2" />
    </>,
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return base(props, <path d="m15 6-6 6 6 6" />);
}

export function SendIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M21 3 10.2 13.8" />
      <path d="M21 3 14.5 21l-4.3-7.2L3 9.5 21 3Z" />
    </>,
  );
}

export function ExternalIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4 11 13" />
      <path d="M20 14v5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19V6a1.5 1.5 0 0 1 1.5-1.5H10" />
    </>,
  );
}

export function LockIcon(props: IconProps) {
  return base(
    props,
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>,
  );
}

export function SunriseIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M12 3v3" />
      <path d="m5.6 6.6 1.8 1.8M18.4 6.6l-1.8 1.8" />
      <path d="M7 17a5 5 0 0 1 10 0" />
      <path d="M3 17h18M5 21h14" />
    </>,
  );
}

/** Big Ben / clock-tower (London session marker, reference 06). */
export function TowerClockIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M12 2.5 14 6H10Z" />
      <path d="M9.5 6h5V21h-5z" />
      <circle cx="12" cy="11" r="2.1" />
      <path d="M12 9.8V11l.9.7" />
      <path d="M4 21h16" />
    </>,
  );
}

/** Statue of Liberty (New York session marker, reference 06) — simplified. */
export function LibertyIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M12 2v2M8.5 3.2l1 1.7M15.5 3.2l-1 1.7" />
      <circle cx="12" cy="6" r="1.6" />
      <path d="M12 7.5 9.8 21h4.4L12 7.5Z" />
      <path d="M13.8 9.5 17 6.8M17 6.8l.4 2.4M17 6.8l-2.2-.4" />
      <path d="M7 21h10" />
    </>,
  );
}

export function CandlesIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M7 4v2M7 14v2M17 3v3M17 16v3" />
      <rect x="5" y="6" width="4" height="8" rx="1" />
      <rect x="15" y="6" width="4" height="10" rx="1" />
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

/* ---- R3b additions (studies 13/14/15/16/17/23/24/25/26) ---- */

export function MoonIcon(props: IconProps) {
  return base(props, <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />);
}

export function CrownIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="m3 8 4.5 4L12 5l4.5 7L21 8l-1.6 10H4.6L3 8Z" />
      <path d="M5 21h14" />
    </>,
  );
}

export function LeafIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M5 19C5 9 13 4 20 4c0 8-4 15-13 15" />
      <path d="M5 19c3-5 7-8 11-10" />
    </>,
  );
}

export function MedalIcon(props: IconProps) {
  return base(
    props,
    <>
      <circle cx="12" cy="14" r="5" />
      <path d="m8.5 9.5-2-6h4L12 7l1.5-3.5h4l-2 6" />
    </>,
  );
}

export function GlobeIcon(props: IconProps) {
  return base(
    props,
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </>,
  );
}

export function CopyIcon(props: IconProps) {
  return base(
    props,
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>,
  );
}

export function PlusIcon(props: IconProps) {
  return base(props, <path d="M12 5v14M5 12h14" />);
}

export function PencilIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </>,
  );
}

export function HeadsetIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M4 13a8 8 0 0 1 16 0" />
      <rect x="2.5" y="13" width="4" height="6" rx="2" />
      <rect x="17.5" y="13" width="4" height="6" rx="2" />
      <path d="M19.5 19a3 3 0 0 1-3 3h-3" />
    </>,
  );
}

export function DownloadIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M12 3v12" />
      <path d="m7 11 5 5 5-5" />
      <path d="M4 21h16" />
    </>,
  );
}

export function BankIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="m3 9 9-6 9 6" />
      <path d="M4 9v10M20 9v10M8 12v5M12 12v5M16 12v5" />
      <path d="M2.5 19h19" />
    </>,
  );
}

export function HashIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M9 3 7 21M17 3l-2 18" />
      <path d="M4 8h17M3 16h17" />
    </>,
  );
}

export function LogoutIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </>,
  );
}

export function GripIcon(props: IconProps) {
  return base(
    props,
    <>
      <circle cx="9" cy="6" r="1" fill="currentColor" />
      <circle cx="15" cy="6" r="1" fill="currentColor" />
      <circle cx="9" cy="12" r="1" fill="currentColor" />
      <circle cx="15" cy="12" r="1" fill="currentColor" />
      <circle cx="9" cy="18" r="1" fill="currentColor" />
      <circle cx="15" cy="18" r="1" fill="currentColor" />
    </>,
  );
}
