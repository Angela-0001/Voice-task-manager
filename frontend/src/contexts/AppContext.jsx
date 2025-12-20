import { createContext, useContext, useReducer, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { GET_TASKS } from '../graphql/queries';

// Initial state
const initialState = {
  tasks: [],
  currentPage: 'home',
  user: { id: 'anonymous', name: 'Anonymous User' },
  settings: {
    voice: {
      rate: 1.0,
      pitch: 1.0,
      voice: '',
      enabled: true
    },
    notifications: {
      enabled: true,
      sound: true,
      reminders: true
    },
    display: {
      theme: 'dark',
      compactMode: false,
      showCompleted: true
    }
  },
  voiceHistory: [],
  loading: false,
  error: null,
  snackbar: { open: false, message: '', severity: 'success' }
};

// Action types
const ActionTypes = {
  SET_TASKS: 'SET_TASKS',
  ADD_TASK: 'ADD_TASK',
  UPDATE_TASK: 'UPDATE_TASK',
  DELETE_TASK: 'DELETE_TASK',
  SET_CURRENT_PAGE: 'SET_CURRENT_PAGE',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  ADD_VOICE_LOG: 'ADD_VOICE_LOG',
  CLEAR_VOICE_HISTORY: 'CLEAR_VOICE_HISTORY',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SHOW_SNACKBAR: 'SHOW_SNACKBAR',
  HIDE_SNACKBAR: 'HIDE_SNACKBAR',
  BULK_DELETE_COMPLETED: 'BULK_DELETE_COMPLETED',
  DUPLICATE_TASK: 'DUPLICATE_TASK'
};

// Reducer function
const appReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_TASKS:
      return { ...state, tasks: action.payload };
    
    case ActionTypes.ADD_TASK:
      return { 
        ...state, 
        tasks: [action.payload, ...state.tasks] 
      };
    
    case ActionTypes.UPDATE_TASK:
      return {
        ...state,
        tasks: state.tasks.map(task =>
          task.id === action.payload.id
            ? { ...task, ...action.payload.updates, updatedAt: new Date().toISOString() }
            : task
        )
      };
    
    case ActionTypes.DELETE_TASK:
      return {
        ...state,
        tasks: state.tasks.filter(task => task.id !== action.payload)
      };
    
    case ActionTypes.BULK_DELETE_COMPLETED:
      return {
        ...state,
        tasks: state.tasks.filter(task => task.status !== 'completed')
      };
    
    case ActionTypes.DUPLICATE_TASK:
      const taskToDuplicate = state.tasks.find(task => task.id === action.payload);
      if (taskToDuplicate) {
        const duplicatedTask = {
          ...taskToDuplicate,
          id: Date.now().toString(),
          title: `${taskToDuplicate.title} (Copy)`,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        return {
          ...state,
          tasks: [duplicatedTask, ...state.tasks]
        };
      }
      return state;
    
    case ActionTypes.SET_CURRENT_PAGE:
      return { ...state, currentPage: action.payload };
    
    case ActionTypes.UPDATE_SETTINGS:
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload
        }
      };
    
    case ActionTypes.ADD_VOICE_LOG:
      const newLog = {
        id: Date.now().toString(),
        ...action.payload,
        timestamp: new Date().toISOString()
      };
      return {
        ...state,
        voiceHistory: [newLog, ...state.voiceHistory.slice(0, 49)] // Keep last 50
      };
    
    case ActionTypes.CLEAR_VOICE_HISTORY:
      return { ...state, voiceHistory: [] };
    
    case ActionTypes.SET_LOADING:
      return { ...state, loading: action.payload };
    
    case ActionTypes.SET_ERROR:
      return { ...state, error: action.payload };
    
    case ActionTypes.SHOW_SNACKBAR:
      return {
        ...state,
        snackbar: { open: true, ...action.payload }
      };
    
    case ActionTypes.HIDE_SNACKBAR:
      return {
        ...state,
        snackbar: { ...state.snackbar, open: false }
      };
    
    default:
      return state;
  }
};

// Create context
const AppContext = createContext();

