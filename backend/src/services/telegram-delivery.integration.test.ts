import {describe,it,expect,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import {prisma} from './db.js';
import {enqueueRadarDelivery,deliverTelegramBatch} from './telegram-delivery.js';
describe.skipIf(process.env.RUN_DB_INTEGRATION!=='1')('Telegram outbox',()=>{
 it('deduplicates queued results and retries a failed delivery',async()=>{
  const id=randomUUID(),old=process.env.TELEGRAM_BOT_TOKEN;
  process.env.TELEGRAM_BOT_TOKEN='fixture';
  const fetchMock=vi.fn().mockResolvedValueOnce({ok:false,status:500,json:async()=>({ok:false})}).mockResolvedValueOnce({ok:true,status:200,json:async()=>({ok:true})});
  vi.stubGlobal('fetch',fetchMock);
  try{
   await enqueueRadarDelivery(id,123,'result');
   await enqueueRadarDelivery(id,123,'result');
   expect(await prisma.telegramDelivery.count({where:{id}})).toBe(1);
   await deliverTelegramBatch();
   expect((await prisma.telegramDelivery.findUniqueOrThrow({where:{id}})).sentAt).toBeNull();
   await prisma.telegramDelivery.update({where:{id},data:{nextAttemptAt:new Date(0)}});
   await deliverTelegramBatch();
   expect((await prisma.telegramDelivery.findUniqueOrThrow({where:{id}})).sentAt).not.toBeNull();
   expect(fetchMock).toHaveBeenCalledTimes(2);
  }finally{
   vi.unstubAllGlobals();
   if(old===undefined)delete process.env.TELEGRAM_BOT_TOKEN;else process.env.TELEGRAM_BOT_TOKEN=old;
   await prisma.telegramDelivery.deleteMany({where:{id}});
  }
 });
});
