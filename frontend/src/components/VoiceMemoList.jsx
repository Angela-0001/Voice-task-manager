import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Collapse,
  IconButton,
  Badge,
  Tooltip
} from '@mui/material';
import {
  Mic as MicIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Add as AddIcon
} from '@mui/icons-material';
import VoiceMemoPlayer from './VoiceMemoPlayer';
import VoiceRecorder from './VoiceRecorder';

const VoiceMemoList = ({ task, onVoiceMemoUpdate }) => {
  const [expanded, setExpanded] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);

  const voiceMemos = task.voiceMemos || [];
  const memoCount = voiceMemos.length;

  const handleVoiceMemoSaved = (newMemo) => {
    console.log('✅ Voice memo saved successfully:', newMemo);
    
    if (onVoiceMemoUpdate) {
      onVoiceMemoUpdate(task.id, 'add', newMemo);
    }
    
    setShowRecorder(false);
    
    // Auto-expand to show the new memo
    if (!expanded) {
      setExpanded(true);
    }
  };

  const handleVoiceMemoDeleted = (memoId) => {
    console.log('🗑️ VoiceMemoList: Handling memo deletion:', { taskId: task.id, memoId });
    if (onVoiceMemoUpdate) {
      onVoiceMemoUpdate(task.id, 'delete', { id: memoId });
    }
  };



  if (memoCount === 0 && !expanded) {
    return (
      <Box sx={{ mt: 2 }}>
        <Button
          startIcon={<MicIcon />}
          onClick={() => setShowRecorder(true)}
          variant="outlined"
          size="small"
          sx={{ 
            borderColor: 'rgba(255,255,255,0.3)',
            color: 'text.secondary',
            '&:hover': {
              borderColor: 'primary.main',
              color: 'primary.main'
            }
          }}
        >
          Add Voice Memo
        </Button>
        
        <VoiceRecorder
          open={showRecorder}
          onClose={() => setShowRecorder(false)}
          onSave={handleVoiceMemoSaved}
          taskId={task.id}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            size="small"
            onClick={() => setExpanded(!expanded)}
            sx={{ color: 'text.secondary' }}
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
          
          <Badge badgeContent={memoCount} color="primary">
            <MicIcon sx={{ color: 'text.secondary' }} />
          </Badge>
          
          <Typography variant="body2" color="text.secondary">
            Voice Memos
          </Typography>
        </Box>

        <Tooltip title="Add Voice Memo">
          <IconButton
            size="small"
            onClick={() => setShowRecorder(true)}
            sx={{ 
              color: 'primary.main',
              '&:hover': {
                backgroundColor: 'rgba(25, 118, 210, 0.1)'
              }
            }}
          >
            <AddIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Voice Memos List */}
      <Collapse in={expanded}>
        <Box sx={{ pl: 2, borderLeft: '2px solid rgba(255,255,255,0.1)' }}>
          {voiceMemos.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
              No voice memos yet. Click the + button to add one.
            </Typography>
          ) : (
            voiceMemos.map((memo) => (
              <VoiceMemoPlayer
                key={memo.id}
                memo={memo}
                taskId={task.id}
                onDelete={handleVoiceMemoDeleted}
              />
            ))
          )}
        </Box>
      </Collapse>

      {/* Voice Recorder Dialog */}
      <VoiceRecorder
        open={showRecorder}
        onClose={() => setShowRecorder(false)}
        onSave={handleVoiceMemoSaved}
        taskId={task.id}
      />
    </Box>
  );
};

export default VoiceMemoList;