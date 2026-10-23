import { Pool } from "pg";

let pool: Pool | null = null;

export function getPgPool(): Pool | null {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return null;

  if (!pool) {
    let cleanUrl = dbUrl;
    if (cleanUrl.includes("sslmode=require") && !cleanUrl.includes("uselibpqcompat")) {
      cleanUrl = cleanUrl.includes("?")
        ? `${cleanUrl}&uselibpqcompat=true`
        : `${cleanUrl}?uselibpqcompat=true`;
    }

    pool = new Pool({
      connectionString: cleanUrl,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 10,
      idleTimeoutMillis: 30000,
    });
  }
  return pool;
}
