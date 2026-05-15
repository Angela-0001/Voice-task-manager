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
    userId: ID!
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
    userId: ID!
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
  }

  enum Priority { low, medium, high }
  enum TaskStatus { pending, in_progress, completed }
  enum Recurrence { none, daily, weekly, monthly }

  type Query {
    me: User
    tasks: TasksResponse!
    task(id: ID!): Task
    pendingTasks: TasksResponse!
    completedTasks: TasksResponse!
    voiceLogs(limit: Int): [VoiceLog!]!
    getVoiceMemoUrl(memoId: ID!): String!
    searchTasksByVoiceContent(query: String!): [Task!]!
  }

  type Mutation {
    register(username: String!, email: String!, password: String!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!

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

    createVoiceLog(
      rawCommand: String!
      interpretedIntent: String!
      actionTriggered: String
      success: Boolean!
    ): VoiceLog!

    clearVoiceLogs: Int!

    refreshTask(taskId: ID!): Task
    deleteVoiceMemo(taskId: ID!, memoId: ID!): Boolean!
  }
`;

module.exports = typeDefs;
