import { createHmac } from "crypto";

export function hashToken(token: string): string {
  return createHmac("sha256", process.env.AUTH_SECRET || "fallback_secret")
    .update(token)
    .digest("hex");
}

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
