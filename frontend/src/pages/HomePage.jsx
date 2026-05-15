import { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Chip,
} from '@mui/material';
import { Grid } from '@mui/material';
import {
  Add as AddIcon,
  List as ListIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import { DELETE_TASK, UPDATE_TASK, GET_TASKS } from '../graphql/queries';
import { useApp } from '../contexts/AppContext';
import { feedback, speak } from '../utils/speech';

import EnhancedVoiceControl from '../components/EnhancedVoiceControl';
import TaskForm from '../components/TaskForm';
import TaskList from '../components/TaskList';
import TaskViews from '../components/TaskViews';
import { useTheme } from '../contexts/ThemeContext';

const HomePage = () => {
  const { getGlassmorphismStyle } = useTheme();
  const { showSnackbar } = useApp();
  
  // Version check to ensure updated code is running
  // console.log('🏠 HomePage UPDATED VERSION loaded at:', new Date().toISOString());


  // Fetch tasks with fresh data policy
  const { data: tasksData, loading: tasksLoading, refetch: refetchTasks, error: tasksError } = useQuery(GET_TASKS, {
    errorPolicy: 'all',
    fetchPolicy: 'network-only', // Always fetch fresh data from network
    notifyOnNetworkStatusChange: true,
    pollInterval: 0, // Disable polling, use manual refetch instead
  });

  // Debug logging
  useEffect(() => {
    if (tasksError) {
      console.error('📋 Task query error:', tasksError.message);
    }
  }, [tasksLoading, tasksError, tasksData]);

  // Force refetch on component mount to ensure fresh data
  useEffect(() => {
    const timer = setTimeout(() => {
      refetchTasks().catch(error => {
        console.error('📋 Initial refetch failed:', error.message);
      });
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [refetchTasks]);

  const tasks = tasksData?.tasks?.tasks || [];

  // Optimized debounced refetch with longer delay to reduce lag
  const debouncedRefetch = useCallback(() => {
    if (window.refetchTimeout) {
      clearTimeout(window.refetchTimeout);
    }
    window.refetchTimeout = setTimeout(() => {
      refetchTasks();
      window.refetchTimeout = null;
    }, 1000); // Increased from 200ms to 1000ms to reduce lag
  }, [refetchTasks]);

  // DEBUGGING: Log task data when it changes
  useEffect(() => {
    // console.log('🔍 DEBUGGING HomePage - Task data updated:', {
    //   tasksCount: tasks.length,
    //   taskTitles: tasks.map(t => t.title),
    //   loading: tasksLoading,
    //   error: tasksError?.message,
    //   isAnonymous: tasksData?.tasks?.isAnonymous,
    //   sessionId: tasksData?.tasks?.sessionId,
    //   currentSessionId: localStorage.getItem('session_id'),
    //   hasAuthToken: !!localStorage.getItem('auth_token'),
    //   rawTasksData: tasksData,
    //   tasksDataStructure: tasksData ? Object.keys(tasksData) : 'no data'
    // });
    
    // Check for duplicate tasks
    const taskIds = tasks.map(t => t.id);
    const duplicateIds = taskIds.filter((id, index) => taskIds.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      console.error('🚨 DUPLICATE TASKS DETECTED:', duplicateIds);
    }
    
    // Expose tasks globally for debugging
    window.debugTasks = tasks;
    window.debugTasksData = tasksData;
  }, [tasks, tasksLoading, tasksError, tasksData]);  // State
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskFilter, setTaskFilter] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  const [isPlayingWelcome, setIsPlayingWelcome] = useState(false);

  // Ref for task form scrolling
  const taskFormRef = useRef(null);

  // GraphQL Mutations
  const [deleteTaskMutation] = useMutation(DELETE_TASK, {
    // Skip cache update and rely on refetch for correct ordering
    update: () => {},
    onCompleted: (_, { variables }) => {
      console.log('✅ Task deleted successfully:', variables?.id);
      showSnackbar('🗑️ Task deleted successfully!', 'success');
      // Reduced voice feedback to prevent lag
      // feedback.custom('Task deleted successfully');
      // Debounced refetch to prevent duplicates
      debouncedRefetch();
    },
    onError: (error) => {
      console.error('❌ Error deleting task:', error);
      showSnackbar(`❌ Failed to delete task: ${error.message}`, 'error');
      // Reduced voice feedback to prevent lag
      // feedback.custom('Failed to delete task');
      // Debounced refetch to prevent duplicates
      debouncedRefetch();
    }
  });

  const [updateTaskMutation] = useMutation(UPDATE_TASK, {
    // Skip cache update and rely on refetch for correct ordering
    update: () => {},
    onCompleted: (data) => {
      console.log('✅ Task updated successfully:', data.updateTask);
      showSnackbar('✅ Task updated successfully!', 'success');
      // Reduced voice feedback to prevent lag and conflicts
      // const updatedTask = data.updateTask;
      // if (updatedTask.status === 'completed') {
      //   feedback.taskCompleted(updatedTask.title);
      // } else if (updatedTask.status === 'in_progress') {
      //   feedback.taskInProgress(updatedTask.title);
      // } else {
      //   feedback.taskUpdated(updatedTask.title);
      // }
      // Debounced refetch to prevent duplicates
      debouncedRefetch();
    },
    onError: (error) => {
      console.error('❌ Error updating task:', error);
      showSnackbar(`❌ Failed to update task: ${error.message}`, 'error');
      // Reduced voice feedback to prevent lag
      // feedback.custom('Failed to update task');
      // Debounced refetch to prevent duplicates
      debouncedRefetch();
    }
  });



  // Task filtering
  const pendingTasks = tasks.filter(task => task.status === 'pending');
  const inProgressTasks = tasks.filter(task => task.status === 'in_progress');
  const completedTasks = tasks.filter(task => task.status === 'completed');

  const filteredTasks = taskFilter === 'pending' ? pendingTasks : 
                       taskFilter === 'in_progress' ? inProgressTasks :
                       taskFilter === 'completed' ? completedTasks : tasks;

  // DEBUGGING: Log task counts
  // console.log('🔍 TASK FILTERING DEBUG:', {
  //   totalTasks: tasks.length,
  //   pendingCount: pendingTasks.length,
  //   inProgressCount: inProgressTasks.length,
  //   completedCount: completedTasks.length,
  //   currentFilter: taskFilter,
  //   filteredCount: filteredTasks.length,
  //   filteredTitles: filteredTasks.map(t => t.title)
  // });

  // Handlers
  const handleDeleteTask = async (taskId) => {
    try {
      await deleteTaskMutation({ variables: { id: taskId } });
    } catch (error) {
      console.error('Delete task error:', error);
    }
  };

  const handleUpdateTask = async (taskId, updates) => {
    try {
      await updateTaskMutation({ variables: { id: taskId, ...updates } });
    } catch (error) {
      console.error('Update task error:', error);
    }
  };

  const handleVoiceMemoUpdate = (taskId, action, memoData) => {
    // Handle voice memo updates (add, delete, update)
    // This will trigger a refetch to get updated task data with voice memos
    console.log('🔄 Voice memo update:', { taskId, action, memoData });
    console.log('🔄 Triggering task refetch...');
    debouncedRefetch();
    
    // Provide user feedback
    switch (action) {
      case 'add':
        showSnackbar('🎙️ Voice memo saved successfully!', 'success');
        feedback.custom('Voice memo saved');
        break;
      case 'delete':
        showSnackbar('🗑️ Voice memo deleted', 'info');
        feedback.custom('Voice memo deleted');
        break;
      case 'update':
        showSnackbar('📝 Voice memo updated', 'info');
        feedback.custom('Voice memo updated');
        break;
    }
  };

  const handleCreateTask = async (taskData) => {
    // TaskForm handles the mutation, we just need to close the form and trigger refetch
    console.log('✅ Task created successfully:', taskData);
    showSnackbar('✅ Task created successfully!', 'success');
    feedback.taskAdded(taskData.title);
    setShowTaskForm(false);
    // Debounced refetch to ensure fresh data
    debouncedRefetch();
  };

  const handleShowTaskForm = () => {
    setShowTaskForm(true);
    // Scroll to task form after a short delay to ensure it's rendered
    setTimeout(() => {
      if (taskFormRef.current) {
        taskFormRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }
    }, 100);
  };



  // Welcome message on page load - play every time (UPDATED VERSION)
  useEffect(() => {
    // console.log('🔊 WELCOME DEBUG - UPDATED VERSION - Initial check:', { 
    //   feedbackAvailable: !!feedback,
    //   feedbackKeys: feedback ? Object.keys(feedback) : 'no feedback',
    //   speechSynthesisSupported: 'speechSynthesis' in window,
    //   timestamp: new Date().toISOString()
    // });
    
    // Clear any previous session storage to ensure welcome plays every time
    sessionStorage.removeItem('voicetask_welcome_played');
    localStorage.removeItem('debug_force_welcome');
    console.log('🧹 CLEARED session storage for welcome message');
    
    // If feedback is not available yet, wait for it
    if (!feedback || !feedback.welcome) {
      console.log('🔊 WELCOME DEBUG - Feedback not ready, will retry when available');
      return;
    }
    
    const playWelcome = async () => {
      setIsPlayingWelcome(true);
      const timestamp = new Date().toISOString();
      // console.log('🔊 PLAY WELCOME - UPDATED VERSION - Starting welcome message at:', timestamp);
      // console.log('🔊 PLAY WELCOME - Feedback object:', feedback);
      // console.log('🔊 PLAY WELCOME - Speech synthesis supported:', 'speechSynthesis' in window);
      // console.log('🔊 PLAY WELCOME - Available voices:', window.speechSynthesis?.getVoices().length);
      
      try {
        if (feedback && feedback.welcome) {
          // console.log('🔊 PLAY WELCOME - UPDATED VERSION - Calling feedback.welcome()');
          await feedback.welcome();
          // console.log('🔊 PLAY WELCOME - UPDATED VERSION - Welcome message completed successfully');
        } else {
          console.error('🔊 PLAY WELCOME - Feedback or welcome function not available', {
            feedbackExists: !!feedback,
            welcomeExists: !!(feedback && feedback.welcome),
            feedbackKeys: feedback ? Object.keys(feedback) : 'no feedback'
          });
          
          // Try basic speech synthesis as fallback
          if ('speechSynthesis' in window) {
            console.log('🔊 PLAY WELCOME - Trying fallback speech synthesis');
            const utterance = new SpeechSynthesisUtterance('Welcome to VoiceTask! Ready to manage your tasks with voice commands.');
            utterance.onstart = () => console.log('🔊 FALLBACK - Speech started');
            utterance.onend = () => console.log('🔊 FALLBACK - Speech ended');
            utterance.onerror = (e) => console.error('🔊 FALLBACK - Speech error:', e);
            window.speechSynthesis.speak(utterance);
          }
        }
      } catch (error) {
        console.error('🔊 PLAY WELCOME - Welcome message failed:', error);
      }
      
      setTimeout(() => {
        setIsPlayingWelcome(false);
      }, 8000);
    };

    // Expose debugging functions globally
    window.debugPlayWelcome = playWelcome;
    window.debugTestSpeech = () => {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance('Hello, this is a test of speech synthesis');
        window.speechSynthesis.speak(utterance);
      }
    };
    window.debugFeedback = feedback;

    // Don't auto-play welcome message to avoid browser blocking
    // Welcome will play when user first interacts with voice controls
    console.log('🔊 WELCOME - Ready to play on user interaction (avoiding autoplay block)');

    // No cleanup needed since we're not using timer
  }, [feedback]);

  return (
    <Box sx={{ 
      width: '100%',
      minHeight: '100vh',
      backgroundColor: 'background.default',
      flex: 1,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      overflowX: 'auto',
    }}>
      <Container 
        maxWidth="lg" 
        sx={{ 
          py: 3, 
          px: { xs: 2, sm: 3, md: 4 }, 
          minHeight: '100vh',
          backgroundColor: 'background.default',
          display: 'flex',
          justifyContent: 'center',
          width: '100%',
          maxWidth: '1200px !important',
        }}
      >
        <Grid container spacing={3} sx={{ 
          minHeight: '100vh',
          backgroundColor: 'background.default',
          maxWidth: '1200px',
          margin: '0 auto',
          flexWrap: { xs: 'wrap', md: 'nowrap' },
          justifyContent: 'center',
          alignItems: 'flex-start',
          width: '100%',
        }}>
          {/* Left Column - Voice Control & Task Form */}
          <Grid 
            item
            xs={12}
            md={4}
            sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              maxWidth: { xs: '100%', md: '33.333333%' },
              width: { xs: '100%', md: '33.333333%' },
              minWidth: { xs: '100%', md: '300px' },
              overflow: 'hidden',
              backgroundColor: 'background.default',
              mb: { xs: 2, md: 0 },
            }}
          >
            {/* Voice Controller Card */}
            <Card 
              elevation={0}
              sx={{ 
                ...getGlassmorphismStyle(),
                mb: 3,
                borderRadius: 3,
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 600,
                      color: 'text.primary',
                      background: 'linear-gradient(45deg, #9c27b0 30%, #e91e63 90%)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    🎙️ Voice Commands
                  </Typography>
                </Box>

                <EnhancedVoiceControl refetchTasks={debouncedRefetch} />
              </CardContent>
            </Card>

            {/* Add New Task Card */}
            <Card 
              ref={taskFormRef}
              elevation={0}
              sx={{
                ...getGlassmorphismStyle(),
                borderRadius: 3,
              }}
            >
              <CardContent sx={{ p: 3 }}>
                {!showTaskForm ? (
                  <>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        fontWeight: 600,
                        mb: 2,
                        color: 'text.primary',
                      }}
                    >
                      Add New Task
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      fullWidth
                      onClick={handleShowTaskForm}
                      sx={{
                        py: 2,
                        fontWeight: 500,
                        fontSize: '0.875rem',
                        background: '#2563EB',
                        color: '#FFFFFF',
                        borderRadius: 1.5,
                        '&:hover': {
                          transform: 'translateY(-1px)',
                          background: '#1E40AF',
                          boxShadow: '0 4px 8px rgba(37, 99, 235, 0.25)',
                        },
                      }}
                    >
                      New Task
                    </Button>
                  </>
                ) : (
                  <TaskForm 
                    onSubmit={handleCreateTask} 
                    onCancel={() => setShowTaskForm(false)} 
                  />
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Right Column - Tasks */}
          <Grid 
            item
            xs={12}
            md={8}
            sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              overflow: 'hidden',
              backgroundColor: 'background.default',
              maxWidth: { xs: '100%', md: '66.666667%' },
              width: { xs: '100%', md: '66.666667%' },
              minWidth: { xs: '100%', md: '400px' },
            }}
          >
            {/* Tasks Header */}
            <Card 
              elevation={0} 
              sx={{ 
                ...getGlassmorphismStyle(),
                mb: 3, 
                borderRadius: 3,
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    fontWeight: 600,
                    color: 'text.primary',
                    mb: 2,
                  }}
                >
                  Tasks
                </Typography>

                {/* Filter Chips */}
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  {[
                    { key: 'all', label: `All (${tasks.length})` },
                    { key: 'pending', label: `Pending (${pendingTasks.length})` },
                    { key: 'in_progress', label: `In Progress (${inProgressTasks.length})` },
                    { key: 'completed', label: `Completed (${completedTasks.length})` }
                  ].map((filter) => (
                    <Chip
                      key={filter.key}
                      label={filter.label}
                      onClick={() => setTaskFilter(filter.key)}
                      color={taskFilter === filter.key ? 'primary' : 'default'}
                      variant={taskFilter === filter.key ? 'filled' : 'outlined'}
                      sx={{
                        fontWeight: 500,
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </Box>

                {/* View Mode Switcher */}
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                  {[
                    { key: 'list', label: 'List', icon: <ListIcon /> },
                    { key: 'calendar', label: 'Calendar', icon: <CalendarIcon /> }
                  ].map((view) => (
                    <Button
                      key={view.key}
                      variant={viewMode === view.key ? 'contained' : 'outlined'}
                      onClick={() => setViewMode(view.key)}
                      size="small"
                      startIcon={view.icon}
                      sx={{
                        fontWeight: 500,
                        fontSize: '0.75rem',
                        px: 2,
                        py: 0.5,
                        borderRadius: 1,
                        minWidth: 'auto',
                      }}
                    >
                      {view.label}
                    </Button>
                  ))}
                </Box>
              </CardContent>
            </Card>

            {/* Task Views */}
            <Box sx={{ width: '100%', overflow: 'hidden' }}>
              {viewMode === 'list' ? (
                <TaskList
                  tasks={filteredTasks}
                  loading={tasksLoading}
                  onDelete={handleDeleteTask}
                  onUpdate={handleUpdateTask}
                  onShowTaskForm={handleShowTaskForm}
                  onVoiceMemoUpdate={handleVoiceMemoUpdate}
                />
              ) : (
                <TaskViews 
                  tasks={tasks} 
                  onUpdateTask={handleUpdateTask} 
                  onDeleteTask={handleDeleteTask}
                  initialView={viewMode}
                  showViewSwitcher={false}
                />
              )}
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default HomePage;