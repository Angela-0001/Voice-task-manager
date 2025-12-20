import { useState, useEffect } from 'react';
import {
  Container,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  Alert,
  Box,
  Typography,
  CircularProgress,
  Link
} from '@mui/material';
import {
  Login as LoginIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';


const LoginPage = ({ onBack, onShowRegister }) => {
  const { login, error, isLoading, clearError, user, isAuthenticated } = useAuth();
  const { getGlassmorphismStyle } = useTheme();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [formErrors, setFormErrors] = useState({});

  // Handle successful login
  useEffect(() => {
    if (isAuthenticated && user) {

    }
  }, [isAuthenticated, user]);

  // Handle login errors
  useEffect(() => {
    if (error) {

    }
  }, [error]);

  const handleInputChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    
    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email';
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!validateForm()) {

      return;
    }
    

    
    await login(formData.email, formData.password);
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      backgroundColor: 'background.default',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      py: 4,
    }}>
      <Container maxWidth="sm">
      <Card 
        elevation={0}
        sx={{ 
          ...getGlassmorphismStyle(),
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <CardHeader
          title={
            <Box>
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={onBack}
                variant="text"
                size="small"
                sx={{ mb: 2, color: 'text.secondary' }}
              >
                Back
              </Button>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
                Sign In
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Welcome back to VoiceTask
              </Typography>
            </Box>
          }
          sx={{ pb: 0 }}
        />
        
        <CardContent>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={handleInputChange('email')}
              error={!!formErrors.email}
              helperText={formErrors.email}
              margin="normal"
              required
            />
            
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={formData.password}
              onChange={handleInputChange('password')}
              error={!!formErrors.password}
              helperText={formErrors.password}
              margin="normal"
              required
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading}
              startIcon={<LoginIcon />}
              sx={{ mt: 3, mb: 2, py: 1.5 }}
            >
              {isLoading ? (
                <CircularProgress size={24} />
              ) : (
                'Sign In'
              )}
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: 'center' }}>
            Don't have an account?{' '}
            <Link
              component="button"
              variant="body2"
              onClick={onShowRegister}
              sx={{ textDecoration: 'none', fontWeight: 'bold' }}
            >
              Sign up here
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Container>
    </Box>
  );
};

export default LoginPage;