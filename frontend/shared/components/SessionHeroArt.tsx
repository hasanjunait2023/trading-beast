/**
 * Session hero artwork (R0, reference 03): a dotted world map in the upper
 * area plus a city skyline silhouette along the bottom — London (Big Ben /
 * Parliament), New York (Manhattan) and Asian (Tokyo Tower / pagoda)
 * variants. Pure inline SVG, decorative only (aria-hidden), clipped by the
 * hero's radius. No numbers, prices or fake data — this is artwork, not a
 * chart.
 */

export type SessionArtVariant = 'london' | 'new-york' | 'asian' | 'generic';

/** Coarse dotted world map: rows of a 56-col grid, '#' = land dot. */
const MAP_ROWS = [
  '                                                        ',
  '    ######  ##           ##################             ',
  '  ############         ######################   ##      ',
  ' ##############        ##########################       ',
  '  ############   #      ###################### ##       ',
  '   ##########           ####################            ',
  '    ########             ################  ##           ',
  '     ######               #############    ####         ',
  '      ####                 ##########      ######  ##   ',
  '      ###                   ########        ########    ',
  '       ##                    ######          ######     ',
  '       ##                     ####            ####      ',
  '       #                      ###             ##        ',
  '                              ##                        ',
  '                              #                         ',
];

function DottedWorldMap() {
  const dots: React.ReactNode[] = [];
  MAP_ROWS.forEach((row, r) => {
    [...row].forEach((ch, c) => {
      if (ch === '#') {
        dots.push(<circle key={`${r}-${c}`} cx={196 + c * 5} cy={6 + r * 5} r={1.6} />);
      }
    });
  });
  return <g fill="#ffffff" opacity="0.16">{dots}</g>;
}

function LondonSkyline() {
  return (
    <g>
      <path
        fill="var(--color-hero-silhouette)"
        d="M250 200v-38h10v-8h8v8h10v38z M286 200v-30h6l4-10 4 10h6v30z M312 200v-24h34v24z M318 176v-6h6v6z M332 176v-6h6v6z M352 200v-44h8v-10h6v10h8v44z M382 200V96h4V78l5-12 5 12v18h4v104z M378 96h28v10h-28z M404 200v-34h10v-8h8v8h10v34z M438 200v-22h40v22z"
      />
      {/* Big Ben clock face */}
      <circle cx="392" cy="118" r="7.5" fill="#d9f5e6" opacity="0.9" />
      <path d="M392 118v-5M392 118l3.5 2" stroke="#043d2d" strokeWidth="1.6" strokeLinecap="round" />
    </g>
  );
}

function NewYorkSkyline() {
  return (
    <g fill="var(--color-hero-silhouette)">
      <path d="M246 200V140h22v60z M274 200v-84h6V96l7-14 7 14v20h6v84z M306 200v-52h24v52z M336 200V120h8V104h6v16h8v80z M364 200v-96h4V84l6-16 6 16v20h4v96z M390 200v-44h26v44z M422 200v-64h20v64z M448 200v-30h32v30z" />
      <g fill="#d9f5e6" opacity="0.55">
        <rect x="252" y="150" width="4" height="6" />
        <rect x="252" y="164" width="4" height="6" />
        <rect x="312" y="158" width="4" height="6" />
        <rect x="342" y="132" width="4" height="6" />
        <rect x="398" y="166" width="4" height="6" />
        <rect x="428" y="146" width="4" height="6" />
      </g>
    </g>
  );
}

function AsianSkyline() {
  return (
    <g fill="var(--color-hero-silhouette)">
      {/* Mt. Fuji backdrop */}
      <path d="M238 200 330 128l18 14 14-14 92 72z" opacity="0.5" />
      {/* Tokyo Tower (simplified lattice) */}
      <path d="M282 200l14-78h6l14 78h-9l-8-58-8 58z M290 168h18M293 148h12M296 130h6" />
      {/* Pagoda */}
      <path d="M352 200v-40h20v40z M344 162l18-10 18 10z M348 140l14-9 14 9z M358 122l4-8 4 8z" />
      {/* Skyscrapers */}
      <path d="M392 200v-56h22v56z M420 200v-38h18v38z M444 200v-48h24v48z M316 200v-30h16v30z" />
      <g fill="#d9f5e6" opacity="0.55">
        <rect x="398" y="154" width="4" height="6" />
        <rect x="398" y="168" width="4" height="6" />
        <rect x="450" y="162" width="4" height="6" />
      </g>
    </g>
  );
}

export interface SessionHeroArtProps {
  variant: SessionArtVariant;
  className?: string;
}

/** Absolutely-positioned artwork layer for SessionHero (parent must be
 *  relative + overflow-hidden). */
export function SessionHeroArt({ variant, className = '' }: SessionHeroArtProps) {
  return (
    <svg
      viewBox="0 0 480 200"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    >
      <DottedWorldMap />
      {variant === 'london' && <LondonSkyline />}
      {variant === 'new-york' && <NewYorkSkyline />}
      {variant === 'asian' && <AsianSkyline />}
    </svg>
  );
}

/** Map a session name to its artwork variant. */
export function sessionArtVariant(session: string): SessionArtVariant {
  if (session === 'London') return 'london';
  if (session === 'New York') return 'new-york';
  if (session === 'Asian') return 'asian';
  return 'generic';
}
