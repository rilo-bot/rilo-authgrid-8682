import { Router, type Request, type Response } from 'express';
import type { Db } from 'mongodb';
import { requireAuth } from '../middleware/auth';
import type { ApiContract } from '../contract';

type DeleteAccountResponse = ApiContract['delete-account']['response'];

export function accountRouter(db: Db): Router {
  const router = Router();

  // DELETE /api/account — permanently delete the authenticated user's account
  router.delete('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, email } = req.auth!;

      const users = db.collection('users');
      const otpCodes = db.collection('otp_codes');

      // Delete the user record
      await users.deleteOne({ id: userId });

      // Clean up any OTP codes associated with this email
      await otpCodes.deleteMany({ email });

      const body: DeleteAccountResponse = { ok: true };
      res.status(200).json(body);
    } catch (err) {
      console.error('DELETE /api/account error:', err);
      res.status(500).json({ error: 'Failed to delete account. Please try again.' });
    }
  });

  return router;
}
