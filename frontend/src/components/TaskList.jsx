import { 
  Box, 
  Typography, 
  Paper,
  Skeleton,
  Stack,
  Chip,
  Button
} from '@mui/material';
import { 
  Assignment as AssignmentIcon,
  Add as AddIcon
} from '@mui/icons-material';
import TaskItem from './TaskItem';
import { feedback } from '../utils/speech';


const TaskList = ({
  tasks,
  loading,
  onDelete,
  onUpdate,
  onSpeak,
  quickEditMode = false,
  bulkActionMode = false,
  selectedTasks = [],
  onTaskSelection,
  onShowTaskForm,
  onVoiceMemoUpdate
}) => {


  if (loading) {

    return (
      <Stack spacing={2}>
        {[1, 2, 3].map((i) => (
          <Paper 
            key={i} 
            elevation={0} 
            className="modern-card shimmer"
            sx={{ p: 3, borderRadius: 2 }}
          >
            <Skeleton 
              variant="text" 
              width="60%" 
              height={28} 
              sx={{ 
                bgcolor: theme => theme.palette.mode === 'dark' ? '#1A1A1A' : '#F1F5F9',
                borderRadius: 1
              }} 
            />
            <Skeleton 
              variant="text" 
              width="80%" 
              height={20} 
              sx={{ 
                mt: 1,
                bgcolor: theme => theme.palette.mode === 'dark' ? '#1A1A1A' : '#F1F5F9',
                borderRadius: 1
              }} 
            />
            <Skeleton 
              variant="text" 
              width="40%" 
              height={16} 
              sx={{ 
                mt: 2,
                bgcolor: theme => theme.palette.mode === 'dark' ? '#1A1A1A' : '#F1F5F9',
                borderRadius: 1
              }} 
            />
          </Paper>
        ))}
      </Stack>
    );
  }

  if (tasks.length === 0) {
    return (
      <Paper 
        elevation={0} 
        className="modern-card"
        sx={{ 
          p: 6, 
          textAlign: 'center', 
          borderRadius: 2,
        }}
      >
        <Box sx={{ mb: 4 }}>
          <Box
            sx={{
              position: 'relative',
              display: 'inline-block',
              mb: 3,
            }}
          >
            <AssignmentIcon sx={{ 
              fontSize: 64, 
              color: '#CBD5E1',
            }} />
          </Box>
        </Box>
        
        <Typography 
          variant="h4" 
          gutterBottom 
          sx={{ 
            fontWeight: 600,
            color: 'text.primary',
            mb: 2,
          }}
        >
          No tasks yet
        </Typography>
        
        <Typography 
          variant="body1" 
          sx={{ 
            mb: 4, 
            maxWidth: 400, 
            mx: 'auto', 
            color: 'text.secondary',
            lineHeight: 1.6,
          }}
        >
          Add your first task using voice or the button below
        </Typography>
        
        <Box sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 2, 
          justifyContent: 'center',
          mb: 3,
        }}>
          <Chip 
            label={'"Add task workout"'}
            sx={{ 
              backgroundColor: '#DBEAFE',
              color: '#2563EB',
              fontWeight: 500,
              fontSize: '0.875rem',
              px: 2,
              py: 1,
              height: 'auto',
            }}
          />
          <Chip 
            label={'"Create task call mom"'}
            sx={{ 
              backgroundColor: '#D1FAE5',
              color: '#10B981',
              fontWeight: 500,
              fontSize: '0.875rem',
              px: 2,
              py: 1,
              height: 'auto',
            }}
          />
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onShowTaskForm}
          sx={{
            background: '#2563EB',
            color: '#FFFFFF',
            fontWeight: 500,
            px: 4,
            py: 1.5,
            borderRadius: 1.5,
            '&:hover': {
              background: '#1E40AF',
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 8px rgba(37, 99, 235, 0.25)',
            },
          }}
        >
          New Task
        </Button>
      </Paper>
    );
  }

  return (
    <Stack spacing={2}>
      {quickEditMode && tasks.length > 0 && (
        <Paper 
          elevation={0}
          sx={{ 
            p: 2, 
            borderRadius: 2,
            backgroundColor: 'info.light',
            color: 'info.contrastText',
            mb: 2
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Quick Edit Mode: Click on any task title or description to edit it directly, or use the edit button for more options.
          </Typography>
        </Paper>
      )}

      {bulkActionMode && tasks.length > 0 && (
        <Paper 
          elevation={0}
          sx={{ 
            p: 2, 
            borderRadius: 2,
            backgroundColor: 'secondary.light',
            color: 'secondary.contrastText',
            mb: 2
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Bulk Action Mode: Select multiple tasks using the checkboxes to perform actions on them all at once.
          </Typography>
        </Paper>
      )}
      
      {tasks.map((task, index) => (
        <TaskItem
          key={task.id}
          task={task}
          taskNumber={index + 1}
          onDelete={onDelete}
          onUpdate={onUpdate}
          onSpeak={() => feedback.readTaskSummary(task)}
          quickEditMode={quickEditMode}
          bulkActionMode={bulkActionMode}
          isSelected={selectedTasks.includes(task.id)}
          onSelectionChange={(selected) => onTaskSelection && onTaskSelection(task.id, selected)}
          onVoiceMemoUpdate={onVoiceMemoUpdate}
        />
      ))}
    </Stack>
  );
};

export default TaskList;