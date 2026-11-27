import { Router, type RequestHandler } from 'express';
export function asyncRouter(): Router {
  const router = Router();
  const methods = ['get','post','put','patch','delete'] as const;
  for (const method of methods) {
    const original = router[method].bind(router);
    Object.defineProperty(router,method,{value:(path:string,...handlers:RequestHandler[]) =>
      original(path,...handlers.map(handler => {
        const wrapped: RequestHandler = (req,res,next) => {
          try { Promise.resolve(handler(req,res,next)).catch(next); }
          catch(error) { next(error); }
        };
        return wrapped;
      })), configurable:true});
  }
  return router;
}
