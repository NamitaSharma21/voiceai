# Voice-Based AI Learning Assessment Tool - Backend

A fast, scalable Node.js/Express backend for a voice-based learning assessment platform.

## Features

✅ **Authentication System**
- User signup and login with JWT
- Password encryption with bcryptjs
- Profile management
- Role-based access control (student, teacher, admin)

✅ **Learning Attempts Management**
- Single-mode and group-mode attempt tracking
- Score calculation and statistics
- Question-wise feedback
- Audio file support
- Time tracking

✅ **Performance Optimizations**
- MongoDB indexing for fast queries
- Connection pooling
- Compression middleware
- Request caching ready
- Efficient pagination

✅ **Security Features**
- JWT authentication
- CORS configuration
- Helmet security headers
- Input validation
- Password hashing

## Installation

### 1. Install Dependencies

```bash
cd Backend
npm install
```

### 2. Configure Environment Variables

Update the `.env` file with your configuration:

```env
MONGO_URI=mongodb+srv://your-username:your-password@cluster.mongodb.net/?appName=Cluster0
PORT=5000
JWT_SECRET=your-secret-key-here
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

### 3. Start the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will run on `http://localhost:5000`

## API Endpoints

### Authentication Routes

#### POST `/api/auth/signup`
Register a new user
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "student"
}
```

#### POST `/api/auth/login`
Login user
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

#### GET `/api/auth/me`
Get current user profile (requires token)

#### PUT `/api/auth/update-profile`
Update user profile (requires token)

### Attempt Routes

#### POST `/api/attempts/create`
Create a new attempt (requires token)
```json
{
  "attemptType": "single",
  "score": 85,
  "totalQuestions": 10,
  "correctAnswers": 8,
  "timeSpent": 300,
  "questions": [],
  "feedback": "Good effort!"
}
```

#### GET `/api/attempts/user/:userId`
Get all attempts for a user
- Query params: `limit=10&page=1&type=single`

#### GET `/api/attempts/:attemptId`
Get specific attempt details

#### GET `/api/attempts/stats/:userId`
Get user statistics

#### DELETE `/api/attempts/:attemptId`
Delete an attempt

## Project Structure

```
Backend/
├── app.js                 # Main Express application
├── package.json           # Dependencies
├── config.js              # Configuration settings
├── .env                   # Environment variables
├── controllers/
│   ├── authController.js  # Auth logic
│   └── attemptController.js # Attempt logic
├── models/
│   ├── User.js            # User schema
│   └── Attempt.js         # Attempt schema
├── routes/
│   ├── auth.js            # Auth routes
│   └── attempts.js        # Attempt routes
└── middleware/
    └── auth.js            # JWT verification
```

## Database Schema

### User Model
- `name`: User's full name
- `email`: Unique email address
- `password`: Hashed password
- `role`: student/teacher/admin
- `profilePic`: Profile picture URL
- `totalAttempts`: Number of attempts made
- `averageScore`: Average score across all attempts
- `isActive`: Account status

### Attempt Model
- `userId`: Reference to User
- `attemptType`: single/group
- `score`: Numeric score (0-100)
- `totalQuestions`: Number of questions
- `correctAnswers`: Number of correct answers
- `timeSpent`: Time in seconds
- `audioFile`: Path to audio file
- `questions`: Array of question details
- `groupMembers`: Array of user references
- `feedback`: Feedback text
- `status`: completed/pending/failed

## Performance Features

1. **MongoDB Indexing**: Indexes on userId and createdAt for fast queries
2. **Connection Pooling**: Min 5 / Max 10 connections
3. **Compression**: Gzip compression for responses
4. **Error Handling**: Comprehensive error handling
5. **Validation**: Input validation on all endpoints
6. **Pagination**: Built-in pagination for list endpoints

## Middleware Stack

1. **Helmet**: Security headers
2. **CORS**: Cross-origin requests
3. **Compression**: Response compression
4. **Express JSON**: JSON parsing
5. **Auth Middleware**: JWT verification

## Error Handling

All API responses follow this format:

```json
{
  "success": true/false,
  "message": "Description",
  "data": {}
}
```

## Testing the API

Use Postman or similar tools. Example:

1. **Sign up**: POST to `/api/auth/signup`
2. **Login**: POST to `/api/auth/login` → Get token
3. **Create Attempt**: POST to `/api/attempts/create` with token in header: `Authorization: Bearer <token>`

## Health Check

GET `/api/health` - Returns server status

## Notes

- All timestamps are in UTC
- Passwords are never returned in responses
- JWT tokens expire in 7 days
- MongoDB must be running before starting the server
