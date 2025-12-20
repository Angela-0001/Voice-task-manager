import { useState, useRef, useEffect } from 'react';
import {
  Card,
  CardContent,
  IconButton,
  Typography,
  Box,
  Slider,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  LinearProgress,
  Button
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  VolumeUp as VolumeIcon,
  VolumeOff as VolumeOffIcon,
  MoreVert as MoreIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useMutation } from '@apollo/client';
import { DELETE_VOICE_MEMO, GET_TASKS } from '../graphql/queries';

const VoiceMemoPlayer = ({ memo, taskId, onDelete }) => {
  const theme = useTheme();
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [deleteVoiceMemo] = useMutation(DELETE_VOICE_MEMO);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    console.log('🎵 Audio setup for memo:', { 
      id: memo.id, 
      audioUrl: memo.audioUrl,
      fileName: memo.fileName 
    });

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);
    const handleLoadStart = () => {
      setIsLoading(true);
      setLoadError(false);
    };
    const handleCanPlay = () => setIsLoading(false);
    const handleCanPlayThrough = () => setIsLoading(false);
    const handleError = () => {
      setIsLoading(false);
      setLoadError(true);
      console.error('Audio loading error for:', memo.audioUrl);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('canplaythrough', handleCanPlayThrough);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('canplaythrough', handleCanPlayThrough);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio || loadError) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      // If audio is still loading, wait for it
      if (isLoading) {
        const playWhenReady = () => {
          audio.removeEventListener('canplay', playWhenReady);
          audio.play().then(() => {
            setIsPlaying(true);
          }).catch(error => {
            console.error('Play error:', error);
            setLoadError(true);
          });
        };
        audio.addEventListener('canplay', playWhenReady);
      } else {
        audio.play().then(() => {
          setIsPlaying(true);
        }).catch(error => {
          console.error('Play error:', error);
          setLoadError(true);
        });
      }
    }
  };

  const retryLoad = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    setLoadError(false);
    setIsLoading(true);
    audio.load(); // Reload the audio
  };

  const handleSeek = (_, newValue) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    audio.currentTime = newValue;
    setCurrentTime(newValue);
  };

  const handleVolumeChange = (_, newValue) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    setVolume(newValue);
    audio.volume = newValue;
    setIsMuted(newValue === 0);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted) {
      audio.volume = volume;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  };

  const handleSpeedChange = (newRate) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    setPlaybackRate(newRate);
    audio.playbackRate = newRate;
    setMenuAnchor(null);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = memo.audioUrl;
    link.download = memo.fileName || `voice-memo-${memo.id}.webm`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setMenuAnchor(null);
  };

  const handleDelete = async () => {
    console.log('🗑️ DELETE BUTTON CLICKED - Starting deletion process');
    
    // Confirm deletion
    if (!window.confirm('Are you sure you want to delete this voice memo? This action cannot be undone.')) {
      console.log('🗑️ DELETE CANCELLED by user');
      setMenuAnchor(null);
      return;
    }
    
    console.log('🗑️ DELETE CONFIRMED by user');
    
    try {
      console.log('🗑️ Attempting to delete voice memo:', { taskId, memoId: memo.id });
      
      const result = await deleteVoiceMemo({
        variables: { taskId, memoId: memo.id },
        errorPolicy: 'all'
      });
      
      console.log('🗑️ Delete result:', result);
      
      if (result.errors) {
        console.error('🗑️ GraphQL errors:', result.errors);
        throw new Error(result.errors[0].message);
      }
      
      if (onDelete) {
        onDelete(memo.id);
      }
      
      // Show success message
      alert('Voice memo deleted successfully!');
      
    } catch (error) {
      console.error('❌ Error deleting voice memo:', error);
      alert(`Failed to delete voice memo: ${error.message}`);
    }
    setMenuAnchor(null);
  };



  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];

  return (
    <Card 
      sx={{ 
        mb: 2, 
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(10px)'
      }}
    >
      <CardContent sx={{ p: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Voice Memo • {formatTime(memo.duration)} • {formatFileSize(memo.fileSize)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {new Date(memo.createdAt).toLocaleString()}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip 
              label={`${playbackRate}x`} 
              size="small" 
              color="primary"
              sx={{ minWidth: 45 }}
            />
            <IconButton
              size="small"
              onClick={(e) => setMenuAnchor(e.currentTarget)}
            >
              <MoreIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Audio Element */}
        <audio
          ref={audioRef}
          src={memo.audioUrl.startsWith('http') ? memo.audioUrl : `http://localhost:5014${memo.audioUrl}`}
          preload="auto"
          style={{ display: 'none' }}
        />

        {/* Progress Bar */}
        <Box sx={{ mb: 2 }}>
          {isLoading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <LinearProgress sx={{ flex: 1 }} />
              <Typography variant="caption" color="text.secondary">
                Loading audio...
              </Typography>
            </Box>
          )}
          {loadError && (
            <Box sx={{ 
              p: 1, 
              mb: 1, 
              backgroundColor: 'error.main', 
              color: 'error.contrastText',
              borderRadius: 1,
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>⚠️ Failed to load audio. Check your connection.</span>
              <Button 
                size="small" 
                onClick={retryLoad}
                sx={{ 
                  color: 'error.contrastText',
                  minWidth: 'auto',
                  fontSize: '0.7rem'
                }}
              >
                Retry
              </Button>
            </Box>
          )}
          <Slider
            value={currentTime}
            max={duration || 100}
            onChange={handleSeek}
            size="small"
            sx={{
              color: theme.palette.primary.main,
              '& .MuiSlider-thumb': {
                width: 12,
                height: 12,
              },
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {formatTime(currentTime)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatTime(duration)}
            </Typography>
          </Box>
        </Box>

        {/* Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Play/Pause Button */}
          <Tooltip title={
            loadError ? 'Audio failed to load' :
            isLoading ? 'Loading audio...' :
            isPlaying ? 'Pause' : 'Play'
          }>
            <IconButton
              onClick={togglePlayPause}
              disabled={isLoading || loadError}
              sx={{
                backgroundColor: loadError ? theme.palette.error.main : theme.palette.primary.main,
                color: 'white',
                '&:hover': {
                  backgroundColor: loadError ? theme.palette.error.dark : theme.palette.primary.dark,
                },
                '&:disabled': {
                  backgroundColor: 'rgba(255,255,255,0.1)',
                }
              }}
            >
              {loadError ? '⚠️' : isPlaying ? <PauseIcon /> : <PlayIcon />}
            </IconButton>
          </Tooltip>

          {/* Volume Control */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, maxWidth: 120 }}>
            <Tooltip title={isMuted ? 'Unmute' : 'Mute'}>
              <IconButton size="small" onClick={toggleMute}>
                {isMuted ? <VolumeOffIcon /> : <VolumeIcon />}
              </IconButton>
            </Tooltip>
            <Slider
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              min={0}
              max={1}
              step={0.1}
              size="small"
              sx={{ flex: 1 }}
            />
          </Box>
        </Box>



        {/* Menu */}
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
        >
          {/* Speed Options */}
          <MenuItem disabled>
            <ListItemIcon>
              <SpeedIcon />
            </ListItemIcon>
            <ListItemText primary="Playback Speed" />
          </MenuItem>
          {speedOptions.map((speed) => (
            <MenuItem
              key={speed}
              onClick={() => handleSpeedChange(speed)}
              selected={playbackRate === speed}
              sx={{ pl: 4 }}
            >
              {speed}x
            </MenuItem>
          ))}
          

          <MenuItem onClick={handleDownload}>
            <ListItemIcon>
              <DownloadIcon />
            </ListItemIcon>
            <ListItemText primary="Download" />
          </MenuItem>
          
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <DeleteIcon color="error" />
            </ListItemIcon>
            <ListItemText primary="Delete" />
          </MenuItem>
        </Menu>
      </CardContent>
    </Card>
  );
};

export default VoiceMemoPlayer;