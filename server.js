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

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check available at: http://localhost:${PORT}/api/health`);
});
