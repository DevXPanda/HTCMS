import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const { Pool } = pg;

// Parse DATABASE_URL
let poolConfig;

if (process.env.DATABASE_URL) {
  const connectionString = process.env.DATABASE_URL;
  const isSupabase = connectionString.includes('supabase.co');
  
  if (isSupabase) {
    try {
      const url = new URL(connectionString);
      
      poolConfig = {
        user: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        host: url.hostname,
        port: parseInt(url.port) || 5432,
        database: url.pathname.slice(1) || 'postgres',
        ssl: {
          rejectUnauthorized: false
        }
      };
    } catch (parseError) {
      console.error('❌ Failed to parse DATABASE_URL:', parseError.message);
      process.exit(1);
    }
  } else {
    poolConfig = {
      connectionString: connectionString,
      ssl: {
        rejectUnauthorized: false
      }
    };
  }
} else {
  console.error('❌ DATABASE_URL environment variable is not set');
  console.error('   Please set DATABASE_URL in your .env file');
  process.exit(1);
}

const pool = new Pool(poolConfig);

async function runFix() {
  const client = await pool.connect();
  
  try {
    console.log('📊 Reading enum fix script...');
    const fixPath = path.join(__dirname, 'fix-audit-log-enums.sql');
    const fixSQL = fs.readFileSync(fixPath, 'utf8');
    
    console.log('🚀 Fixing audit log enums in Supabase...');
    console.log('⚠️  This will add missing enum values to existing audit_logs table');
    
    // Execute the fix
    await client.query(fixSQL);
    
    console.log('✅ Enum fix completed successfully!');
    console.log('📋 All required enum values have been added');
    
    // Verify enums
    console.log('\n📋 Verifying entity types...');
    const entityTypes = await client.query(`
      SELECT enumlabel FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_audit_logs_entity_type')
      ORDER BY enumsortorder
    `);
    console.log('Entity types:', entityTypes.rows.map(r => r.enumlabel).join(', '));
    
    console.log('\n📋 Verifying action types...');
    const actionTypes = await client.query(`
      SELECT enumlabel FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_audit_logs_action_type')
      ORDER BY enumsortorder
    `);
    console.log('Action types:', actionTypes.rows.map(r => r.enumlabel).join(', '));
    
  } catch (error) {
    console.error('❌ Error fixing enums:', error.message);
    console.error('   Error details:', error);
    if (error.position) {
      console.error(`   Error at position: ${error.position}`);
    }
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the fix
runFix().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
