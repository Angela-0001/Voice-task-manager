import { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Box,
  useTheme as useMuiTheme,
} from '@mui/material';
import {
  Mic as MicIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  Login as LoginIcon,
  Assignment as TasksIcon,
  BarChart as StatsIcon,
  Info as AboutIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';

import NotificationSystem from './NotificationSystem';

const Header = ({ currentPage, onPageChange, onSignOut, onShowSignIn }) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { tasks, settings } = useApp();
  const { user, isAuthenticated, logout } = useAuth();

  const theme = useMuiTheme();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = () => {
    logout();
    handleMenuClose();

    if (onSignOut) {
      onSignOut();
    }
  };

  const pages = [
    { id: 'home', label: 'Tasks', icon: <TasksIcon sx={{ fontSize: 18, mr: 0.5 }} /> },
    { id: 'stats', label: 'Stats', icon: <StatsIcon sx={{ fontSize: 18, mr: 0.5 }} /> },
    { id: 'voice-guide', label: 'Voice Guide', icon: <MicIcon sx={{ fontSize: 18, mr: 0.5 }} /> },
    { id: 'about', label: 'About', icon: <AboutIcon sx={{ fontSize: 18, mr: 0.5 }} /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon sx={{ fontSize: 18, mr: 0.5 }} /> },
  ];

  return (
    <AppBar 
      position="sticky" 
      elevation={0}
      sx={{ 
        background: 'linear-gradient(135deg, #4F46E5 0%, #F59E0B 100%)',
        height: 64,
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <Toolbar sx={{ 
        width: '100%', 
        maxWidth: '1200px',
        margin: '0 auto',
        px: { xs: 2, sm: 3 }, 
        height: 64, 
        justifyContent: 'space-between' 
      }}>
        {/* Left side - VoiceTask Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <MicIcon sx={{ 
            fontSize: 28, 
            color: '#FFFFFF',
            mr: 2
          }} />
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              fontWeight: 600,
              color: '#FFFFFF',
              letterSpacing: '-0.01em',
            }}
          >
            VoiceTask
          </Typography>
        </Box>

        {/* Center - Navigation */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          {pages.map((page) => (
            <Button
              key={page.id}
              color="inherit"
              onClick={() => onPageChange(page.id)}
              sx={{
                fontWeight: currentPage === page.id ? 600 : 400,
                fontSize: '0.875rem',
                color: '#FFFFFF',
                position: 'relative',
                px: 2,
                py: 1,
                borderRadius: 1,
                minWidth: 'auto',
                transition: 'all 0.2s ease',
                opacity: currentPage === page.id ? 1 : 0.8,
                '&::after': currentPage === page.id ? {
                  content: '""',
                  position: 'absolute',
                  bottom: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '80%',
                  height: '2px',
                  background: '#FFFFFF',
                  borderRadius: '1px',
                } : {},
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  opacity: 1,
                },
              }}
            >
              {page.icon}
              {page.label}
            </Button>
          ))}
        </Box>

        {/* Right side - User Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <NotificationSystem tasks={tasks} settings={settings} />
          
          <IconButton 
            color="inherit" 
            onClick={() => {
              toggleTheme();

            }}
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            sx={{ color: '#FFFFFF' }}
          >
            {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>

          {!isAuthenticated && onShowSignIn && (
            <Button
              variant="contained"
              startIcon={<LoginIcon />}
              onClick={onShowSignIn}
              sx={{
                fontWeight: 500,
                background: 'rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                borderRadius: 1,
                px: 3,
                py: 1,
                fontSize: '0.875rem',
                transition: 'all 0.2s ease',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.3)',
                },
              }}
            >
              Sign In
            </Button>
          )}
          
          <IconButton
            color="inherit"
            onClick={handleMenuOpen}
            aria-label="User menu"
            sx={{ color: '#FFFFFF' }}
          >
            <Avatar 
              src={user?.profileImage} 
              sx={{ width: 32, height: 32, bgcolor: 'rgba(255, 255, 255, 0.2)' }}
            >
              {user?.username ? user.username.charAt(0).toUpperCase() : <PersonIcon sx={{ color: '#FFFFFF' }} />}
            </Avatar>
          </IconButton>
        </Box>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          {isAuthenticated && (
            <MenuItem disabled>
              <Typography variant="body2" color="text.secondary">
                {user?.email || 'Authenticated User'}
              </Typography>
            </MenuItem>
          )}
          {!isAuthenticated && (
            <MenuItem disabled>
              <Typography variant="body2" color="text.secondary">
                Anonymous Mode
              </Typography>
            </MenuItem>
          )}
          <MenuItem onClick={() => { 
            handleMenuClose(); 
            onPageChange('settings');

          }}>
            Settings
          </MenuItem>
          <MenuItem onClick={handleSignOut}>
            <LogoutIcon sx={{ mr: 1, fontSize: 20 }} />
            {isAuthenticated ? 'Sign Out' : 'Exit Anonymous'}
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Header;