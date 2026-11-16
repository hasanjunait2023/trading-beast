/**
 * Session Focus Radar - Core Analysis Engine
 * Ported from n8n workflow: Seating time analysis chapter 2 important.json
 * Pure TypeScript module, no n8n dependencies
 */
// ============================================================================
// Configuration Constants
// ============================================================================
const MAJORS = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'NZD', 'CAD', 'CHF'];
const OFF = 21600; // Dhaka UTC+6 offset in seconds
const FLAGS = {
    USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', JPY: '🇯🇵',
    AUD: '🇦🇺', NZD: '🇳🇿', CAD: '🇨🇦', CHF: '🇨🇭'
};
const SESSION_MAP = {
    'Asian': ['JPY', 'AUD', 'NZD'],
    'London': ['EUR', 'GBP', 'CHF'],
    'New York': ['USD', 'CAD', 'EUR', 'GBP']
};
// ============================================================================
// Helper Functions
// ============================================================================
function ema(c, p) {
    if (c.length < p)
        return null;
    const k = 2 / (p + 1);
    let e = c.slice(0, p).reduce((a, b) => a + b, 0) / p;
    for (let i = p; i < c.length; i++)
        e = c[i] * k + e * (1 - k);
    return e;
}
function emaSeries(c, p) {
    const out = new Array(c.length).fill(null);
    if (c.length < p)
        return out;
    const k = 2 / (p + 1);
    let e = c.slice(0, p).reduce((a, b) => a + b, 0) / p;
    out[p - 1] = e;
    for (let i = p; i < c.length; i++) {
        e = c[i] * k + e * (1 - k);
        out[i] = e;
    }
    return out;
}
function rsiSeries(c, p) {
    const out = new Array(c.length).fill(null);
    if (c.length <= p)
        return out;
    let g = 0, l = 0;
    for (let i = 1; i <= p; i++) {
        const d = c[i] - c[i - 1];
        if (d >= 0)
            g += d;
        else
            l -= d;
    }
    g /= p;
    l /= p;
    out[p] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
    for (let i = p + 1; i < c.length; i++) {
        const d = c[i] - c[i - 1];
        g = (g * (p - 1) + (d > 0 ? d : 0)) / p;
        l = (l * (p - 1) + (d < 0 ? -d : 0)) / p;
        out[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
    }
    return out;
}
function swings(arr, lb) {
    const s = Math.max(1, arr.length - lb);
    const hi = [], lo = [];
    for (let i = s; i < arr.length - 1; i++) {
        if (arr[i] > arr[i - 1] && arr[i] > arr[i + 1])
            hi.push(i);
        if (arr[i] < arr[i - 1] && arr[i] < arr[i + 1])
            lo.push(i);
    }
    return { hi, lo };
}
function avg(a) {
    return a.reduce((s, x) => s + x, 0) / a.length;
}
function sgn(x) {
    return x > 0 ? 1 : x < 0 ? -1 : 0;
}
function nz(x, a) {
    return a > 0 && x !== null ? x / a : 0;
}
function r1(x) {
    return Math.round(x * 10) / 10;
}
function trOf(c, i) {
    return Math.max(c[i].h - c[i].l, Math.abs(c[i].h - c[i - 1].c), Math.abs(c[i].l - c[i - 1].c));
}
function atrS(c) {
    const t = [];
    for (let i = c.length - 14; i < c.length; i++)
        t.push(trOf(c, i));
    return avg(t);
}
function parseYahooChart(j) {
    const res = j?.chart?.result?.[0];
    const q = res?.indicators?.quote?.[0];
    if (!res || !res.timestamp || !q)
        return null;
    const out = [];
    for (let i = 0; i < res.timestamp.length; i++) {
        const o = q.open[i], h = q.high[i], l = q.low[i], c = q.close[i];
        if (o == null || h == null || l == null || c == null)
            continue;
        out.push({ ts: res.timestamp[i], o, h, l, c });
    }
    return out.length ? out : null;
}
function bucket(c, sec) {
    const m = new Map();
    for (const x of c) {
        const k = Math.floor((x.ts + OFF) / sec);
        const b = m.get(k);
        if (!b)
            m.set(k, { ts: k * sec - OFF, o: x.o, h: x.h, l: x.l, c: x.c });
        else {
            b.h = Math.max(b.h, x.h);
            b.l = Math.min(b.l, x.l);
            b.c = x.c;
        }
    }
    return Array.from(m.values()).sort((a, b) => a.ts - b.ts);
}
function closedOnly(c, sec, nowSec) {
    const x = c[c.length - 1];
    return (x && nowSec < x.ts + sec) ? c.slice(0, -1) : c;
}
// ============================================================================
// Pair Definitions (from n8n workflow)
// ============================================================================
function buildPairs() {
    const order = ['EUR', 'GBP', 'AUD', 'NZD', 'USD', 'CAD', 'CHF', 'JPY'];
    const out = [];
    for (let i = 0; i < order.length; i++) {
        for (let j = i + 1; j < order.length; j++) {
            const base = order[i], quote = order[j];
            out.push({ kind: 'fx', pair: `${base}/${quote}`, base, quote, yahoo: `${base}${quote}=X`, name: `${base}/${quote}`, icon: '', dec: quote === 'JPY' ? 3 : 5 });
        }
    }
    const assets = [
        { pair: 'Gold', name: 'Gold', icon: '🥇', yahoo: 'XAUUSD=X', dec: 2, group: 'METALS', sessions: ['London', 'New York'], kind: 'asset' },
        { pair: 'Silver', name: 'Silver', icon: '🥈', yahoo: 'XAGUSD=X', dec: 3, group: 'METALS', sessions: ['London', 'New York'], kind: 'asset' },
        { pair: 'Oil', name: 'WTI Oil', icon: '🛢️', yahoo: 'CL=F', dec: 2, group: 'OIL', sessions: ['New York'], kind: 'asset' },
        { pair: 'Bitcoin', name: 'Bitcoin', icon: '₿', yahoo: 'BTC-USD', dec: 1, group: 'BTC', sessions: null, kind: 'asset' }
    ];
    out.push(...assets);
    return out;
}
// ============================================================================
// Session Detection
// ============================================================================
function detectSession(nowSec) {
    const dNow = nowSec + OFF;
    const hour = Math.floor((dNow % 86400) / 3600);
    let session, startHour;
    if (hour >= 18) {
        session = 'New York';
        startHour = 18;
    }
    else if (hour >= 12) {
        session = 'London';
        startHour = 12;
    }
    else if (hour >= 7) {
        session = 'Asian';
        startHour = 7;
    }
    else {
        session = 'New York';
        startHour = 18;
    }
    let startD = dNow - (dNow % 86400) + startHour * 3600;
    if (startD > dNow)
        startD -= 86400;
    const sessionStartTs = startD - OFF;
    const orDone = nowSec >= sessionStartTs + 3600;
    return { session, startHour, sessionStartTs, orDone };
}
// ============================================================================
// Core Analysis - Single Pair
// ============================================================================
function analyzePair(pairConfig, data15m, data1h, cfg, nowSec) {
    const cl15 = data15m.map(x => x.c);
    const cl1 = data1h.map(x => x.c);
    const data4h = bucket(data1h, 14400);
    const cl4 = data4h.map(x => x.c);
    if (cl15.length < 220 || cl1.length < 210 || cl4.length < 205)
        return null;
    const e4 = ema(cl4, 200);
    const e1 = ema(cl1, 200);
    const e50 = ema(cl15, 50);
    const e20 = ema(cl15, 20);
    const p15 = cl15[cl15.length - 1];
    const n = cl15.length;
    const net = cl15[n - 1] - cl15[n - 25];
    let path = 0;
    for (let i = n - 24; i < n; i++)
        path += Math.abs(cl15[i] - cl15[i - 1]);
    const er = path > 0 ? Math.abs(net) / path : 0;
    const trs = [];
    for (let i = data15m.length - 208; i < data15m.length; i++)
        trs.push(trOf(data15m, i));
    const act = avg(trs.slice(0, -8)) > 0 ? avg(trs.slice(-8)) / avg(trs.slice(0, -8)) : 1;
    const atr15 = avg(trs.slice(-14));
    const ts4 = nz(e4 !== null ? cl4[cl4.length - 1] - e4 : null, atrS(data4h));
    const ts1 = nz(e1 !== null ? cl1[cl1.length - 1] - e1 : null, atrS(data1h));
    const ts15 = nz(e50 !== null ? p15 - e50 : null, atr15);
    const cs = cl15.slice(-300);
    const rs = rsiSeries(cs, 14);
    const rsi = rs[rs.length - 1] ?? 50;
    const { hi, lo } = swings(cs, 60);
    let div = null;
    if (lo.length >= 2) {
        const i1 = lo[lo.length - 2], i2 = lo[lo.length - 1];
        if (cs[i2] < cs[i1] && (rs[i2] ?? 0) > (rs[i1] ?? 0))
            div = 'BULLISH';
    }
    if (!div && hi.length >= 2) {
        const i1 = hi[hi.length - 2], i2 = hi[hi.length - 1];
        if (cs[i2] > cs[i1] && (rs[i2] ?? 0) < (rs[i1] ?? 0))
            div = 'BEARISH';
    }
    const day = {};
    for (const x of data15m) {
        const d = Math.floor((x.ts + OFF) / 86400);
        const b = day[d] || (day[d] = { h: -Infinity, l: Infinity, n: 0 });
        b.h = Math.max(b.h, x.h);
        b.l = Math.min(b.l, x.l);
        b.n++;
    }
    const todayKey = Math.floor((nowSec + OFF) / 86400);
    const full = Object.keys(day).map(Number).filter(k => k < todayKey && day[k].n >= 60).sort((a, b) => a - b);
    const pdk = full.length ? full[full.length - 1] : null;
    const pdh = pdk !== null ? day[pdk].h : null;
    const pdl = pdk !== null ? day[pdk].l : null;
    const adrDays = full.slice(-14);
    const adr = adrDays.length ? avg(adrDays.map(k => day[k].h - day[k].l)) : null;
    const t = day[todayKey];
    const adrPct = (adr && t) ? Math.round((t.h - t.l) / adr * 100) : null;
    const orC = data15m.filter(x => x.ts >= cfg.sessionStartTs && x.ts < cfg.sessionStartTs + 3600);
    const orHave = orC.length >= 4;
    const orHigh = orHave ? Math.max(...orC.map(x => x.h)) : null;
    const orLow = orHave ? Math.min(...orC.map(x => x.l)) : null;
    return {
        kind: pairConfig.kind,
        name: pairConfig.name,
        icon: pairConfig.icon,
        dec: pairConfig.dec,
        group: pairConfig.group,
        sessions: pairConfig.sessions,
        pair: pairConfig.pair,
        base: pairConfig.base,
        quote: pairConfig.quote,
        live: data15m[data15m.length - 1].c,
        p15, e20, e50, rsi, er, net, act, atr15, adrPct, pdh, pdl, div, orHave, orHigh, orLow,
        stale: nowSec - data15m[data15m.length - 1].ts > 10800,
        bias: null, cnt: 0, d4: 0, d1: 0, d15: 0, score: 0,
        orConfirmed: false, orLive: false, obstacle: null, roomATR: null,
        cramped: false, stretched: false, divAgainst: false, extended: false,
        win4: sgn(e4 !== null ? cl4[cl4.length - 1] - e4 : 0),
        win1: sgn(e1 !== null ? cl1[cl1.length - 1] - e1 : 0),
        win15: sgn(e50 !== null ? p15 - e50 : 0),
        ts4, ts1, ts15
    };
}
// ============================================================================
// Scoring & Ranking
// ============================================================================
function scorePairs(pairs, cfg, nowSec) {
    const s1 = {}, s4 = {}, s15 = {};
    MAJORS.forEach(c => { s1[c] = 0; s4[c] = 0; s15[c] = 0; });
    for (const p of pairs) {
        if (p.kind === 'asset')
            continue;
        s1[p.base] += p.win1;
        s1[p.quote] -= p.win1;
        s4[p.base] += p.win4;
        s4[p.quote] -= p.win4;
        s15[p.base] += p.win15;
        s15[p.quote] -= p.win15;
    }
    const orReady = cfg.orDone && pairs.some(p => p.orHave);
    const active = SESSION_MAP[cfg.session] || [];
    const closedAssets = [];
    const evald = pairs.filter(p => !cfg.watchlist || cfg.watchlist.includes(p.pair))
        .filter(p => {
        if (p.kind === 'asset' && p.stale) {
            closedAssets.push(p.name);
            return false;
        }
        return true;
    })
        .map((p) => {
        const isA = p.kind === 'asset';
        const d4 = isA ? r1(p.ts4) : s4[p.base] - s4[p.quote];
        const d1 = isA ? r1(p.ts1) : s1[p.base] - s1[p.quote];
        const d15 = isA ? r1(p.ts15) : s15[p.base] - s15[p.quote];
        const scale = isA ? 3 : 7;
        const v = d1 + d15;
        const bias = v > 0 ? 'BUY' : v < 0 ? 'SELL' : null;
        const dir = bias === 'BUY' ? 1 : bias === 'SELL' ? -1 : 0;
        const cnt = dir === 0 ? 0 : [d4, d1, d15].filter(d => sgn(d) === dir).length;
        const A = cnt === 3 ? 20 : cnt === 2 ? 8 : 0;
        const B = dir === 0 ? 0 : Math.min(Math.abs(d1) / scale, 1) * 8 + Math.min(Math.abs(d15) / scale, 1) * 7;
        const erOk = dir !== 0 && sgn(p.net) === dir;
        const emaOk = dir !== 0 && dir * (p.p15 - p.e50) > 0 && dir * (p.e20 - p.e50) > 0;
        const C = (erOk ? Math.min(p.er / 0.5, 1) * 15 : 0) + (emaOk ? 5 : 0);
        const D = (p.act >= 0.9 && p.act <= 1.8) ? 10 : (p.act >= 0.7 && p.act < 0.9) ? 5 : p.act > 1.8 ? 6 : 0;
        let E;
        if (isA)
            E = p.sessions === null ? 3 : p.sessions.includes(cfg.session) ? 5 : 2;
        else {
            const nAct = [p.base, p.quote].filter(c => active.includes(c)).length;
            E = nAct === 2 ? 5 : nAct === 1 ? 3 : 1;
        }
        let F = 7, orConfirmed = false, orLive = false;
        if (orReady && dir !== 0 && p.orHave) {
            orConfirmed = bias === 'BUY' ? p.p15 > (p.orHigh ?? -Infinity) : p.p15 < (p.orLow ?? Infinity);
            orLive = bias === 'BUY' ? p.live > (p.orHigh ?? -Infinity) : p.live < (p.orLow ?? Infinity);
            F = orConfirmed ? 15 : orLive ? 7 : 0;
        }
        else if (orReady) {
            F = 0;
        }
        const adrPts = p.adrPct === null ? 2 : p.adrPct < 60 ? 5 : p.adrPct < 90 ? 3 : p.adrPct < 110 ? 1 : 0;
        let obstacle = null, roomATR = null;
        if (bias === 'BUY' && p.pdh !== null && p.pdh > p.live) {
            obstacle = p.pdh;
            roomATR = (p.pdh - p.live) / p.atr15;
        }
        if (bias === 'SELL' && p.pdl !== null && p.pdl < p.live) {
            obstacle = p.pdl;
            roomATR = (p.live - p.pdl) / p.atr15;
        }
        const roomPts = roomATR === null ? 10 : roomATR >= 3 ? 10 : roomATR >= 2 ? 6 : roomATR >= 1.5 ? 3 : 0;
        const cramped = roomATR !== null && roomATR < 1.5;
        const G = adrPts + roomPts;
        const stretched = (bias === 'BUY' && p.rsi >= 75) || (bias === 'SELL' && p.rsi <= 25);
        const divAgainst = !!(p.div && ((bias === 'BUY' && p.div === 'BEARISH') || (bias === 'SELL' && p.div === 'BULLISH')));
        const extended = dir !== 0 && dir * (p.live - p.e50) / p.atr15 > 3.5;
        const pen = (stretched ? 8 : 0) + (divAgainst ? 7 : 0) + (extended ? 6 : 0);
        const score = Math.max(0, Math.min(100, Math.round(A + B + C + D + E + F + G - pen)));
        return { ...p, d4, d1, d15, bias, cnt, score, orConfirmed, orLive, obstacle, roomATR, cramped, stretched, divAgainst, extended };
    });
    const isFocus = (r) => r.bias !== null && r.cnt === 3 && r.score >= 65 && !r.cramped && (orReady ? r.orConfirmed : true);
    const keysOf = (r) => r.kind === 'asset' ? [r.group] : [r.base, r.quote];
    function pickDiverse(list, n) {
        const chosen = [];
        const used = new Set();
        for (const c of list) {
            if (chosen.length >= n)
                break;
            const k = keysOf(c);
            if (!k.some(x => used.has(x))) {
                chosen.push(c);
                k.forEach(x => used.add(x));
            }
        }
        for (const c of list) {
            if (chosen.length >= n)
                break;
            if (!chosen.includes(c))
                chosen.push(c);
        }
        return chosen;
    }
    const focus = pickDiverse(evald.filter(isFocus).sort((a, b) => b.score - a.score), 3).sort((a, b) => b.score - a.score);
    const watch = evald.filter((r) => !focus.includes(r) && r.bias !== null && r.cnt >= 2 && r.score >= 55).sort((a, b) => b.score - a.score).slice(0, 2);
    const avoid = evald.filter((r) => !focus.includes(r) && !watch.includes(r)).sort((a, b) => a.score - b.score).slice(0, 3);
    return { focus, watch, avoid };
}
// ============================================================================
// Public API
// ============================================================================
export async function runAnalysis(yahooData, cfg, nowSec = Math.floor(Date.now() / 1000)) {
    const pairs = buildPairs();
    const analyzed = [];
    const skipped = [];
    let lastTs = 0;
    for (const p of pairs) {
        const yahoo = yahooData.get(p.yahoo);
        if (!yahoo) {
            skipped.push(p.pair);
            continue;
        }
        const data15m = parseYahooChart(yahoo.data15m);
        const data1h = parseYahooChart(yahoo.data1h);
        if (!data15m || !data1h || !data15m.length || !data1h.length) {
            skipped.push(p.pair);
            continue;
        }
        const res = analyzePair(p, data15m, data1h, cfg, nowSec);
        if (res) {
            analyzed.push(res);
            if (p.kind !== 'asset')
                lastTs = Math.max(lastTs, data15m[data15m.length - 1].ts);
        }
        else {
            skipped.push(p.pair);
        }
    }
    const { focus, watch, avoid } = scorePairs(analyzed, cfg, nowSec);
    const time = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit' });
    const scope = cfg.watchlist ? `${cfg.watchlist.length} item watchlist` : 'all pairs';
    const hasAsset = analyzed.some(r => r.kind === 'asset');
    const marketClosed = nowSec - lastTs > 10800;
    const closedAssets = analyzed.filter(r => r.kind === 'asset' && r.stale).map(r => r.name);
    const warnings = [];
    if (marketClosed)
        warnings.push('Forex market closed — using last available data');
    if (closedAssets.length)
        warnings.push(`Closed: ${closedAssets.join(', ')} (market closed)`);
    if (!cfg.orDone)
        warnings.push(cfg.orDone ? 'Opening range data unavailable — trend only' : `Opening range in progress (${(cfg.startHour + 1) % 24}:00 end) — trend only`);
    if (skipped.length)
        warnings.push(`${skipped.length} pairs missing data — strength calc incomplete`);
    return {
        session: cfg.session,
        timestamp: time,
        scope,
        focus,
        watch,
        avoid,
        warnings,
        marketClosed,
        closedAssets,
        skippedCount: skipped.length,
        orReady: cfg.orDone && analyzed.some(p => p.orHave)
    };
}
export { buildPairs, detectSession };
//# sourceMappingURL=analysis-engine.js.map