// Read-only deployment check. Never prints connection strings or credentials.
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');

async function main() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!process.env.SUPABASE_URL || !key) throw Error('Server database credentials are not configured.');
  const db = createClient(process.env.SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const checks = [
    ['chapter_likes', db.from('chapter_likes').select('chapter_id,user_id').limit(0)],
    ['comments.quoted_text', db.from('comments').select('quoted_text').limit(0)],
  ];
  for (const [name, query] of checks) {
    const { error } = await query;
    console.log(`${name}: ${error ? `${error.code || 'connection error'} ${error.message}` : 'available'}`);
    if (error) process.exitCode = 1;
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
