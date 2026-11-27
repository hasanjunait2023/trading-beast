import { PrismaClient, Prisma } from '@prisma/client';
const prisma = new PrismaClient();
export const DAILY_CREDITS = 10;
export const RADAR_COST = 10;
export const CREDIT_EPOCH_DAY = Math.floor(Date.UTC(2026,10,28)/86400000);
export function utcDay(now = new Date()) { return Math.floor(now.getTime()/86400000); }
export function grantDays(createdAt: Date, lastGrantDay: number, day: number) {
  return Math.max(0, day - Math.max(lastGrantDay, utcDay(createdAt)-1, CREDIT_EPOCH_DAY-1));
}
export class InsufficientCredits extends Error {}
export class DuplicateTrigger extends Error {}
async function atomic<T>(fn: (tx: Prisma.TransactionClient)=>Promise<T>): Promise<T> {
  for(let i=0;;i++) {
    try { return await prisma.$transaction(fn,{isolationLevel: Prisma.TransactionIsolationLevel.Serializable}); }
    catch(e) { if(i>=4 || !(e instanceof Prisma.PrismaClientKnownRequestError) || !['P2034','P2002'].includes(e.code)) throw e; }
  }
}
async function accrue(tx: Prisma.TransactionClient,userId: string) {
  const user=await tx.user.findUniqueOrThrow({where:{id:userId},select:{createdAt:true}});
  const day=utcDay();
  let wallet=await tx.creditWallet.upsert({where:{userId},create:{userId,lastGrantDay:Math.max(utcDay(user.createdAt),CREDIT_EPOCH_DAY)-1},update:{}});
  const days=grantDays(user.createdAt,wallet.lastGrantDay,day);
  if(days>0){
    const delta=BigInt(days*DAILY_CREDITS);
    await tx.creditEntry.create({data:{userId,delta,kind:'DAILY_GRANT',reference:'grant:'+day}});
    wallet=await tx.creditWallet.update({where:{userId},data:{balance:{increment:delta},lastGrantDay:day}});
  }
  return wallet;
}
export async function creditBalance(userId:string) {
  return atomic(async tx=>{const w=await accrue(tx,userId);return Number(w.balance);});
}
export async function reserveRadar(userId:string,key:string) {
  return atomic(async tx=>{
    await accrue(tx,userId);
    const reference='radar:'+key;
    if(await tx.creditEntry.findUnique({where:{userId_reference:{userId,reference}}})) throw new DuplicateTrigger('Trigger already submitted');
    const updated=await tx.creditWallet.updateMany({where:{userId,balance:{gte:BigInt(RADAR_COST)}},data:{balance:{decrement:BigInt(RADAR_COST)}}});
    if(updated.count!==1) throw new InsufficientCredits('10 credits required');
    await tx.creditEntry.create({data:{userId,reference,delta:BigInt(-RADAR_COST),kind:'RADAR_DEBIT'}});
  });
}
export async function refundRadar(userId:string,key:string) {
  return atomic(async tx=>{
    const debit=await tx.creditEntry.findUnique({where:{userId_reference:{userId,reference:'radar:'+key}}});
    const reference='refund:'+key;
    if(!debit || await tx.creditEntry.findUnique({where:{userId_reference:{userId,reference}}})) return;
    await tx.creditEntry.create({data:{userId,reference,delta:-debit.delta,kind:'RADAR_REFUND'}});
    await tx.creditWallet.update({where:{userId},data:{balance:{increment:-debit.delta}}});
  });
}
export async function withRadarCredits<T>(userId:string,key:string,run:()=>Promise<T>):Promise<T>{
  await reserveRadar(userId,key);
  try{return await run();}catch(e){await refundRadar(userId,key);throw e;}
}
