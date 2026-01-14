import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Parse DATABASE_URL if provided, otherwise use individual env vars
let poolConfig;

if (process.env.DATABASE_URL) {
  const connectionString = process.env.DATABASE_URL;
  
  // Check if it's a Supabase connection
  const isSupabase = connectionString.includes('supabase.co');
  
  // For Supabase, parse connection string and build config explicitly
  // This ensures SSL settings are properly applied
  if (isSupabase) {
    try {
      // Parse the connection string
      const url = new URL(connectionString);
      
      // Extract components
      const user = decodeURIComponent(url.username);
      const password = decodeURIComponent(url.password);
      const hostname = url.hostname;
      const port = parseInt(url.port) || 5432;
      const database = url.pathname.slice(1) || 'postgres';
      
      poolConfig = {
        user: user,
        password: password,
        host: hostname,
        port: port,
        database: database,
        // Explicit SSL configuration for Supabase
        ssl: {
          rejectUnauthorized: false  // Required for Supabase's SSL certificates
        },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      };
      
      console.log(`🔌 Connecting to PostgreSQL (Supabase: yes)`);
      console.log(`🌐 Hostname: ${hostname}`);
      console.log(`🔒 SSL Configuration: rejectUnauthorized=false`);
    } catch (parseError) {
      // If parsing fails, fall back to connection string with SSL option
      console.warn('⚠️  Could not parse DATABASE_URL, using connection string:', parseError.message);
      poolConfig = {
        connectionString: connectionString,
        ssl: {
          rejectUnauthorized: false
        },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      };
    }
  } else {
    // For non-Supabase connections, use connection string as-is
    poolConfig = {
      connectionString: connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };
    
    console.log(`🔌 Connecting to PostgreSQL (Supabase: no)`);
  }
} else {
  // Fallback to individual environment variables
  const isSupabase = process.env.DB_HOST?.includes('supabase.co');
  
  poolConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    ssl: isSupabase ? {
      rejectUnauthorized: false
    } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
}

// Create connection pool
const pool = new Pool(poolConfig);

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

// Test connection function
export const testConnection = async () => {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    console.log('📅 Server time:', result.rows[0].now);
    return { success: true, message: 'Database connection successful', time: result.rows[0].now };
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('   Error Code:', error.code);
    console.error('   Error Message:', error.message);
    console.error('   Error Detail:', error.detail || 'N/A');
    console.error('   Error Hint:', error.hint || 'N/A');
    
    // Special handling for DNS errors
    if (error.code === 'ENOTFOUND') {
      console.error('\n🔍 DNS Resolution Failed:');
      console.error('   The hostname could not be resolved.');
      console.error('\n   Possible solutions:');
      console.error('   1. Verify your internet connection is working');
      console.error('   2. Check if you\'re on an IPv4-only network');
      console.error('      → If yes, use Session Pooler connection string instead of Direct');
      console.error('      → In Supabase Dashboard: Settings → Database → Connection string');
      console.error('      → Change "Method" dropdown to "Session mode" or "Transaction mode"');
      console.error('   3. Verify the hostname matches exactly from Supabase Dashboard');
      console.error('   4. Ensure your Supabase project is active and not paused');
      
      // Try to extract and show the hostname
      try {
        const urlMatch = process.env.DATABASE_URL?.match(/@([^:]+):/);
        if (urlMatch) {
          console.error(`\n   Current hostname: ${urlMatch[1]}`);
          console.error('   Expected format: db.[project-ref].supabase.co');
        }
      } catch (e) {
        // Ignore
      }
    }
    
    console.error('\n   Full Error:', error);
    
    return { 
      success: false, 
      error: {
        code: error.code,
        message: error.message,
        detail: error.detail,
        hint: error.hint
      }
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

// Get a client from the pool
export const getClient = async () => {
  try {
    const client = await pool.connect();
    return client;
  } catch (error) {
    console.error('❌ Failed to get client from pool:', error);
    throw error;
  }
};

// Execute a query
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Executed query', { text, duration, rows: result.rowCount });
    }
    
    return result;
  } catch (error) {
    console.error('❌ Query error:', error);
    console.error('   Query:', text);
    console.error('   Params:', params);
    throw error;
  }
};

// Close the pool
export const closePool = async () => {
  try {
    await pool.end();
    console.log('✅ Database pool closed successfully');
  } catch (error) {
    console.error('❌ Error closing database pool:', error);
    throw error;
  }
};

// Export the pool for advanced usage
export { pool };

// Default export
export default {
  pool,
  query,
  getClient,
  testConnection,
  closePool
};
