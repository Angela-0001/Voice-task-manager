import { createContext, useContext, useReducer, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { ME, LOGIN, REGISTER } from '../graphql/queries';
import client from '../apollo/client';

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null
};

const ActionTypes = {
  SET_USER: 'SET_USER',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  LOGOUT: 'LOGOUT'
};

const authReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_USER:
      return { ...state, user: action.payload, isAuthenticated: !!action.payload, isLoading: false, error: null };
    case ActionTypes.SET_LOADING:
      return { ...state, isLoading: action.payload };
    case ActionTypes.SET_ERROR:
      return { ...state, error: action.payload, isLoading: false };
    case ActionTypes.LOGOUT:
      return { ...initialState, isLoading: false };
    default:
      return state;
  }
};

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const { data: userData, loading: userLoading, error: userError } = useQuery(ME, {
    errorPolicy: 'ignore',
    skip: !localStorage.getItem('auth_token')
  });

  useEffect(() => {
    if (userData?.me) {
      dispatch({ type: ActionTypes.SET_USER, payload: userData.me });
    } else if (!userLoading) {
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
    }
  }, [userData, userLoading]);

  useEffect(() => {
    if (userError) {
      localStorage.removeItem('auth_token');
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
    }
  }, [userError]);

  const [loginMutation] = useMutation(LOGIN);
  const [registerMutation] = useMutation(REGISTER);

  const login = async (email, password) => {
    dispatch({ type: ActionTypes.SET_LOADING, payload: true });
    dispatch({ type: ActionTypes.SET_ERROR, payload: null });
    try {
      const { data } = await loginMutation({ variables: { email, password } });
      if (data?.login) {
        localStorage.setItem('auth_token', data.login.token);
        await client.resetStore();
        dispatch({ type: ActionTypes.SET_USER, payload: data.login.user });
      }
    } catch (error) {
      dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
    }
  };

  const register = async (username, email, password) => {
    dispatch({ type: ActionTypes.SET_LOADING, payload: true });
    dispatch({ type: ActionTypes.SET_ERROR, payload: null });
    try {
      const { data } = await registerMutation({ variables: { username, email, password } });
      if (data?.register) {
        localStorage.setItem('auth_token', data.register.token);
        await client.resetStore();
        dispatch({ type: ActionTypes.SET_USER, payload: data.register.user });
      }
    } catch (error) {
      dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
    }
  };

  const logout = async () => {
    localStorage.removeItem('auth_token');
    await client.clearStore();
    dispatch({ type: ActionTypes.LOGOUT });
    // Navigate by dispatching state reset — no full page reload needed
    window.dispatchEvent(new Event('auth:logout'));
  };

  const clearError = () => dispatch({ type: ActionTypes.SET_ERROR, payload: null });

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export default AuthContext;
