import { describe,it,expect } from 'vitest';
import { grantDays,utcDay,CREDIT_EPOCH_DAY } from './credits.js';
const epoch=new Date(CREDIT_EPOCH_DAY*86400000);
describe('credit accrual',()=>{
  it('grants one day at rollout',()=>expect(grantDays(new Date(0),CREDIT_EPOCH_DAY-1,CREDIT_EPOCH_DAY)).toBe(1));
  it('does not grant twice on the same day',()=>expect(grantDays(epoch,CREDIT_EPOCH_DAY,CREDIT_EPOCH_DAY)).toBe(0));
  it('accumulates missed days',()=>expect(grantDays(epoch,CREDIT_EPOCH_DAY,CREDIT_EPOCH_DAY+7)).toBe(7));
  it('does not grant before signup',()=>expect(grantDays(new Date((CREDIT_EPOCH_DAY+3)*86400000),CREDIT_EPOCH_DAY-1,CREDIT_EPOCH_DAY+3)).toBe(1));
  it('uses UTC date boundaries',()=>expect(utcDay(new Date((CREDIT_EPOCH_DAY+1)*86400000-1))).toBe(CREDIT_EPOCH_DAY));
});
