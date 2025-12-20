import { useState, useRef, useEffect } from 'react';
import {
  Card,
  CardContent,
  IconButton,
  Typography,
  LinearProgress,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  CircularProgress
} from '@mui/material';
import {
  Mic as MicIcon,
  Stop as StopIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Save as SaveIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

const VoiceRecorder = ({ open, onClose, onSave, taskId }) => {
  const theme = useTheme();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [recordingState, setRecordingState] = useState('idle'); // 'idle', 'requesting', 'recording', 'recorded', 'uploading', 'success'

  const mediaRecorderRef = useRef(null);
  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);

  const MAX_DURATION = 300; // 5 minutes in seconds

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const analyser = analyserRef.current;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    // Clear canvas
    ctx.fillStyle = theme.palette.background.paper;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw waveform bars
    const barWidth = (canvas.width / bufferLength) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
      
      const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
      gradient.addColorStop(0, theme.palette.primary.main);
      gradient.addColorStop(1, theme.palette.primary.light);
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

      x += barWidth + 1;
    }

    if (isRecording) {
      animationRef.current = requestAnimationFrame(drawWaveform);
    }
  };

  const startRecording = async () => {
    try {
      setError(null);
      setPermissionDenied(false);
      setRecordingState('requesting');
      
      console.log('🎙️ Requesting microphone access...');

      // Use simpler audio constraints for faster startup
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      console.log('✅ Microphone access granted, starting recording...');
      setRecordingState('recording');

      // Set up audio context for visualization
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        audioContextRef.current = new window.AudioContext();
      }
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      // Set up MediaRecorder
      const options = {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 32000 // Good quality for voice
      };

      mediaRecorderRef.current = new MediaRecorder(stream, options);
      const chunks = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setRecordingState('recorded');
        
        console.log('✅ Recording completed:', {
          size: `${(blob.size / 1024).toFixed(1)}KB`,
          duration: `${recordingDuration}s`
        });
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingDuration(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          const newDuration = prev + 1;
          if (newDuration >= MAX_DURATION) {
            stopRecording();
            return MAX_DURATION;
          }
          return newDuration;
        });
      }, 1000);

      // Start waveform animation
      drawWaveform();

    } catch (error) {
      console.error('❌ Error starting recording:', error);
      
      if (error.name === 'NotAllowedError') {
        setPermissionDenied(true);
        setError('🎤 Microphone access denied. Please click the microphone icon in your browser\'s address bar and allow access, then try again.');
      } else if (error.name === 'NotFoundError') {
        setError('🎤 No microphone found. Please connect a microphone and try again.');
      } else if (error.name === 'NotReadableError') {
        setError('🎤 Microphone is being used by another application. Please close other apps and try again.');
      } else {
        setError(`🎤 Recording failed: ${error.message || 'Please check your microphone and try again.'}`);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSave = async () => {
    if (!audioBlob || !taskId) return;

    setIsUploading(true);
    setRecordingState('uploading');
    setError(null);

    try {
      // Show immediate feedback
      console.log('🎙️ Starting voice memo upload...', {
        size: `${(audioBlob.size / 1024).toFixed(1)}KB`,
        duration: `${recordingDuration}s`,
        taskId
      });

      const formData = new FormData();
      formData.append('audioFile', audioBlob, `voice-memo-${Date.now()}.webm`);
      formData.append('taskId', taskId);
      formData.append('duration', recordingDuration.toString());
      formData.append('mimeType', 'audio/webm;codecs=opus');

      // Add device ID for anonymous users
      const deviceId = localStorage.getItem('device_id');
      if (deviceId) {
        formData.append('deviceId', deviceId);
      }

      const response = await fetch('http://localhost:5014/api/voice-memo/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
          'x-device-id': deviceId || ''
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || `Upload failed with status ${response.status}`);
      }

      const result = await response.json();
      
      console.log('✅ Voice memo uploaded successfully:', result.voiceMemo);
      
      setRecordingState('success');
      setSuccess(true);
      
      if (onSave) {
        onSave(result.voiceMemo);
      }

      // Show success feedback before closing
      setTimeout(() => {
        handleClose();
      }, 1000);

    } catch (error) {
      console.error('❌ Voice memo upload error:', error);
      setError(error.message || 'Failed to save voice memo. Please try again.');
      setRecordingState('recorded'); // Go back to recorded state
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    // Stop recording if active
    if (isRecording) {
      stopRecording();
    }

    // Stop playback if active
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }

    // Reset state
    setRecordingDuration(0);
    setAudioBlob(null);
    setAudioUrl(null);
    setError(null);
    setSuccess(false);
    setPermissionDenied(false);
    setRecordingState('idle');

    if (onClose) {
      onClose();
    }
  };

  const handleCancel = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingDuration(0);
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MicIcon color="primary" />
          <Typography variant="h6">Record Voice Memo</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
            {permissionDenied && (
              <Button 
                size="small" 
                onClick={() => window.open('https://support.google.com/chrome/answer/2693767', '_blank')}
                sx={{ ml: 1 }}
              >
                Help
              </Button>
            )}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            🎉 Voice memo saved successfully! It will appear in your task shortly.
          </Alert>
        )}

        <Card sx={{ mb: 2, background: 'rgba(255,255,255,0.05)' }}>
          <CardContent>
            {/* Waveform Canvas */}
            <Box sx={{ mb: 2, textAlign: 'center' }}>
              <canvas
                ref={canvasRef}
                width={400}
                height={100}
                style={{
                  width: '100%',
                  height: '100px',
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: theme.shape.borderRadius,
                  background: theme.palette.background.paper
                }}
              />
            </Box>

            {/* Timer and Progress */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" color="primary">
                  {formatTime(recordingDuration)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  / {formatTime(MAX_DURATION)}
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={(recordingDuration / MAX_DURATION) * 100}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: isRecording ? theme.palette.error.main : theme.palette.primary.main
                  }
                }}
              />
            </Box>

            {/* Recording Controls */}
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 2 }}>
              {!isRecording && !audioBlob && (
                <IconButton
                  onClick={startRecording}
                  size="large"
                  sx={{
                    backgroundColor: theme.palette.error.main,
                    color: 'white',
                    '&:hover': {
                      backgroundColor: theme.palette.error.dark,
                    },
                    animation: 'pulse 2s ease-in-out infinite',
                    '@keyframes pulse': {
                      '0%': { transform: 'scale(1)' },
                      '50%': { transform: 'scale(1.05)' },
                      '100%': { transform: 'scale(1)' }
                    }
                  }}
                >
                  <MicIcon />
                </IconButton>
              )}

              {isRecording && (
                <IconButton
                  onClick={stopRecording}
                  size="large"
                  sx={{
                    backgroundColor: theme.palette.error.main,
                    color: 'white',
                    animation: 'pulse 1s ease-in-out infinite',
                  }}
                >
                  <StopIcon />
                </IconButton>
              )}

              {audioBlob && (
                <>
                  <IconButton
                    onClick={togglePlayback}
                    size="large"
                    color="primary"
                  >
                    {isPlaying ? <PauseIcon /> : <PlayIcon />}
                  </IconButton>
                  <IconButton
                    onClick={handleCancel}
                    size="large"
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </>
              )}
            </Box>

            {/* Status Chips */}
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
              {recordingState === 'requesting' && (
                <Chip 
                  label="🎤 Requesting microphone access..." 
                  color="info" 
                  size="small"
                />
              )}
              {recordingState === 'recording' && (
                <Chip 
                  label="🔴 Recording..." 
                  color="error" 
                  size="small"
                  sx={{ animation: 'pulse 1s ease-in-out infinite' }}
                />
              )}
              {recordingState === 'recorded' && audioBlob && (
                <Chip 
                  label={`✅ Ready to save (${(audioBlob.size / 1024).toFixed(1)} KB)`} 
                  color="success" 
                  size="small" 
                />
              )}
              {recordingState === 'uploading' && (
                <Chip 
                  label="☁️ Uploading..." 
                  color="primary" 
                  size="small"
                />
              )}
              {recordingState === 'success' && (
                <Chip 
                  label="🎉 Saved successfully!" 
                  color="success" 
                  size="small"
                />
              )}
              {recordingDuration >= MAX_DURATION && (
                <Chip 
                  label="⏰ Max duration reached" 
                  color="warning" 
                  size="small" 
                />
              )}
            </Box>
          </CardContent>
        </Card>

        {/* Hidden audio element for playback */}
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            style={{ display: 'none' }}
          />
        )}
      </DialogContent>

      <DialogActions>
        <Button 
          onClick={handleClose} 
          disabled={isUploading || recordingState === 'uploading'}
          color={success ? "success" : "inherit"}
        >
          {success ? 'Done' : 'Cancel'}
        </Button>
        <Button
          onClick={handleSave}
          disabled={!audioBlob || isUploading || recordingState === 'uploading' || success}
          variant="contained"
          startIcon={
            recordingState === 'uploading' ? 
              <CircularProgress size={20} color="inherit" /> : 
              success ? 
                <Typography>🎉</Typography> : 
                <SaveIcon />
          }
          sx={{
            minWidth: 140,
            '&:disabled': {
              opacity: 0.7
            }
          }}
        >
          {recordingState === 'uploading' ? 'Uploading...' : 
           success ? 'Saved!' : 
           'Save Voice Memo'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VoiceRecorder;