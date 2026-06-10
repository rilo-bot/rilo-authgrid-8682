import { Router, type Request, type Response } from 'express';
import type { Db } from 'mongodb';
import type { User } from '../contract';
import { requireAuth } from '../middleware/auth';

export function dashboardRouter(db: Db): Router {
  const router = Router();
  const users = db.collection<Omit<User, 'id'> & { _id?: unknown }>('users');

  // GET /api/dashboard — return dashboard summary for the authenticated user
  router.get('/', requireAuth, async (req: Request, res: Response) => {
    try {
      const { userId } = req.auth!;

      const userDoc = await users.findOne({ id: userId });
      if (!userDoc) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }

      const user: User = {
        id: userDoc.id as string,
        email: userDoc.email as string,
        displayName: userDoc.displayName as string | undefined,
        avatarUrl: userDoc.avatarUrl as string | null | undefined,
        bio: userDoc.bio as string | null | undefined,
        createdAt: userDoc.createdAt as string,
        updatedAt: userDoc.updatedAt as string,
      };

      // memberSince is the date the account was created.
      // lastLogin reflects the time of this authenticated request — the schema
      // has no dedicated last-login field, so we use the current timestamp.
      const memberSince: string = user.createdAt;
      const lastLogin: string = new Date().toISOString();

      res.json({ user, memberSince, lastLogin });
    } catch (err) {
      console.error('GET /api/dashboard error:', err);
      res.status(500).json({ error: 'Internal server error. Please try again.' });
    }
  });

  return router;
}
