import { useState, useEffect } from 'react';
import { useMutation } from '@apollo/client';
import {
  Box,
  TextField,
  Button,
  MenuItem,
  Typography,
  Grid,
  useTheme,
  alpha,
  FormControlLabel,
  Switch,
  CircularProgress,
  IconButton
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  Save as SaveIcon,
  Close as CloseIcon,
  Notifications as NotificationsIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon
} from '@mui/icons-material';
import { UPDATE_TASK, GET_TASKS } from '../graphql/queries';
import { useApp } from '../contexts/AppContext';



// Helper function to convert status to GraphQL format
const statusToGraphQL = (status) => {
  switch (status) {
    case 'in_progress':
      return 'in_progress';
    case 'completed':
      return 'completed';
    case 'pending':
    default:
      return 'pending';
  }
};

const EditTaskForm = ({ task, onSubmit, onCancel }) => {
  const theme = useTheme();
  const { showSnackbar } = useApp();

  const [title, setTitle] = useState(task.title || '');
  const [description, setDescription] = useState(task.description || '');
  const [status, setStatus] = useState(task.status || 'pending');
  const [dueDate, setDueDate] = useState(task.dueDate ? new Date(task.dueDate) : null);
  const [priority, setPriority] = useState(task.priority || 'medium');
  const [reminderEnabled, setReminderEnabled] = useState(task.reminderEnabled !== undefined ? task.reminderEnabled : true);
  const [recurrence, setRecurrence] = useState(task.recurrence || 'none');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // GraphQL Mutation
  const [updateTask] = useMutation(UPDATE_TASK, {
    onCompleted: (data) => {
      console.log('✅ TASK UPDATED SUCCESSFULLY:', data.updateTask);
      showSnackbar('✅ Task updated successfully!', 'success');

      // Voice feedback disabled


      // Clear form and close
      setIsSubmitting(false);

      // Call onSubmit callback if provided
      if (onSubmit) {
        onSubmit(data.updateTask);
      }
    },
    onError: (error) => {
      console.error('❌ TASK UPDATE ERROR:', error);
      console.error('❌ ERROR DETAILS:', error.message);
      console.error('❌ GRAPHQL ERRORS:', error.graphQLErrors);
      console.error('❌ NETWORK ERROR:', error.networkError);
      showSnackbar('❌ Failed to update task. Please try again.', 'error');

      // Voice feedback disabled


      setIsSubmitting(false);
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      showSnackbar('❌ Please enter a task title', 'error');

      return;
    }

    setIsSubmitting(true);

    // Voice feedback disabled


    try {
      console.log('📋 UPDATING TASK WITH DATA:', {
        id: task.id,
        title: title.trim(),
        description: description.trim(),
        status,
        dueDate: dueDate ? dueDate.toISOString() : null,
        priority,
        reminderEnabled,
        recurrence
      });

      const variables = {
        id: task.id,
        title: title.trim(),
        description: description.trim() || null,
        status: statusToGraphQL(status),
        dueDate: dueDate ? dueDate.toISOString() : null,
        priority,
        reminderEnabled,
        recurrence
      };

      console.log('📋 GRAPHQL VARIABLES:', variables);

      // Perform GraphQL mutation with optimistic response
      await updateTask({
        variables,
        optimisticResponse: {
          updateTask: {
            id: task.id,
            title: title.trim(),
            description: description.trim(),
            status,
            dueDate: dueDate ? dueDate.toISOString() : null,
            priority,
            reminderEnabled,
            recurrence,
            updatedAt: new Date().toISOString()
          }
        },
        refetchQueries: [{ query: GET_TASKS }],
        awaitRefetchQueries: true
      });
    } catch (error) {
      console.error('❌ UPDATE ERROR:', error);
      // Error handling is done in the mutation's onError callback
    }
  };

  // Voice input for task title
  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      showSnackbar('❌ Speech recognition not supported in your browser', 'error');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);

    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setTitle(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);

    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden',
      }}
    >
      <Typography
        variant="h6"
        gutterBottom
        sx={{
          fontWeight: 600,
          mb: 3,
          color: 'text.primary',
        }}
      >
        Edit Task
      </Typography>

      <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%', maxWidth: '100%' }}>
        <Grid container spacing={1.5} sx={{ width: '100%', maxWidth: '100%' }}>
          <Grid size={12} sx={{ width: '100%', maxWidth: '100%' }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <TextField
                fullWidth
                label="Task Title"
                placeholder="What needs to be done?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                variant="outlined"
                sx={{
                  width: '100%',
                  maxWidth: '100%',
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&:hover fieldset': {
                      borderColor: theme.palette.primary.main,
                    },
                  },
                }}
              />
              <IconButton
                onClick={handleVoiceInput}
                disabled={isListening}
                color={isListening ? "secondary" : "primary"}
                sx={{
                  mt: 1,
                  p: 1.5,
                  border: '1px solid',
                  borderColor: isListening ? 'secondary.main' : 'primary.main',
                  borderRadius: 2,
                  '&:hover': {
                    backgroundColor: isListening ? 'secondary.light' : 'primary.light',
                  }
                }}
              >
                {isListening ? <MicOffIcon /> : <MicIcon />}
              </IconButton>
            </Box>
          </Grid>

          <Grid size={12} sx={{ width: '100%', maxWidth: '100%' }}>
            <TextField
              fullWidth
              label="Description (Optional)"
              placeholder="Add more details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={2}
              variant="outlined"
              sx={{
                width: '100%',
                maxWidth: '100%',
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
          </Grid>

          <Grid size={12} sx={{ width: '100%', maxWidth: '100%' }}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Due Date (Optional)"
                value={dueDate}
                onChange={(newValue) => setDueDate(newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    variant: 'outlined',
                    sx: {
                      width: '100%',
                      maxWidth: '100%',
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      },
                    }
                  }
                }}
              />
            </LocalizationProvider>
          </Grid>

          <Grid size={12} sx={{ width: '100%', maxWidth: '100%' }}>
            <TextField
              select
              fullWidth
              label="Priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              variant="outlined"
              sx={{
                width: '100%',
                maxWidth: '100%',
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            >
              <MenuItem value="low">🟢 Low</MenuItem>
              <MenuItem value="medium">🟡 Medium</MenuItem>
              <MenuItem value="high">🔴 High</MenuItem>
            </TextField>
          </Grid>

          <Grid size={12} sx={{ width: '100%', maxWidth: '100%' }}>
            <TextField
              select
              fullWidth
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              variant="outlined"
              sx={{
                width: '100%',
                maxWidth: '100%',
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            >
              <MenuItem value="pending">📋 Pending</MenuItem>
              <MenuItem value="in_progress">⚡ In Progress</MenuItem>
              <MenuItem value="completed">✅ Completed</MenuItem>
            </TextField>
          </Grid>

          <Grid size={12} sx={{ width: '100%', maxWidth: '100%' }}>
            <TextField
              select
              fullWidth
              label="Recurrence"
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value)}
              variant="outlined"
              sx={{
                width: '100%',
                maxWidth: '100%',
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            >
              <MenuItem value="none">🚫 None</MenuItem>
              <MenuItem value="daily">📅 Daily</MenuItem>
              <MenuItem value="weekly">📆 Weekly</MenuItem>
              <MenuItem value="monthly">🗓️ Monthly</MenuItem>
            </TextField>
          </Grid>

          <Grid size={12} sx={{ width: '100%', maxWidth: '100%' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={reminderEnabled}
                  onChange={(e) => setReminderEnabled(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <NotificationsIcon fontSize="small" />
                  Enable Reminders
                </Box>
              }
              sx={{
                mt: 1,
                width: '100%',
                maxWidth: '100%',
                '& .MuiFormControlLabel-label': {
                  fontSize: '0.875rem',
                  color: theme.palette.text.secondary
                }
              }}
            />
          </Grid>

          <Grid size={12} sx={{ width: '100%', maxWidth: '100%' }}>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button
                type="submit"
                variant="contained"
                startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                disabled={!title.trim() || isSubmitting}
                sx={{
                  flex: 1,
                  borderRadius: 1.5,
                  py: 1.5,
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  background: '#2563EB',
                  color: '#FFFFFF',
                  '&:hover': {
                    transform: isSubmitting ? 'none' : 'translateY(-1px)',
                    background: '#1E40AF',
                    boxShadow: isSubmitting ? 'none' : '0 4px 8px rgba(37, 99, 235, 0.25)',
                  },
                  transition: 'all 0.2s ease',
                  '&:disabled': {
                    opacity: 0.6,
                    transform: 'none',
                  }
                }}
              >
                {isSubmitting ? 'Updating...' : 'Update Task'}
              </Button>

              {onCancel && (
                <Button
                  variant="outlined"
                  onClick={onCancel}
                  startIcon={<CloseIcon />}
                  sx={{
                    borderRadius: 2,
                    py: 1.5,
                    px: 2,
                    borderColor: alpha(theme.palette.text.primary, 0.3),
                    '&:hover': {
                      borderColor: theme.palette.text.primary,
                      background: alpha(theme.palette.text.primary, 0.05),
                    },
                  }}
                >
                  Cancel
                </Button>
              )}
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default EditTaskForm;