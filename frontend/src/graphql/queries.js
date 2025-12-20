import { gql } from '@apollo/client';

// Auth queries
export const ME = gql`
  query Me {
    me {
      id
      username
      email
      profileImage
      authProvider
      createdAt
      lastLogin
    }
  }
`;

export const REGISTER = gql`
  mutation Register($username: String!, $email: String!, $password: String!) {
    register(username: $username, email: $email, password: $password) {
      token
      user {
        id
        username
        email
        profileImage
        authProvider
        createdAt
        lastLogin
      }
    }
  }
`;

export const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        username
        email
        profileImage
        authProvider
        createdAt
        lastLogin
      }
    }
  }
`;



// Task queries
export const GET_TASKS = gql`
  query GetTasks {
    tasks {
      success
      count
      isAnonymous
      sessionId
      tasks {
        id
        userId
        sessionId
        title
        description
        status
        dueDate
        priority
        reminderEnabled
        recurrence
        completedAt
        voiceMemos {
          id
          audioFileId
          fileName
          duration
          fileSize
          transcription
          transcriptionConfidence
          createdAt
          audioUrl
        }
        createdAt
        updatedAt
      }
    }
  }
`;

export const GET_PENDING_TASKS = gql`
  query GetPendingTasks {
    pendingTasks {
      success
      count
      isAnonymous
      sessionId
      tasks {
        id
        title
        description
        status
        priority
        dueDate
        createdAt
      }
    }
  }
`;

export const GET_COMPLETED_TASKS = gql`
  query GetCompletedTasks {
    completedTasks {
      success
      count
      isAnonymous
      sessionId
      tasks {
        id
        title
        description
        status
        priority
        completedAt
        createdAt
      }
    }
  }
`;

export const CREATE_TASK = gql`
  mutation CreateTask($title: String!, $description: String, $status: TaskStatus, $priority: Priority, $dueDate: DateTime, $reminderEnabled: Boolean, $recurrence: Recurrence) {
    createTask(title: $title, description: $description, status: $status, priority: $priority, dueDate: $dueDate, reminderEnabled: $reminderEnabled, recurrence: $recurrence) {
      id
      userId
      sessionId
      title
      description
      status
      dueDate
      priority
      reminderEnabled
      recurrence
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_TASK = gql`
  mutation UpdateTask($id: ID!, $title: String, $description: String, $status: TaskStatus, $priority: Priority, $reminderEnabled: Boolean, $recurrence: Recurrence) {
    updateTask(id: $id, title: $title, description: $description, status: $status, priority: $priority, reminderEnabled: $reminderEnabled, recurrence: $recurrence) {
      id
      title
      description
      status
      dueDate
      priority
      reminderEnabled
      recurrence
      updatedAt
    }
  }
`;

export const DELETE_TASK = gql`
  mutation DeleteTask($id: ID!) {
    deleteTask(id: $id)
  }
`;

export const MARK_TASK_COMPLETE = gql`
  mutation MarkTaskComplete($id: ID!) {
    markTaskComplete(id: $id) {
      id
      title
      status
      completedAt
      updatedAt
    }
  }
`;

export const BULK_DELETE_COMPLETED = gql`
  mutation BulkDeleteCompleted {
    bulkDeleteCompleted
  }
`;

export const BULK_DELETE_ALL = gql`
  mutation BulkDeleteAll {
    bulkDeleteAll
  }
`;

export const BULK_UPDATE_STATUS = gql`
  mutation BulkUpdateStatus($status: TaskStatus!) {
    bulkUpdateStatus(status: $status)
  }
`;

export const DUPLICATE_TASK = gql`
  mutation DuplicateTask($id: ID!) {
    duplicateTask(id: $id) {
      id
      title
      description
      status
      priority
      dueDate
      createdAt
      updatedAt
    }
  }
`;

// Voice Log queries
export const GET_VOICE_LOGS = gql`
  query GetVoiceLogs($limit: Int) {
    voiceLogs(limit: $limit) {
      id
      userId
      sessionId
      rawCommand
      interpretedIntent
      actionTriggered
      success
      timestamp
    }
  }
`;

export const CREATE_VOICE_LOG = gql`
  mutation CreateVoiceLog($rawCommand: String!, $interpretedIntent: String!, $actionTriggered: String, $success: Boolean!) {
    createVoiceLog(rawCommand: $rawCommand, interpretedIntent: $interpretedIntent, actionTriggered: $actionTriggered, success: $success) {
      id
      rawCommand
      interpretedIntent
      actionTriggered
      success
      timestamp
    }
  }
`;

export const CLEAR_VOICE_LOGS = gql`
  mutation ClearVoiceLogs {
    clearVoiceLogs
  }
`;

// Migration
export const MIGRATE_ANONYMOUS_TASKS = gql`
  mutation MigrateAnonymousTasks {
    migrateAnonymousTasks {
      success
      migratedTasksCount
      migratedLogsCount
    }
  }
`;
// Voice Memo queries
export const DELETE_VOICE_MEMO = gql`
  mutation DeleteVoiceMemo($taskId: ID!, $memoId: ID!) {
    deleteVoiceMemo(taskId: $taskId, memoId: $memoId)
  }
`;



export const GET_VOICE_MEMO_URL = gql`
  query GetVoiceMemoUrl($memoId: ID!) {
    getVoiceMemoUrl(memoId: $memoId)
  }
`;

export const SEARCH_TASKS_BY_VOICE = gql`
  query SearchTasksByVoiceContent($query: String!) {
    searchTasksByVoiceContent(query: $query) {
      id
      title
      description
      status
      priority
      voiceMemos {
        id
        transcription
        transcriptionConfidence
        createdAt
      }
    }
  }
`;