// src/auth/utils/hash.util.ts
import * as argon2 from 'argon2';

export async function hashPassword(password: string): Promise<string> {
  const hashed: string = await argon2.hash(password);
  return hashed;
}

export async function verifyPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  const valid: boolean = await argon2.verify(hash, password);
  return valid;
}
