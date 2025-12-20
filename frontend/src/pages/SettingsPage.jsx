import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  useTheme,
  alpha,
  FormControlLabel,
  Switch,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  Computer as ComputerIcon,
  Notifications as NotificationsIcon,
  VolumeUp as VolumeUpIcon,
  Schedule as ScheduleIcon,
  Mic as MicIcon,
  RecordVoiceOver as RecordVoiceOverIcon,
  Speed as SpeedIcon,
  GraphicEq as GraphicEqIcon,
  Language as LanguageIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useTheme as useCustomTheme } from '../contexts/ThemeContext';
import { useApp } from '../contexts/AppContext';
import { 
  getCurrentGender, 
  getVolume, 
  getPitch, 
  getRate, 
  isSpeechEnabled,
  setGender, 
  setVolume, 
  setPitch, 
  setRate, 
  setSpeechEnabled,
  testCurrentVoice 
} from '../utils/speech';






const SettingsPage = () => {
  const theme = useTheme();
  const { isDarkMode, toggleTheme } = useCustomTheme();
  const { settings, updateSettings } = useApp();

  const [themeMode, setThemeMode] = useState(isDarkMode ? 'dark' : 'light');
  
  // Voice settings state
  const [voiceSettings, setVoiceSettings] = useState({
    enabled: true,
    gender: 'female',
    volume: 1.0,
    pitch: 1.0,
    rate: 1.0
  });
  
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load voice settings on component mount
  useEffect(() => {
    const loadVoiceSettings = () => {
      setVoiceSettings({
        enabled: isSpeechEnabled(),
        gender: getCurrentGender(),
        volume: getVolume(),
        pitch: getPitch(),
        rate: getRate()
      });
      setHasUnsavedChanges(false); // Mark as saved when loaded
    };
    
    loadVoiceSettings();
  }, []);



  const handleNotificationSettingChange = (setting, value) => {
    updateSettings({
      notifications: {
        ...settings.notifications,
        [setting]: value
      }
    });
  };

  // Voice settings handlers
  const handleVoiceSettingChange = (setting, value) => {
    const newSettings = { ...voiceSettings, [setting]: value };
    setVoiceSettings(newSettings);
    setHasUnsavedChanges(true);
    
    // Only apply settings for immediate feedback (volume for sliders)
    if (setting === 'volume') {
      setVolume(value);
    }
    // Don't apply other settings immediately - wait for Save button
  };

  const handleTestVoice = () => {
    // Debug: Log current settings and available voices
    console.log('🔊 Testing voice with settings:', voiceSettings);
    
    // Get available voices for debugging
    const voices = window.speechSynthesis.getVoices();
    console.log('🔊 Available voices:', voices.map(v => ({ name: v.name, lang: v.lang })));
    
    // Temporarily apply current form settings for testing
    const originalSettings = {
      gender: getCurrentGender(),
      volume: getVolume(),
      pitch: getPitch(),
      rate: getRate()
    };
    
    // Apply test settings
    setGender(voiceSettings.gender);
    setVolume(voiceSettings.volume);
    setPitch(voiceSettings.pitch);
    setRate(voiceSettings.rate);
    
    // Debug: Check current settings
    console.log('🔊 Testing voice with settings:', voiceSettings);
    
    // Test voice
    testCurrentVoice();
    
    // Restore original settings after a delay
    setTimeout(() => {
      setGender(originalSettings.gender);
      setVolume(originalSettings.volume);
      setPitch(originalSettings.pitch);
      setRate(originalSettings.rate);
    }, 3000);
  };

  // Save voice settings function
  const saveVoiceSettings = () => {
    try {
      // Apply all settings to speech system
      setSpeechEnabled(voiceSettings.enabled);
      setGender(voiceSettings.gender);
      setVolume(voiceSettings.volume);
      setPitch(voiceSettings.pitch);
      setRate(voiceSettings.rate);
      
      // Mark as saved
      setHasUnsavedChanges(false);
      
      // Show success message
      alert('Voice settings saved successfully!');
    } catch (error) {
      console.error('Error saving voice settings:', error);
      alert('Failed to save voice settings. Please try again.');
    }
  };



  const handleThemeChange = (_, newTheme) => {
    if (newTheme !== null) {
      setThemeMode(newTheme);
      if (newTheme === 'dark' && !isDarkMode) {
        toggleTheme();
      } else if (newTheme === 'light' && isDarkMode) {
        toggleTheme();
      }
    }
  };



  const resetAllSettings = () => {
    // Reset app settings
    updateSettings({
      notifications: {
        enabled: true,
        sound: true,
        reminders: true
      },
      display: {
        theme: 'dark',
        compactMode: false,
        showCompleted: true
      }
    });
    
    // Reset voice settings
    const defaultVoiceSettings = {
      enabled: true,
      gender: 'female',
      volume: 1.0,
      pitch: 1.0,
      rate: 1.0
    };
    
    setVoiceSettings(defaultVoiceSettings);
    
    // Apply voice settings
    setSpeechEnabled(defaultVoiceSettings.enabled);
    setGender(defaultVoiceSettings.gender);
    setVolume(defaultVoiceSettings.volume);
    setPitch(defaultVoiceSettings.pitch);
    setRate(defaultVoiceSettings.rate);
    
    // Reset theme
    setThemeMode('dark');
    if (!isDarkMode) {
      toggleTheme();
    }
  };

  return (
    <Box sx={{ 
      width: '100vw',
      minHeight: '100vh',
      backgroundColor: 'background.default',
      flex: 1,
      overflowX: 'auto',
    }}>
      <Container 
        maxWidth="md" 
        sx={{ 
          py: 4, 
          px: { xs: 2, sm: 3, md: 4 }, 
          minWidth: '100%',
          minHeight: '100vh',
          backgroundColor: 'background.default',
        }}
      >
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <SettingsIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Box>
            <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold' }}>
              Settings
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Customize your VoiceTask experience
            </Typography>
          </Box>
        </Box>





      {/* Voice Feedback Settings */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
            🔊 Voice Feedback Settings
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Configure voice gender and speech parameters for voice feedback
          </Typography>
          
          {/* Info Box */}
          <Box sx={{ 
            p: 2, 
            borderRadius: 1, 
            backgroundColor: alpha(theme.palette.info.main, 0.1),
            border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
            mb: 3
          }}>
            <Typography variant="body2" color="info.main" sx={{ fontWeight: 500 }}>
              💡 How it works: These settings control how the system speaks back to you. 
              Uses your system's default English voice with custom pitch, rate, and volume.
            </Typography>
          </Box>
          
          <Divider sx={{ mb: 3 }} />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Enable Voice Feedback */}
            <FormControlLabel
              control={
                <Switch
                  checked={voiceSettings.enabled}
                  onChange={(e) => handleVoiceSettingChange('enabled', e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <RecordVoiceOverIcon fontSize="small" />
                  Enable Voice Feedback
                </Box>
              }
            />

            {voiceSettings.enabled && (
              <>


                {/* Voice Gender */}
                <Box>
                  <Typography variant="body2" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon fontSize="small" />
                    Voice Gender
                  </Typography>
                  <ToggleButtonGroup
                    value={voiceSettings.gender}
                    exclusive
                    onChange={(e, value) => value && handleVoiceSettingChange('gender', value)}
                    aria-label="voice gender"
                    fullWidth
                  >
                    <ToggleButton value="male" aria-label="male voice">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span>🗣️</span>
                        <span>Male</span>
                      </Box>
                    </ToggleButton>
                    <ToggleButton value="female" aria-label="female voice">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span>👩</span>
                        <span>Female</span>
                      </Box>
                    </ToggleButton>
                  </ToggleButtonGroup>
                  

                </Box>

                {/* Volume */}
                <Box>
                  <Typography variant="body2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <VolumeUpIcon fontSize="small" />
                    Volume: {Math.round(voiceSettings.volume * 100)}%
                  </Typography>
                  <Slider
                    value={voiceSettings.volume}
                    onChange={(_, value) => handleVoiceSettingChange('volume', value)}
                    min={0.1}
                    max={1.0}
                    step={0.1}
                    marks={[
                      { value: 0.1, label: '10%' },
                      { value: 0.5, label: '50%' },
                      { value: 1.0, label: '100%' }
                    ]}
                  />
                </Box>

                {/* Pitch */}
                <Box>
                  <Typography variant="body2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <GraphicEqIcon fontSize="small" />
                    Pitch: {voiceSettings.pitch.toFixed(1)}
                  </Typography>
                  <Slider
                    value={voiceSettings.pitch}
                    onChange={(_, value) => handleVoiceSettingChange('pitch', value)}
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    marks={[
                      { value: 0.5, label: 'Low' },
                      { value: 1.0, label: 'Normal' },
                      { value: 2.0, label: 'High' }
                    ]}
                  />
                </Box>

                {/* Rate */}
                <Box>
                  <Typography variant="body2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SpeedIcon fontSize="small" />
                    Speech Rate: {voiceSettings.rate.toFixed(1)}x
                  </Typography>
                  <Slider
                    value={voiceSettings.rate}
                    onChange={(_, value) => handleVoiceSettingChange('rate', value)}
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    marks={[
                      { value: 0.5, label: '0.5x' },
                      { value: 1.0, label: '1x' },
                      { value: 1.5, label: '1.5x' },
                      { value: 2.0, label: '2x' }
                    ]}
                  />
                </Box>

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
                  <Button
                    variant="outlined"
                    onClick={handleTestVoice}
                    startIcon={<RecordVoiceOverIcon />}
                  >
                    Test Voice
                  </Button>
                  <Button
                    variant="contained"
                    onClick={saveVoiceSettings}
                    color={hasUnsavedChanges ? "warning" : "primary"}
                    sx={{ 
                      fontWeight: hasUnsavedChanges ? 'bold' : 'normal',
                      animation: hasUnsavedChanges ? 'pulse 2s ease-in-out infinite' : 'none'
                    }}
                  >
                    {hasUnsavedChanges ? '⚠️ Save Changes' : '✅ Settings Saved'}
                  </Button>
                  <Button
                    variant="text"
                    onClick={() => {
                      const voices = window.speechSynthesis.getVoices();
                      console.log('🔊 All available voices:', voices);
                      alert(`Found ${voices.length} voices. Check console for details.`);
                    }}
                    size="small"
                  >
                    Debug Voices
                  </Button>
                </Box>
              </>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Voice Recognition Settings */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
            🎙️ Voice Recognition Settings
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Configure speech recognition and voice commands
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings?.voiceCommands?.enabled !== false}
                  onChange={(e) => updateSettings({ 
                    voiceCommands: { ...settings?.voiceCommands, enabled: e.target.checked } 
                  })}
                  color="primary"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MicIcon fontSize="small" />
                  Enable Voice Commands
                </Box>
              }
            />

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
              Voice Command Examples:
            </Typography>
            <Box sx={{ 
              p: 2, 
              borderRadius: 1, 
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`
            }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • "Buy groceries tomorrow"
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • "Delete task 1"
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • "Mark first task completed"
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • "Mark task 2 as in progress"
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • "Show my tasks"
              </Typography>
              <Typography variant="body2">
                • "Go to settings"
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
            🔔 Notification Settings
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Configure task reminders and alerts
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings?.notifications?.enabled || false}
                  onChange={(e) => handleNotificationSettingChange('enabled', e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <NotificationsIcon fontSize="small" />
                  Enable Browser Notifications
                </Box>
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings?.notifications?.sound || false}
                  onChange={(e) => handleNotificationSettingChange('sound', e.target.checked)}
                  color="primary"
                  disabled={!settings?.notifications?.enabled}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <VolumeUpIcon fontSize="small" />
                  Play Sound with Notifications
                </Box>
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings?.notifications?.reminders || false}
                  onChange={(e) => handleNotificationSettingChange('reminders', e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScheduleIcon fontSize="small" />
                  Enable Task Reminders
                </Box>
              }
            />

            {settings?.notifications?.enabled && 'Notification' in window && Notification.permission !== 'granted' && (
              <Box sx={{ 
                p: 2, 
                borderRadius: 1, 
                backgroundColor: alpha(theme.palette.warning.main, 0.1),
                border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`
              }}>
                <Typography variant="body2" color="warning.main" sx={{ mb: 1 }}>
                  Browser notifications are not permitted
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  onClick={() => Notification.requestPermission()}
                >
                  Request Permission
                </Button>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Theme Settings */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
            🎨 Theme Settings
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Choose your preferred appearance
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <ToggleButtonGroup
            value={themeMode}
            exclusive
            onChange={handleThemeChange}
            aria-label="theme selection"
            sx={{ display: 'flex', justifyContent: 'center' }}
          >
            <ToggleButton value="light" aria-label="light theme">
              <LightModeIcon sx={{ mr: 1 }} />
              Light
            </ToggleButton>
            <ToggleButton value="dark" aria-label="dark theme">
              <DarkModeIcon sx={{ mr: 1 }} />
              Dark
            </ToggleButton>
            <ToggleButton value="system" aria-label="system theme">
              <ComputerIcon sx={{ mr: 1 }} />
              System
            </ToggleButton>
          </ToggleButtonGroup>
        </CardContent>
      </Card>







      {/* Reset Settings */}
      <Card sx={{ mt: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
            Reset All Settings
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Restore default configuration
          </Typography>
          <Box sx={{ textAlign: 'right' }}>
            <Button 
              variant="outlined" 
              color="error"
              onClick={resetAllSettings}
            >
              Reset
            </Button>
          </Box>
        </CardContent>
      </Card>
      </Container>
    </Box>
  );
};

export default SettingsPage;