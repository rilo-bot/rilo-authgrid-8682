import { Router, type Request, type Response } from 'express';
import type { Db } from 'mongodb';
import type { User } from '../contract';
import { requireAuth } from '../middleware/auth';

export function profileRouter(db: Db): Router {
  const router = Router();
  const users = db.collection<Omit<User, 'id'> & { _id?: unknown }>('users');

  // GET /api/profile — fetch the authenticated user's full profile
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

      res.json(user);
    } catch (err) {
      console.error('GET /api/profile error:', err);
      res.status(500).json({ error: 'Internal server error. Please try again.' });
    }
  });

  // PATCH /api/profile — update display name, avatar URL, and/or bio
  router.patch('/', requireAuth, async (req: Request, res: Response) => {
    try {
      const { userId } = req.auth!;

      const body = req.body as {
        displayName?: unknown;
        avatarUrl?: unknown;
        bio?: unknown;
      };

      // Validate each optional field when present
      if (
        body.displayName !== undefined &&
        typeof body.displayName !== 'string'
      ) {
        res.status(400).json({ error: 'displayName must be a string.' });
        return;
      }

      if (
        body.avatarUrl !== undefined &&
        body.avatarUrl !== null &&
        typeof body.avatarUrl !== 'string'
      ) {
        res.status(400).json({ error: 'avatarUrl must be a string or null.' });
        return;
      }

      if (
        body.bio !== undefined &&
        body.bio !== null &&
        typeof body.bio !== 'string'
      ) {
        res.status(400).json({ error: 'bio must be a string or null.' });
        return;
      }

      // Build the $set object with only the provided fields
      const updates: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
      };

      if (body.displayName !== undefined) {
        updates.displayName = (body.displayName as string).trim();
      }
      if (body.avatarUrl !== undefined) {
        updates.avatarUrl = body.avatarUrl;
      }
      if (body.bio !== undefined) {
        updates.bio = body.bio;
      }

      const result = await users.findOneAndUpdate(
        { id: userId },
        { $set: updates },
        { returnDocument: 'after' }
      );

      if (!result) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }

      const userDoc = result;

      const user: User = {
        id: userDoc.id as string,
        email: userDoc.email as string,
        displayName: userDoc.displayName as string | undefined,
        avatarUrl: userDoc.avatarUrl as string | null | undefined,
        bio: userDoc.bio as string | null | undefined,
        createdAt: userDoc.createdAt as string,
        updatedAt: userDoc.updatedAt as string,
      };

      res.json(user);
    } catch (err) {
      console.error('PATCH /api/profile error:', err);
      res.status(500).json({ error: 'Internal server error. Please try again.' });
    }
  });

  return router;
}
