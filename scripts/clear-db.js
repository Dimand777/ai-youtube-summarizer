const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Helper to load env variables from a file
function loadEnvFile(fileName) {
  const filePath = path.join(__dirname, '..', fileName);
  if (!fs.existsSync(filePath)) return false;

  const content = fs.readFileSync(filePath, 'utf8');
  content.split(/\r?\n/).forEach(line => {
    if (line.trim().startsWith('#') || !line.trim()) return;
    const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      process.env[key] = value.trim();
    }
  });
  return true;
}

// Load env files
loadEnvFile('.env.local');
loadEnvFile('.env');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Use service role key if available, otherwise fallback to anon key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your_supabase_project_url') || supabaseKey.includes('your_supabase_anon_key')) {
  console.error('❌ Error: Supabase credentials are not set or are placeholder values in .env / .env.local.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});

async function clearDb() {
  console.log('🔄 Clearing user history and summary cache...');

  // Delete from user_history
  const { error: historyErr } = await supabase
    .from('user_history')
    .delete()
    .neq('video_id', '_placeholder_nonexistent_');

  if (historyErr) {
    console.error('❌ Error clearing user_history:', historyErr.message);
  } else {
    console.log('✅ Cleared user_history successfully.');
  }

  // Delete from summaries
  const { error: summariesErr } = await supabase
    .from('summaries')
    .delete()
    .neq('video_id', '_placeholder_nonexistent_');

  if (summariesErr) {
    console.error('❌ Error clearing summaries:', summariesErr.message);
  } else {
    console.log('✅ Cleared summaries successfully.');
  }

  console.log('🎉 Database cleanup completed.');
}

clearDb();
