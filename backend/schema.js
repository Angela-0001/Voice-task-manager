const { gql } = require('apollo-server-express');

const typeDefs = gql`
  scalar DateTime

  type User {
    id: ID!
    username: String!
    email: String!
    profileImage: String
    authProvider: String!
    createdAt: DateTime!
    lastLogin: DateTime!
  }

  type VoiceMemo {
    id: ID!
    audioFileId: String!
    fileName: String!
    fileSize: Int!
    duration: Float!
    mimeType: String!
    transcription: String
    transcriptionConfidence: Float
    createdAt: DateTime!
    createdBy: User
    audioUrl: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Task {
    id: ID!
    userId: ID
    sessionId: String
    title: String!
    description: String
    priority: Priority!
    status: TaskStatus!
    dueDate: DateTime
    reminderEnabled: Boolean
    recurrence: Recurrence!
    completedAt: DateTime
    voiceMemos: [VoiceMemo!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type VoiceLog {
    id: ID!
    userId: ID
    sessionId: String
    rawCommand: String!
    interpretedIntent: String!
    actionTriggered: String
    success: Boolean!
    timestamp: DateTime!
  }

  type TasksResponse {
    success: Boolean!
    count: Int!
    tasks: [Task!]!
    isAnonymous: Boolean!
    sessionId: String
  }

  type MigrationResponse {
    success: Boolean!
    migratedTasksCount: Int!
    migratedLogsCount: Int!
  }



  enum Priority { low, medium, high }
  enum TaskStatus { pending, in_progress, completed }
  enum Recurrence { none, daily, weekly, monthly }



  type Query {
    # Auth
    me: User
    
    # Tasks (returns count and metadata matching reference)
    tasks: TasksResponse!
    task(id: ID!): Task
    pendingTasks: TasksResponse!
    completedTasks: TasksResponse!
    

    
    # Voice Logs
    voiceLogs(limit: Int): [VoiceLog!]!
    
    # Voice Memos
    getVoiceMemoUrl(memoId: ID!): String!
    searchTasksByVoiceContent(query: String!): [Task!]!
  }

  type Mutation {
    # Auth
    register(username: String!, email: String!, password: String!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!

    
    # Tasks (matching reference response structure)
    createTask(
      title: String!
      description: String
      status: TaskStatus
      priority: Priority
      dueDate: DateTime
      reminderEnabled: Boolean
      recurrence: Recurrence
    ): Task!
    
    updateTask(
      id: ID!
      title: String
      description: String
      status: TaskStatus
      priority: Priority
      reminderEnabled: Boolean
      recurrence: Recurrence
    ): Task!
    
    deleteTask(id: ID!): Boolean!
    markTaskComplete(id: ID!): Task!
    bulkDeleteCompleted: Boolean!
    bulkDeleteAll: Boolean!
    bulkUpdateStatus(status: TaskStatus!): Int!
    duplicateTask(id: ID!): Task!
    
    # Voice Logs
    createVoiceLog(
      rawCommand: String!
      interpretedIntent: String!
      actionTriggered: String
      success: Boolean!
    ): VoiceLog!
    
    clearVoiceLogs: Int!
    
    # Migration
    migrateAnonymousTasks: MigrationResponse!
    migrateAnonymousTasksToDevice: String!
    
    # Voice Memos (Upload via REST /api/voice-memo/upload)
    refreshTask(taskId: ID!): Task
    deleteVoiceMemo(taskId: ID!, memoId: ID!): Boolean!
  }
`;

module.exports = typeDefs;