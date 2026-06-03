module.exports = {
  // Database
  mongodb: {
    maxPoolSize: 10,
    minPoolSize: 5,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    serverSelectionTimeoutMS: 10000,
    retryWrites: true
  },

  // Server
  server: {
    port: process.env.PORT || 5000,
    corsOrigin: process.env.CLIENT_URL || 'http://localhost:5173',
    nodeEnv: process.env.NODE_ENV || 'development'
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: '7d',
    refreshExpiresIn: '30d'
  },

  // Pagination
  pagination: {
    defaultLimit: 10,
    maxLimit: 100
  },

  // File upload
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['audio/mpeg', 'audio/wav', 'audio/mp4']
  },

  // API Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100
  }
};
