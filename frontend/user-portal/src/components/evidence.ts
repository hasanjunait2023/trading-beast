import type { RadarPairView } from '@shared/radar/adapter';
import type { EvidenceItem } from '@shared/components/ScoreEvidence';

/**
 * Evidence rows for a stored Radar pair — ONLY fields the payload actually
 * carries (handoff §4: no invented breakdown point values). Shared by the
 * Markets and Pair Detail screens; mirrors the Mini App's list (Z1).
 */

function dirWord(v: number | null): 'Bullish' | 'Bearish' | 'Neutral' | null {
  if (v === null) return null;
  return v > 0 ? 'Bullish' : v < 0 ? 'Bearish' : 'Neutral';
}

function dirSign(v: number | null): number {
  return v === null ? 0 : Math.sign(v);
}

/**
 * Narrative evidence rows for the reference Score Evidence panel, mapped
 * factually from payload fields only (same mapping as the Mini App's Pair
 * Detail — no invented structure/momentum claims, no breakdown points).
 */
export function narrativeEvidence(p: RadarPairView): EvidenceItem[] {
  const items: EvidenceItem[] = [];
  const biasSign = p.bias === 'bullish' ? 1 : p.bias === 'bearish' ? -1 : 0;

  const trend = dirWord(p.d4);
  if (trend) items.push({ label: 'Trend', value: `${trend} (4H direction)` });

  if (p.orConfirmed) {
    items.push({
      label: 'Structure',
      value:
        p.bias === 'bearish'
          ? 'Break below OR confirmed'
          : p.bias === 'bullish'
            ? 'Break above OR confirmed'
            : 'OR break confirmed',
    });
  } else if (p.orLive) {
    items.push({ label: 'Structure', value: 'Price beyond OR — not confirmed', tone: 'neutral' });
  } else if (p.orHave) {
    items.push({ label: 'Structure', value: 'No OR break yet', tone: 'neutral' });
  }

  const momentum = dirWord(p.d15);
  if (momentum) {
    const conflicts = biasSign !== 0 && dirSign(p.d15) !== 0 && dirSign(p.d15) !== biasSign;
    items.push({
      label: 'Momentum',
      value: `${momentum} (15m)${p.rsi !== null ? ` · RSI ${p.rsi.toFixed(0)}` : ''}`,
      tone: conflicts ? 'warning' : 'positive',
    });
  }

  if (p.d1 !== null) {
    if (biasSign === 0) {
      items.push({ label: 'Context', value: 'No directional bias for the 1H to align with', tone: 'neutral' });
    } else if (dirSign(p.d1) === biasSign) {
      items.push({ label: 'Context', value: '1H direction aligns with bias' });
    } else if (dirSign(p.d1) === 0) {
      items.push({ label: 'Context', value: 'No clear 1H direction', tone: 'neutral' });
    } else {
      items.push({ label: 'Context', value: '1H direction conflicts with bias', tone: 'warning' });
    }
  }

  if (p.divAgainst) {
    items.push({ label: 'Divergence', value: 'RSI divergence against the bias', tone: 'warning' });
  } else if (p.div) {
    items.push({
      label: 'Divergence',
      value: `RSI divergence: ${p.div === 'BULLISH' ? 'Bullish' : 'Bearish'}`,
      tone: 'neutral',
    });
  }
  if (p.extended) items.push({ label: 'Extension', value: 'Move is extended versus the 50 EMA', tone: 'warning' });
  if (p.cramped) items.push({ label: 'Range', value: 'Price is cramped against the obstacle', tone: 'warning' });
  if (p.stretched) items.push({ label: 'Range', value: 'Price is stretched', tone: 'warning' });

  return items.slice(0, 6);
}
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
