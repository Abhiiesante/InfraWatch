import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  tenantId?: number;
  userId?: number;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();
