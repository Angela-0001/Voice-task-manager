import { createContext, useContext, useReducer, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { ME, LOGIN, REGISTER, MIGRATE_ANONYMOUS_TASKS } from '../graphql/queries';
import client from '../apollo/client';

// Initial state
const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  isAnonymous: true
};

// Action types
const ActionTypes = {
  SET_USER: 'SET_USER',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  LOGOUT: 'LOGOUT'
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_USER:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        isAnonymous: !action.payload,
        isLoading: false,
        error: null
      };
    case ActionTypes.SET_LOADING:
      return { ...state, isLoading: action.payload };
    case ActionTypes.SET_ERROR:
      return { ...state, error: action.payload, isLoading: false };
    case ActionTypes.LOGOUT:
      return {
        ...initialState,
        isLoading: false,
        isAnonymous: true
      };
    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check if user is authenticated on app load
  const { data: userData, loading: userLoading, error: userError } = useQuery(ME, {
    errorPolicy: 'ignore',
    skip: !localStorage.getItem('auth_token')
  });

  // Handle user data changes
  useEffect(() => {
    if (userData?.me) {
      dispatch({ type: ActionTypes.SET_USER, payload: userData.me });
      // Voice feedback will be handled by components that use this context
    } else if (!userLoading && localStorage.getItem('auth_token')) {
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
    }
  }, [userData, userLoading]);

  // Handle user query errors
  useEffect(() => {
    if (userError) {
      // Token might be invalid, clear it
      localStorage.removeItem('auth_token');
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
    }
  }, [userError]);

  // Login mutation
  const [loginMutation] = useMutation(LOGIN);

  // Register mutation
  const [registerMutation] = useMutation(REGISTER);



  // Migration mutation
  const [migrateMutation] = useMutation(MIGRATE_ANONYMOUS_TASKS);

  // Update loading state
  useEffect(() => {
    if (!userLoading && !localStorage.getItem('auth_token')) {
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
    }
  }, [userLoading]);

  // Action creators
  const login = async (email, password) => {
    dispatch({ type: ActionTypes.SET_LOADING, payload: true });
    dispatch({ type: ActionTypes.SET_ERROR, payload: null });
    
    try {
      const { data } = await loginMutation({
        variables: { email, password }
      });
      
      if (data?.login) {
        console.log('🔐 Login successful, clearing cache and sessionId');
        
        // CRITICAL: Store auth token FIRST
        localStorage.setItem('auth_token', data.login.token);
        
        // CRITICAL: Remove anonymous sessionId
        localStorage.removeItem('session_id');
        
        // CRITICAL: Reset Apollo cache completely to prevent contamination
        await client.resetStore();
        
        // Set authenticated user
        dispatch({ type: ActionTypes.SET_USER, payload: data.login.user });
        
        // Trigger migration of anonymous data (optional)
        await migrateAnonymousData();
        
        console.log('✅ Login complete - cache reset, sessionId removed');
      }
    } catch (error) {
      dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
    }
  };

  const register = async (username, email, password) => {
    dispatch({ type: ActionTypes.SET_LOADING, payload: true });
    dispatch({ type: ActionTypes.SET_ERROR, payload: null });
    
    try {
      const { data } = await registerMutation({
        variables: { username, email, password }
      });
      
      if (data?.register) {
        console.log('🔐 Registration successful, clearing cache and sessionId');
        
        // CRITICAL: Store auth token FIRST
        localStorage.setItem('auth_token', data.register.token);
        
        // CRITICAL: Remove anonymous sessionId
        localStorage.removeItem('session_id');
        
        // CRITICAL: Reset Apollo cache completely to prevent contamination
        await client.resetStore();
        
        // Set authenticated user
        dispatch({ type: ActionTypes.SET_USER, payload: data.register.user });
        
        // Trigger migration of anonymous data (optional)
        await migrateAnonymousData();
        
        console.log('✅ Registration complete - cache reset, sessionId removed');
      }
    } catch (error) {
      dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
    }
  };



  const logout = async () => {
    console.log('🔓 Logout initiated, clearing cache and generating new sessionId');

    try {
      // Remove auth token FIRST to stop sending Authorization header
      localStorage.removeItem('auth_token');

      // Generate NEW anonymous sessionId (fresh context after logout)
      const newSessionId = `anon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('session_id', newSessionId);

      // Aggressively clear Apollo cache and active queries
      // clearStore removes all data without refetching; resetStore refetches watch queries
      await client.clearStore();

      // Update state to anonymous
      dispatch({ type: ActionTypes.LOGOUT });

      console.log('✅ Logout complete - cache cleared, new sessionId:', newSessionId);

      // Final safety: hard reload to guarantee UI/header uses new context and no stale headers
      // This avoids any edge cases with lingering in-memory state
      window.location.replace('/');
    } catch (e) {
      console.error('❌ Logout error, forcing reload anyway:', e);
      window.location.replace('/');
    }
  };

  const migrateAnonymousData = async () => {
    try {
      const { data } = await migrateMutation();
      if (data?.migrateAnonymousTasks) {
        console.log('✅ Migrated anonymous data:', data.migrateAnonymousTasks);
      }
    } catch (error) {
      console.error('❌ Migration failed:', error);
    }
  };

  const clearError = () => {
    dispatch({ type: ActionTypes.SET_ERROR, payload: null });
  };

  const value = {
    ...state,
    login,
    register,
    logout,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;