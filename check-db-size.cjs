const { Pool } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const dbUrl = env.split('\n').find(l => l.startsWith('DATABASE_URL=')).split('=')[1].trim();

const pool = new Pool({ connectionString: dbUrl });
pool.query(`
SELECT pg_size_pretty(pg_database_size(current_database())) as total_size;
`)
  .then(res => { console.log("DB Size:", res.rows[0].total_size); pool.end(); })
  .catch(err => { console.error(err); pool.end(); });
