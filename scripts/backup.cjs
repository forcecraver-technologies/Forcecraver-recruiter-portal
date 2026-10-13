const { Pool } = require('pg');
const fs = require('fs');

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

if (!dbUrl) {
  console.error('No DATABASE_URL found in environment or .env');
  process.exit(1);
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

function escapeSqlValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return String(val);
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

async function runBackup() {
  const client = await pool.connect();
  try {
    let sqlOutput = `-- ==========================================================\n`;
    sqlOutput += `-- TalentHub / Forcecraver Recruiter Portal Database Backup\n`;
    sqlOutput += `-- Backup Generated at: ${new Date().toISOString()}\n`;
    sqlOutput += `-- ==========================================================\n\n`;

    // 1. Append Schema Definition
    if (fs.existsSync('schema.sql')) {
      sqlOutput += `-- [SCHEMA DEFINITION]\n`;
      sqlOutput += fs.readFileSync('schema.sql', 'utf-8');
      sqlOutput += `\n\n`;
    }

    // 2. Fetch all public tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    
    // Order tables to respect foreign keys: users, jobs, candidates, then others
    const priority = ['users', 'jobs', 'candidates'];
    const allTables = tablesRes.rows.map(r => r.table_name);
    const sortedTables = [
      ...priority.filter(t => allTables.includes(t)),
      ...allTables.filter(t => !priority.includes(t))
    ];

    sqlOutput += `-- [DATA DUMP]\n`;

    for (const table of sortedTables) {
      console.log(`Exporting table: ${table}...`);
      const dataRes = await client.query(`SELECT * FROM "${table}"`);
      sqlOutput += `\n-- Data for table: ${table} (${dataRes.rows.length} rows)\n`;
      
      if (dataRes.rows.length > 0) {
        const columns = Object.keys(dataRes.rows[0]);
        const colsList = columns.map(c => `"${c}"`).join(', ');

        for (const row of dataRes.rows) {
          const valuesList = columns.map(c => escapeSqlValue(row[c])).join(', ');
          sqlOutput += `INSERT INTO "${table}" (${colsList}) VALUES (${valuesList}) ON CONFLICT DO NOTHING;\n`;
        }
      }
    }

    fs.writeFileSync('backup_schema_and_data.sql', sqlOutput, 'utf-8');
    const stats = fs.statSync('backup_schema_and_data.sql');
    console.log(`Database backup saved successfully to backup_schema_and_data.sql (${stats.size} bytes)`);
  } catch (err) {
    console.error('Backup failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runBackup();
