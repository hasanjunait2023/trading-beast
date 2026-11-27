import {z} from 'zod';
import {AppError} from '../middleware/errorHandler.js';
export function pagination(query:unknown){
  const parsed=z.object({page:z.coerce.number().int().min(1).max(10000).default(1),limit:z.coerce.number().int().min(1).max(100).default(50)}).safeParse(query);
  if(!parsed.success)throw new AppError(400,'Invalid pagination');
  const {page,limit}=parsed.data;
  return {page,limit,skip:(page-1)*limit,take:limit};
}
