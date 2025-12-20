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
  PersonAdd as PersonAddIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';


const RegistrationPage = ({ onBack, onShowLogin }) => {
  const { register, error, isLoading, clearError, user, isAuthenticated } = useAuth();
  const { getGlassmorphismStyle } = useTheme();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [formErrors, setFormErrors] = useState({});

  // Handle successful registration
  useEffect(() => {
    if (isAuthenticated && user) {

    }
  }, [isAuthenticated, user]);

  // Handle registration errors
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
    
    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email';
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!validateForm()) {

      return;
    }
    

    await register(formData.username, formData.email, formData.password);
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
                Create Account
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Join VoiceTask today
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
              label="Username"
              value={formData.username}
              onChange={handleInputChange('username')}
              error={!!formErrors.username}
              helperText={formErrors.username}
              margin="normal"
              required
            />
            
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
            
            <TextField
              fullWidth
              label="Confirm Password"
              type="password"
              value={formData.confirmPassword}
              onChange={handleInputChange('confirmPassword')}
              error={!!formErrors.confirmPassword}
              helperText={formErrors.confirmPassword}
              margin="normal"
              required
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading}
              startIcon={<PersonAddIcon />}
              sx={{ mt: 3, mb: 2, py: 1.5 }}
            >
              {isLoading ? (
                <CircularProgress size={24} />
              ) : (
                'Create Account'
              )}
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: 'center' }}>
            Already have an account?{' '}
            <Link
              component="button"
              variant="body2"
              onClick={onShowLogin}
              sx={{ textDecoration: 'none', fontWeight: 'bold' }}
            >
              Sign in here
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Container>
    </Box>
  );
};

export default RegistrationPage;