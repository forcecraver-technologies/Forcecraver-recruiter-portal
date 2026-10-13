const { Pool } = require('pg');
const fs = require('fs');

// Read .env manually
let dbUrl = process.env.DATABASE_URL;
if (!dbUrl && fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('DATABASE_URL=')) {
      dbUrl = trimmed.substring('DATABASE_URL='.length).replace(/^["']|["']$/g, '');
      break;
    }
  }
}

console.log('Connecting with DB URL:', dbUrl ? 'Found' : 'Not found');

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  try {
    console.log('Adding password column to users table if not exists...');
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_otp_code VARCHAR(10);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_otp_expires_at TIMESTAMP WITH TIME ZONE;
    `);
    console.log('Migration successful!');

    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);
    console.log('Updated columns in users:', res.rows.map(r => r.column_name));
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await pool.end();
  }
}

migrate();
