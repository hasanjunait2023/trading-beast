import { randomUUID } from 'node:crypto';
import { prisma } from './db.js';
export async function enqueueRadarDelivery(id:string,chatId:number,text:string){
  await prisma.telegramDelivery.upsert({where:{id},create:{id,chatId:String(chatId),text},update:{}});
}
export async function deliverTelegramBatch(limit=10){
  const token=process.env.TELEGRAM_BOT_TOKEN;
  if(!token)return;
  const now=new Date();
  const due=await prisma.telegramDelivery.findMany({where:{sentAt:null,failedAt:null,nextAttemptAt:{lte:now},OR:[{leaseUntil:null},{leaseUntil:{lte:now}}]},orderBy:{nextAttemptAt:'asc'},take:limit});
  for(const row of due){
    const leaseToken=randomUUID();
    const claimed=await prisma.telegramDelivery.updateMany({where:{id:row.id,sentAt:null,failedAt:null,OR:[{leaseUntil:null},{leaseUntil:{lte:new Date()}}]},data:{leaseToken,leaseUntil:new Date(Date.now()+60000),attempts:{increment:1}}});
    if(!claimed.count)continue;
    try{
      const response=await fetch('https://api.telegram.org/bot'+token+'/sendMessage',{method:'POST',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:row.chatId,text:row.text,parse_mode:'HTML',disable_web_page_preview:true})});
      const result=await response.json() as {ok:boolean;parameters?:{retry_after?:number}};
      if(!response.ok||!result.ok){
        const retryAfter=Math.min(3600,Math.max(0,Number(result.parameters?.retry_after)||0));
        if(response.status===429 && retryAfter && row.attempts+1<8) {
          await prisma.telegramDelivery.updateMany({where:{id:row.id,leaseToken},data:{leaseToken:null,leaseUntil:null,nextAttemptAt:new Date(Date.now()+retryAfter*1000)}});
          continue;
        }
        throw new Error('Telegram rejected message');
      }
      await prisma.telegramDelivery.updateMany({where:{id:row.id,leaseToken},data:{sentAt:new Date(),leaseToken:null,leaseUntil:null}});
    }catch{
      const attempt=row.attempts+1;
      await prisma.telegramDelivery.updateMany({where:{id:row.id,leaseToken},data:{leaseToken:null,leaseUntil:null,failedAt:attempt>=8?new Date():null,nextAttemptAt:new Date(Date.now()+Math.min(3600,2**attempt*10)*1000)}});
    }
  }
}
