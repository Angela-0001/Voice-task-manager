import { createContext, useContext, useState, useEffect } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { CssBaseline, GlobalStyles } from '@mui/material';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

const createVoiceTaskTheme = (isDarkMode) => createTheme({
  palette: {
    mode: isDarkMode ? 'dark' : 'light',
    primary: {
      main: '#4F46E5', // Electric blue
      light: '#6366F1',
      dark: '#3730A3',
    },
    secondary: {
      main: '#9333EA', // Purple
      light: '#A855F7',
      dark: '#7C3AED',
    },
    accent: {
      cyan: '#06B6D4',
      lime: '#84CC16',
      coral: '#FB923C',
      pink: '#EC4899',
    },
    background: {
      default: isDarkMode ? '#0F172A' : '#F8FAFC',
      paper: isDarkMode ? '#1E293B' : '#FFFFFF',
      glass: isDarkMode ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.8)',
    },
    text: {
      primary: isDarkMode ? '#F8FAFC' : '#1E293B',
      secondary: isDarkMode ? '#CBD5E1' : '#64748B',
    },
    divider: isDarkMode ? '#334155' : '#E2E8F0',
    success: {
      main: '#84CC16', // Lime green
      light: '#A3E635',
      dark: '#65A30D',
    },
    warning: {
      main: '#FB923C', // Coral
      light: '#FDBA74',
      dark: '#EA580C',
    },
    error: {
      main: '#EF4444',
      light: '#F87171',
      dark: '#DC2626',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontFamily: '"Poppins", "SF Pro Display", sans-serif',
      fontWeight: 800,
      background: 'linear-gradient(135deg, #4F46E5 0%, #9333EA 50%, #EC4899 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    },
    h2: {
      fontFamily: '"Poppins", "SF Pro Display", sans-serif',
      fontWeight: 700,
    },
    h3: {
      fontFamily: '"Poppins", "SF Pro Display", sans-serif',
      fontWeight: 700,
    },
    h4: {
      fontFamily: '"Poppins", "SF Pro Display", sans-serif',
      fontWeight: 700,
    },
    h5: {
      fontFamily: '"Poppins", "SF Pro Display", sans-serif',
      fontWeight: 700,
    },
    h6: {
      fontFamily: '"Poppins", "SF Pro Display", sans-serif',
      fontWeight: 700,
    },
    body1: {
      fontSize: 'clamp(14px, 2.5vw, 18px)',
      fontWeight: 400,
    },
    body2: {
      fontSize: 'clamp(12px, 2vw, 16px)',
      fontWeight: 400,
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC',
          minHeight: '100%',
        },
        body: {
          backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC',
          minHeight: '100vh',
          scrollBehavior: 'smooth',
        },
        '#root': {
          minHeight: '100vh',
          backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC',
        },
        '@keyframes gradientShift': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        '@keyframes pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
        '@keyframes float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        '@keyframes ripple': {
          '0%': { transform: 'scale(0)', opacity: 1 },
          '100%': { transform: 'scale(4)', opacity: 0 },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          textTransform: 'none',
          fontWeight: 600,
          padding: '12px 32px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          overflow: 'hidden',
          '&:hover': {
            transform: 'translateY(-2px) scale(1.02)',
            boxShadow: '0 12px 40px rgba(79, 70, 229, 0.3)',
          },
          '&:active': {
            transform: 'translateY(0) scale(0.98)',
          },
        },
        contained: {
          background: 'linear-gradient(135deg, #4F46E5 0%, #9333EA 50%, #EC4899 100%)',
          backgroundSize: '200% 200%',
          '&:hover': {
            backgroundPosition: 'right center',
            animation: 'gradientShift 2s ease infinite',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          backdropFilter: 'blur(20px)',
          border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.05)',
          background: isDarkMode 
            ? 'rgba(30, 41, 59, 0.8)' 
            : 'rgba(255, 255, 255, 0.8)',
          '&:hover': {
            transform: 'translateY(-8px)',
            boxShadow: isDarkMode 
              ? '0 20px 60px rgba(79, 70, 229, 0.2)' 
              : '0 20px 60px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(79, 70, 229, 0.3)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 16,
            backdropFilter: 'blur(10px)',
            background: isDarkMode 
              ? 'rgba(30, 41, 59, 0.6)' 
              : 'rgba(255, 255, 255, 0.6)',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 20px rgba(79, 70, 229, 0.1)',
            },
            '&.Mui-focused': {
              transform: 'translateY(-2px)',
              boxShadow: '0 8px 30px rgba(79, 70, 229, 0.2)',
              borderColor: '#4F46E5',
            },
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'scale(1.1)',
            backgroundColor: 'rgba(79, 70, 229, 0.1)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          fontWeight: 500,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'scale(1.05)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(20px)',
          background: isDarkMode 
            ? 'rgba(30, 41, 59, 0.8)' 
            : 'rgba(255, 255, 255, 0.8)',
          border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.05)',
        },
      },
    },
  },
});

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('voicetask-theme');
    return saved ? JSON.parse(saved) : true; // Default to dark mode
  });

  useEffect(() => {
    localStorage.setItem('voicetask-theme', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const getGlassmorphismStyle = () => ({
    backdropFilter: 'blur(20px)',
    background: isDarkMode 
      ? 'rgba(30, 41, 59, 0.8)' 
      : 'rgba(255, 255, 255, 0.8)',
    border: isDarkMode 
      ? '1px solid rgba(255, 255, 255, 0.1)' 
      : '1px solid rgba(0, 0, 0, 0.05)',
  });

  const theme = createVoiceTaskTheme(isDarkMode);

  const globalStyles = (
    <GlobalStyles
      styles={{
        '.glass-effect': {
          backdropFilter: 'blur(20px)',
          background: isDarkMode 
            ? 'rgba(30, 41, 59, 0.8)' 
            : 'rgba(255, 255, 255, 0.8)',
          border: isDarkMode 
            ? '1px solid rgba(255, 255, 255, 0.1)' 
            : '1px solid rgba(0, 0, 0, 0.05)',
        },
        '.gradient-text': {
          background: 'linear-gradient(135deg, #4F46E5 0%, #9333EA 50%, #EC4899 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        },
        '.floating-animation': {
          animation: 'float 3s ease-in-out infinite',
        },
        '.pulse-animation': {
          animation: 'pulse 2s ease-in-out infinite',
        },
        '.voice-button': {
          background: isDarkMode 
            ? 'linear-gradient(135deg, #4F46E5 0%, #9333EA 100%)'
            : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', // Light-medium green gradient
          borderRadius: '50%',
          width: '80px',
          height: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 8px 32px rgba(79, 70, 229, 0.3)',
          '&:hover': {
            transform: 'scale(1.1)',
            boxShadow: '0 12px 48px rgba(79, 70, 229, 0.4)',
          },
          '&.listening': {
            animation: 'pulse 1s ease-in-out infinite',
            boxShadow: '0 0 0 0 rgba(79, 70, 229, 0.7), 0 0 0 10px rgba(79, 70, 229, 0.3), 0 0 0 20px rgba(79, 70, 229, 0.1)',
          },
        },
      }}
    />
  );

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, getGlassmorphismStyle, theme }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {globalStyles}
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};