import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Parse DATABASE_URL if provided, otherwise use individual env vars
let sequelizeConfig;

if (process.env.DATABASE_URL) {
    // Parse Supabase connection string
    const connectionString = process.env.DATABASE_URL;
    const isSupabase = connectionString.includes('supabase.co');

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
                // SSL configuration for Supabase
                ssl: isSupabase ? {
                    require: true,
                    rejectUnauthorized: false  // Required for Supabase's SSL certificates
                } : false
            },
            logging: process.env.NODE_ENV === 'development' ? console.log : false,
            pool: {
                max: 5,
                min: 0,
                acquire: 30000,
                idle: 10000
            }
        };

        if (isSupabase) {
            console.log('📊 Sequelize configured for Supabase PostgreSQL');
        }
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
} else {
    // Fallback to individual environment variables (for local development)
    sequelizeConfig = {
        database: process.env.DB_NAME,
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        dialect: 'postgres',
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

// Test connection function
export const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connection has been established successfully.');
        return true;
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        return false;
    }
};
