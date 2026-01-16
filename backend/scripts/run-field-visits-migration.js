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

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('📊 Reading migration file...');
    const migrationPath = path.join(__dirname, 'migrate-field-visits-schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🚀 Running field visits schema migration on Supabase...');
    console.log('⚠️  This will create field_visits, follow_ups, and collector_tasks tables');
    console.log('⚠️  This will update notices table with collector-triggered fields');
    
    // Execute the migration
    await client.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('📋 field_visits table created');
    console.log('📋 follow_ups table created');
    console.log('📋 collector_tasks table created');
    console.log('📋 notices table updated');
    console.log('📋 All indexes and foreign keys created');
    
  } catch (error) {
    console.error('❌ Error running migration:', error.message);
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

// Run the migration
runMigration().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
