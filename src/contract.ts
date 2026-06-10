/**
 * AUTO-GENERATED — DO NOT EDIT.
 * This is the shared API contract for this app, regenerated from the plan on
 * every build. Both the frontend (@/contract) and the backend (./contract)
 * import these types so the request/response shapes can never drift.
 */


export interface User {
  /** Unique user ID */
  id: string;
  /** User's email address */
  email: string;
  /** User's chosen display name */
  displayName?: string;
  /** URL to the user's avatar image */
  avatarUrl?: string | null;
  /** Short user biography */
  bio?: string | null;
  /** ISO timestamp of account creation */
  createdAt: string;
  /** ISO timestamp of last profile update */
  updatedAt: string;
}

export interface OtpCode {
  /** Unique OTP record ID */
  id: string;
  /** Email the code was sent to */
  email: string;
  /** The one-time verification code */
  code: string;
  /** ISO timestamp when the code expires */
  expiresAt: string;
  /** ISO timestamp when the code was created */
  createdAt: string;
}

export interface ApiContract {
  "auth-request-code": { method: "POST"; path: "/api/auth/request-code"; request: { email: string }; response: { ok: boolean } };
  "auth-verify-code": { method: "POST"; path: "/api/auth/verify-code"; request: { email: string; code: string }; response: { token: string; user: User } };
  "auth-me": { method: "GET"; path: "/api/auth/me"; request: void; response: User };
  "get-profile": { method: "GET"; path: "/api/profile"; request: void; response: User };
  "update-profile": { method: "PATCH"; path: "/api/profile"; request: { displayName?: string; avatarUrl?: string | null; bio?: string | null }; response: User };
  "get-dashboard": { method: "GET"; path: "/api/dashboard"; request: void; response: { user: User; memberSince: string; lastLogin: string } };
  "delete-account": { method: "DELETE"; path: "/api/account"; request: void; response: { ok: boolean } };
}

export const API_ROUTES = {
  "auth-request-code": { method: "POST", path: "/api/auth/request-code" },
  "auth-verify-code": { method: "POST", path: "/api/auth/verify-code" },
  "auth-me": { method: "GET", path: "/api/auth/me" },
  "get-profile": { method: "GET", path: "/api/profile" },
  "update-profile": { method: "PATCH", path: "/api/profile" },
  "get-dashboard": { method: "GET", path: "/api/dashboard" },
  "delete-account": { method: "DELETE", path: "/api/account" },
} as const;
