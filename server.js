const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Import database connection
const { testDatabaseConnection } = require('./config/database');

// Helper function for consistent API responses
const createResponse = (status, message, data = null) => ({
  status,
  message,
  ...(data && { data }),
  timestamp: new Date().toISOString()
});

// Routes
app.get('/', (req, res) => {
  res.json(createResponse('success', 'Colección Musical Backend API is running'));
});

// Database connection test endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = await testDatabaseConnection();
    res.json(createResponse('success', 'Database connection successful', { database: dbStatus }));
  } catch (error) {
    res.status(500).json(createResponse('error', 'Database connection failed', { error: error.message }));
  }
});

// Start server - bind to all interfaces on Render, localhost for development
if (process.env.PORT) {
  // Render environment - bind to all interfaces
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on 0.0.0.0:${PORT}`);
    console.log(`Health check available at: http://0.0.0.0:${PORT}/api/health`);
  });
} else {
  // Local development - bind to localhost
  app.listen(PORT, 'localhost', () => {
    console.log(`Server is running on localhost:${PORT}`);
    console.log(`Health check available at: http://localhost:${PORT}/api/health`);
  });
}
