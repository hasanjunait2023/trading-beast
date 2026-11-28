import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from './db.js';
import { DAILY_CREDITS, WELCOME_CREDITS, CREDIT_EPOCH_DAY, utcDay } from './credits.js';
export interface Identity { telegramId:string; username?:string; firstName?:string; lastName?:string; languageCode?:string }
export async function registerUser(identity:Identity, referralCode?:string|null) {
  for(let attempt=0;attempt<5;attempt++){
    try {
      return await prisma.$transaction(async tx=>{
        const existing=await tx.user.findUnique({where:{telegramId:identity.telegramId}});
        const {telegramId,...profile}=identity;
        if(existing) return tx.user.update({where:{id:existing.id},data:{...profile,lastActiveAt:new Date()}});
        const referrer=referralCode?await tx.user.findUnique({where:{referralCode}}):null;
        const user=await tx.user.create({data:{...identity,languageCode:identity.languageCode||'en',referralCode:randomBytes(12).toString('hex').toUpperCase(),referredBy:referrer?.referralCode??null,lastActiveAt:new Date()}});
        const day=utcDay(user.createdAt);
        const eligible=day>=CREDIT_EPOCH_DAY;
        // Welcome grant: exactly once, only on this create path. The ledger
        // reference 'welcome' is unique per user (@@unique([userId, reference])),
        // so a retried transaction can never double-post it, and the wallet
        // balance always equals the ledger sum (credit-audit invariant).
        await tx.creditWallet.create({data:{userId:user.id,balance:BigInt(WELCOME_CREDITS+(eligible?DAILY_CREDITS:0)),lastGrantDay:eligible?day:CREDIT_EPOCH_DAY-1}});
        await tx.creditEntry.create({data:{userId:user.id,delta:BigInt(WELCOME_CREDITS),kind:'WELCOME_GRANT',reference:'welcome'}});
        if(eligible) await tx.creditEntry.create({data:{userId:user.id,delta:BigInt(DAILY_CREDITS),kind:'DAILY_GRANT',reference:'grant:'+day}});
        if(referrer) await tx.referral.create({data:{referrerId:referrer.id,referredId:user.id,status:'PENDING'}});
        return user;
      },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
    }catch(e){
      if(attempt===4 || !(e instanceof Prisma.PrismaClientKnownRequestError) || !['P2002','P2034'].includes(e.code)) throw e;
    }
  }
  throw new Error('Registration retry exhausted');
}
