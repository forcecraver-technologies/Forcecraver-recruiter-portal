import { getPgPool } from "./pg";
import fs from "fs/promises";
import path from "path";

export interface UserAccount {
  id: string;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  phone?: string | null;
  role: string;
  designation?: string | null;
  isActive: boolean;
  canPostJd: boolean;
  canScreenCandidates: boolean;
  canAccessCandidates: boolean;
  canScheduleInterviews: boolean;
  isDeveloper: boolean;
  otpCode?: string | null;
  otpExpiresAt?: string | Date | null;
  lastLoginAt?: string | Date | null;
  createdAt?: string | Date | null;
}

const LOCAL_USERS_FILE = path.join(process.cwd(), "src", "data", "users.json");

async function readLocalUsers(): Promise<UserAccount[]> {
  try {
    const raw = await fs.readFile(LOCAL_USERS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeLocalUsers(users: UserAccount[]): Promise<void> {
  try {
    await fs.mkdir(path.dirname(LOCAL_USERS_FILE), { recursive: true });
    await fs.writeFile(LOCAL_USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write local users:", err);
  }
}

export async function findUserByEmail(email: string): Promise<UserAccount | null> {
  const cleanEmail = email.trim().toLowerCase();
  const pool = getPgPool();

  if (pool) {
    try {
      const res = await pool.query(
        `SELECT id, name, first_name, last_name, email, phone, role, designation,
                is_active, can_post_jd, can_screen_candidates, can_access_candidates,
                can_schedule_interviews, is_developer, otp_code, otp_expires_at, last_login_at, created_at
         FROM users
         WHERE LOWER(email) = $1
         LIMIT 1`,
        [cleanEmail]
      );

      if (res.rows.length > 0) {
        const row = res.rows[0];
        return {
          id: row.id,
          name: row.name,
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
          phone: row.phone,
          role: row.role,
          designation: row.designation,
          isActive: Boolean(row.is_active),
          canPostJd: Boolean(row.can_post_jd),
          canScreenCandidates: Boolean(row.can_screen_candidates),
          canAccessCandidates: Boolean(row.can_access_candidates),
          canScheduleInterviews: Boolean(row.can_schedule_interviews),
          isDeveloper: Boolean(row.is_developer),
          otpCode: row.otp_code,
          otpExpiresAt: row.otp_expires_at,
          lastLoginAt: row.last_login_at,
          createdAt: row.created_at,
        };
      }
    } catch (err) {
      console.warn("PostgreSQL findUserByEmail failed, using local store:", err);
    }
  }

  const local = await readLocalUsers();
  return local.find((u) => u.email.toLowerCase() === cleanEmail) || null;
}

export async function createUser(data: {
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: string;
  designation?: string;
}): Promise<UserAccount> {
  const cleanEmail = data.email.trim().toLowerCase();
  const isMaster =
    cleanEmail === "sarthak@forcecraver.com" ||
    cleanEmail === "admin@forcecraver.com" ||
    cleanEmail.includes("admin") ||
    cleanEmail.includes("developer");

  const role = data.role || (isMaster ? "DEVELOPER" : "RECRUITER");
  const designation = data.designation || (isMaster ? "Lead Developer / Admin" : "HR Recruiter");
  const isDev = isMaster || role === "DEVELOPER" || role === "ADMIN";

  const pool = getPgPool();
  if (pool) {
    try {
      const res = await pool.query(
        `INSERT INTO users (
           id, name, first_name, last_name, email, phone, role, designation,
           is_active, can_post_jd, can_screen_candidates, can_access_candidates,
           can_schedule_interviews, is_developer, created_at, updated_at
         )
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, true, $8, $8, true, $8, $9, NOW(), NOW())
         RETURNING id, name, first_name, last_name, email, phone, role, designation,
                   is_active, can_post_jd, can_screen_candidates, can_access_candidates,
                   can_schedule_interviews, is_developer, created_at`,
        [
          data.name,
          data.firstName || null,
          data.lastName || null,
          cleanEmail,
          data.phone || null,
          role,
          designation,
          isDev,
          isDev,
        ]
      );

      if (res.rows.length > 0) {
        const row = res.rows[0];
        return {
          id: row.id,
          name: row.name,
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
          phone: row.phone,
          role: row.role,
          designation: row.designation,
          isActive: true,
          canPostJd: isDev,
          canScreenCandidates: isDev,
          canAccessCandidates: true,
          canScheduleInterviews: isDev,
          isDeveloper: isDev,
        };
      }
    } catch (err) {
      console.warn("PostgreSQL createUser failed, fallback to local:", err);
    }
  }

  // Local fallback
  const local = await readLocalUsers();
  const nextId = `USER-${String(local.length + 1).padStart(3, "0")}`;
  const newUser: UserAccount = {
    id: nextId,
    name: data.name,
    firstName: data.firstName || null,
    lastName: data.lastName || null,
    email: cleanEmail,
    phone: data.phone || null,
    role,
    designation,
    isActive: true,
    canPostJd: isDev,
    canScreenCandidates: isDev,
    canAccessCandidates: true,
    canScheduleInterviews: isDev,
    isDeveloper: isDev,
    createdAt: new Date().toISOString(),
  };

  local.push(newUser);
  await writeLocalUsers(local);
  return newUser;
}

export async function setUserOtp(
  email: string,
  otpCode: string,
  expiresAt: Date
): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  const pool = getPgPool();

  if (pool) {
    try {
      await pool.query(
        `UPDATE users
         SET otp_code = $1, otp_expires_at = $2, updated_at = NOW()
         WHERE LOWER(email) = $3`,
        [otpCode, expiresAt, cleanEmail]
      );
      return;
    } catch (err) {
      console.warn("PostgreSQL setUserOtp failed, saving locally:", err);
    }
  }

  const local = await readLocalUsers();
  const idx = local.findIndex((u) => u.email.toLowerCase() === cleanEmail);
  if (idx !== -1) {
    local[idx].otpCode = otpCode;
    local[idx].otpExpiresAt = expiresAt.toISOString();
    await writeLocalUsers(local);
  }
}

export async function clearUserOtpAndRecordLogin(email: string): Promise<UserAccount | null> {
  const cleanEmail = email.trim().toLowerCase();
  const pool = getPgPool();

  if (pool) {
    try {
      const res = await pool.query(
        `UPDATE users
         SET otp_code = NULL, otp_expires_at = NULL, last_login_at = NOW(), updated_at = NOW()
         WHERE LOWER(email) = $1
         RETURNING id, name, first_name, last_name, email, phone, role, designation,
                   is_active, can_post_jd, can_screen_candidates, can_access_candidates,
                   can_schedule_interviews, is_developer`,
        [cleanEmail]
      );

      if (res.rows.length > 0) {
        const row = res.rows[0];
        return {
          id: row.id,
          name: row.name,
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
          phone: row.phone,
          role: row.role,
          designation: row.designation,
          isActive: Boolean(row.is_active),
          canPostJd: Boolean(row.can_post_jd),
          canScreenCandidates: Boolean(row.can_screen_candidates),
          canAccessCandidates: Boolean(row.can_access_candidates),
          canScheduleInterviews: Boolean(row.can_schedule_interviews),
          isDeveloper: Boolean(row.is_developer),
        };
      }
    } catch (err) {
      console.warn("PostgreSQL clearUserOtp failed:", err);
    }
  }

  const local = await readLocalUsers();
  const idx = local.findIndex((u) => u.email.toLowerCase() === cleanEmail);
  if (idx !== -1) {
    local[idx].otpCode = null;
    local[idx].otpExpiresAt = null;
    local[idx].lastLoginAt = new Date().toISOString();
    await writeLocalUsers(local);
    return local[idx];
  }

  return null;
}

export async function getAllRecruiters(): Promise<UserAccount[]> {
  const pool = getPgPool();
  if (pool) {
    try {
      const res = await pool.query(
        `SELECT id, name, first_name, last_name, email, phone, role, designation,
                is_active, can_post_jd, can_screen_candidates, can_access_candidates,
                can_schedule_interviews, is_developer, last_login_at, created_at
         FROM users
         ORDER BY created_at DESC`
      );
      if (res.rows.length > 0) {
        return res.rows.map((row) => ({
          id: row.id,
          name: row.name,
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
          phone: row.phone,
          role: row.role,
          designation: row.designation,
          isActive: Boolean(row.is_active),
          canPostJd: Boolean(row.can_post_jd),
          canScreenCandidates: Boolean(row.can_screen_candidates),
          canAccessCandidates: Boolean(row.can_access_candidates),
          canScheduleInterviews: Boolean(row.can_schedule_interviews),
          isDeveloper: Boolean(row.is_developer),
          lastLoginAt: row.last_login_at,
          createdAt: row.created_at,
        }));
      }
    } catch (err) {
      console.warn("PostgreSQL getAllRecruiters failed:", err);
    }
  }

  return await readLocalUsers();
}
