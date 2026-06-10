import type { Express } from 'express';
import type { Db } from 'mongodb';
import { authRouter } from './auth';
import { profileRouter } from './profile';
import { dashboardRouter } from './dashboard';
import { accountRouter } from './account';

/**
 * Register every API route here.
 *
 * Create route modules under src/ (e.g. src/routes/tasks.ts) and call them from
 * this function. `db` is the connected MongoDB database (native driver) —
 * use `db.collection('name')` directly; there are NO schemas or models.
 *
 * The shared API contract lives in ./contract (engine-owned — DO NOT edit it).
 * Import its types so your request/response shapes match the frontend exactly.
 */
export function registerRoutes(app: Express, db: Db): void {
  app.use('/api/auth', authRouter(db));
  app.use('/api/profile', profileRouter(db));
  app.use('/api/dashboard', dashboardRouter(db));
  app.use('/api/account', accountRouter(db));
}
