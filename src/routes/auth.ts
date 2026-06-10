import { Router, type Request, type Response } from 'express';
import type { Db } from 'mongodb';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import type { User, OtpCode } from '../contract';
import { requireAuth } from '../middleware/auth';

const OTP_EXPIRY_MINUTES = 10;
const OTP_CODE_LENGTH = 6;

function generateOtpCode(): string {
  // Cryptographically random 6-digit numeric code
  const max = 10 ** OTP_CODE_LENGTH;
  const num = crypto.randomInt(0, max);
  return num.toString().padStart(OTP_CODE_LENGTH, '0');
}

function createMailTransport() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Fail fast if Gmail is unreachable
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000,
  });
}

export function authRouter(db: Db): Router {
  const router = Router();
  const users = db.collection<Omit<User, 'id'> & { _id?: unknown }>('users');
  const otpCodes = db.collection<Omit<OtpCode, 'id'> & { _id?: unknown }>('otp_codes');

  // POST /api/auth/request-code
  router.post('/request-code', async (req: Request, res: Response) => {
    try {
      const { email } = req.body as { email?: unknown };

      if (!email || typeof email !== 'string' || !email.includes('@')) {
        res.status(400).json({ error: 'A valid email address is required.' });
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);
      const code = generateOtpCode();
      const codeId = crypto.randomUUID();

      // Remove any existing codes for this email, then insert the new one
      await otpCodes.deleteMany({ email: normalizedEmail });
      await otpCodes.insertOne({
        id: codeId,
        email: normalizedEmail,
        code,
        expiresAt: expiresAt.toISOString(),
        createdAt: now.toISOString(),
      });

      // Upsert user record so the user exists for verify-code
      const existingUser = await users.findOne({ email: normalizedEmail });
      if (!existingUser) {
        const userId = crypto.randomUUID();
        const timestamp = now.toISOString();
        await users.insertOne({
          id: userId,
          email: normalizedEmail,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      }

      // Send the OTP via Gmail
      const transport = createMailTransport();
      try {
        await transport.sendMail({
          from: process.env.SMTP_USER,
          to: normalizedEmail,
          subject: 'Your AuthGrid login code',
          text: `Your one-time login code is: ${code}\n\nThis code expires in ${OTP_EXPIRY_MINUTES} minutes.\n\nIf you did not request this, you can safely ignore this email.`,
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <h2>Your AuthGrid login code</h2>
              <p style="font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #1a1a1a;">${code}</p>
              <p>This code expires in <strong>${OTP_EXPIRY_MINUTES} minutes</strong>.</p>
              <p style="color: #888; font-size: 12px;">If you did not request this, you can safely ignore this email.</p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error('Failed to send OTP email:', emailErr);
        res.status(502).json({ error: 'Failed to send verification email. Please try again.' });
        return;
      } finally {
        transport.close();
      }

      res.json({ ok: true });
    } catch (err) {
      console.error('request-code error:', err);
      res.status(500).json({ error: 'Internal server error. Please try again.' });
    }
  });

  // POST /api/auth/verify-code
  router.post('/verify-code', async (req: Request, res: Response) => {
    try {
      const { email, code } = req.body as { email?: unknown; code?: unknown };

      if (!email || typeof email !== 'string') {
        res.status(400).json({ error: 'email is required.' });
        return;
      }
      if (!code || typeof code !== 'string') {
        res.status(400).json({ error: 'code is required.' });
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      const now = new Date();

      const record = await otpCodes.findOne({ email: normalizedEmail });

      if (!record) {
        res.status(400).json({ error: 'No verification code found for this email. Please request a new one.' });
        return;
      }

      if (new Date(record.expiresAt as string) < now) {
        await otpCodes.deleteOne({ email: normalizedEmail });
        res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
        return;
      }

      if (record.code !== code.trim()) {
        res.status(400).json({ error: 'Incorrect verification code. Please try again.' });
        return;
      }

      // Code is valid — delete it so it can't be reused
      await otpCodes.deleteOne({ email: normalizedEmail });

      // Fetch (or create) the user record
      let userDoc = await users.findOne({ email: normalizedEmail });
      if (!userDoc) {
        const userId = crypto.randomUUID();
        const timestamp = now.toISOString();
        await users.insertOne({
          id: userId,
          email: normalizedEmail,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        userDoc = await users.findOne({ email: normalizedEmail });
      }

      if (!userDoc) {
        res.status(500).json({ error: 'Failed to retrieve user record.' });
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

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        res.status(500).json({ error: 'Server misconfiguration: JWT_SECRET not set.' });
        return;
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        secret,
        { expiresIn: '30d' }
      );

      res.json({ token, user });
    } catch (err) {
      console.error('verify-code error:', err);
      res.status(500).json({ error: 'Internal server error. Please try again.' });
    }
  });

  // GET /api/auth/me  (PROTECTED)
  router.get('/me', requireAuth, async (req: Request, res: Response) => {
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
      console.error('auth/me error:', err);
      res.status(500).json({ error: 'Internal server error. Please try again.' });
    }
  });

  return router;
}
