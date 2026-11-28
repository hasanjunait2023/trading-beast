import type { RadarPairView } from '@shared/radar/adapter';
import type { EvidenceItem } from '@shared/components/ScoreEvidence';

/**
 * Evidence rows for a stored Radar pair — ONLY fields the payload actually
 * carries (handoff §4: no invented breakdown point values). Shared by the
 * Markets and Pair Detail screens; mirrors the Mini App's list (Z1).
 */
export function evidenceFor(p: RadarPairView): EvidenceItem[] {
  const items: EvidenceItem[] = [];
  const num = (v: number, dec = p.dec) => v.toFixed(dec);
  if (p.orHave && p.orHigh !== null) items.push({ label: 'Opening range high', value: num(p.orHigh) });
  if (p.orHave && p.orLow !== null) items.push({ label: 'Opening range low', value: num(p.orLow) });
  if (p.orHave) items.push({ label: 'OR breakout confirmed', value: p.orConfirmed ? 'Yes' : 'No' });
  if (p.orHave) items.push({ label: 'OR live', value: p.orLive ? 'Yes' : 'No' });
  if (p.adrPct !== null) items.push({ label: 'ADR %', value: `${p.adrPct}` });
  if (p.rsi !== null) items.push({ label: 'RSI', value: p.rsi.toFixed(1) });
  if (p.atr15 !== null) items.push({ label: 'ATR (15m)', value: num(p.atr15, 5) });
  if (p.d4 !== null) items.push({ label: '4H directional evidence', value: `${p.d4}` });
  if (p.d1 !== null) items.push({ label: '1H directional evidence', value: `${p.d1}` });
  if (p.d15 !== null) items.push({ label: '15m directional evidence', value: `${p.d15}` });
  if (p.div) items.push({ label: 'RSI divergence', value: p.div === 'BULLISH' ? 'Bullish' : 'Bearish' });
  if (p.obstacle !== null) items.push({ label: 'Obstacle', value: num(p.obstacle) });
  if (p.roomATR !== null) items.push({ label: 'Room (ATR)', value: `${p.roomATR}` });
  if (p.cramped) items.push({ label: 'Cramped', value: 'Yes' });
  if (p.stretched) items.push({ label: 'Stretched', value: 'Yes' });
  if (p.divAgainst) items.push({ label: 'Divergence against bias', value: 'Yes' });
  if (p.extended) items.push({ label: 'Extended', value: 'Yes' });
  return items;
}
