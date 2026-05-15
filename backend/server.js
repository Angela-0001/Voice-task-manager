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

const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL]
  : ['http://localhost:8081', 'http://localhost:8082', 'http://localhost:8083', 'http://localhost:3000'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Apollo-Require-Preflight']
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
    const { taskId, duration } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Require authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    let userId;
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.userId;
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Validate task ownership
    const Task = require('./models/Task');
    const task = await Task.findOne({ _id: taskId, userId });
    if (!task) {
      return res.status(404).json({ error: 'Task not found or access denied' });
    }

    if (task.voiceMemos && task.voiceMemos.length >= 10) {
      return res.status(400).json({ error: 'Maximum 10 voice memos allowed per task' });
    }

    const uniqueFilename = `voice-memo-${Date.now()}-${Math.random().toString(36).substring(2, 11)}.webm`;

    const uploadStream = global.gridFSBucket.openUploadStream(uniqueFilename, {
      metadata: {
        taskId: new mongoose.Types.ObjectId(taskId),
        userId: new mongoose.Types.ObjectId(userId),
        mimeType: req.file.mimetype,
        duration: parseFloat(duration),
        originalName: req.file.originalname
      }
    });

    const { Readable } = require('stream');
    const bufferStream = new Readable();
    bufferStream.push(req.file.buffer);
    bufferStream.push(null);
    bufferStream.pipe(uploadStream);

    uploadStream.on('finish', async () => {
      try {
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
          createdBy: new mongoose.Types.ObjectId(userId)
        };

        await Task.findByIdAndUpdate(taskId, { $push: { voiceMemos: voiceMemo } });

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

// Create Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: process.env.NODE_ENV !== 'production',
  playground: false,
  context: async ({ req }) => {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return { userId: decoded.userId, userEmail: decoded.email };
      } catch {
        // Invalid token — return empty context (resolvers will throw if auth required)
      }
    }

    return { userId: null, userEmail: null };
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