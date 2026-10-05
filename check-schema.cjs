const { Pool } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const dbUrl = env.split('\n').find(l => l.startsWith('DATABASE_URL=')).split('=')[1].trim();

const pool = new Pool({ connectionString: dbUrl });
pool.query(process.argv[2] || 'SELECT * FROM sbk.public_fixtures() LIMIT 1')
  .then(res => { console.log(res.rows[0]); pool.end(); })
  .catch(err => { console.error(err); pool.end(); });
