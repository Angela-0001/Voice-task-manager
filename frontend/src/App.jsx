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
  const [appState, setAppState] = useState('login'); // default to login, no anonymous access

  // Listen for events from AboutPage
  useEffect(() => {
    const handleShowSignIn = () => setAppState('login');
    const handleGoToTasks = () => { setAppState('app'); setCurrentPage('home'); };

    window.addEventListener('showSignIn', handleShowSignIn);
    window.addEventListener('goToTasks', handleGoToTasks);
    return () => {
      window.removeEventListener('showSignIn', handleShowSignIn);
      window.removeEventListener('goToTasks', handleGoToTasks);
    };
  }, []);

  // Once authenticated, go to app
  useEffect(() => {
    if (isAuthenticated) setAppState('app');
  }, [isAuthenticated]);

  if (authLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Loading...
      </Box>
    );
  }

  if (!isAuthenticated) {
    if (appState === 'register') {
      return (
        <RegistrationPage
          onBack={() => setAppState('login')}
          onShowLogin={() => setAppState('login')}
        />
      );
    }
    return (
      <LoginPage
        onBack={() => setAppState('login')}
        onShowRegister={() => setAppState('register')}
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

  // Main app interface
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