// Provider component
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  // Remove the AppContext's own GraphQL query to avoid conflicts
  // Tasks will be managed by individual components

  // Load settings and voice history from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('voicetask-settings');
    const savedVoiceHistory = localStorage.getItem('voicetask-voice-history');

    if (savedSettings) {
      dispatch({ type: ActionTypes.UPDATE_SETTINGS, payload: JSON.parse(savedSettings) });
    }

    if (savedVoiceHistory) {
      const history = JSON.parse(savedVoiceHistory);
      history.forEach(log => {
        dispatch({ type: ActionTypes.ADD_VOICE_LOG, payload: log });
      });
    }
  }, []);

  // Save settings and voice history to localStorage when they change
  // Note: We don't save tasks to localStorage anymore since they come from GraphQL

  useEffect(() => {
    localStorage.setItem('voicetask-settings', JSON.stringify(state.settings));
  }, [state.settings]);

  useEffect(() => {
    localStorage.setItem('voicetask-voice-history', JSON.stringify(state.voiceHistory));
  }, [state.voiceHistory]);

  // Action creators
  const actions = {
    // Task actions - direct state updates for immediate UI response
    createTask: (taskData) => {
      const newTask = {
        id: Date.now().toString(),
        ...taskData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      dispatch({ type: ActionTypes.ADD_TASK, payload: newTask });
      dispatch({ 
        type: ActionTypes.SHOW_SNACKBAR, 
        payload: { message: '✅ Task created successfully!', severity: 'success' } 
      });
    },

    updateTask: (id, updates) => {
      dispatch({ type: ActionTypes.UPDATE_TASK, payload: { id, updates } });
      dispatch({ 
        type: ActionTypes.SHOW_SNACKBAR, 
        payload: { message: '✅ Task updated!', severity: 'success' } 
      });
    },

    deleteTask: (id) => {
      dispatch({ type: ActionTypes.DELETE_TASK, payload: id });
      dispatch({ 
        type: ActionTypes.SHOW_SNACKBAR, 
        payload: { message: '🗑️ Task deleted', severity: 'info' } 
      });
    },

    // Direct state manipulation functions for immediate UI updates
    addTaskToState: (task) => {
      dispatch({ type: ActionTypes.ADD_TASK, payload: task });
    },

    updateTaskInState: (id, updates) => {
      dispatch({ type: ActionTypes.UPDATE_TASK, payload: { id, updates } });
    },

    removeTaskFromState: (id) => {
      dispatch({ type: ActionTypes.DELETE_TASK, payload: id });
    },



    bulkDeleteCompleted: () => {
      dispatch({ type: ActionTypes.BULK_DELETE_COMPLETED });
      dispatch({ 
        type: ActionTypes.SHOW_SNACKBAR, 
        payload: { message: '🗑️ All completed tasks deleted', severity: 'info' } 
      });
    },

    duplicateTask: (id) => {
      dispatch({ type: ActionTypes.DUPLICATE_TASK, payload: id });
      dispatch({ 
        type: ActionTypes.SHOW_SNACKBAR, 
        payload: { message: '📋 Task duplicated', severity: 'success' } 
      });
    },

    // Navigation
    setCurrentPage: (page) => {
      dispatch({ type: ActionTypes.SET_CURRENT_PAGE, payload: page });
    },

    // Settings
    updateSettings: (settings) => {
      dispatch({ type: ActionTypes.UPDATE_SETTINGS, payload: settings });
    },

    // Voice history
    addVoiceLog: (command, success, action = 'unknown') => {
      dispatch({ 
        type: ActionTypes.ADD_VOICE_LOG, 
        payload: { command, success, action } 
      });
    },

    clearVoiceHistory: () => {
      dispatch({ type: ActionTypes.CLEAR_VOICE_HISTORY });
    },

    // UI state
    setLoading: (loading) => {
      dispatch({ type: ActionTypes.SET_LOADING, payload: loading });
    },

    setError: (error) => {
      dispatch({ type: ActionTypes.SET_ERROR, payload: error });
    },

    showSnackbar: (message, severity = 'success') => {
      dispatch({ 
        type: ActionTypes.SHOW_SNACKBAR, 
        payload: { message, severity } 
      });
    },

    hideSnackbar: () => {
      dispatch({ type: ActionTypes.HIDE_SNACKBAR });
    },

    // Voice command processing (legacy - now handled by VoiceControl component)
    processVoiceCommand: (command) => {
      console.log('Legacy voice command processing:', command);
      // This is now handled by the VoiceControl component with GraphQL
      // Keeping for backward compatibility
      actions.addVoiceLog(command.command || command, command.success || false, command.action || 'legacy');
    }
  };

  // Expose global navigation function for voice commands
  useEffect(() => {
    window.setCurrentPage = actions.setCurrentPage;
    return () => {
      delete window.setCurrentPage;
    };
  }, []);

  const value = {
    ...state,
    ...actions
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook to use the context
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export default AppContext;