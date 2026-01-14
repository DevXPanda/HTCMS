import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Use only DATABASE_URL for Render deployment
if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
const isSupabase = connectionString.includes('supabase.co');

let sequelizeConfig;

try {
    // Parse the connection string
    const url = new URL(connectionString);

    sequelizeConfig = {
        database: url.pathname.slice(1) || 'postgres',
        username: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        host: url.hostname,
        port: parseInt(url.port) || 5432,
        dialect: 'postgres',
        dialectOptions: {
            // SSL configuration - required for Supabase and Render
            ssl: {
                require: true,
                rejectUnauthorized: false  // Required for Supabase's SSL certificates
            }
        },
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    };
} catch (parseError) {
    // Fallback: use connection string directly
    console.warn('⚠️  Could not parse DATABASE_URL for Sequelize, using connection string');
    sequelizeConfig = {
        url: connectionString,
        dialect: 'postgres',
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    };
}

// Create Sequelize instance
export const sequelize = new Sequelize(sequelizeConfig);
