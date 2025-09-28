# Colección Musical Backend

A simple Node.js backend API for managing a musical collection with PostgreSQL database connectivity.

## Features

- ✅ Express.js server
- ✅ PostgreSQL database connection
- ✅ Database health check endpoint
- ✅ CORS enabled
- ✅ Environment variable configuration

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- PostgreSQL database (hosted on Render)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd coleccion_musical_backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory with your database credentials (see the example below):
```env
# Database Configuration (required)
DB_HOST=your_database_host
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_username
DB_PASSWORD=your_password

# Server Configuration (optional)
PORT=3000
NODE_ENV=development
```

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3000` (or the port specified in your environment variables).

## API Endpoints

### Health Check
- **GET** `/api/health` - Test database connection
  - Returns database connection status and information
  - Example response:
  ```json
  {
    "status": "success",
    "message": "Database connection successful",
    "data": {
      "database": {
        "connected": true,
        "currentTime": "2024-01-01T12:00:00.000Z",
        "postgresVersion": "PostgreSQL 15.4",
        "host": "your_database_host",
        "database": "your_database_name"
      }
    },
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
  ```

### Root Endpoint
- **GET** `/` - Basic API information
  - Returns server status and timestamp

## Database Configuration

The application connects to a PostgreSQL database using environment variables. SSL is enabled by default for secure connections.

## Project Structure

```
coleccion_musical_backend/
├── config/
│   └── database.js          # Database connection configuration
├── server.js                # Main server file
├── package.json             # Dependencies and scripts
└── README.md               # This file
```

## Testing the Database Connection

1. Start the server:
```bash
npm run dev
```

2. Test the connection by visiting:
```
http://localhost:3000/api/health
```

If the connection is successful, you'll see a JSON response with database information. If there's an error, check your database credentials and network connectivity.

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Verify your database credentials in the `.env` file
   - Check if the database server is accessible
   - Ensure SSL is properly configured

2. **Port Already in Use**
   - Change the PORT in your `.env` file
   - Kill any process using the default port 3000

3. **Module Not Found**
   - Run `npm install` to install all dependencies

## Deploying to Render

### Prerequisites
- GitHub repository with your code
- Render account

### Deployment Steps

1. **Connect to Render:**
   - Go to [render.com](https://render.com)
   - Sign up/Login with your GitHub account
   - Click "New +" → "Web Service"

2. **Configure the Service:**
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** Node
   - **Region:** Choose closest to your users

3. **Environment Variables:**
   Render will automatically provide `DATABASE_URL` if you connect a PostgreSQL database. You can also set:
   ```
   NODE_ENV=production
   PORT=10000
   ```

4. **Database Setup:**
   - In Render dashboard, create a new PostgreSQL database
   - Render will automatically provide the `DATABASE_URL` environment variable
   - No additional configuration needed!

5. **Deploy:**
   - Connect your GitHub repository
   - Render will automatically deploy on every push to main branch

### Render-Specific Features
- ✅ Automatic `DATABASE_URL` handling
- ✅ Production-ready server binding
- ✅ SSL termination handled by Render
- ✅ Automatic HTTPS
- ✅ Zero-downtime deployments

## Next Steps

This is a basic backend setup. You can extend it by adding:
- Authentication and authorization
- CRUD operations for musical items
- Data validation
- Error handling middleware
- Logging
- API documentation

## License

ISC
