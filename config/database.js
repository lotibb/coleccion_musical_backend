const { Pool } = require('pg');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  }
};

// Validate required environment variables
const requiredEnvVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

// Create connection pool
const pool = new Pool(dbConfig);

// Test database connection
async function testDatabaseConnection() {
  let client;
  try {
    client = await pool.connect();
    
    // Test query to check connection
    const result = await client.query('SELECT NOW() as current_time, version() as postgres_version');
    
    return {
      connected: true,
      currentTime: result.rows[0].current_time,
      postgresVersion: result.rows[0].postgres_version,
      host: dbConfig.host,
      database: dbConfig.database
    };
  } catch (error) {
    throw new Error(`Database connection failed: ${error.message}`);
  } finally {
    if (client) {
      client.release();
    }
  }
}

module.exports = {
  testDatabaseConnection
};
