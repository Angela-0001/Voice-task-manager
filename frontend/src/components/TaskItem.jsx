import { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  IconButton,
  Box,
  Chip,
  Checkbox,
  Menu,
  MenuItem,
  Fade,
  useTheme,
  alpha,
  Tooltip,
  TextField,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  Delete as DeleteIcon,
  VolumeUp as VolumeUpIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  Flag as FlagIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import VoiceMemoList from './VoiceMemoList';

const TaskItem = ({ 
  task, 
  taskNumber,
  onDelete, 
  onUpdate, 
  onSpeak, 
  quickEditMode = false,
  bulkActionMode = false,
  isSelected = false,
  onSelectionChange,
  onVoiceMemoUpdate
}) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const [editedDescription, setEditedDescription] = useState(task.description || '');
  const [editedPriority, setEditedPriority] = useState(task.priority);
  const [editedDueDate, setEditedDueDate] = useState(task.dueDate ? new Date(task.dueDate) : null);
  
  const isCompleted = task.status === 'completed';

  // Helper functions defined first
  const getStatusConfig = (status) => {
    switch (status) {
      case 'completed':
        return { 
          color: 'success', 
          icon: '✅', 
          label: 'Completed',
          bgColor: alpha(theme.palette.success.main, 0.1),
          borderColor: theme.palette.success.main
        };
      case 'in_progress':
        return { 
          color: 'warning', 
          icon: '⚡', 
          label: 'In Progress',
          bgColor: alpha(theme.palette.warning.main, 0.1),
          borderColor: theme.palette.warning.main
        };
      default:
        return { 
          color: 'default', 
          icon: '📋', 
          label: 'Pending',
          bgColor: alpha(theme.palette.grey[500], 0.1),
          borderColor: theme.palette.grey[400]
        };
    }
  };

  const getPriorityConfig = (priority) => {
    switch (priority) {
      case 'high':
        return { color: 'error.main', icon: '🔴', label: 'High Priority' };
      case 'low':
        return { color: 'success.main', icon: '🟢', label: 'Low Priority' };
      default:
        return { color: 'warning.main', icon: '🟡', label: 'Medium Priority' };
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays < -1) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays <= 7) return `In ${diffDays} days`;
    return date.toLocaleDateString();
  };

  const isOverdue = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date < now;
  };

  const isToday = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Now we can safely use these functions
  const statusConfig = getStatusConfig(task.status);
  const priorityConfig = getPriorityConfig(task.priority);
  const taskIsOverdue = isOverdue(task.dueDate);
  const taskIsToday = isToday(task.dueDate);

  const handleKeyDown = (event) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        handleToggleComplete();
        break;
      case 'Delete':
        event.preventDefault();
        onDelete(task.id);
        break;
      case 's':
      case 'S':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          onSpeak(task);
        }
        break;
      default:
        break;
    }
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleStatusChange = (newStatus) => {
    onUpdate(task.id, { status: newStatus });
    handleMenuClose();
  };

  const handleToggleComplete = () => {
    const newStatus = isCompleted ? 'pending' : 'completed';
    onUpdate(task.id, { status: newStatus });
  };

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditedTitle(task.title);
    setEditedDescription(task.description || '');
    setEditedPriority(task.priority);
    setEditedDueDate(task.dueDate ? new Date(task.dueDate) : null);
    handleMenuClose();
  };

  const handleSaveEdit = () => {
    if (editedTitle.trim()) {
      onUpdate(task.id, {
        title: editedTitle.trim(),
        description: editedDescription.trim(),
        priority: editedPriority,
        dueDate: editedDueDate ? editedDueDate.toISOString() : null
      });
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedTitle(task.title);
    setEditedDescription(task.description || '');
    setEditedPriority(task.priority);
    setEditedDueDate(task.dueDate ? new Date(task.dueDate) : null);
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSaveEdit();
    } else if (event.key === 'Escape') {
      handleCancelEdit();
    }
  };



  return (
    <Fade in timeout={300}>
      <Card 
        elevation={0}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        role="article"
        aria-label={`Task: ${task.title}. Status: ${task.status}. ${task.dueDate ? `Due: ${formatDate(task.dueDate)}.` : ''} Priority: ${task.priority}.`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="modern-card"
        sx={{ 
          borderRadius: 2,
          borderLeft: `4px solid ${taskIsOverdue ? theme.palette.error.main : statusConfig.borderColor}`,
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
          opacity: isCompleted ? 0.7 : 1,
          background: isCompleted ? 
            theme.palette.mode === 'dark' 
              ? 'rgba(16, 185, 129, 0.05)' 
              : '#D1FAE5' :
            taskIsOverdue ? 
            theme.palette.mode === 'dark' 
              ? 'rgba(248, 113, 113, 0.05)' 
              : '#FEE2E2' :
            theme.palette.mode === 'dark' ? '#121212' : '#FFFFFF',
          ...(quickEditMode && {
            border: `2px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
            backgroundColor: alpha(theme.palette.primary.main, 0.02),
          }),
          ...(bulkActionMode && {
            border: `2px solid ${alpha(theme.palette.secondary.main, 0.3)}`,
            backgroundColor: isSelected 
              ? alpha(theme.palette.secondary.main, 0.1)
              : alpha(theme.palette.secondary.main, 0.02),
          }),
          '&:focus': {
            outline: '2px solid #2563EB',
            outlineOffset: '2px',
          }
        }}
      >
        <CardContent sx={{ p: 2 }}>
          <Box display="flex" alignItems="flex-start" gap={1.5}>
            {/* Task Number */}
            <Box
              sx={{
                minWidth: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: theme.palette.mode === 'dark' ? '#374151' : '#F3F4F6',
                color: theme.palette.mode === 'dark' ? '#D1D5DB' : '#6B7280',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.875rem',
                fontWeight: 600,
                mt: 0.25
              }}
            >
              {taskNumber}
            </Box>

            {/* Selection Checkbox (Bulk Mode) or Status Checkbox */}
            {bulkActionMode ? (
              <Tooltip title="Select for bulk action">
                <Checkbox
                  checked={isSelected}
                  onChange={(e) => onSelectionChange && onSelectionChange(e.target.checked)}
                  sx={{
                    color: theme.palette.secondary.main,
                    '&.Mui-checked': {
                      color: theme.palette.secondary.main,
                    },
                    mt: -0.5
                  }}
                />
              </Tooltip>
            ) : (
              <Tooltip title={isCompleted ? "Mark as pending" : "Mark as completed"}>
                <Checkbox
                  checked={isCompleted}
                  onChange={handleToggleComplete}
                  icon={<RadioButtonUncheckedIcon />}
                  checkedIcon={<CheckCircleIcon />}
                  sx={{
                    color: theme.palette.success.main,
                    '&.Mui-checked': {
                      color: theme.palette.success.main,
                    },
                    mt: -0.5
                  }}
                />
              </Tooltip>
            )}

            {/* Task Content */}
            <Box flex={1}>
              {isEditing ? (
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <Box sx={{ mb: 2 }}>
                    <TextField
                      fullWidth
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Task title"
                      variant="outlined"
                      size="small"
                      autoFocus
                      sx={{
                        mb: 1,
                        '& .MuiOutlinedInput-root': {
                          fontSize: '1.125rem',
                          fontWeight: 600,
                        }
                      }}
                    />
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Task description (optional)"
                      variant="outlined"
                      size="small"
                      sx={{
                        mb: 1,
                        '& .MuiOutlinedInput-root': {
                          fontSize: '0.875rem',
                        }
                      }}
                    />
                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Priority</InputLabel>
                        <Select
                          value={editedPriority}
                          onChange={(e) => setEditedPriority(e.target.value)}
                          label="Priority"
                        >
                          <MenuItem value="low">🟢 Low</MenuItem>
                          <MenuItem value="medium">🟡 Medium</MenuItem>
                          <MenuItem value="high">🔴 High</MenuItem>
                        </Select>
                      </FormControl>
                      <DatePicker
                        label="Due Date"
                        value={editedDueDate}
                        onChange={(newValue) => setEditedDueDate(newValue)}
                        slotProps={{
                          textField: {
                            size: 'small',
                            sx: { minWidth: 140 }
                          }
                        }}
                      />
                    </Box>
                  </Box>
                </LocalizationProvider>
              ) : (
                <>
                  <Typography 
                    variant="h6" 
                    component="h3"
                    sx={{ 
                      fontWeight: 600,
                      fontSize: '1.125rem',
                      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      textDecoration: isCompleted ? 'line-through' : 'none',
                      color: 'text.primary',
                      mb: 1,
                      lineHeight: 1.2,
                      cursor: 'pointer',
                      '&:hover': {
                        color: 'primary.main',
                      }
                    }}
                    onClick={handleStartEdit}
                    title="Click to edit"
                  >
                    {task.title}
                  </Typography>
                  
                  {task.description && (
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        mb: 2,
                        fontSize: '0.875rem',
                        color: 'text.secondary',
                        textDecoration: isCompleted ? 'line-through' : 'none',
                        lineHeight: 1.5,
                        cursor: 'pointer',
                        '&:hover': {
                          color: 'primary.main',
                        }
                      }}
                      onClick={handleStartEdit}
                      title="Click to edit"
                    >
                      {task.description}
                    </Typography>
                  )}
                </>
              )}

              {/* Modern Status, Priority, and Date */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={statusConfig.label}
                  size="small"
                  sx={{
                    backgroundColor: statusConfig.bgColor,
                    color: statusConfig.borderColor,
                    fontWeight: 500,
                    fontSize: '0.75rem',
                    height: 24,
                  }}
                />

                <Chip
                  label={priorityConfig.label}
                  size="small"
                  variant="outlined"
                  sx={{
                    borderColor: priorityConfig.color,
                    color: priorityConfig.color,
                    fontWeight: 500,
                    fontSize: '0.75rem',
                    height: 24,
                  }}
                />
                
                {task.dueDate && (
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 0.5,
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 1,
                    backgroundColor: taskIsOverdue ? 'rgba(248, 113, 113, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                  }}>
                    {taskIsOverdue && <WarningIcon sx={{ fontSize: 14, color: 'error.main' }} />}
                    <ScheduleIcon sx={{ 
                      fontSize: 14, 
                      color: taskIsOverdue ? 'error.main' : taskIsToday ? 'warning.main' : 'text.secondary' 
                    }} />
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        fontWeight: 500,
                        fontSize: '0.75rem',
                        fontFamily: '"JetBrains Mono", "Fira Code", "Courier New", monospace',
                        color: taskIsOverdue ? 'error.main' : taskIsToday ? 'warning.main' : 'text.secondary'
                      }}
                    >
                      {formatDate(task.dueDate)}
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Voice Memos */}
              <VoiceMemoList 
                task={task} 
                onVoiceMemoUpdate={onVoiceMemoUpdate}
              />
            </Box>

            {/* Modern Action Buttons */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {isEditing ? (
                <>
                  <Tooltip title="Save changes" placement="top">
                    <IconButton
                      onClick={handleSaveEdit}
                      size="small"
                      disabled={!editedTitle.trim()}
                      sx={{
                        color: 'success.main',
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.success.main, 0.1),
                          transform: 'scale(1.05)',
                        },
                        '&:disabled': {
                          opacity: 0.5,
                        }
                      }}
                    >
                      <SaveIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Cancel editing" placement="top">
                    <IconButton
                      onClick={handleCancelEdit}
                      size="small"
                      sx={{
                        color: 'error.main',
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.error.main, 0.1),
                          transform: 'scale(1.05)',
                        }
                      }}
                    >
                      <CancelIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </>
              ) : (
                <>
                  <Tooltip title="Edit task" placement="top">
                    <IconButton
                      onClick={handleStartEdit}
                      size="small"
                      sx={{
                        opacity: quickEditMode ? 1 : (isHovered ? 1 : 0.7),
                        transition: 'all 0.2s ease',
                        color: quickEditMode ? '#2563EB' : '#64748B',
                        backgroundColor: quickEditMode ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                        '&:hover': {
                          backgroundColor: '#F8F9FA',
                          color: '#2563EB',
                          transform: 'scale(1.05)',
                        }
                      }}
                    >
                      <EditIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Read aloud" placement="top">
                    <IconButton
                      onClick={() => onSpeak(task)}
                      size="small"
                      sx={{
                        opacity: isHovered ? 1 : 0.7,
                        transition: 'all 0.2s ease',
                        color: '#64748B',
                        '&:hover': {
                          backgroundColor: '#F8F9FA',
                          color: '#2563EB',
                          transform: 'scale(1.05)',
                        }
                      }}
                    >
                      <VolumeUpIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="More options" placement="top">
                    <IconButton
                      onClick={handleMenuOpen}
                      size="small"
                      sx={{
                        opacity: isHovered ? 1 : 0.7,
                        transition: 'all 0.2s ease',
                        color: '#64748B',
                        '&:hover': {
                          backgroundColor: '#F8F9FA',
                          color: '#2563EB',
                          transform: 'scale(1.05)',
                        }
                      }}
                    >
                      <MoreVertIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </>
              )}
            </Box>
          </Box>
        </CardContent>

        {/* Context Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem onClick={handleStartEdit}>
            <EditIcon sx={{ mr: 1, fontSize: 20 }} />
            Edit Task
          </MenuItem>
          <MenuItem onClick={() => handleStatusChange('pending')}>
            📋 Mark as Pending
          </MenuItem>
          <MenuItem onClick={() => handleStatusChange('in_progress')}>
            ⚡ Mark as In Progress
          </MenuItem>
          <MenuItem onClick={() => handleStatusChange('completed')}>
            ✅ Mark as Completed
          </MenuItem>
          <MenuItem onClick={() => { onDelete(task.id); handleMenuClose(); }} sx={{ color: 'error.main' }}>
            <DeleteIcon sx={{ mr: 1, fontSize: 20 }} />
            Delete Task
          </MenuItem>
        </Menu>
      </Card>
    </Fade>
  );
};

export default TaskItem;