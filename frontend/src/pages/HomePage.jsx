import { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Container, Card, CardContent, Typography, Button, Box, Chip,
} from '@mui/material';
import { Grid } from '@mui/material';
import { Add as AddIcon, List as ListIcon, CalendarMonth as CalendarIcon } from '@mui/icons-material';
import { DELETE_TASK, UPDATE_TASK, GET_TASKS } from '../graphql/queries';
import { useApp } from '../contexts/AppContext';
import { feedback } from '../utils/speech';
import EnhancedVoiceControl from '../components/EnhancedVoiceControl';
import TaskForm from '../components/TaskForm';
import TaskList from '../components/TaskList';
import TaskViews from '../components/TaskViews';
import { useTheme } from '../contexts/ThemeContext';

const HomePage = () => {
  const { getGlassmorphismStyle } = useTheme();
  const { showSnackbar } = useApp();

  const { data: tasksData, loading: tasksLoading, refetch: refetchTasks, error: tasksError } = useQuery(GET_TASKS, {
    errorPolicy: 'all',
    fetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: true,
  });

  const tasks = tasksData?.tasks?.tasks || [];

  const refetchTimeoutRef = useRef(null);

  const debouncedRefetch = useCallback(() => {
    if (refetchTimeoutRef.current) clearTimeout(refetchTimeoutRef.current);
    refetchTimeoutRef.current = setTimeout(() => {
      refetchTasks();
      refetchTimeoutRef.current = null;
    }, 500);
  }, [refetchTasks]);

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskFilter, setTaskFilter] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  const taskFormRef = useRef(null);

  const [deleteTaskMutation] = useMutation(DELETE_TASK, {
    update: () => {},
    onCompleted: () => {
      showSnackbar('🗑️ Task deleted successfully!', 'success');
      debouncedRefetch();
    },
    onError: (error) => {
      showSnackbar(`❌ Failed to delete task: ${error.message}`, 'error');
    }
  });

  const [updateTaskMutation] = useMutation(UPDATE_TASK, {
    update: () => {},
    onCompleted: () => {
      showSnackbar('✅ Task updated successfully!', 'success');
      debouncedRefetch();
    },
    onError: (error) => {
      showSnackbar(`❌ Failed to update task: ${error.message}`, 'error');
    }
  });

  const pendingTasks = tasks.filter(task => task.status === 'pending');
  const inProgressTasks = tasks.filter(task => task.status === 'in_progress');
  const completedTasks = tasks.filter(task => task.status === 'completed');

  const filteredTasks =
    taskFilter === 'pending' ? pendingTasks :
    taskFilter === 'in_progress' ? inProgressTasks :
    taskFilter === 'completed' ? completedTasks : tasks;

  const handleDeleteTask = async (taskId) => {
    await deleteTaskMutation({ variables: { id: taskId } });
  };

  const handleUpdateTask = async (taskId, updates) => {
    await updateTaskMutation({ variables: { id: taskId, ...updates } });
  };

  const handleVoiceMemoUpdate = (taskId, action) => {
    debouncedRefetch();
    const messages = {
      add: ['🎙️ Voice memo saved successfully!', 'success'],
      delete: ['🗑️ Voice memo deleted', 'info'],
      update: ['📝 Voice memo updated', 'info'],
    };
    if (messages[action]) showSnackbar(...messages[action]);
  };

  const handleCreateTask = (taskData) => {
    showSnackbar('✅ Task created successfully!', 'success');
    feedback.taskAdded(taskData.title);
    setShowTaskForm(false);
    debouncedRefetch();
  };

  const handleShowTaskForm = () => {
    setShowTaskForm(true);
    setTimeout(() => {
      taskFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // Play welcome on first interaction
  useEffect(() => {
    if (!feedback?.welcome) return;
    const playWelcome = () => feedback.welcome();
    document.addEventListener('click', playWelcome, { once: true });
    document.addEventListener('keydown', playWelcome, { once: true });
    return () => {
      document.removeEventListener('click', playWelcome);
      document.removeEventListener('keydown', playWelcome);
    };
  }, []);

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', backgroundColor: 'background.default', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflowX: 'auto' }}>
      <Container maxWidth="lg" sx={{ py: 3, px: { xs: 2, sm: 3, md: 4 }, minHeight: '100vh', display: 'flex', justifyContent: 'center', width: '100%', maxWidth: '1200px !important' }}>
        <Grid container spacing={3} sx={{ minHeight: '100vh', maxWidth: '1200px', margin: '0 auto', flexWrap: { xs: 'wrap', md: 'nowrap' }, justifyContent: 'center', alignItems: 'flex-start', width: '100%' }}>

          {/* Left Column */}
          <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', maxWidth: { xs: '100%', md: '33.333333%' }, width: { xs: '100%', md: '33.333333%' }, minWidth: { xs: '100%', md: '300px' }, overflow: 'hidden', mb: { xs: 2, md: 0 } }}>
            <Card elevation={0} sx={{ ...getGlassmorphismStyle(), mb: 3, borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, background: 'linear-gradient(45deg, #9c27b0 30%, #e91e63 90%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    🎙️ Voice Commands
                  </Typography>
                </Box>
                <EnhancedVoiceControl refetchTasks={debouncedRefetch} />
              </CardContent>
            </Card>

            <Card ref={taskFormRef} elevation={0} sx={{ ...getGlassmorphismStyle(), borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                {!showTaskForm ? (
                  <>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>Add New Task</Typography>
                    <Button variant="contained" startIcon={<AddIcon />} fullWidth onClick={handleShowTaskForm}
                      sx={{ py: 2, fontWeight: 500, fontSize: '0.875rem', background: '#2563EB', color: '#FFFFFF', borderRadius: 1.5, '&:hover': { background: '#1E40AF', transform: 'translateY(-1px)', boxShadow: '0 4px 8px rgba(37,99,235,0.25)' } }}>
                      New Task
                    </Button>
                  </>
                ) : (
                  <TaskForm onSubmit={handleCreateTask} onCancel={() => setShowTaskForm(false)} />
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Right Column */}
          <Grid item xs={12} md={8} sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', maxWidth: { xs: '100%', md: '66.666667%' }, width: { xs: '100%', md: '66.666667%' }, minWidth: { xs: '100%', md: '400px' } }}>
            <Card elevation={0} sx={{ ...getGlassmorphismStyle(), mb: 3, borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary', mb: 2 }}>Tasks</Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  {[
                    { key: 'all', label: `All (${tasks.length})` },
                    { key: 'pending', label: `Pending (${pendingTasks.length})` },
                    { key: 'in_progress', label: `In Progress (${inProgressTasks.length})` },
                    { key: 'completed', label: `Completed (${completedTasks.length})` }
                  ].map((filter) => (
                    <Chip key={filter.key} label={filter.label} onClick={() => setTaskFilter(filter.key)}
                      color={taskFilter === filter.key ? 'primary' : 'default'}
                      variant={taskFilter === filter.key ? 'filled' : 'outlined'}
                      sx={{ fontWeight: 500, fontSize: '0.75rem', cursor: 'pointer' }} />
                  ))}
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                  {[{ key: 'list', label: 'List', icon: <ListIcon /> }, { key: 'calendar', label: 'Calendar', icon: <CalendarIcon /> }].map((view) => (
                    <Button key={view.key} variant={viewMode === view.key ? 'contained' : 'outlined'} onClick={() => setViewMode(view.key)}
                      size="small" startIcon={view.icon}
                      sx={{ fontWeight: 500, fontSize: '0.75rem', px: 2, py: 0.5, borderRadius: 1, minWidth: 'auto' }}>
                      {view.label}
                    </Button>
                  ))}
                </Box>
              </CardContent>
            </Card>

            <Box sx={{ width: '100%', overflow: 'hidden' }}>
              {viewMode === 'list' ? (
                <TaskList tasks={filteredTasks} loading={tasksLoading} onDelete={handleDeleteTask} onUpdate={handleUpdateTask} onShowTaskForm={handleShowTaskForm} onVoiceMemoUpdate={handleVoiceMemoUpdate} />
              ) : (
                <TaskViews tasks={tasks} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} initialView={viewMode} showViewSwitcher={false} />
              )}
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default HomePage;
