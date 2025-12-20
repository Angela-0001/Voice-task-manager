const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const GridFSBucket = require('mongodb').GridFSBucket;
require('dotenv').config();

const typeDefs = require('./schema');
const resolvers = require('./resolvers');

const app = express();

app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:8083',
    'http://localhost:8081',
    'http://localhost:8082',
    'http://localhost:8083',
    'http://localhost:3000',
    'https://studio.apollographql.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id', 'x-device-id', 'Apollo-Require-Preflight']
}));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.use(express.json());

const upload = multer({
  limits: { fileSize: 10000000 },
  fileFilter: (req, file, cb) => {
    cb(file.mimetype.startsWith('audio/') ? null : new Error('Only audio files allowed'), file.mimetype.startsWith('audio/'));
  }
});

mongoose.connect(process.env.MONGODB_URI)
.then(() => {
  console.log('MongoDB connected');
  global.gridFSBucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'voiceMemos' });
})
.catch(err => {
  console.error('MongoDB connection error:', err.message);
  process.exit(1);
});

mongoose.connection.on('error', err => console.error('MongoDB error:', err));app.post('/api/voice-memo/upload', upload.single('audioFile'), async (req, res) => {
  try {
    const { taskId, duration, mimeType } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }
    
    // Verify authentication
    const authHeader = req.headers.authorization;
    const deviceId = req.headers['x-device-id'];
    let userId = null;
    let isAnonymous = true;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
        isAnonymous = false;
      } catch (error) {
        // Invalid token, treat as anonymous
      }
    }
    
    // Validate task ownership
    let query = { _id: taskId };
    if (isAnonymous) {
      query.userId = null;
      query.deviceId = deviceId;
    } else {
      query.userId = userId;
    }
    
    const Task = require('./models/Task');
    const task = await Task.findOne(query);
    if (!task) {
      return res.status(404).json({ error: 'Task not found or access denied' });
    }
    
    // Check voice memo limit
    if (task.voiceMemos && task.voiceMemos.length >= 10) {
      return res.status(400).json({ error: 'Maximum 10 voice memos allowed per task' });
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const uniqueFilename = `voice-memo-${timestamp}-${Math.random().toString(36).substring(2, 11)}.webm`;
    
    // Upload to GridFS
    const uploadStream = global.gridFSBucket.openUploadStream(uniqueFilename, {
      metadata: {
        taskId: new mongoose.Types.ObjectId(taskId),
        userId: isAnonymous ? null : new mongoose.Types.ObjectId(userId),
        deviceId: deviceId,
        mimeType: req.file.mimetype,
        duration: parseFloat(duration),
        originalName: req.file.originalname
      }
    });
    
    // Create readable stream from buffer
    const { Readable } = require('stream');
    const bufferStream = new Readable();
    bufferStream.push(req.file.buffer);
    bufferStream.push(null);
    
    bufferStream.pipe(uploadStream);
    
    uploadStream.on('finish', async () => {
      try {
        // Create voice memo object
        const voiceMemo = {
          _id: new mongoose.Types.ObjectId(),
          audioFileId: uploadStream.id,
          fileName: uniqueFilename,
          fileSize: req.file.size,
          duration: parseFloat(duration),
          mimeType: req.file.mimetype,
          transcription: '',
          transcriptionConfidence: null,
          createdAt: new Date(),
          createdBy: isAnonymous ? null : new mongoose.Types.ObjectId(userId)
        };
        
        // Add to task
        await Task.findByIdAndUpdate(taskId, {
          $push: { voiceMemos: voiceMemo }
        });
        
        res.json({
          success: true,
          voiceMemo: {
            id: voiceMemo._id.toString(),
            audioFileId: uploadStream.id.toString(),
            fileName: uniqueFilename,
            fileSize: req.file.size,
            duration: parseFloat(duration),
            mimeType: req.file.mimetype,
            transcription: '',
            transcriptionConfidence: null,
            createdAt: voiceMemo.createdAt,
            audioUrl: `/api/audio/stream/${uploadStream.id}`
          }
        });
      } catch (error) {
        console.error('Error saving voice memo:', error);
        res.status(500).json({ error: 'Failed to save voice memo' });
      }
    });
    
    uploadStream.on('error', (error) => {
      console.error('GridFS upload error:', error);
      res.status(500).json({ error: 'Failed to upload audio file' });
    });
    
  } catch (error) {
    console.error('Voice memo upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});app.get('/api/audio/test', (req, res) => {
  res.json({ message: 'Audio streaming endpoint is working', timestamp: new Date().toISOString() });
});app.get('/api/audio/stream/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    
    // Get file metadata from GridFS (simplified - no auth for now)
    const files = await global.gridFSBucket.find({ _id: new mongoose.Types.ObjectId(fileId) }).toArray();
    
    if (files.length === 0) {
      return res.status(404).json({ error: 'Audio file not found' });
    }
    
    const file = files[0];
    res.set({
      'Content-Type': file.metadata?.mimeType || 'audio/webm',
      'Content-Length': file.length,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=86400', // Cache for 24 hours
      'ETag': `"${fileId}-${file.length}"`,
      'Last-Modified': file.uploadDate.toUTCString(),
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Authorization'
    });
    
    // Handle range requests for seeking
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : file.length - 1;
      const chunksize = (end - start) + 1;
      
      res.status(206);
      res.set({
        'Content-Range': `bytes ${start}-${end}/${file.length}`,
        'Content-Length': chunksize
      });
    }
    
    // Stream the file
    const downloadStream = global.gridFSBucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));
    downloadStream.pipe(res);
    
    downloadStream.on('error', (error) => {
      console.error('Stream error:', error);
      res.status(500).json({ error: 'Failed to stream audio' });
    });
    
  } catch (error) {
    console.error('Audio streaming error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create Apollo Server with device-specific authentication context
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
  playground: false,
  context: async ({ req }) => {
    const authHeader = req.headers.authorization;
    const sessionIdHeader = req.headers['x-session-id'];
    const deviceIdHeader = req.headers['x-device-id'];
    
    // Generate or get device ID for anonymous users
    const deviceId = deviceIdHeader || `device-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    
    // STRICT RULE: If Authorization header exists, user is authenticated
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        return {
          userId: decoded.userId,
          userEmail: decoded.email,
          isAnonymous: false,
          sessionId: null, // No sessionId for authenticated users
          deviceId: deviceId // Still track device for authenticated users
        };
      } catch (error) {
        const sessionId = sessionIdHeader || `anon-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        return {
          userId: null,
          userEmail: null,
          isAnonymous: true,
          sessionId: sessionId,
          deviceId: deviceId
        };
      }
    }
    
    const sessionId = sessionIdHeader || `anon-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    return {
      userId: null,
      userEmail: null,
      isAnonymous: true,
      sessionId: sessionId,
      deviceId: deviceId
    };
  },
  formatError: (error) => {
    console.error('GraphQL Error:', error);
    return {
      message: error.message,
      locations: error.locations,
      path: error.path,
      extensions: {
        code: error.extensions?.code,
        exception: process.env.NODE_ENV === 'development' ? error.extensions?.exception : undefined
      }
    };
  }
});

async function startServer() {
  await server.start();
  server.applyMiddleware({ app, cors: false, path: '/graphql' });
  
  const PORT = process.env.PORT || 5014;
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`GraphQL endpoint: http://localhost:${PORT}${server.graphqlPath}`);
  });
}

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' 
  });
});

app.get('/', (req, res) => {
  res.json({ message: 'Backend server is running!', graphql: '/graphql' });
});

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  await mongoose.connection.close();
  process.exit(0);
});