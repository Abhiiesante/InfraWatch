import { Router, Request, Response, NextFunction } from 'express';
import { userService } from '@/services/user.service.js';
import { authMiddleware, requireRole } from '@/middleware/auth.js';
import { validateRequest } from '@/middleware/validation.js';
import { createUserSchema, updateUserSchema } from '@/lib/validation.js';

const router = Router();

// GET /api/users
router.get(
  '/',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await userService.getUsersByTenant(req.tenantId!);
      res.json(users);
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/users/:id
router.get(
  '/:id',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await userService.getUserById(parseInt(req.params.id), req.tenantId!);
      res.json(user);
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/users
router.post(
  '/',
  authMiddleware,
  requireRole('ADMIN'),
  validateRequest(createUserSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await userService.createUser(req.tenantId!, req.body);
      res.status(201).json(user);
    } catch (error) {
      next(error);
    }
  },
);

// PUT /api/users/:id
router.put(
  '/:id',
  authMiddleware,
  validateRequest(updateUserSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Users can only update themselves, admins can update anyone
      const targetId = parseInt(req.params.id);
      if (req.userId !== targetId && req.auth?.role !== 'ADMIN') {
        res.status(403).json({ error: 'Cannot update other users' });
        return;
      }

      const user = await userService.updateUser(targetId, req.tenantId!, req.body);
      res.json(user);
    } catch (error) {
      next(error);
    }
  },
);

// DELETE /api/users/:id
router.delete(
  '/:id',
  authMiddleware,
  requireRole('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await userService.deactivateUser(parseInt(req.params.id), req.tenantId!);
      res.json({ message: 'User deactivated' });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
