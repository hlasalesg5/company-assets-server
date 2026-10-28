import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

const SECRET_KEY = process.env.AUTH_SECRET || "hla-uae-asset-management-super-secret-key-2026";

export interface AuthUser {
  email: string;
  name: string;
  role: "Admin" | "HR";
}

export interface TokenPayload extends AuthUser {
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

// Generate HMAC-SHA256 signed token (valid for 7 days)
export function signToken(user: AuthUser, expiresInMs: number = 7 * 24 * 60 * 60 * 1000): string {
  const payload: TokenPayload = {
    ...user,
    iat: Date.now(),
    exp: Date.now() + expiresInMs,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(payloadB64)
    .digest("base64url");

  return `${payloadB64}.${signature}`;
}

// Verify HMAC-SHA256 signed token
export function verifyToken(token: string): TokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [payloadB64, signature] = parts;
    const expectedSig = crypto
      .createHmac("sha256", SECRET_KEY)
      .update(payloadB64)
      .digest("base64url");

    if (
      signature.length !== expectedSig.length ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))
    ) {
      return null;
    }

    const payload: TokenPayload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"));

    if (Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

// Express middleware to protect API routes
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. Authentication required." });
  }

  const token = authHeader.substring(7).trim();
  const user = verifyToken(token);

  if (!user) {
    return res.status(401).json({ error: "Invalid or expired session. Please log in again." });
  }

  req.user = user;
  next();
}
