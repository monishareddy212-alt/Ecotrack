import bcrypt from 'bcryptjs';
import { query } from '../db/connection';
import type { SafeUser } from '../types/express';
import { normalizeEmail } from '../utils/validation';

const BCRYPT_COST = 12;

interface UserRow {
  id: string | number;
  full_name: string;
  email: string;
  password_hash: string;
  created_at: Date | string;
}

export class EmailAlreadyRegisteredError extends Error {
  readonly code = 'EMAIL_EXISTS';

  constructor() {
    super('An account with this email address already exists.');
    this.name = 'EmailAlreadyRegisteredError';
  }
}

export class InvalidCredentialsError extends Error {
  readonly code = 'INVALID_CREDENTIALS';

  constructor() {
    super('Invalid email or password.');
    this.name = 'InvalidCredentialsError';
  }
}

function toSafeUser(row: Omit<UserRow, 'password_hash'>): SafeUser {
  return {
    id: String(row.id),
    fullName: row.full_name,
    email: row.email,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  };
}

export async function registerUser(params: {
  fullName: string;
  email: string;
  password: string;
}): Promise<SafeUser> {
  const normalizedEmail = normalizeEmail(params.email);
  const passwordHash = await bcrypt.hash(params.password, BCRYPT_COST);

  try {
    const insertResult = await query(
      `
        INSERT INTO users (full_name, email, password_hash)
        VALUES (?, ?, ?)
      `,
      [params.fullName.trim(), normalizedEmail, passwordHash]
    );

    const userId = insertResult.insertId;
    const user = await getUserById(String(userId));
    if (!user) {
      throw new Error('Failed to retrieve newly registered user.');
    }
    return user;
  } catch (error: unknown) {
    const err = error as { code?: string; errno?: number };
    if (err?.code === 'ER_DUP_ENTRY' || err?.errno === 1062 || err?.code === '23505') {
      throw new EmailAlreadyRegisteredError();
    }
    throw error;
  }
}

export async function authenticateUser(params: {
  email: string;
  password: string;
}): Promise<SafeUser> {
  const normalizedEmail = normalizeEmail(params.email);
  const result = await query<UserRow>(
    `
      SELECT id, full_name, email, password_hash, created_at
      FROM users
      WHERE email = ?
      LIMIT 1
    `,
    [normalizedEmail]
  );

  const row = result.rows[0];
  if (!row) {
    // Perform a dummy hash comparison to keep response timing consistent
    await bcrypt.compare(params.password, '$2b$12$C6UzMDM.H6dfI/f/IKcEeO9mK2U5zQ2uQ/h8f7f7f7f7f7f7f7f7e');
    throw new InvalidCredentialsError();
  }

  const passwordMatches = await bcrypt.compare(params.password, row.password_hash);
  if (!passwordMatches) {
    throw new InvalidCredentialsError();
  }

  return toSafeUser(row);
}

export async function getUserById(userId: string): Promise<SafeUser | null> {
  const result = await query<Omit<UserRow, 'password_hash'>>(
    `
      SELECT id, full_name, email, created_at
      FROM users
      WHERE id = ?
      LIMIT 1
    `,
    [userId]
  );

  const row = result.rows[0];
  return row ? toSafeUser(row) : null;
}

export async function updateUserFullName(
  userId: string,
  fullName: string
): Promise<SafeUser | null> {
  await query(
    `
      UPDATE users
      SET full_name = ?
      WHERE id = ?
    `,
    [fullName.trim(), userId]
  );

  return getUserById(userId);
}
