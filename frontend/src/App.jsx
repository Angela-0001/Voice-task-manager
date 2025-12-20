import { useState, useEffect } from 'react';
import { Box, Snackbar, Alert } from '@mui/material';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppProvider, useApp } from './contexts/AppContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';


import Header from './components/Header';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import SettingsPage from './pages/SettingsPage';
import StatsPage from './pages/StatsPage';
import LoginPage from './pages/LoginPage';
import RegistrationPage from './pages/RegistrationPage';
import VoiceGuide from './pages/VoiceGuide';




// App Content Component (uses context)
const AppContent = () => {
  const { 
    currentPage, 
    setCurrentPage, 
    createTask, 
    updateTask, 
    deleteTask, 
    processVoiceCommand,
    snackbar,
    hideSnackbar
  } = useApp();
  
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [appState, setAppState] = useState('app'); // 'about', 'login', 'register', 'app'

  // Listen for events from AboutPage - MUST be called before any early returns
  useEffect(() => {
    const handleShowSignIn = () => {
      setAppState('login');
    };

    const handleGoToTasks = () => {
      setAppState('app');
      setCurrentPage('home');
    };

    window.addEventListener('showSignIn', handleShowSignIn);
    window.addEventListener('goToTasks', handleGoToTasks);
    
    return () => {
      window.removeEventListener('showSignIn', handleShowSignIn);
      window.removeEventListener('goToTasks', handleGoToTasks);
    };
  }, []);

  // If user is authenticated, go to app
  useEffect(() => {
    if (isAuthenticated && appState !== 'app') {
      setAppState('app');
    }
  }, [isAuthenticated, appState]);

  if (authLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        Loading...
      </Box>
    );
  }

  // Show login page
  if (appState === 'login' && !isAuthenticated) {
    return (
      <LoginPage 
        onBack={() => setAppState('about')}
        onShowRegister={() => setAppState('register')}
      />
    );
  }

  // Show registration page
  if (appState === 'register' && !isAuthenticated) {
    return (
      <RegistrationPage 
        onBack={() => setAppState('about')}
        onShowLogin={() => setAppState('login')}
      />
    );
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <HomePage
            onCreateTask={createTask}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
            onVoiceCommand={processVoiceCommand}
            onShowAuth={() => setAppState('login')}
          />
        );
      case 'stats':
        return <StatsPage />;
      case 'settings':
        return <SettingsPage />;
      case 'about':
        return <AboutPage />;
      case 'voice-guide':
        return <VoiceGuide />;
      default:
        return (
          <HomePage
            onCreateTask={createTask}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
            onVoiceCommand={processVoiceCommand}
            onShowAuth={() => setAppState('login')}
          />
        );
    }
  };

  // Main app interface (authenticated or anonymous)
  return (
    <Box sx={{ 
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'background.default',
      position: 'relative',
    }}>
      <Header 
        currentPage={currentPage} 
        onPageChange={setCurrentPage}
        onSignOut={() => setAppState('about')}
        onShowSignIn={() => setAppState('login')}
      />
      
      {renderCurrentPage()}





      {/* Global Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={hideSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={hideSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// Main App Component (provides context)
function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;