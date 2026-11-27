import {describe,it,expect,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import jwt from 'jsonwebtoken';
import {prisma} from './db.js';
import {registerUser} from './users.js';
import {generateToken,authMiddleware} from '../middleware/auth.js';
import type {AuthRequest} from '../middleware/auth.js';
import type {Response} from 'express';
describe.skipIf(process.env.RUN_DB_INTEGRATION!=='1')('auth session',()=>{
 it('refreshes without extending expiry and rejects revoked credentials',async()=>{
  const user=await registerUser({telegramId:'session-'+randomUUID()});
  try{
   const token=await generateToken({...user,tier:'FREE'});
   const payload=jwt.decode(token) as {jti:string;exp:number};
   const refreshed=jwt.decode(await generateToken({...user,tier:'FREE'},payload.jti)) as {exp:number;jti:string};
   expect(refreshed).toMatchObject(payload.jti?{jti:payload.jti,exp:payload.exp}:{});
   await prisma.authSession.update({where:{id:payload.jti},data:{revokedAt:new Date()}});
   const response={status:vi.fn().mockReturnThis(),json:vi.fn()};
   const next=vi.fn();
   await authMiddleware({headers:{authorization:'Bearer '+token}} as AuthRequest,response as unknown as Response,next);
   expect(response.status).toHaveBeenCalledWith(401);
   expect(next).not.toHaveBeenCalled();
  }finally{await prisma.user.delete({where:{id:user.id}});}
 });
});
