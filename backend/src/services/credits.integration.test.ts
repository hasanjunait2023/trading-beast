import { randomUUID } from 'node:crypto';
import { describe, it, expect, afterEach, afterAll } from 'vitest';
import { prisma } from './db.js';
import { registerUser } from './users.js';
import { creditBalance, withRadarCredits, reserveRadar, recoverExpiredRadarRuns, utcDay, CREDIT_EPOCH_DAY, InsufficientCredits } from './credits.js';

const enabled=process.env.RUN_DB_INTEGRATION==='1';
const ids:string[]=[];
describe.skipIf(!enabled)('PostgreSQL credit invariants',()=>{
  afterEach(async()=>{ await prisma.user.deleteMany({where:{telegramId:{in:ids.splice(0)}}}); });
  afterAll(async()=>{ await prisma.$disconnect(); });
  async function create(){
    const telegramId='test-'+randomUUID();ids.push(telegramId);
    const user=await registerUser({telegramId});
    await prisma.$transaction(async tx=>{
      await tx.creditEntry.deleteMany({where:{userId:user.id}});
      await tx.creditEntry.create({data:{userId:user.id,delta:10n,kind:'TEST',reference:'seed'}});
      await tx.creditWallet.update({where:{userId:user.id},data:{balance:10n,lastGrantDay:Math.max(utcDay(),CREDIT_EPOCH_DAY-1)}});
    });
    return user;
  }
  it('registers concurrent bot and app requests as one account and wallet',async()=>{
    const telegramId='test-'+randomUUID();ids.push(telegramId);
    const users=await Promise.all([registerUser({telegramId}),registerUser({telegramId})]);
    expect(users[0].id).toBe(users[1].id);
    expect(await prisma.creditWallet.count({where:{userId:users[0].id}})).toBe(1);
    expect(await creditBalance(users[0].id)).toBe(utcDay()>=CREDIT_EPOCH_DAY?10:0);
  });
  it('allows only one concurrent spend when balance is 10',async()=>{
    const u=await create();
    const results=await Promise.allSettled([withRadarCredits(u.id,'a',async()=>({ok:true})),withRadarCredits(u.id,'b',async()=>({ok:true}))]);
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    const failed=results.find(r=>r.status==='rejected');
    expect(failed && failed.reason).toBeInstanceOf(InsufficientCredits);
    expect(await creditBalance(u.id)).toBe(0);
  });
  it('replays completed result without a second debit and rejects conflicting input',async()=>{
    const u=await create();
    expect(await withRadarCredits(u.id,'a',async()=>({value:1}),'same')).toEqual({value:1});
    expect(await withRadarCredits(u.id,'a',async()=>({value:2}),'same')).toEqual({value:1});
    await expect(withRadarCredits(u.id,'a',async()=>({value:3}),'different')).rejects.toThrow();
    expect(await creditBalance(u.id)).toBe(0);
  });
  it('refunds failed and expired runs only once',async()=>{
    const u=await create();
    await expect(withRadarCredits(u.id,'failed',async()=>{throw new Error('fixture');})).rejects.toThrow('fixture');
    expect(await creditBalance(u.id)).toBe(10);
    await reserveRadar(u.id,'expired');
    await prisma.radarRun.update({where:{userId_requestKey:{userId:u.id,requestKey:'expired'}},data:{expiresAt:new Date(0)}});
    await Promise.all([recoverExpiredRadarRuns(),recoverExpiredRadarRuns()]);
    expect(await creditBalance(u.id)).toBe(10);
    expect(await prisma.creditEntry.count({where:{userId:u.id,reference:'refund:expired'}})).toBe(1);
    const sum=await prisma.creditEntry.aggregate({where:{userId:u.id},_sum:{delta:true}});
    expect(sum._sum.delta).toBe(10n);
  });
});
