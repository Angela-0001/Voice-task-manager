import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5014/graphql';

const httpLink = createHttpLink({ uri: API_URL });

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('auth_token');
  return {
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {})
    }
  };
});

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          tasks: { keyArgs: false, merge: (_, incoming) => incoming },
          pendingTasks: { keyArgs: false, merge: (_, incoming) => incoming },
          completedTasks: { keyArgs: false, merge: (_, incoming) => incoming },
        },
      },
      Task: { keyFields: ['id'] },
    },
  }),
  defaultOptions: {
    watchQuery: { errorPolicy: 'all', fetchPolicy: 'network-only' },
    query: { errorPolicy: 'all', fetchPolicy: 'network-only' },
    mutate: { errorPolicy: 'all' },
  },
});

export default client;
