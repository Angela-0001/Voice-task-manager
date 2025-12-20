import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

// Get API URL from environment variable
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5014/graphql';

// Create HTTP link to GraphQL server with error handling
const httpLink = createHttpLink({
  uri: API_URL,
  fetch: (uri, options) => {
    return fetch(uri, options).catch(error => {
      console.error('❌ Apollo: Network error:', error.message);
      throw error;
    });
  }
});

console.log('🔗 Apollo Client connecting to:', API_URL);

// Device-specific auth link - sends appropriate headers based on authentication state
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('auth_token');
  
  // Generate or get device ID for device-specific anonymous tasks
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = `device-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem('device_id', deviceId);
    console.log('📱 Apollo: Generated new deviceId:', deviceId);
  }
  
  // AUTHENTICATED: Send Authorization + device ID
  if (token) {
    console.log('🔐 Apollo: Sending authenticated headers with deviceId:', deviceId);
    return {
      headers: {
        ...headers,
        authorization: `Bearer ${token}`,
        'x-device-id': deviceId,
      }
    };
  }
  
  // ANONYMOUS: Send session ID + device ID for device-specific tasks
  let sessionId = localStorage.getItem('session_id');
  
  // Generate session ID if it doesn't exist
  if (!sessionId) {
    sessionId = `anon-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem('session_id', sessionId);
    console.log('🔓 Apollo: Generated new sessionId:', sessionId);
  }

  console.log('🔓 Apollo: Sending anonymous headers - sessionId:', sessionId, 'deviceId:', deviceId);
  return {
    headers: {
      ...headers,
      'x-session-id': sessionId,
      'x-device-id': deviceId,
    }
  };
});

// Create Apollo Client with optimized cache policies
const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          tasks: {
            // SIMPLIFIED: Always return fresh data, no complex merging
            keyArgs: false,
            merge(existing, incoming) {
              // Always return the fresh incoming data
              return incoming;
            },
          },
          pendingTasks: {
            keyArgs: false,
            merge: (_, incoming) => incoming,
          },
          completedTasks: {
            keyArgs: false,
            merge: (_, incoming) => incoming,
          },
        },
      },
      Task: {
        keyFields: ["id"],
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
      fetchPolicy: 'cache-first', // Use cache first to prevent duplicates
      notifyOnNetworkStatusChange: true,
    },
    query: {
      errorPolicy: 'all',
      fetchPolicy: 'cache-first', // Use cache first to prevent duplicates
    },
    mutate: {
      errorPolicy: 'all',
      fetchPolicy: 'no-cache', // Mutations should always hit the network
    },
  },
});

export default client;