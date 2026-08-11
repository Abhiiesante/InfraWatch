import { PrismaClient, Prisma } from '@prisma/client';
import { requestContext } from './context.js';

let prisma: PrismaClient;

const setupMiddleware = (client: PrismaClient) => {
  // Build a cache of models that have a tenantId field
  const modelsWithTenantId = new Set<string>();
  Prisma.dmmf.datamodel.models.forEach((model) => {
    if (model.fields.some((f) => f.name === 'tenantId')) {
      modelsWithTenantId.add(model.name);
    }
  });

  client.$use(async (params, next) => {
    const context = requestContext.getStore();
    const tenantId = context?.tenantId;

    if (!tenantId || !params.model || !modelsWithTenantId.has(params.model)) {
      return next(params);
    }

    // Auto-inject tenantId for read and update operations
    if (['findUnique', 'findFirst', 'findMany', 'count', 'update', 'updateMany', 'delete', 'deleteMany', 'findUniqueOrThrow', 'findFirstOrThrow'].includes(params.action)) {
      params.args = params.args || {};
      params.args.where = params.args.where || {};
      
      // If it's a unique operation, adding tenantId makes it non-unique by Prisma's strict definition
      // (unless the unique constraint includes tenantId, which it often doesn't if it's just 'id').
      // We safely convert findUnique to findFirst so it accepts the compound where clause.
      if (params.action === 'findUnique' || params.action === 'findUniqueOrThrow') {
        params.action = params.action === 'findUnique' ? 'findFirst' : 'findFirstOrThrow';
      }
      
      params.args.where.tenantId = tenantId;
    }

    // Auto-inject tenantId for write operations
    if (['create', 'createMany'].includes(params.action)) {
      params.args = params.args || {};
      params.args.data = params.args.data || {};
      
      if (Array.isArray(params.args.data)) {
        params.args.data = params.args.data.map((item: any) => ({ ...item, tenantId }));
      } else {
        params.args.data.tenantId = tenantId;
      }
    }

    if (params.action === 'upsert') {
      params.args = params.args || {};
      params.args.where = params.args.where || {};
      params.args.where.tenantId = tenantId;
      if (params.args.create) {
        params.args.create.tenantId = tenantId;
      }
    }

    return next(params);
  });
};

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
  setupMiddleware(prisma);
} else {
  const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient();
    setupMiddleware(globalForPrisma.prisma);
  }
  prisma = globalForPrisma.prisma;
}

export default prisma;
