import { Router, Request, Response, NextFunction } from 'express';
import { authService } from '@/services/auth.service.js';
import { validateRequest } from '@/middleware/validation.js';
import { registerSchema, loginSchema, refreshTokenSchema } from '@/lib/validation.js';
import { verifyRefreshToken } from '@/lib/jwt.js';

const router = Router();

// POST /api/auth/register
router.post(
  '/register',
  validateRequest(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.register(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/auth/login
router.post(
  '/login',
  validateRequest(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.login(req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/auth/refresh
router.post(
  '/refresh',
  validateRequest(refreshTokenSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = verifyRefreshToken(req.body.refreshToken);
      const tokens = await authService.refreshTokens(payload.userId);
      res.json(tokens);
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/auth/logout
router.post('/logout', (_req: Request, res: Response) => {
  // Client-side logout - just return success
  // Token invalidation could be handled via Redis/blacklist if needed
  res.json({ message: 'Logged out successfully' });
});

export default router;
