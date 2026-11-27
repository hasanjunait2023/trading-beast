import { describe,it,expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { prisma } from './db.js';
import { registerUser } from './users.js';
import { reconcileCredits } from './credit-audit.js';
describe.skipIf(process.env.RUN_DB_INTEGRATION!=='1')('credit reconciliation',()=>{
  it('detects a mismatch without silently changing a balance',async()=>{
    const user=await registerUser({telegramId:'audit-'+randomUUID()});
    try {
      await prisma.creditWallet.update({where:{userId:user.id},data:{balance:{increment:1n}}});
      const report=await reconcileCredits();
      expect(report.consistent).toBe(false);
      expect(report.discrepancies.find(x=>x.userId===user.id)?.difference).toBe('1');
      const wallet=await prisma.creditWallet.findUniqueOrThrow({where:{userId:user.id}});
      expect(wallet.balance%10n).toBe(1n);
    }finally{await prisma.user.delete({where:{id:user.id}});}
  });
});
