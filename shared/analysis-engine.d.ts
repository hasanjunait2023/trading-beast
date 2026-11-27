/**
 * Session Focus Radar - Core Analysis Engine
 * Ported from n8n workflow: Seating time analysis chapter 2 important.json
 * Pure TypeScript module, no n8n dependencies
 */
export interface PairConfig {
    kind: 'fx' | 'asset';
    pair: string;
    base?: string;
    quote?: string;
    name: string;
    icon: string;
    yahoo: string;
    dec: number;
    group?: string;
    sessions?: string[] | null;
}
export interface MarketData {
    timestamps: number[];
    open: number[];
    high: number[];
    low: number[];
    close: number[];
}
export interface AnalyzedPair {
    kind: 'fx' | 'asset';
    name: string;
    icon: string;
    dec: number;
    group?: string;
    sessions?: string[] | null;
    pair: string;
    base?: string;
    quote?: string;
    live: number;
    p15: number;
    e20: number;
    e50: number;
    rsi: number;
    er: number;
    net: number;
    act: number;
    atr15: number;
    adrPct: number | null;
    pdh: number | null;
    pdl: number | null;
    div: 'BULLISH' | 'BEARISH' | null;
    orHave: boolean;
    orHigh: number | null;
    orLow: number | null;
    stale: boolean;
    bias: 'BUY' | 'SELL' | null;
    cnt: number;
    d4: number;
    d1: number;
    d15: number;
    score: number;
    orConfirmed: boolean;
    orLive: boolean;
    obstacle: number | null;
    roomATR: number | null;
    cramped: boolean;
    stretched: boolean;
    divAgainst: boolean;
    extended: boolean;
    win4: number;
    win1: number;
    win15: number;
    ts4: number;
    ts1: number;
    ts15: number;
}
export interface PartialAnalyzedPair extends Partial<AnalyzedPair> {
    kind: 'fx' | 'asset';
    name: string;
    icon: string;
    dec: number;
    group?: string;
    sessions?: string[] | null;
    pair: string;
    base?: string;
    quote?: string;
    live: number;
    p15: number;
    e20: number;
    e50: number;
    rsi: number;
    er: number;
    net: number;
    act: number;
    atr15: number;
    adrPct: number | null;
    pdh: number | null;
    pdl: number | null;
    div: 'BULLISH' | 'BEARISH' | null;
    orHave: boolean;
    orHigh: number | null;
    orLow: number | null;
    stale: boolean;
    bias: 'BUY' | 'SELL' | null;
}
export interface SessionConfig {
    session: 'Asian' | 'London' | 'New York';
    startHour: number;
    sessionStartTs: number;
    orDone: boolean;
    watchlist?: string[] | null;
}
export interface FocusResult {
    session: string;
    timestamp: string;
    scope: string;
    focus: AnalyzedPair[];
    watch: AnalyzedPair[];
    avoid: AnalyzedPair[];
    warnings: string[];
    marketClosed: boolean;
    closedAssets: string[];
    skippedCount: number;
    orReady: boolean;
}
declare function buildPairs(): PairConfig[];
declare function detectSession(nowSec: number): SessionConfig;
export declare function runAnalysis(yahooData: Map<string, {
    data15m: any;
    data1h: any;
}>, cfg: SessionConfig, nowSec?: number): Promise<FocusResult>;
export { buildPairs, detectSession };
//# sourceMappingURL=analysis-engine.d.ts.map