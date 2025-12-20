import { useState, useMemo, useEffect } from 'react';
import {
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Card,
  CardContent,
  Chip,
  Paper,
  useTheme,
  alpha,
  IconButton,
  Badge,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Button,
  Tooltip,
} from '@mui/material';
import { Grid } from '@mui/material';
import {
  List as ListIcon,
  CalendarMonth as CalendarIcon,
  Assignment as TaskIcon,
  ChevronLeft,
  ChevronRight,
  Today,
  Flag,
  VolumeUp as VolumeUpIcon,
} from '@mui/icons-material';

import TaskList from './TaskList';
import { 
  generateCalendarDays, 
  getTasksForDate,
  isToday,
  isSameDate,
  getMonthName 
} from '../utils/dateHelpers';


const TaskViews = ({ tasks, onUpdateTask, onDeleteTask, initialView = 'list', showViewSwitcher = true, onReadSummary }) => {
  const theme = useTheme();
  const [currentView, setCurrentView] = useState(initialView);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  // Update view when initialView changes
  useEffect(() => {
    setCurrentView(initialView);
  }, [initialView]);

  const handleViewChange = (_, newView) => {
    if (newView !== null) {
      setCurrentView(newView);
    }
  };

  // Calendar navigation functions
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // Priority and status colors
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return theme.palette.error.main;
      case 'medium':
        return theme.palette.warning.main;
      case 'low':
        return theme.palette.success.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return theme.palette.success.main;
      case 'in_progress':
        return theme.palette.info.main;
      case 'pending':
        return theme.palette.warning.main;
      default:
        return theme.palette.grey[500];
    }
  };

  // Calculate task statistics
  const stats = {
    total: tasks.length,
    completed: tasks.filter(task => task.status === 'completed').length,
    pending: tasks.filter(task => task.status === 'pending').length,
    inProgress: tasks.filter(task => task.status === 'in_progress').length,
    high: tasks.filter(task => task.priority === 'high').length,
    medium: tasks.filter(task => task.priority === 'medium').length,
    low: tasks.filter(task => task.priority === 'low').length,
    overdue: tasks.filter(task => {
      if (!task.dueDate) return false;
      return new Date(task.dueDate) < new Date() && task.status !== 'completed';
    }).length,
    dueToday: tasks.filter(task => {
      if (!task.dueDate) return false;
      const today = new Date().toDateString();
      return new Date(task.dueDate).toDateString() === today && task.status !== 'completed';
    }).length
  };

  const completionRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

  // Group tasks by date for calendar view
  const groupTasksByDate = () => {
    const grouped = {};
    tasks.forEach(task => {
      if (task.dueDate) {
        const date = new Date(task.dueDate).toDateString();
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(task);
      }
    });
    return grouped;
  };

  const renderListView = () => (
    <TaskList 
      tasks={tasks} 
      onUpdateTask={onUpdateTask} 
      onDeleteTask={onDeleteTask} 
    />
  );

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    return generateCalendarDays(currentDate);
  }, [currentDate]);

  // Get tasks without due dates
  const tasksWithoutDueDate = useMemo(() => {
    return tasks.filter(task => !task.dueDate);
  }, [tasks]);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const renderCalendarView = () => {
    return (
      <Box>
        {/* Calendar Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            📅 {getMonthName(currentDate)}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton onClick={goToPreviousMonth} size="small">
              <ChevronLeft />
            </IconButton>
            <IconButton onClick={goToToday} size="small" color="primary">
              <Today />
            </IconButton>
            <IconButton onClick={goToNextMonth} size="small">
              <ChevronRight />
            </IconButton>
          </Box>
        </Box>

        <Grid container spacing={2}>
          {/* Calendar Grid */}
          <Grid xs={12} lg={selectedDate ? 8 : 12}>
            <Paper sx={{ p: 2 }}>
              {/* Week day headers */}
              <Grid container sx={{ mb: 1 }}>
                {weekDays.map((day) => (
                  <Grid xs={1} key={day} sx={{ textAlign: 'center', width: 'calc(100% / 7)' }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 'bold', py: 1 }}>
                      {day}
                    </Typography>
                  </Grid>
                ))}
              </Grid>

              {/* Calendar days */}
              <Grid container>
                {calendarDays.map((dayInfo, index) => {
                  const dayTasks = getTasksForDate(tasks, dayInfo.date);
                  const isSelected = selectedDate && isSameDate(dayInfo.date, selectedDate);
                  const todayHighlight = isToday(dayInfo.date);

                  return (
                    <Grid xs={1} key={index} sx={{ aspectRatio: '1', minHeight: 80, width: 'calc(100% / 7)' }}>
                      <Box
                        onClick={() => setSelectedDate(dayInfo.date)}
                        sx={{
                          height: '100%',
                          border: 1,
                          borderColor: 'divider',
                          cursor: 'pointer',
                          position: 'relative',
                          backgroundColor: isSelected 
                            ? alpha(theme.palette.primary.main, 0.1)
                            : todayHighlight 
                            ? alpha(theme.palette.primary.main, 0.05)
                            : 'transparent',
                          '&:hover': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.05),
                          },
                          display: 'flex',
                          flexDirection: 'column',
                          p: 0.5,
                        }}
                      >
                        {/* Day number */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: todayHighlight ? 'bold' : 'normal',
                              color: dayInfo.isCurrentMonth 
                                ? todayHighlight 
                                  ? 'primary.main' 
                                  : 'text.primary'
                                : 'text.disabled',
                            }}
                          >
                            {dayInfo.day}
                          </Typography>
                          
                          {/* Task count badge */}
                          {dayTasks.length > 0 && (
                            <Badge
                              badgeContent={dayTasks.length}
                              color="primary"
                              sx={{
                                '& .MuiBadge-badge': {
                                  fontSize: '0.6rem',
                                  minWidth: 14,
                                  height: 14,
                                },
                              }}
                            />
                          )}
                        </Box>

                        {/* Task indicators */}
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.5 }}>
                          {dayTasks.slice(0, 2).map((task) => (
                            <Box
                              key={task.id}
                              sx={{
                                height: 3,
                                borderRadius: 1,
                                backgroundColor: getPriorityColor(task.priority),
                                opacity: task.status === 'completed' ? 0.5 : 1,
                              }}
                            />
                          ))}
                          {dayTasks.length > 2 && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                              +{dayTasks.length - 2}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </Paper>
          </Grid>

          {/* Selected Date Tasks Panel */}
          {selectedDate && (
            <Grid xs={12} lg={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                    {selectedDate.toLocaleDateString('en-US', { 
                      weekday: 'long',
                      month: 'long', 
                      day: 'numeric'
                    })}
                  </Typography>

                  <Divider sx={{ mb: 2 }} />

                  {getTasksForDate(tasks, selectedDate).length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                      <TaskIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        No tasks for this date
                      </Typography>
                    </Box>
                  ) : (
                    <List dense>
                      {getTasksForDate(tasks, selectedDate).map((task) => (
                        <ListItem key={task.id} sx={{ px: 0 }}>
                          <ListItemIcon>
                            <Flag sx={{ color: getPriorityColor(task.priority) }} />
                          </ListItemIcon>
                          <ListItemText
                            primary={task.title}
                            secondary={
                              <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                                <Chip
                                  label={task.status}
                                  size="small"
                                  sx={{
                                    backgroundColor: alpha(getStatusColor(task.status), 0.1),
                                    color: getStatusColor(task.status),
                                    fontSize: '0.7rem',
                                  }}
                                />
                                <Chip
                                  label={task.priority}
                                  size="small"
                                  sx={{
                                    backgroundColor: alpha(getPriorityColor(task.priority), 0.1),
                                    color: getPriorityColor(task.priority),
                                    fontSize: '0.7rem',
                                  }}
                                />
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>

        {/* Tasks without due date */}
        {tasksWithoutDueDate.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                📋 Tasks without Due Date
              </Typography>
              <Grid container spacing={1}>
                {tasksWithoutDueDate.map((task) => (
                  <Grid xs={12} sm={6} md={4} key={task.id}>
                    <Card variant="outlined" sx={{ p: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
                        {task.title}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Chip
                          label={task.status}
                          size="small"
                          sx={{
                            backgroundColor: alpha(getStatusColor(task.status), 0.1),
                            color: getStatusColor(task.status),
                            fontSize: '0.6rem',
                          }}
                        />
                        <Chip
                          label={task.priority}
                          size="small"
                          sx={{
                            backgroundColor: alpha(getPriorityColor(task.priority), 0.1),
                            color: getPriorityColor(task.priority),
                            fontSize: '0.6rem',
                          }}
                        />
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Box>
        )}
      </Box>
    );
  };



  const renderCurrentView = () => {
    switch (currentView) {
      case 'calendar':
        return renderCalendarView();
      default:
        return renderListView();
    }
  };

  return (
    <Box>
      {/* View Toggle and Summary Button */}
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mb: 3 }}>
        {/* View Toggle - Only show if showViewSwitcher is true */}
        {showViewSwitcher && (
          <ToggleButtonGroup
            value={currentView}
            exclusive
            onChange={handleViewChange}
            aria-label="task view selection"
            sx={{ 
              backgroundColor: 'background.paper',
              '& .MuiToggleButton-root': {
                border: 'none',
                borderRadius: 2,
                mx: 0.5,
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  }
                }
              }
            }}
          >
            <ToggleButton value="list" aria-label="list view">
              <ListIcon sx={{ mr: 1 }} />
              List
            </ToggleButton>
            <ToggleButton value="calendar" aria-label="calendar view">
              <CalendarIcon sx={{ mr: 1 }} />
              Calendar
            </ToggleButton>

          </ToggleButtonGroup>
        )}

        {/* Task Summary Button */}
        {onReadSummary && (
          <Tooltip title="Read all task titles aloud" placement="top">
            <Button
              variant="outlined"
              startIcon={<VolumeUpIcon />}
              onClick={onReadSummary}
              sx={{
                borderRadius: 2,
                fontWeight: 500,
                fontSize: '0.875rem',
                px: 2,
                py: 1,
                borderColor: 'primary.main',
                color: 'primary.main',
                '&:hover': {
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 8px rgba(37, 99, 235, 0.25)',
                },
              }}
            >
              Read Tasks
            </Button>
          </Tooltip>
        )}
      </Box>

      {/* Current View Content */}
      {renderCurrentView()}
    </Box>
  );
};

export default TaskViews;
