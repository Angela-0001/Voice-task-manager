const Task = require('./models/Task');
const VoiceLog = require('./models/VoiceLog');
const User = require('./models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { GraphQLScalarType } = require('graphql');
const { Kind } = require('graphql/language');
// Remove GraphQLUpload import for now
const mongoose = require('mongoose');
const { Readable } = require('stream');

// DateTime scalar
const DateTime = new GraphQLScalarType({
  name: 'DateTime',
  serialize: (value) => value.toISOString(),
  parseValue: (value) => new Date(value),
  parseLiteral: (ast) => {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  },
});

const resolvers = {
  DateTime,
  
  VoiceLog: {
    timestamp: (voiceLog) => voiceLog.createdAt || new Date()
  },
  
  Query: {
    me: async (_, __, { userId }) => {
      if (!userId) return null;
      try {
        return await User.findById(userId);
      } catch (error) {
        throw new Error('Error fetching user');
      }
    },

    tasks: async (_, __, { userId, sessionId, deviceId, isAnonymous }) => {
      try {
        let query = {};
        
        if (isAnonymous) {
          // SIMPLIFIED: Show all anonymous tasks for now
          query = { 
            userId: null
          };
        } else {
          // Authenticated users see their tasks
          query = { 
            userId: userId
          };
        }
        
        const tasks = await Task.find(query).sort({ createdAt: 1 });
        console.log('📋 TASKS QUERY - Simplified results:', {
          count: tasks.length,
          query,
          isAnonymous,
          deviceId,
          userId,
          taskTitles: tasks.map(t => t.title)
        });
        
        return {
          success: true,
          count: tasks.length,
          tasks,
          isAnonymous,
          sessionId: isAnonymous ? sessionId : null
        };
      } catch (error) {
        console.error('❌ Error fetching tasks:', error);
        throw new Error('Error fetching tasks');
      }
    },



    task: async (_, { id }, { userId, deviceId, isAnonymous }) => {
      try {
        let query = { _id: id };
        
        if (isAnonymous) {
          // DEVICE-SPECIFIC: Anonymous can only access tasks from their device
          query.userId = null;
          query.deviceId = deviceId;
        } else {
          // CROSS-DEVICE: Authenticated can access their tasks from any device
          query.userId = userId;
        }
        
        console.log('🔍 STRICT task query:', query);
        const task = await Task.findOne(query);
        return task;
      } catch (error) {
        throw new Error('Task not found');
      }
    },

    pendingTasks: async (_, __, { userId, deviceId, isAnonymous, sessionId }) => {
      try {
        let query = { status: 'pending' };
        
        if (isAnonymous) {
          // DEVICE-SPECIFIC: Anonymous pending tasks from this device only
          query.userId = null;
          query.deviceId = deviceId;
        } else {
          // CROSS-DEVICE: Authenticated pending tasks from all devices
          query.userId = userId;
        }
        
        const tasks = await Task.find(query).sort({ createdAt: 1 });
        
        return {
          success: true,
          count: tasks.length,
          tasks,
          isAnonymous,
          sessionId: isAnonymous ? sessionId : null
        };
      } catch (error) {
        throw new Error('Error fetching pending tasks');
      }
    },

    completedTasks: async (_, __, { userId, deviceId, isAnonymous, sessionId }) => {
      try {
        let query = { status: 'completed' };
        
        if (isAnonymous) {
          // DEVICE-SPECIFIC: Anonymous completed tasks from this device only
          query.userId = null;
          query.deviceId = deviceId;
        } else {
          // CROSS-DEVICE: Authenticated completed tasks from all devices
          query.userId = userId;
        }
        
        const tasks = await Task.find(query).sort({ createdAt: 1 });
        
        return {
          success: true,
          count: tasks.length,
          tasks,
          isAnonymous,
          sessionId: isAnonymous ? sessionId : null
        };
      } catch (error) {
        throw new Error('Error fetching completed tasks');
      }
    },

    voiceLogs: async (_, { limit = 100 }, { userId, sessionId, isAnonymous }) => {
      try {
        let query = {};
        if (isAnonymous) {
          query.sessionId = sessionId;
        } else {
          query.userId = userId;
        }
        
        const logs = await VoiceLog.find(query).sort({ createdAt: -1 }).limit(limit);
        return logs;
      } catch (error) {
        throw new Error('Error fetching voice logs');
      }
    },

    // Voice Memo Queries
    getVoiceMemoUrl: async (_, { memoId }, { userId, deviceId, isAnonymous }) => {
      try {
        // SIMPLIFIED: Find task containing this memo (matching other operations)
        let query = {};
        if (isAnonymous) {
          // SIMPLIFIED: Anonymous can access voice memo URLs from any anonymous task
          query = { userId: null, 'voiceMemos._id': memoId };
        } else {
          // Authenticated can access voice memo URLs from their tasks
          query = { userId: userId, 'voiceMemos._id': memoId };
        }
        
        const task = await Task.findOne(query);
        if (!task) {
          throw new Error('Voice memo not found or access denied');
        }
        
        const memo = task.voiceMemos.id(memoId);
        if (!memo) {
          throw new Error('Voice memo not found');
        }
        
        return `/api/audio/stream/${memo.audioFileId}`;
      } catch (error) {
        throw new Error('Failed to get voice memo URL: ' + error.message);
      }
    },

    searchTasksByVoiceContent: async (_, { query }, { userId, deviceId, isAnonymous }) => {
      try {
        // SIMPLIFIED: Search voice content (matching other operations)
        let searchQuery = {};
        
        if (isAnonymous) {
          // SIMPLIFIED: Anonymous can search voice content from any anonymous task
          searchQuery = { 
            userId: null,
            'voiceMemos.transcription': { $regex: query, $options: 'i' }
          };
        } else {
          // Authenticated can search voice content from their tasks
          searchQuery = { 
            userId: userId,
            'voiceMemos.transcription': { $regex: query, $options: 'i' }
          };
        }
        
        const tasks = await Task.find(searchQuery).sort({ createdAt: -1 });
        return tasks;
      } catch (error) {
        throw new Error('Failed to search tasks by voice content: ' + error.message);
      }
    }
  },
  Mutation: {
    // Auth mutations
    register: async (_, { username, email, password }) => {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
          throw new Error('User with this email or username already exists');
        }

        // Create new user
        const user = new User({
          username,
          email,
          passwordHash: password,
          authProvider: 'local'
        });

        await user.save();

        // Generate JWT token
        const token = jwt.sign(
          { userId: user._id, email: user.email },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );

        return {
          token,
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            profileImage: user.profileImage,
            authProvider: user.authProvider,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin
          }
        };
      } catch (error) {
        throw new Error('Registration failed: ' + error.message);
      }
    },

    login: async (_, { email, password }) => {
      try {
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
          throw new Error('Invalid email or password');
        }

        // Check password
        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
          throw new Error('Invalid email or password');
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate JWT token
        const token = jwt.sign(
          { userId: user._id, email: user.email },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );

        return {
          token,
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            profileImage: user.profileImage,
            authProvider: user.authProvider,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin
          }
        };
      } catch (error) {
        throw new Error('Login failed: ' + error.message);
      }
    },



    createTask: async (_, { title, description, status, priority, dueDate, reminderEnabled, recurrence }, context) => {
      try {
        const { userId, sessionId, deviceId, isAnonymous } = context;
        console.log('🆕 CREATE TASK - Device-specific context:', { 
          isAnonymous, 
          userId, 
          deviceId, 
          title: title.substring(0, 30) 
        });
        
        const taskData = {
          title,
          description: description || '',
          priority: priority || 'medium',
          dueDate: dueDate ? new Date(dueDate) : null,
          reminderEnabled: reminderEnabled !== undefined ? reminderEnabled : true,
          recurrence: recurrence || 'none',
          status: status || 'pending'
        };

        if (isAnonymous) {
          // SIMPLIFIED: Anonymous tasks get no deviceId for now
          taskData.userId = null;
        } else {
          // Authenticated tasks get userId
          taskData.userId = userId;
        }

        const task = new Task(taskData);
        await task.save();
        
        console.log('✅ DEVICE-SPECIFIC task created:', {
          id: task.id,
          title: task.title,
          userId: task.userId,
          deviceId: task.deviceId,
          isAnonymous
        });
        return task;
      } catch (error) {
        console.error('❌ Error creating task:', error);
        throw new Error('Error creating task: ' + error.message);
      }
    },
    updateTask: async (_, { id, title, description, status, priority, reminderEnabled, recurrence }, context) => {
      try {
        const { userId, deviceId, isAnonymous } = context;
        console.log('🔄 UPDATE task - Simplified:', { isAnonymous, userId, taskId: id });
        
        // SIMPLIFIED: Basic task ownership verification
        let query = { _id: id };
        if (isAnonymous) {
          // SIMPLIFIED: Anonymous can update any anonymous task
          query.userId = null;
        } else {
          // Authenticated can update their tasks
          query.userId = userId;
        }

        console.log('🔍 Simplified update query:', query);

        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (status !== undefined) updateData.status = status;
        if (priority !== undefined) updateData.priority = priority;
        if (reminderEnabled !== undefined) updateData.reminderEnabled = reminderEnabled;
        if (recurrence !== undefined) updateData.recurrence = recurrence;

        const task = await Task.findOneAndUpdate(
          query,
          updateData,
          { new: true, runValidators: true }
        );
        
        if (!task) {
          console.log('❌ Task not found with STRICT query:', query);
          throw new Error('Task not found or access denied');
        }
        
        console.log('✅ STRICT task updated:', { title: task.title, userId: task.userId, sessionId: task.sessionId });
        return task;
      } catch (error) {
        console.error('❌ Error updating task:', error);
        throw new Error('Error updating task: ' + error.message);
      }
    },

    deleteTask: async (_, { id }, context) => {
      try {
        const { userId, deviceId, isAnonymous } = context;
        console.log('🗑️ DELETE task - Simplified:', { isAnonymous, userId, taskId: id });
        
        // SIMPLIFIED: Basic task ownership verification
        let query = { _id: id };
        if (isAnonymous) {
          // SIMPLIFIED: Anonymous can delete any anonymous task
          query.userId = null;
        } else {
          // Authenticated can delete their tasks
          query.userId = userId;
        }

        console.log('🔍 Simplified delete query:', query);
        const result = await Task.findOneAndDelete(query);
        console.log('✅ STRICT task deleted:', !!result);
        return !!result;
      } catch (error) {
        console.error('❌ Error deleting task:', error);
        return false;
      }
    },

    markTaskComplete: async (_, { id }, { userId, deviceId, isAnonymous }) => {
      try {
        // SIMPLIFIED: Basic task ownership verification
        let query = { _id: id };
        if (isAnonymous) {
          // SIMPLIFIED: Anonymous can complete any anonymous task
          query.userId = null;
        } else {
          // Authenticated can complete their tasks
          query.userId = userId;
        }

        console.log('🔍 Simplified complete query:', query);
        const task = await Task.findOneAndUpdate(
          query,
          { status: 'completed', completedAt: new Date() },
          { new: true, runValidators: true }
        );
        
        if (!task) {
          console.log('❌ Task not found with STRICT query:', query);
          throw new Error('Task not found or access denied');
        }
        
        console.log('✅ STRICT task completed:', { title: task.title, userId: task.userId, sessionId: task.sessionId });
        return task;
      } catch (error) {
        throw new Error('Error marking task as complete');
      }
    },

    bulkDeleteCompleted: async (_, __, { userId, deviceId, isAnonymous }) => {
      try {
        let query = { status: 'completed' };
        if (isAnonymous) {
          query.userId = null;
        } else {
          query.userId = userId;
        }

        const result = await Task.deleteMany(query);
        console.log('🗑️ BULK DELETE completed tasks:', result.deletedCount);
        return true;
      } catch (error) {
        console.error('❌ Error bulk deleting completed tasks:', error);
        return false;
      }
    },

    bulkDeleteAll: async (_, __, { userId, deviceId, isAnonymous }) => {
      try {
        let query = {};
        if (isAnonymous) {
          // SIMPLIFIED: Anonymous can delete all anonymous tasks
          query.userId = null;
        } else {
          // Authenticated can delete all their tasks
          query.userId = userId;
        }

        const result = await Task.deleteMany(query);
        console.log('🗑️ BULK DELETE ALL tasks:', result.deletedCount);
        return true;
      } catch (error) {
        console.error('❌ Error bulk deleting all tasks:', error);
        return false;
      }
    },

    bulkUpdateStatus: async (_, { status }, { userId, deviceId, isAnonymous }) => {
      try {
        let query = {};
        if (isAnonymous) {
          // SIMPLIFIED: Anonymous can update all anonymous tasks
          query.userId = null;
        } else {
          // Authenticated can update all their tasks
          query.userId = userId;
        }

        const updateData = { 
          status,
          updatedAt: new Date()
        };

        // If marking as completed, set completedAt
        if (status === 'completed') {
          updateData.completedAt = new Date();
        } else {
          updateData.completedAt = null;
        }

        const result = await Task.updateMany(query, updateData);
        console.log(`🔄 BULK UPDATE STATUS to ${status}:`, result.modifiedCount, 'tasks updated');
        return result.modifiedCount;
      } catch (error) {
        console.error('❌ Error bulk updating task status:', error);
        throw new Error('Failed to update task status');
      }
    },

    duplicateTask: async (_, { id }, { userId, sessionId, isAnonymous }) => {
      try {
        let query = { _id: id };
        if (isAnonymous) {
          query.sessionId = sessionId;
        } else {
          query.userId = userId;
        }

        const originalTask = await Task.findOne(query);
        if (!originalTask) throw new Error('Task not found or access denied');
        
        const duplicatedTaskData = {
          title: `${originalTask.title} (Copy)`,
          description: originalTask.description,
          status: 'pending',
          priority: originalTask.priority,
          dueDate: originalTask.dueDate,
          reminderEnabled: originalTask.reminderEnabled,
          recurrence: originalTask.recurrence
        };

        if (isAnonymous) {
          duplicatedTaskData.sessionId = sessionId;
        } else {
          duplicatedTaskData.userId = userId;
        }
        
        const duplicatedTask = new Task(duplicatedTaskData);
        await duplicatedTask.save();
        return duplicatedTask;
      } catch (error) {
        throw new Error('Error duplicating task');
      }
    },

    createVoiceLog: async (_, { rawCommand, interpretedIntent, actionTriggered, success }, { userId, sessionId, isAnonymous }) => {
      try {
        const voiceLogData = {
          rawCommand,
          interpretedIntent,
          actionTriggered: actionTriggered || '',
          success
        };

        if (isAnonymous) {
          voiceLogData.sessionId = sessionId;
        } else {
          voiceLogData.userId = userId;
        }

        const voiceLog = new VoiceLog(voiceLogData);
        await voiceLog.save();
        return voiceLog;
      } catch (error) {
        throw new Error('Error creating voice log');
      }
    },

    clearVoiceLogs: async (_, __, { userId, sessionId, isAnonymous }) => {
      try {
        let query = {};
        if (isAnonymous) {
          query.sessionId = sessionId;
        } else {
          query.userId = userId;
        }

        const result = await VoiceLog.deleteMany(query);
        return result.deletedCount;
      } catch (error) {
        return 0;
      }
    },

    migrateAnonymousTasks: async (_, __, { userId, sessionId, isAnonymous }) => {
      if (isAnonymous) {
        throw new Error('Must be authenticated to migrate data');
      }

      try {
        // MIGRATE: Move anonymous tasks and logs to authenticated user
        const sessionIdToMigrate = sessionId;

        // Migrate tasks: move from sessionId to userId
        const tasksResult = await Task.updateMany(
          { sessionId: sessionIdToMigrate, userId: null },
          { $set: { userId }, $unset: { sessionId: 1 } }
        );

        // Migrate voice logs
        const logsResult = await VoiceLog.updateMany(
          { sessionId: sessionIdToMigrate, userId: null },
          { $set: { userId }, $unset: { sessionId: 1 } }
        );

        console.log('🔄 Migration completed:', {
          migratedTasksCount: tasksResult.modifiedCount,
          migratedLogsCount: logsResult.modifiedCount
        });

        return {
          success: true,
          migratedTasksCount: tasksResult.modifiedCount,
          migratedLogsCount: logsResult.modifiedCount
        };
      } catch (error) {
        throw new Error('Error migrating anonymous data: ' + error.message);
      }
    },

    migrateAnonymousTasksToDevice: async (_, __, { deviceId, isAnonymous }) => {
      if (!isAnonymous) {
        throw new Error('This migration is only for anonymous users');
      }

      try {
        // DEVICE MIGRATION: Assign existing anonymous tasks to current device
        const tasksResult = await Task.updateMany(
          { 
            userId: null, 
            deviceId: { $exists: false },
            $or: [
              { sessionId: { $exists: true } },
              { sessionId: { $exists: false } }
            ]
          },
          { $set: { deviceId } }
        );

        console.log('📱 Device migration completed:', {
          migratedTasksCount: tasksResult.modifiedCount,
          deviceId
        });

        return `Successfully migrated ${tasksResult.modifiedCount} anonymous tasks to device ${deviceId}`;
      } catch (error) {
        throw new Error('Error migrating anonymous tasks to device: ' + error.message);
      }
    },

    // Voice Memo Mutations (Upload handled via REST endpoint)
    refreshTask: async (_, { taskId }, { userId, deviceId, isAnonymous }) => {
      try {
        // Simple query to refresh task data after voice memo upload
        let query = { _id: taskId };
        if (isAnonymous) {
          query.userId = null;
          query.deviceId = deviceId;
        } else {
          query.userId = userId;
        }
        
        const task = await Task.findOne(query);
        return task;
      } catch (error) {
        throw new Error('Task not found');
      }
    },

    deleteVoiceMemo: async (_, { taskId, memoId }, { userId, deviceId, isAnonymous }) => {
      try {
        console.log('🗑️ DELETE VOICE MEMO - Request:', { taskId, memoId, userId, deviceId, isAnonymous });
        
        // SIMPLIFIED: Basic task ownership verification (matching other operations)
        let query = { _id: taskId };
        if (isAnonymous) {
          // SIMPLIFIED: Anonymous can delete voice memos from any anonymous task
          query.userId = null;
        } else {
          // Authenticated can delete voice memos from their tasks
          query.userId = userId;
        }
        
        console.log('🗑️ DELETE VOICE MEMO - Simplified Query:', query);
        
        const task = await Task.findOne(query);
        if (!task) {
          console.log('🗑️ DELETE VOICE MEMO - Task not found');
          throw new Error('Task not found or access denied');
        }
        
        console.log('🗑️ DELETE VOICE MEMO - Task found, voice memos count:', task.voiceMemos?.length || 0);
        
        // Find the voice memo
        const memo = task.voiceMemos.id(memoId);
        if (!memo) {
          console.log('🗑️ DELETE VOICE MEMO - Voice memo not found in task');
          throw new Error('Voice memo not found');
        }
        
        console.log('🗑️ DELETE VOICE MEMO - Voice memo found:', memo.fileName);
        
        // Delete from GridFS
        try {
          await global.gridFSBucket.delete(new mongoose.Types.ObjectId(memo.audioFileId));
        } catch (error) {
          console.warn('GridFS file not found, continuing with memo deletion');
        }
        
        // Remove from task using the memo's actual _id
        const updateResult = await Task.findByIdAndUpdate(taskId, {
          $pull: { voiceMemos: { _id: memo._id } }
        });
        
        console.log('🗑️ DELETE VOICE MEMO - Update result:', updateResult ? 'Success' : 'Failed');
        
        return true;
      } catch (error) {
        console.error('Delete voice memo error:', error);
        throw new Error('Failed to delete voice memo: ' + error.message);
      }
    },


  },

  // Voice Memo Type Resolvers
  VoiceMemo: {
    createdBy: async (voiceMemo) => {
      if (!voiceMemo.createdBy) return null;
      try {
        return await User.findById(voiceMemo.createdBy);
      } catch (error) {
        return null;
      }
    }
  },

  // Task Type Resolvers
  Task: {
    voiceMemos: async (task) => {
      if (!task.voiceMemos || task.voiceMemos.length === 0) {
        return [];
      }
      
      return task.voiceMemos.map(memo => ({
        id: memo._id.toString(),
        audioFileId: memo.audioFileId.toString(),
        fileName: memo.fileName,
        fileSize: memo.fileSize,
        duration: memo.duration,
        mimeType: memo.mimeType,
        transcription: memo.transcription || '',
        transcriptionConfidence: memo.transcriptionConfidence,
        createdAt: memo.createdAt,
        createdBy: memo.createdBy,
        audioUrl: `/api/audio/stream/${memo.audioFileId}`
      }));
    }
  }
};

module.exports = resolvers;