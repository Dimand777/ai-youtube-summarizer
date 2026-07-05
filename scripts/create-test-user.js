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
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || supabaseUrl.includes('your_supabase_project_url')) {
  console.error('❌ Error: Supabase URL is not set in .env / .env.local.');
  process.exit(1);
}

// Parse args or use defaults
const email = process.argv[2] || 'test@example.com';
const password = process.argv[3] || 'Password123!';

async function run() {
  if (serviceKey && !serviceKey.includes('your_supabase_service_role_key')) {
    console.log('🔄 Creating confirmed test user using Admin API (service_role key)...');
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false }
    });

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        console.log(`ℹ️ User ${email} is already registered.`);
      } else {
        console.error('❌ Failed to create user:', error.message);
      }
    } else {
      console.log(`✅ Confirmed user ${email} created successfully.`);
    }
  } else if (anonKey && !anonKey.includes('your_supabase_anon_key')) {
    console.log('🔄 Registering test user using public signUp (anon key)...');
    const supabase = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false }
    });

    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        console.log(`ℹ️ User ${email} is already registered.`);
      } else {
        console.error('❌ Failed to register user:', error.message);
      }
    } else {
      console.log(`✅ User ${email} signup request sent.`);
      if (data.user && !data.session) {
        console.log('⚠️ Note: Email confirmation is required for this user before login (since signUp was used without service_role key).');
      } else {
        console.log('✅ User registered and session established (no confirmation required).');
      }
    }
  } else {
    console.error('❌ Error: No valid Supabase API key (anon or service_role) found in env.');
    process.exit(1);
  }
}

run();
