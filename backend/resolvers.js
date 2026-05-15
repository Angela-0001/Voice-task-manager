const Task = require('./models/Task');
const VoiceLog = require('./models/VoiceLog');
const User = require('./models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { GraphQLScalarType } = require('graphql');
const { Kind } = require('graphql/language');
const mongoose = require('mongoose');

// DateTime scalar
const DateTime = new GraphQLScalarType({
  name: 'DateTime',
  serialize: (value) => value.toISOString(),
  parseValue: (value) => new Date(value),
  parseLiteral: (ast) => {
    if (ast.kind === Kind.STRING) return new Date(ast.value);
    return null;
  },
});

// Helper: require authenticated user or throw
function requireAuth(userId) {
  if (!userId) throw new Error('Authentication required');
}

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
      } catch {
        throw new Error('Error fetching user');
      }
    },

    tasks: async (_, __, { userId }) => {
      requireAuth(userId);
      const tasks = await Task.find({ userId }).sort({ createdAt: 1 });
      return { success: true, count: tasks.length, tasks };
    },

    task: async (_, { id }, { userId }) => {
      requireAuth(userId);
      const task = await Task.findOne({ _id: id, userId });
      if (!task) throw new Error('Task not found');
      return task;
    },

    pendingTasks: async (_, __, { userId }) => {
      requireAuth(userId);
      const tasks = await Task.find({ userId, status: 'pending' }).sort({ createdAt: 1 });
      return { success: true, count: tasks.length, tasks };
    },

    completedTasks: async (_, __, { userId }) => {
      requireAuth(userId);
      const tasks = await Task.find({ userId, status: 'completed' }).sort({ createdAt: 1 });
      return { success: true, count: tasks.length, tasks };
    },

    voiceLogs: async (_, { limit = 100 }, { userId }) => {
      requireAuth(userId);
      return await VoiceLog.find({ userId }).sort({ createdAt: -1 }).limit(limit);
    },

    getVoiceMemoUrl: async (_, { memoId }, { userId }) => {
      requireAuth(userId);
      const task = await Task.findOne({ userId, 'voiceMemos._id': memoId });
      if (!task) throw new Error('Voice memo not found or access denied');
      const memo = task.voiceMemos.id(memoId);
      if (!memo) throw new Error('Voice memo not found');
      return `/api/audio/stream/${memo.audioFileId}`;
    },

    searchTasksByVoiceContent: async (_, { query }, { userId }) => {
      requireAuth(userId);
      return await Task.find({
        userId,
        'voiceMemos.transcription': { $regex: query, $options: 'i' }
      }).sort({ createdAt: -1 });
    }
  },

  Mutation: {
    register: async (_, { username, email, password }) => {
      const existing = await User.findOne({ $or: [{ email }, { username }] });
      if (existing) throw new Error('User with this email or username already exists');

      const user = new User({ username, email, passwordHash: password, authProvider: 'local' });
      await user.save();

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
    },

    login: async (_, { email, password }) => {
      const user = await User.findOne({ email });
      if (!user) throw new Error('Invalid email or password');

      const isValid = await user.comparePassword(password);
      if (!isValid) throw new Error('Invalid email or password');

      user.lastLogin = new Date();
      await user.save();

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
    },

    createTask: async (_, { title, description, status, priority, dueDate, reminderEnabled, recurrence }, { userId }) => {
      requireAuth(userId);
      const task = new Task({
        userId,
        title,
        description: description || '',
        priority: priority || 'medium',
        dueDate: dueDate ? new Date(dueDate) : null,
        reminderEnabled: reminderEnabled !== undefined ? reminderEnabled : true,
        recurrence: recurrence || 'none',
        status: status || 'pending'
      });
      await task.save();
      return task;
    },

    updateTask: async (_, { id, title, description, status, priority, reminderEnabled, recurrence }, { userId }) => {
      requireAuth(userId);
      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (status !== undefined) updateData.status = status;
      if (priority !== undefined) updateData.priority = priority;
      if (reminderEnabled !== undefined) updateData.reminderEnabled = reminderEnabled;
      if (recurrence !== undefined) updateData.recurrence = recurrence;

      const task = await Task.findOneAndUpdate(
        { _id: id, userId },
        updateData,
        { new: true, runValidators: true }
      );
      if (!task) throw new Error('Task not found or access denied');
      return task;
    },

    deleteTask: async (_, { id }, { userId }) => {
      requireAuth(userId);
      const result = await Task.findOneAndDelete({ _id: id, userId });
      return !!result;
    },

    markTaskComplete: async (_, { id }, { userId }) => {
      requireAuth(userId);
      const task = await Task.findOneAndUpdate(
        { _id: id, userId },
        { status: 'completed', completedAt: new Date() },
        { new: true, runValidators: true }
      );
      if (!task) throw new Error('Task not found or access denied');
      return task;
    },

    bulkDeleteCompleted: async (_, __, { userId }) => {
      requireAuth(userId);
      await Task.deleteMany({ userId, status: 'completed' });
      return true;
    },

    bulkDeleteAll: async (_, __, { userId }) => {
      requireAuth(userId);
      await Task.deleteMany({ userId });
      return true;
    },

    bulkUpdateStatus: async (_, { status }, { userId }) => {
      requireAuth(userId);
      const updateData = { status, updatedAt: new Date() };
      if (status === 'completed') updateData.completedAt = new Date();
      else updateData.completedAt = null;

      const result = await Task.updateMany({ userId }, updateData);
      return result.modifiedCount;
    },

    duplicateTask: async (_, { id }, { userId }) => {
      requireAuth(userId);
      const original = await Task.findOne({ _id: id, userId });
      if (!original) throw new Error('Task not found or access denied');

      const duplicate = new Task({
        userId,
        title: `${original.title} (Copy)`,
        description: original.description,
        status: 'pending',
        priority: original.priority,
        dueDate: original.dueDate,
        reminderEnabled: original.reminderEnabled,
        recurrence: original.recurrence
      });
      await duplicate.save();
      return duplicate;
    },

    createVoiceLog: async (_, { rawCommand, interpretedIntent, actionTriggered, success }, { userId }) => {
      requireAuth(userId);
      const voiceLog = new VoiceLog({
        userId,
        rawCommand,
        interpretedIntent,
        actionTriggered: actionTriggered || '',
        success
      });
      await voiceLog.save();
      return voiceLog;
    },

    clearVoiceLogs: async (_, __, { userId }) => {
      requireAuth(userId);
      const result = await VoiceLog.deleteMany({ userId });
      return result.deletedCount;
    },

    refreshTask: async (_, { taskId }, { userId }) => {
      requireAuth(userId);
      return await Task.findOne({ _id: taskId, userId });
    },

    deleteVoiceMemo: async (_, { taskId, memoId }, { userId }) => {
      requireAuth(userId);
      const task = await Task.findOne({ _id: taskId, userId });
      if (!task) throw new Error('Task not found or access denied');

      const memo = task.voiceMemos.id(memoId);
      if (!memo) throw new Error('Voice memo not found');

      try {
        await global.gridFSBucket.delete(new mongoose.Types.ObjectId(memo.audioFileId));
      } catch {
        // GridFS file already gone, continue
      }

      await Task.findByIdAndUpdate(taskId, { $pull: { voiceMemos: { _id: memo._id } } });
      return true;
    },
  },

  VoiceMemo: {
    createdBy: async (voiceMemo) => {
      if (!voiceMemo.createdBy) return null;
      try {
        return await User.findById(voiceMemo.createdBy);
      } catch {
        return null;
      }
    }
  },

  Task: {
    voiceMemos: async (task) => {
      if (!task.voiceMemos || task.voiceMemos.length === 0) return [];
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
