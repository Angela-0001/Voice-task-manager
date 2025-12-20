import { useState, useEffect, useCallback } from 'react';
import { 
  Snackbar, 
  Alert, 
  IconButton, 
  Badge,
  Menu,
  MenuItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Box,
  Divider,
  Button
} from '@mui/material';
import { 
  Notifications as NotificationsIcon,
  NotificationsActive,
  Schedule,
  Warning,
  CheckCircle,
  Clear
} from '@mui/icons-material';

const NotificationSystem = ({ tasks = [], settings = {} }) => {
  const [notifications, setNotifications] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [anchorEl, setAnchorEl] = useState(null);
  const [lastCheck, setLastCheck] = useState(Date.now());

  // Check for task reminders
  const checkTaskReminders = useCallback(() => {
    if (!settings?.notifications?.reminders) return;

    const now = new Date();
    const newNotifications = [];

    tasks.forEach(task => {
      if (task.status === 'completed' || !task.dueDate) return;

      const dueDate = new Date(task.dueDate);
      const timeDiff = dueDate.getTime() - now.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

      // Check if we should notify
      let shouldNotify = false;
      let notificationType = 'reminder';
      let message = '';

      if (timeDiff < 0) {
        // Overdue
        shouldNotify = true;
        notificationType = 'overdue';
        message = `Task "${task.title}" is overdue!`;
      } else if (hoursDiff <= 1 && hoursDiff > 0) {
        // Due within 1 hour
        shouldNotify = true;
        notificationType = 'urgent';
        message = `Task "${task.title}" is due in ${Math.round(hoursDiff * 60)} minutes!`;
      } else if (daysDiff <= 1 && daysDiff > 0) {
        // Due within 24 hours
        shouldNotify = true;
        notificationType = 'soon';
        message = `Task "${task.title}" is due ${hoursDiff < 24 ? 'today' : 'tomorrow'}!`;
      } else if (daysDiff <= 3 && daysDiff > 1) {
        // Due within 3 days
        shouldNotify = true;
        notificationType = 'upcoming';
        message = `Task "${task.title}" is due in ${Math.ceil(daysDiff)} days`;
      }

      if (shouldNotify) {
        // Check if we already have this notification
        const existingNotification = notifications.find(n => 
          n.taskId === task.id && n.type === notificationType
        );

        if (!existingNotification) {
          newNotifications.push({
            id: `${task.id}-${notificationType}-${Date.now()}`,
            taskId: task.id,
            type: notificationType,
            message,
            task: task,
            timestamp: now.toISOString(),
            read: false
          });
        }
      }
    });

    if (newNotifications.length > 0) {
      setNotifications(prev => [...newNotifications, ...prev].slice(0, 50)); // Keep last 50
      
      // Show browser notification if enabled
      if (settings?.notifications?.enabled && 'Notification' in window) {
        newNotifications.forEach(notification => {
          if (Notification.permission === 'granted') {
            new Notification('Task Reminder', {
              body: notification.message,
              icon: '/vite.svg',
              tag: notification.taskId // Prevent duplicate notifications
            });
          }
        });
      }

      // Show snackbar for most urgent notification
      const urgentNotification = newNotifications.find(n => n.type === 'overdue') || 
                               newNotifications.find(n => n.type === 'urgent') ||
                               newNotifications[0];
      
      if (urgentNotification) {
        setSnackbar({
          open: true,
          message: urgentNotification.message,
          severity: urgentNotification.type === 'overdue' ? 'error' : 
                   urgentNotification.type === 'urgent' ? 'warning' : 'info'
        });
      }
    }
  }, [tasks, settings, notifications]);

  // Request notification permission
  useEffect(() => {
    if (settings?.notifications?.enabled && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [settings?.notifications?.enabled]);

  // Check for reminders periodically
  useEffect(() => {
    checkTaskReminders();
    
    const interval = setInterval(() => {
      checkTaskReminders();
      setLastCheck(Date.now());
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [checkTaskReminders]);

  // Handle notification menu
  const handleNotificationClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setAnchorEl(null);
  };

  const markAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  const clearNotification = (notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    handleNotificationClose();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'overdue':
        return <Warning color="error" />;
      case 'urgent':
        return <NotificationsActive color="warning" />;
      case 'soon':
        return <Schedule color="info" />;
      case 'upcoming':
        return <NotificationsIcon color="action" />;
      default:
        return <NotificationsIcon />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'overdue':
        return 'error';
      case 'urgent':
        return 'warning';
      case 'soon':
        return 'info';
      case 'upcoming':
        return 'default';
      default:
        return 'default';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      {/* Notification Bell Icon */}
      <IconButton
        color="inherit"
        onClick={handleNotificationClick}
        sx={{ ml: 1 }}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      {/* Notification Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleNotificationClose}
        PaperProps={{
          sx: { 
            width: 350, 
            maxHeight: 400,
            '& .MuiMenuItem-root': {
              whiteSpace: 'normal',
              alignItems: 'flex-start',
              py: 1
            }
          }
        }}
      >
        <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" component="div">
            Task Reminders
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Last checked: {new Date(lastCheck).toLocaleTimeString()}
          </Typography>
        </Box>

        {notifications.length === 0 ? (
          <MenuItem disabled>
            <ListItemIcon>
              <CheckCircle color="success" />
            </ListItemIcon>
            <ListItemText primary="No pending reminders" />
          </MenuItem>
        ) : (
          <>
            {notifications.slice(0, 10).map((notification) => (
              <MenuItem
                key={notification.id}
                onClick={() => markAsRead(notification.id)}
                sx={{ 
                  bgcolor: notification.read ? 'transparent' : 'action.hover',
                  opacity: notification.read ? 0.7 : 1
                }}
              >
                <ListItemIcon>
                  {getNotificationIcon(notification.type)}
                </ListItemIcon>
                <ListItemText
                  primary={notification.message}
                  secondary={
                    <Box>
                      <Typography variant="caption" display="block">
                        Priority: {notification.task.priority}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(notification.timestamp).toLocaleString()}
                      </Typography>
                    </Box>
                  }
                />
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearNotification(notification.id);
                  }}
                >
                  <Clear fontSize="small" />
                </IconButton>
              </MenuItem>
            ))}
            
            {notifications.length > 10 && (
              <MenuItem disabled>
                <ListItemText 
                  primary={`... and ${notifications.length - 10} more`}
                  sx={{ textAlign: 'center' }}
                />
              </MenuItem>
            )}

            <Divider />
            <MenuItem onClick={clearAllNotifications}>
              <ListItemText 
                primary="Clear all notifications"
                sx={{ textAlign: 'center', color: 'text.secondary' }}
              />
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Snackbar for immediate notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default NotificationSystem;