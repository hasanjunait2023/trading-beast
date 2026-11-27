import { prisma } from './db.js';
export async function reconcileCredits(limit=100) {
  const rows=await prisma.$queryRaw<{userId:string;balance:bigint|null;ledger:bigint;difference:bigint}[]>`
    WITH ledger AS (SELECT "userId", SUM(delta)::bigint AS total FROM "CreditEntry" GROUP BY "userId")
    SELECT COALESCE(w."userId",l."userId") AS "userId", w.balance,
      COALESCE(l.total,0)::bigint AS ledger,
      (COALESCE(w.balance,0)-COALESCE(l.total,0))::bigint AS difference
    FROM "CreditWallet" w FULL JOIN ledger l ON w."userId"=l."userId"
    WHERE w."userId" IS NULL OR w.balance<>COALESCE(l.total,0)
    ORDER BY COALESCE(w."userId",l."userId") LIMIT ${limit+1}
  `;
  return {consistent:rows.length===0,truncated:rows.length>limit,discrepancies:rows.slice(0,limit).map(r=>({userId:r.userId,balance:r.balance?.toString()??null,ledger:r.ledger.toString(),difference:r.difference.toString()}))};
}
