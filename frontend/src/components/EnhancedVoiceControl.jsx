import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Box,
  Button,
  Typography,
  Alert,
  Paper,
  CircularProgress,
  Fade,
  useTheme,
  keyframes,
  Chip
} from '@mui/material';
import {
  MicOff as MicOffIcon,
  GraphicEq as GraphicEqIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Psychology as PsychologyIcon
} from '@mui/icons-material';
import { ollamaStatus } from '../utils/ollamaStatus';
import { 
  CREATE_TASK, 
  UPDATE_TASK, 
  DELETE_TASK, 
  MARK_TASK_COMPLETE, 
  CREATE_VOICE_LOG,
  GET_TASKS,
  BULK_DELETE_ALL
} from '../graphql/queries';
import { useApp } from '../contexts/AppContext';
import voiceManager from '../utils/voiceManager';
import { 
  feedback
} from '../utils/speech';

import voiceCommandService from '../services/voiceCommandService';

const pulseAnimation = keyframes`
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.7);
  }
  70% {
    transform: scale(1.1);
    box-shadow: 0 0 0 20px rgba(79, 70, 229, 0);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(79, 70, 229, 0);
  }
`;

const floatAnimation = keyframes`
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
`;

const EnhancedVoiceControl = ({ refetchTasks }) => {
  const theme = useTheme();
  const { showSnackbar } = useApp();
  
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsedCommand, setParsedCommand] = useState(null);
  const [error, setError] = useState('');
  const [recognition, setRecognition] = useState(null);
  const [status, setStatus] = useState('ready'); // ready, listening, processing, success, error
  const currentLanguage = 'en-US'; // English only
  const [useLLMParsing] = useState(true);
  const [llmStatus, setLLMStatus] = useState('checking'); // checking, available, unavailable
  const [lastClickTime, setLastClickTime] = useState(0);

  // Get current tasks for context
  const { data: tasksData, refetch: refetchTasksData } = useQuery(GET_TASKS, {
    fetchPolicy: 'cache-and-network', // Get fresh data for operations
    notifyOnNetworkStatusChange: true // Ensure UI updates on network changes
  });

  // Update voice command service context when tasks change
  useEffect(() => {
    if (tasksData?.tasks?.tasks) {
      voiceCommandService.updateContext(tasksData.tasks.tasks);
    }
  }, [tasksData]);

  // Check LLM availability on mount
  useEffect(() => {
    checkLLMAvailability();
  }, []);

  // GraphQL Mutations
  const [createTask] = useMutation(CREATE_TASK, {
    onCompleted: async (data) => {
      showSnackbar('✅ Task created successfully!', 'success');
      
      try {
        await feedback.taskAdded(data.createTask.title);
      } catch (error) {
        // Voice feedback failed silently
      }
      
      setStatus('success');
      
      if (refetchTasks) {
        setTimeout(() => refetchTasks(), 100);
      }
    },
    onError: async (error) => {
      console.error('❌ Error creating task:', error);
      showSnackbar('❌ Failed to create task', 'error');
      
      try {
        await feedback.error('Failed to add task');
      } catch (voiceError) {
        console.error('🔊 Voice feedback failed:', voiceError);
      }
      
      setStatus('error');
    }
  });

  const [updateTask] = useMutation(UPDATE_TASK, {
    onCompleted: async (data) => {
      showSnackbar('✅ Task updated successfully!', 'success');
      
      try {
        await feedback.taskUpdated(data.updateTask.title);
      } catch (error) {
        console.error('🔊 Voice feedback failed:', error);
      }
      
      setStatus('success');
      
      if (refetchTasks) {
        setTimeout(() => refetchTasks(), 100);
      }
    },
    onError: async (error) => {
      console.error('❌ Error updating task:', error);
      showSnackbar('❌ Failed to update task', 'error');
      setStatus('error');
    }
  });

  const [deleteTask] = useMutation(DELETE_TASK, {
    onCompleted: async () => {
      showSnackbar('✅ Task deleted successfully!', 'success');
      
      try {
        await feedback.taskDeleted('Task deleted');
      } catch (error) {
        console.error('🔊 Voice feedback failed:', error);
      }
      
      setStatus('success');
      
      if (refetchTasks) {
        setTimeout(() => refetchTasks(), 100);
      }
    },
    onError: async (error) => {
      console.error('❌ Error deleting task:', error);
      showSnackbar('❌ Failed to delete task', 'error');
      setStatus('error');
    }
  });

  const [markTaskComplete] = useMutation(MARK_TASK_COMPLETE, {
    onCompleted: async (data) => {
      showSnackbar('✅ Task marked as completed!', 'success');
      
      try {
        await feedback.taskCompleted(data.markTaskComplete.title);
      } catch (error) {
        console.error('🔊 Voice feedback failed:', error);
      }
      
      setStatus('success');
      
      if (refetchTasks) {
        setTimeout(() => refetchTasks(), 100);
      }
    },
    onError: async (error) => {
      console.error('❌ Error completing task:', error);
      showSnackbar('❌ Failed to complete task', 'error');
      setStatus('error');
    }
  });

  const [createVoiceLog] = useMutation(CREATE_VOICE_LOG, {
    onError: (error) => {
      console.error('Error logging voice command:', error);
    }
  });

  const [bulkDeleteAll] = useMutation(BULK_DELETE_ALL, {
    onCompleted: async () => {
      showSnackbar('✅ All tasks deleted successfully!', 'success');
      
      try {
        await feedback.success('All tasks deleted successfully');
      } catch (error) {
        console.error('🔊 Voice feedback failed:', error);
      }
      
      setStatus('success');
      
      if (refetchTasks) {
        setTimeout(() => refetchTasks(), 100);
      }
    },
    onError: async (error) => {
      console.error('❌ Error deleting all tasks:', error);
      showSnackbar('❌ Failed to delete all tasks', 'error');
      setStatus('error');
    }
  });

  // Check if LLM (Groq) is available
  const checkLLMAvailability = async () => {
    setLLMStatus('checking');
    try {
      if (ollamaStatus.isReady()) {
        setLLMStatus('available');
      } else {
        setLLMStatus('unavailable');
      }
    } catch (error) {
      setLLMStatus('unavailable');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      voiceManager.stopAll();
    };
  }, []);

  // Initialize speech recognition - FAST & SIMPLE
  useEffect(() => {
    
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      
      // Don't initialize immediately - do it on first click for faster startup
      setRecognition('ready'); // Mark as ready to initialize
    } else {
      console.error('🎙️ SPEECH RECOGNITION NOT SUPPORTED');
      setError('Speech recognition is not supported in this browser. Please use Chrome.');
    }
  }, []); // Remove status dependency to prevent infinite loop
  const debugDeleteAll = async () => {
    try {
      const freshData = await refetchTasksData();
      const allTasks = freshData.data?.tasks?.tasks || [];
      
      if (allTasks.length === 0) {
        return;
      }
      await bulkDeleteAll();
      
      if (refetchTasks) {
        setTimeout(() => refetchTasks(), 500);
      }
      
      showSnackbar(`🧪 DEBUG: Deleted ${allTasks.length} tasks`, 'success');
      
    } catch (error) {
      console.error('🧪 DEBUG: Delete all failed:', error);
      showSnackbar('🧪 DEBUG: Delete failed - check console', 'error');
    }
  };
  const debugReadAll = async () => {
    await processVoiceCommand('read all tasks');
  };
  const debugStatusUpdate = async (command = 'mark milk as done') => {
    
    // Test detection first
    const textLower = command.toLowerCase();
    const isDetected = isStatusUpdateCommand(textLower);
    
    if (isDetected) {
      const statusInfo = parseStatusUpdate(command, textLower);
      
      // Test ordinal detection
      const ordinalMap = {
        'first': 1, '1st': 1, 'second': 2, '2nd': 2, 'third': 3, '3rd': 3,
        'fourth': 4, '4th': 4, 'fifth': 5, '5th': 5
      };
      
      for (const [ordinal, number] of Object.entries(ordinalMap)) {
        if (statusInfo.taskTitle.includes(ordinal)) {
          break;
        }
      }
    }
    
    await processVoiceCommand(command);
  };
  const debugBulkUpdate = async (command = 'mark all tasks as complete') => {
    await processVoiceCommand(command);
  };
  const debugPriorityUpdate = async (command = 'set priority of task 2 to low') => {
    await processVoiceCommand(command);
  };
  const debugTaskNumberStatus = async (command = 'mark task 1 complete') => {
    await processVoiceCommand(command);
  };
  const debugDueDateUpdate = async (command = 'set due date of task 1 to tomorrow') => {
    await processVoiceCommand(command);
  };
  const debugIndividualUpdate = async (taskId, status) => {
    try {
      if (status === 'completed') {
        await markTaskComplete({ variables: { id: taskId } });
      } else {
        await updateTask({ variables: { id: taskId, status: status } });
      }
    } catch (error) {
      console.error('🧪 DEBUG: Individual update failed:', error);
    }
  };
  const debugRecognition = () => {
    
    // Try to initialize if not exists
    if (!recognition && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognitionInstance = new SpeechRecognition();
        setRecognition(recognitionInstance);
      } catch (error) {
        console.error('🧪 DEBUG: Failed to initialize recognition:', error);
      }
    }
  };
  const debugMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Test audio levels
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const checkAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        
        if (average > 10) {
        } else {
        }
      };
      
      // Check audio level for 3 seconds
      const interval = setInterval(checkAudioLevel, 500);
      setTimeout(() => {
        clearInterval(interval);
        stream.getTracks().forEach(track => track.stop());
        audioContext.close();
      }, 3000);
      
    } catch (error) {
      console.error('🧪 DEBUG: Microphone access failed:', error);
    }
  };

  // Expose debug functions globally
  useEffect(() => {
    window.debugDeleteAll = debugDeleteAll; // Test delete all
    window.debugReadAll = debugReadAll; // Test read all tasks
    window.debugBulkUpdate = debugBulkUpdate; // Test bulk updates
    window.debugStatusUpdate = debugStatusUpdate; // Test in progress
    window.debugIndividualUpdate = debugIndividualUpdate; // Test individual update
    window.debugRecognition = debugRecognition; // Check recognition status
    window.debugMicrophone = debugMicrophone; // Test microphone access and audio levels
    window.debugPriorityUpdate = debugPriorityUpdate; // Test priority updates
    window.debugTaskNumberStatus = debugTaskNumberStatus; // Test task number status
    window.debugDueDateUpdate = debugDueDateUpdate; // Test due date updates
    window.debugStatusUpdate1 = () => debugStatusUpdate('mark milk as done'); // Test status updates
    window.debugStatusUpdate2 = () => debugStatusUpdate('mark first task complete'); // Test simple completion
    window.debugStatusUpdate3 = () => debugStatusUpdate('mark task 2 complete'); // Test task number
    window.debugStatusUpdate4 = () => debugStatusUpdate('mark second task complete'); // Test ordinal
    window.debugStatusUpdate5 = () => debugStatusUpdate('mark third task complete'); // Test ordinal
    window.debugBulkUpdate1 = () => debugBulkUpdate('mark all tasks as complete'); // Test bulk complete
    window.debugBulkUpdate2 = () => debugBulkUpdate('mark all tasks as in progress'); // Test bulk in progress
    window.debugBulkUpdate3 = () => debugBulkUpdate('mark all tasks as pending'); // Test bulk pending
  }, []);

  // SHARED HELPER FUNCTIONS
  // PRIORITY EXTRACTION FUNCTION - MORE FLEXIBLE
  const extractPriority = (text) => {
    const textLower = text.toLowerCase();
    
    // HIGH PRIORITY - flexible detection
    if (textLower.includes('high') || textLower.includes('urgent') || textLower.includes('important') || 
        textLower.includes('critical') || textLower.includes('asap') || textLower.includes('now') ||
        textLower.includes('emergency') || textLower.includes('rush')) {
      return 'high';
    }
    
    // LOW PRIORITY - flexible detection  
    if (textLower.includes('low') || textLower.includes('later') || textLower.includes('someday') ||
        textLower.includes('when i have time') || textLower.includes('not urgent') || 
        textLower.includes('whenever') || textLower.includes('eventually')) {
      return 'low';
    }
    
    // MEDIUM PRIORITY - flexible detection
    if (textLower.includes('medium') || textLower.includes('normal') || textLower.includes('regular') ||
        textLower.includes('standard') || textLower.includes('average')) {
      return 'medium';
    }
    return 'medium'; // default
  };

  // Enhanced date extraction with relative dates
  const extractDate = (text) => {
    const textLower = text.toLowerCase();
    const today = new Date();
    
    // RELATIVE DATES - PRIORITY 1
    if (textLower.includes('tomorrow')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return tomorrow.toISOString();
    }
    
    if (textLower.includes('today')) {
      return today.toISOString();
    }
    
    if (textLower.includes('next week')) {
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      return nextWeek.toISOString();
    }
    
    if (textLower.includes('next month')) {
      const nextMonth = new Date(today);
      nextMonth.setMonth(today.getMonth() + 1);
      return nextMonth.toISOString();
    }
    
    // SPECIFIC DATES - PRIORITY 2
    const currentYear = new Date().getFullYear();
    const datePatterns = [
      /(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i,
      /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?/i,
    ];

    const monthNames = {
      'january': 0, 'february': 1, 'march': 2, 'april': 3, 'may': 4, 'june': 5,
      'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11
    };

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        let day, month;
        
        if (isNaN(match[1])) {
          month = monthNames[match[1].toLowerCase()];
          day = parseInt(match[2]);
        } else {
          day = parseInt(match[1]);
          month = monthNames[match[2].toLowerCase()];
        }

        if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
          const date = new Date(currentYear, month, day);
          if (date < today) {
            date.setFullYear(currentYear + 1);
          }
          return date.toISOString();
        }
      }
    }
    return null;
  };

  // Helper functions for status update detection
  const isStatusUpdateCommand = (textLower) => {
    // Check for ordinal task references
    const hasOrdinal = /first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th/.test(textLower);
    const hasTaskRef = textLower.includes('task');
    
    return (
      // COMPLETED status
      textLower.includes('mark') && (textLower.includes('done') || textLower.includes('completed') || textLower.includes('complete')) ||
      textLower.includes('complete') && (hasTaskRef || hasOrdinal) ||
      textLower.includes('finish') && (hasTaskRef || hasOrdinal) ||
      
      // PENDING status  
      textLower.includes('mark') && (textLower.includes('pending') || textLower.includes('todo') || textLower.includes('not done')) ||
      textLower.includes('make pending') ||
      textLower.includes('set to pending') ||
      
      // IN_PROGRESS status
      textLower.includes('mark') && (textLower.includes('in progress') || textLower.includes('working') || textLower.includes('started')) ||
      textLower.includes('start working') ||
      textLower.includes('begin') && (hasTaskRef || hasOrdinal) ||
      textLower.includes('in progress') ||
      
      // PRIORITY updates
      textLower.includes('set') && textLower.includes('priority') ||
      textLower.includes('make') && (textLower.includes('high priority') || textLower.includes('low priority') || textLower.includes('medium priority')) ||
      textLower.includes('change priority') ||
      (textLower.includes('mark') || textLower.includes('set')) && (textLower.includes('urgent') || textLower.includes('important') || textLower.includes('critical'))
    );
  };

  const parseStatusUpdate = (text, textLower) => {
    let status = 'pending'; // default
    let priority = null; // for priority updates
    let taskTitle = text;
    let updateType = 'status'; // 'status' or 'priority'
    
    // Check for priority updates first - MORE FLEXIBLE
    if (textLower.includes('priority') || textLower.includes('urgent') || textLower.includes('important') || 
        textLower.includes('critical') || textLower.includes('high') || textLower.includes('low') || 
        textLower.includes('medium') || /task \d+ to (high|low|medium)/i.test(text)) {
      updateType = 'priority';
      
      // Determine priority - flexible detection
      if (textLower.includes('high') || textLower.includes('urgent') || textLower.includes('important') || 
          textLower.includes('critical') || textLower.includes('asap')) {
        priority = 'high';
      } else if (textLower.includes('low') || textLower.includes('later') || textLower.includes('not urgent') ||
                 textLower.includes('someday') || textLower.includes('whenever')) {
        priority = 'low';
      } else if (textLower.includes('medium') || textLower.includes('normal') || textLower.includes('regular')) {
        priority = 'medium';
      }
      
      // Clean task title for priority updates
      taskTitle = text
        .replace(/set|make|change|mark|as|priority|urgent|important|critical|high|low|medium|normal|task|the|to|of/gi, '')
        .replace(/first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth/gi, '')
        .replace(/1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th|\d+/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      return { updateType, priority, taskTitle };
    }
    
    // Determine status for status updates
    if (textLower.includes('done') || textLower.includes('completed') || textLower.includes('complete') || textLower.includes('finish')) {
      status = 'completed';
    } else if (textLower.includes('in progress') || textLower.includes('working') || textLower.includes('started') || textLower.includes('begin')) {
      status = 'in_progress';
    } else if (textLower.includes('pending') || textLower.includes('todo') || textLower.includes('not done')) {
      status = 'pending';
    }
    
    // Clean task title - remove status-related words and ordinals
    taskTitle = text
      .replace(/mark|as|done|completed|complete|finish|pending|todo|not done|in progress|working|started|begin|task|the/gi, '')
      .replace(/first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth/gi, '')
      .replace(/1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    return { updateType, status, taskTitle };
  };

  // Enhanced voice command processing with LLM
  const processVoiceCommand = useCallback(async (text) => {
    
    setStatus('processing');

    try {
      if (!text || text.trim().length === 0) {
        await feedback.commandNotUnderstood();
        setStatus('error');
        return;
      }

      // FAST ALL COMMANDS - HANDLE EVERYTHING
      let parsedCommand;
      
      // COMMAND DETECTION - PRIORITY ORDER
      const textLower = text.toLowerCase();
      
      // 1. READ/LIST COMMANDS - HIGHEST PRIORITY
      const isReadCommand = (
        textLower.includes('read all') ||
        textLower.includes('list all') ||
        textLower.includes('show all') ||
        textLower.includes('read tasks') ||
        textLower.includes('list tasks') ||
        textLower.includes('show tasks') ||
        textLower.includes('what tasks') ||
        textLower.includes('my tasks') ||
        textLower.includes('tell me my tasks') ||
        textLower.includes('what do i have') ||
        textLower.includes('show me my tasks') ||
        textLower === 'read all tasks' ||
        textLower === 'list all tasks' ||
        textLower === 'show all tasks' ||
        textLower === 'read tasks' ||
        textLower === 'list tasks' ||
        textLower === 'show tasks'
      );
      
      // 2. BULK STATUS UPDATE DETECTION - HIGH PRIORITY
      const isBulkStatusUpdate = (
        (textLower.includes('mark all') || textLower.includes('set all')) && 
        (textLower.includes('complete') || textLower.includes('done') || textLower.includes('pending') || textLower.includes('in progress')) ||
        textLower.includes('complete all tasks') ||
        textLower.includes('mark all tasks as') ||
        textLower.includes('set all tasks to')
      );
      
      // 3. PRIORITY UPDATE DETECTION - HIGH PRIORITY
      const isPriorityUpdate = (
        textLower.includes('priority of') ||
        textLower.includes('priority to') ||
        (textLower.includes('set') && textLower.includes('priority')) ||
        (textLower.includes('change') && textLower.includes('priority')) ||
        (textLower.includes('make') && (textLower.includes('high') || textLower.includes('low') || textLower.includes('medium')) && textLower.includes('task')) ||
        /task \d+ to (high|low|medium|urgent|important)/i.test(text)
      );

      // 4. DELETE ALL DETECTION
      const isDeleteAll = (
        textLower.includes('delete all') ||
        textLower.includes('remove all') ||
        textLower.includes('clear all') ||
        textLower.includes('delete everything') ||
        textLower.includes('remove everything') ||
        textLower.includes('clear everything') ||
        textLower === 'delete all tasks' ||
        textLower === 'remove all tasks' ||
        textLower === 'clear all tasks'
      );
      
      // Check for READ commands first (highest priority)
      if (isReadCommand) {
        parsedCommand = {
          intent: 'READ',
          confidence: 1.0,
          reasoning: 'Read/list tasks command'
        };
      }
      // Check for PRIORITY UPDATE commands
      else if (isPriorityUpdate) {
        
        // Extract task identifier and priority
        let taskId = null;
        let taskTitle = '';
        
        // Look for task number (e.g., "priority of task 2 to low")
        const taskNumberMatch = text.match(/(?:priority of |task )(\d+)/i);
        if (taskNumberMatch) {
          taskId = `task_${taskNumberMatch[1]}`;
        }
        
        // Look for ordinals (e.g., "priority of first task to high")
        if (!taskId) {
          const ordinalMap = {
            'first': 1, '1st': 1, 'second': 2, '2nd': 2, 'third': 3, '3rd': 3,
            'fourth': 4, '4th': 4, 'fifth': 5, '5th': 5
          };
          
          for (const [ordinal, number] of Object.entries(ordinalMap)) {
            if (textLower.includes(ordinal)) {
              taskId = `task_${number}`;
              break;
            }
          }
        }
        
        // Extract priority from the command
        const priority = extractPriority(text);
        
        // Clean task title (fallback if no number/ordinal found)
        taskTitle = text
          .replace(/priority|of|task|to|set|change|make|\d+|first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th/gi, '')
          .replace(/high|low|medium|urgent|important|critical/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        parsedCommand = {
          intent: 'UPDATE',
          taskId: taskId,
          taskTitle: taskTitle,
          priority: priority,
          updates: { priority: priority },
          confidence: 1.0,
          reasoning: `Update task priority to ${priority} (${taskId || 'by title'})`
        };
      }
      // Check for BULK STATUS UPDATE commands
      else if (isBulkStatusUpdate) {
        
        // Determine target status
        let targetStatus = 'pending';
        if (textLower.includes('complete') || textLower.includes('done')) {
          targetStatus = 'completed';
        } else if (textLower.includes('in progress') || textLower.includes('working')) {
          targetStatus = 'in_progress';
        } else if (textLower.includes('pending') || textLower.includes('todo')) {
          targetStatus = 'pending';
        }
        
        parsedCommand = {
          intent: 'BULK_UPDATE',
          status: targetStatus,
          updates: { status: targetStatus },
          confidence: 1.0,
          reasoning: `Bulk update all tasks to ${targetStatus}`
        };
      }
      // Check for DELETE ALL commands
      else if (isDeleteAll) {
        parsedCommand = {
          intent: 'BULK_DELETE',
          confidence: 1.0,
          reasoning: 'Delete all command - simple detection'
        };
      }
      // Check for single DELETE commands
      else if (/delete|remove|cancel/i.test(text)) {
        
        // Check for task number (e.g., "delete task 2", "delete second task")
        let taskId = null;
        const taskNumberMatch = text.match(/(?:delete|remove|cancel)\s+(?:task\s+)?(\d+)/i);
        if (taskNumberMatch) {
          taskId = `task_${taskNumberMatch[1]}`;
        }
        
        // Check for ordinals (e.g., "delete first task", "remove second task")
        const ordinalMap = {
          'first': 1, '1st': 1, 'second': 2, '2nd': 2, 'third': 3, '3rd': 3,
          'fourth': 4, '4th': 4, 'fifth': 5, '5th': 5
        };
        
        if (!taskId) {
          for (const [ordinal, number] of Object.entries(ordinalMap)) {
            if (text.toLowerCase().includes(ordinal)) {
              taskId = `task_${number}`;
              break;
            }
          }
        }
        
        const taskTitle = text.replace(/delete|remove|cancel|task|the|first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th|\d+/gi, '').trim();
        
        parsedCommand = {
          intent: 'DELETE',
          taskId: taskId,
          taskTitle: taskTitle,
          confidence: 0.9,
          reasoning: taskId ? `Delete task by number: ${taskId}` : 'Delete single task by title'
        };
      }
      // 3. TASK NUMBER STATUS UPDATE - HIGH PRIORITY (e.g., "mark task 1 complete")
      else if (/(?:mark|set|make)\s+task\s+\d+\s+(?:complete|done|finished|pending|in progress)/i.test(text)) {
        
        // Extract task number and status
        const taskNumberMatch = text.match(/task\s+(\d+)/i);
        const taskId = taskNumberMatch ? `task_${taskNumberMatch[1]}` : null;
        
        let status = 'pending';
        if (/complete|done|finished/i.test(text)) {
          status = 'completed';
        } else if (/in progress|working|started/i.test(text)) {
          status = 'in_progress';
        } else if (/pending|todo/i.test(text)) {
          status = 'pending';
        }
        
        parsedCommand = {
          intent: 'UPDATE',
          taskId: taskId,
          taskTitle: '',
          status: status,
          updates: { status: status },
          confidence: 1.0,
          reasoning: `Update task ${taskNumberMatch[1]} status to ${status}`
        };
      }
      // 4. DUE DATE UPDATE - HIGH PRIORITY (e.g., "set due date of task 1")
      else if (/(?:set|change|update)\s+due\s+date\s+of\s+task\s+\d+/i.test(text)) {
        
        // Extract task number
        const taskNumberMatch = text.match(/task\s+(\d+)/i);
        const taskId = taskNumberMatch ? `task_${taskNumberMatch[1]}` : null;
        
        // Extract date from the command
        const extractedDate = extractDate(text);
        
        parsedCommand = {
          intent: 'UPDATE',
          taskId: taskId,
          taskTitle: '',
          dueDate: extractedDate,
          updates: { dueDate: extractedDate },
          confidence: 1.0,
          reasoning: `Update task ${taskNumberMatch[1]} due date`
        };
      }
      // 5. STATUS UPDATE COMMANDS - COMPREHENSIVE (including priority)
      else if (isStatusUpdateCommand(textLower)) {
        const updateInfo = parseStatusUpdate(text, textLower);
        
        if (updateInfo.updateType === 'priority') {
          parsedCommand = {
            intent: 'UPDATE',
            taskTitle: updateInfo.taskTitle,
            priority: updateInfo.priority,
            updates: { priority: updateInfo.priority },
            confidence: 0.9,
            reasoning: `Update task priority to ${updateInfo.priority}`
          };
        } else {
          parsedCommand = {
            intent: 'UPDATE',
            taskTitle: updateInfo.taskTitle,
            status: updateInfo.status,
            updates: { status: updateInfo.status },
            confidence: 0.9,
            reasoning: `Update task status to ${updateInfo.status}`
          };
        }
      }
      // Default: CREATE task with date extraction
      else {
        
        // Extract priority first
        const extractedPriority = extractPriority(text);
        
        // Clean task title - remove command words, dates, and priority keywords
        let taskTitle = text
          .replace(/^(add task|create task|new task|add|create|new|remind me to|i need to)\s*/i, '')
          .replace(/(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)/gi, '')
          .replace(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?/gi, '')
          .replace(/\s+(tomorrow|today|next week|next month)\s*/gi, ' ')
          .replace(/\s+(high priority|low priority|medium priority|normal priority|regular priority)\s*/gi, ' ')
          .replace(/\s+(urgent|important|critical|not urgent|when i have time|someday)\s*/gi, ' ')
          .replace(/\s+priority\s*/gi, ' ')
          .replace(/\s+on\s+/gi, ' ')
          .replace(/\s+for\s+/gi, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (!taskTitle) taskTitle = text.trim();
        
        const extractedDate = extractDate(text);
        console.log('🔍 DATE EXTRACTION DEBUG:', {
          originalText: text,
          extractedDate: extractedDate ? new Date(extractedDate).toDateString() : 'No date',
          extractedPriority: extractedPriority
        });
        
        parsedCommand = {
          intent: 'CREATE',
          taskTitle: taskTitle,
          priority: extractedPriority,
          dueDate: extractedDate,
          updates: { dueDate: extractedDate, priority: extractedPriority },
          confidence: 1.0,
          reasoning: `Create with date and priority extraction (${extractedPriority} priority)`
        };
      }
      setParsedCommand(parsedCommand);

      // Execute the parsed command(s)
      if (parsedCommand.commands && parsedCommand.commands.length > 0) {
        // New format with multiple commands
        for (const command of parsedCommand.commands) {
          // Convert new format to legacy format for executeCommand
          const legacyCommand = {
            intent: command.action === 'DELETE_ALL' ? 'BULK_DELETE' : 
                   command.action === 'UPDATE_ALL' ? 'BULK_UPDATE' : 
                   command.action,
            taskTitle: command.taskTitle,
            taskId: command.taskId,
            status: command.updates?.status,
            priority: command.updates?.priority,
            dueDate: command.updates?.dueDate,
            filters: command.filters,
            updates: command.updates,
            confidence: command.confidence
          };
          
          await executeCommand(legacyCommand, text);
        }
      } else {
        // Legacy format - single command
        await executeCommand(parsedCommand, text);
      }

      // Log voice command (temporarily disabled to fix main functionality)
      try {
        await createVoiceLog({
          variables: {
            rawCommand: text,
            interpretedIntent: parsedCommand.intent,
            actionTriggered: parsedCommand.intent.toLowerCase(),
            success: true
          }
        });
      } catch (logError) {
        console.log('Voice log error:', logError);
      }
      
      setTimeout(() => {
        if (status !== 'listening') {
          setStatus('ready');
        }
      }, 2000);
      
    } catch (error) {
      console.error('❌ ERROR processing voice command:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Original command:', text);
      
      // Show specific error message instead of generic "please try again"
      let errorMessage = 'Command failed';
      if (error.message.includes('No tasks')) {
        errorMessage = 'No tasks found to update';
      } else if (error.message.includes('Task not found')) {
        errorMessage = 'Task not found - try using task numbers';
      } else if (error.message.includes('Network')) {
        errorMessage = 'Network error - check connection';
      } else {
        errorMessage = `Error: ${error.message}`;
      }
      
      setError(errorMessage);
      setStatus('error');
      
      // Clear error faster
      setTimeout(() => {
        setError('');
        setStatus('ready');
      }, 3000);
      
      try {
        await createVoiceLog({
          variables: {
            rawCommand: text,
            interpretedIntent: 'error',
            actionTriggered: 'error',
            success: false
          }
        });
      } catch (logError) {
        console.log('Voice log error:', logError);
      }
    }
  }, [useLLMParsing, llmStatus, createVoiceLog, status]);

  // Execute parsed command
  const executeCommand = async (command, originalText) => {
    
    const { intent, taskTitle, taskId, status: taskStatus, priority, dueDate } = command;
    // Also check for dueDate in updates object (fallback parser format)
    const extractedDueDate = dueDate || command.updates?.dueDate;

    switch (intent) {
      case 'CREATE':
        // Map priority correctly
        let mappedPriority = 'medium';
        if (priority) {
          const priorityMap = {
            'HIGH': 'high',
            'MEDIUM': 'medium', 
            'LOW': 'low'
          };
          mappedPriority = priorityMap[priority.toUpperCase()] || 'medium';
        }

        if (taskTitle) {
          console.log('🔍 CREATE TASK DEBUG:', {
            taskTitle: taskTitle,
            extractedDate: extractedDueDate ? new Date(extractedDueDate).toDateString() : null,
            originalCommand: command
          });
          
          const taskVariables = {
            title: taskTitle,
            description: command.description || '',
            priority: mappedPriority,
            status: 'pending',
            dueDate: extractedDueDate ? new Date(extractedDueDate) : null,
            reminderEnabled: true,
            recurrence: 'none'
          };
          await createTask({ variables: taskVariables });
        } else {
          // Fallback to original text as title
          await createTask({
            variables: {
              title: originalText.trim(),
              description: '',
              priority: mappedPriority,
              status: 'pending',
              reminderEnabled: true,
              recurrence: 'none'
            }
          });
        }
        break;

      case 'UPDATE':
        
        // CRITICAL FIX: Get fresh data for individual updates too
        const freshUpdateData = await refetchTasksData();
        const freshUpdateTasks = freshUpdateData.data?.tasks?.tasks || [];
        
        let taskToUpdate = null;
        
        if (taskId && freshUpdateTasks.length > 0) {
          // Try to find by taskId first
          const taskIndex = parseInt(taskId.replace('task_', '')) - 1;
          taskToUpdate = freshUpdateTasks[taskIndex];
        } else if (freshUpdateTasks.length > 0) {
          // ENHANCED TASK FINDING - Support task numbers, ordinals, and titles
          const searchText = (taskTitle || originalText).toLowerCase()
            .replace(/mark|as|done|completed|complete|finish|pending|todo|not done|in progress|working|started|begin|task|the/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
          console.log('🔍 TASK SEARCH DEBUG:', {
            searchText: searchText,
            availableTasks: freshUpdateTasks.map((t, i) => `${i+1}. ${t.title}`)
          });
          
          // 1. Try task number (e.g., "2" for second task)
          let taskNumber = parseInt(searchText);
          
          // 2. Try ordinal numbers (first, second, third, etc.)
          if (isNaN(taskNumber)) {
            const ordinalMap = {
              'first': 1, '1st': 1,
              'second': 2, '2nd': 2,
              'third': 3, '3rd': 3,
              'fourth': 4, '4th': 4,
              'fifth': 5, '5th': 5,
              'sixth': 6, '6th': 6,
              'seventh': 7, '7th': 7,
              'eighth': 8, '8th': 8,
              'ninth': 9, '9th': 9,
              'tenth': 10, '10th': 10
            };
            
            // Check if searchText contains any ordinal
            for (const [ordinal, number] of Object.entries(ordinalMap)) {
              if (searchText.includes(ordinal)) {
                taskNumber = number;
                break;
              }
            }
          }
          
          if (!isNaN(taskNumber) && taskNumber >= 1 && taskNumber <= freshUpdateTasks.length) {
            taskToUpdate = freshUpdateTasks[taskNumber - 1];
          }
          
          // 2. Try exact title match
          if (!taskToUpdate) {
            taskToUpdate = freshUpdateTasks.find(task => 
              task.title.toLowerCase() === searchText
            );
          }
          
          // 3. Try partial match
          if (!taskToUpdate) {
            taskToUpdate = freshUpdateTasks.find(task => 
              task.title.toLowerCase().includes(searchText) ||
              searchText.includes(task.title.toLowerCase())
            );
          }
          
          // 4. Try keyword matching
          if (!taskToUpdate) {
            const keywords = searchText.split(' ').filter(word => 
              word.length > 2 && !['update', 'mark', 'set'].includes(word)
            );
            
            if (keywords.length > 0) {
              taskToUpdate = freshUpdateTasks.find(task => {
                const titleWords = task.title.toLowerCase().split(' ');
                return keywords.some(keyword => 
                  titleWords.some(word => word.includes(keyword) || keyword.includes(word))
                );
              });
            }
          }
        }
        
        if (taskToUpdate) {
          // Check update type
          const isPriorityUpdate = (command.updates?.priority && !command.updates?.status && !command.updates?.dueDate) || (command.priority && !taskStatus && !command.dueDate);
          const isStatusUpdate = (command.updates?.status && !command.updates?.priority && !command.updates?.dueDate) || (taskStatus && !command.priority && !command.dueDate);
          const isDueDateUpdate = (command.updates?.dueDate && !command.updates?.status && !command.updates?.priority) || (command.dueDate && !taskStatus && !command.priority);
          
          if (isPriorityUpdate) {
            const newPriority = command.priority || command.updates?.priority;
            
            try {
              await updateTask({
                variables: {
                  id: taskToUpdate.id,
                  status: taskToUpdate.status, // keep current status
                  priority: newPriority
                }
              });
              await feedback.success(`Task priority updated to ${newPriority}`);
              
            } catch (updateError) {
              console.error('❌ Task priority update failed:', updateError);
              throw updateError;
            }
          } else if (isDueDateUpdate) {
            const newDueDate = command.dueDate || command.updates?.dueDate;
            
            try {
              await updateTask({
                variables: {
                  id: taskToUpdate.id,
                  status: taskToUpdate.status, // keep current status
                  priority: taskToUpdate.priority, // keep current priority
                  dueDate: newDueDate ? new Date(newDueDate) : null
                }
              });
              const dateText = newDueDate ? new Date(newDueDate).toDateString() : 'removed';
              await feedback.success(`Task due date updated to ${dateText}`);
              
            } catch (updateError) {
              console.error('❌ Task due date update failed:', updateError);
              throw updateError;
            }
          } else if (isStatusUpdate) {
            
            try {
              if (taskStatus === 'completed') {
                await markTaskComplete({ variables: { id: taskToUpdate.id } });
              } else {
                await updateTask({
                  variables: {
                    id: taskToUpdate.id,
                    status: taskStatus,
                    priority: taskToUpdate.priority // keep current priority
                  }
                });
              }
              
            } catch (updateError) {
              console.error('❌ Task status update failed:', updateError);
              throw updateError;
            }
          } else {
            // Mixed update (both status and priority)
            
            try {
              if (taskStatus === 'completed') {
                await markTaskComplete({ variables: { id: taskToUpdate.id } });
              } else {
                await updateTask({
                  variables: {
                    id: taskToUpdate.id,
                    status: taskStatus || taskToUpdate.status,
                    priority: priority?.toLowerCase() || taskToUpdate.priority
                  }
                });
              }
              
            } catch (updateError) {
              console.error('❌ Task update failed:', updateError);
              throw updateError;
            }
          }
          
          // Force UI refresh
          if (refetchTasks) {
            setTimeout(() => refetchTasks(), 500);
          }
        } else {
          const errorMsg = `Task not found. Available tasks: ${freshUpdateTasks.map((t, i) => `${i+1}. ${t.title}`).join(', ')}`;
          console.error('❌', errorMsg);
          throw new Error(errorMsg);
        }
        break;

      case 'DELETE':
        
        // CRITICAL FIX: Get fresh data for individual deletes too
        const freshSingleDeleteData = await refetchTasksData();
        const freshSingleDeleteTasks = freshSingleDeleteData.data?.tasks?.tasks || [];
        
        let taskToDelete = null;
        
        if (taskId && freshSingleDeleteTasks.length > 0) {
          // Try to find by taskId first
          const taskIndex = parseInt(taskId.replace('task_', '')) - 1;
          if (taskIndex >= 0 && taskIndex < freshSingleDeleteTasks.length) {
            taskToDelete = freshSingleDeleteTasks[taskIndex];
          } else {
          }
        } else if (freshSingleDeleteTasks.length > 0) {
          // Try to find by title, keywords, or task number
          const searchText = (taskTitle || originalText).toLowerCase();
          console.log('🔍 DELETE SEARCH DEBUG:', {
            searchText: searchText,
            availableTasks: freshSingleDeleteTasks.map((t, i) => `${i+1}. ${t.title}`)
          });
          
          // Try task number in the search text
          const numberMatch = searchText.match(/\b(\d+)\b/);
          if (numberMatch) {
            const taskNumber = parseInt(numberMatch[1]);
            if (taskNumber >= 1 && taskNumber <= freshSingleDeleteTasks.length) {
              taskToDelete = freshSingleDeleteTasks[taskNumber - 1];
            }
          }
          
          // Try ordinals in search text
          if (!taskToDelete) {
            const ordinalMap = {
              'first': 1, '1st': 1, 'second': 2, '2nd': 2, 'third': 3, '3rd': 3,
              'fourth': 4, '4th': 4, 'fifth': 5, '5th': 5
            };
            
            for (const [ordinal, number] of Object.entries(ordinalMap)) {
              if (searchText.includes(ordinal)) {
                if (number >= 1 && number <= freshSingleDeleteTasks.length) {
                  taskToDelete = freshSingleDeleteTasks[number - 1];
                  break;
                }
              }
            }
          }
          
          // First try exact match
          if (!taskToDelete) {
            taskToDelete = freshSingleDeleteTasks.find(task => 
              task.title.toLowerCase() === searchText
            );
          }
          
          // Then try partial match
          if (!taskToDelete) {
            taskToDelete = freshSingleDeleteTasks.find(task => 
              task.title.toLowerCase().includes(searchText) ||
              searchText.includes(task.title.toLowerCase())
            );
          }
          
          // Finally try keyword matching
          if (!taskToDelete) {
            const keywords = searchText.split(' ').filter(word => 
              word.length > 2 && !['delete', 'remove', 'task', 'the', 'first', 'second', 'third'].includes(word)
            );
            
            if (keywords.length > 0) {
              taskToDelete = freshSingleDeleteTasks.find(task => {
                const titleWords = task.title.toLowerCase().split(' ');
                return keywords.some(keyword => 
                  titleWords.some(word => word.includes(keyword) || keyword.includes(word))
                );
              });
            }
          }
        }
        
        if (taskToDelete) {
          await deleteTask({ variables: { id: taskToDelete.id } });
        } else {
          throw new Error('Task not found');
        }
        break;

      case 'BULK_DELETE':
      case 'DELETE_ALL':
        
        // CRITICAL FIX: Force refetch fresh data before bulk operations
        const freshDeleteData = await refetchTasksData();
        const freshDeleteTasks = freshDeleteData.data?.tasks?.tasks || [];
        
        if (freshDeleteTasks.length === 0) {
          throw new Error('No tasks to delete');
        }

        let tasksToDelete = [];
        
        // Check if we have filters
        if (command.filters || command.filter) {
          const filters = command.filters || command.filter;
          
          tasksToDelete = freshDeleteTasks.filter(task => {
            // Filter by status
            if (filters.status && task.status !== filters.status) {
              return false;
            }
            
            // Filter by priority (convert to match task format)
            if (filters.priority) {
              const taskPriority = task.priority.toUpperCase();
              if (taskPriority !== filters.priority) {
                return false;
              }
            }
            
            return true;
          });
        } else {
          // Delete all tasks - use fresh data
          tasksToDelete = [...freshDeleteTasks];
        }
        console.log('🗑️ BULK DELETE DEBUG - Tasks to delete:', {
          count: tasksToDelete.length,
          taskTitles: tasksToDelete.map((task, index) => `${index + 1}. ${task.title}`)
        });
        
        if (tasksToDelete.length === 0) {
          throw new Error('No tasks match the criteria');
        }

        // TRY BULK DELETE FIRST, THEN FALLBACK TO INDIVIDUAL
        let deletedCount = 0;
        
        try {
          // Use bulk delete mutation for all tasks
          const bulkResult = await bulkDeleteAll();
          deletedCount = tasksToDelete.length;
          
        } catch (bulkError) {
          console.error('❌ Bulk delete failed, falling back to individual deletion:', bulkError);
          
          // Fallback to individual deletion
          for (const task of tasksToDelete) {
            try {
              await deleteTask({ variables: { id: task.id } });
              deletedCount++;
              
              // Small delay to prevent race conditions
              await new Promise(resolve => setTimeout(resolve, 50));
              
            } catch (taskError) {
              console.error(`❌ Failed to delete task: ${task.title}`, taskError);
              // Continue with other tasks even if one fails
            }
          }
        }
        
        // Refetch tasks to update UI
        if (refetchTasks) {
          setTimeout(() => refetchTasks(), 500);
        }
        const deleteMessage = deletedCount === 1 ? 
          `Deleted 1 task successfully` : 
          `Deleted ${deletedCount} tasks successfully`;
        await feedback.success(deleteMessage);
        break;

      case 'BULK_UPDATE':
      case 'UPDATE_ALL':
        try {
          
          // CRITICAL FIX: Force refetch fresh data before bulk operations
          const freshData = await refetchTasksData();
          const freshTasks = freshData.data?.tasks?.tasks || [];
          console.log('🔄 BULK UPDATE DEBUG - Fresh tasks loaded:', {
            count: freshTasks.length,
            taskStatuses: freshTasks.map(t => ({ title: t.title, status: t.status }))
          });
          
          if (freshTasks.length === 0) {
            throw new Error('No tasks to update');
          }

        let tasksToUpdate = [];
        
        // Check if we have filters
        if (command.filters || command.filter) {
          const filters = command.filters || command.filter;
          
          tasksToUpdate = freshTasks.filter(task => {
            // Filter by status
            if (filters.status && task.status !== filters.status) {
              return false;
            }
            
            // Filter by priority
            if (filters.priority) {
              const taskPriority = task.priority.toUpperCase();
              if (taskPriority !== filters.priority) {
                return false;
              }
            }
            
            return true;
          });
        } else {
          // Update all tasks - use fresh data
          tasksToUpdate = [...freshTasks];
        }
        
        if (tasksToUpdate.length === 0) {
          throw new Error('No tasks match the criteria');
        }

        // Update all matching tasks with proper status handling
        const updates = command.updates || {};
        
        let updatedCount = 0;
        for (const task of tasksToUpdate) {
          try {
            
            if (updates.status === 'completed') {
              // Use markTaskComplete for completed status
              await markTaskComplete({ variables: { id: task.id } });
            } else {
              // Use updateTask for pending and in_progress
              const updateData = {
                id: task.id,
                status: updates.status,
                priority: updates.priority?.toLowerCase() || task.priority
              };
              await updateTask({ variables: updateData });
            }
            
            updatedCount++;
            
            // Longer delay for UI to update properly
            await new Promise(resolve => setTimeout(resolve, 200));
            
          } catch (updateError) {
            console.error(`❌ Failed to update task: ${task.title}`, updateError);
            console.error('❌ Error details:', updateError.message);
          }
        }
        
        // Force multiple UI refreshes to ensure changes are visible
        
        // Immediate refresh
        if (refetchTasks) {
          refetchTasks();
        }
        
        // Also refetch our internal data
        try {
          await refetchTasksData();
        } catch (refetchError) {
          console.error('🔄 Failed to refetch internal data:', refetchError);
        }
        
        // Final refresh after delay
        if (refetchTasks) {
          setTimeout(() => {
            refetchTasks();
          }, 1000);
        }
        
        // Status-specific feedback message
        let statusText = updates.status;
        if (updates.status === 'completed') {
          statusText = 'completed';
        } else if (updates.status === 'in_progress') {
          statusText = 'in progress';
        } else if (updates.status === 'pending') {
          statusText = 'pending';
        }
        
        const updateMessage = updatedCount === 1 ? 
          `Marked 1 task as ${statusText}` : 
          `Marked ${updatedCount} tasks as ${statusText}`;
        await feedback.success(updateMessage);
        
        } catch (bulkUpdateError) {
          console.error('❌ BULK UPDATE FAILED:', bulkUpdateError);
          console.error('❌ Bulk update error message:', bulkUpdateError.message);
          console.error('❌ Command that failed:', command);
          throw new Error(`Bulk update failed: ${bulkUpdateError.message}`);
        }
        break;

      case 'READ':
        
        // Refetch to get latest tasks
        try {
          const freshData = await refetchTasksData();
          const allTasks = freshData.data?.tasks?.tasks || [];
          
          if (allTasks.length === 0) {
            await feedback.success('You have no tasks');
          } else {
            // Group tasks by status
            const pendingTasks = allTasks.filter(t => t.status === 'pending');
            const inProgressTasks = allTasks.filter(t => t.status === 'in_progress');
            const completedTasks = allTasks.filter(t => t.status === 'completed');
            
            let message = `You have ${allTasks.length} tasks. `;
            
            if (pendingTasks.length > 0) {
              message += `${pendingTasks.length} pending: `;
              message += pendingTasks.slice(0, 5).map(t => t.title).join(', ');
              if (pendingTasks.length > 5) {
                message += ` and ${pendingTasks.length - 5} more`;
              }
              message += '. ';
            }
            
            if (inProgressTasks.length > 0) {
              message += `${inProgressTasks.length} in progress: `;
              message += inProgressTasks.slice(0, 3).map(t => t.title).join(', ');
              if (inProgressTasks.length > 3) {
                message += ` and ${inProgressTasks.length - 3} more`;
              }
              message += '. ';
            }
            
            if (completedTasks.length > 0) {
              message += `${completedTasks.length} completed.`;
            }
            await feedback.success(message);
          }
          
          // Refresh UI
          if (refetchTasks) {
            refetchTasks();
          }
          
        } catch (error) {
          console.error('📖 Error reading tasks:', error);
          await feedback.error('Failed to read tasks');
        }
        break;

      case 'SEARCH':
        // Search functionality (can be enhanced)
        await feedback.success('Search functionality coming soon');
        break;

      default:
        await feedback.commandNotUnderstood();
        break;
    }
  };

  // Language is fixed to English - no language change needed

  // Toggle listening - FAST INITIALIZATION
  const toggleListening = async () => {
    // Debounce rapid clicks
    const now = Date.now();
    if (now - lastClickTime < 500) {
      return;
    }
    setLastClickTime(now);
    
    // Initialize recognition on first click for instant startup
    if (!recognition || recognition === 'ready') {
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        try {
          const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
          const recognitionInstance = new SpeechRecognition();
          
          // FAST SIMPLE SETTINGS
          recognitionInstance.continuous = false;
          recognitionInstance.interimResults = false;
          recognitionInstance.maxAlternatives = 1;
          recognitionInstance.lang = currentLanguage;
          
          // Add event handlers
          recognitionInstance.onstart = () => {
            setIsListening(true);
            setStatus('listening');
          };

          recognitionInstance.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setTranscript(transcript);
            setStatus('processing');
            setTimeout(() => processVoiceCommand(transcript), 300);
          };

          recognitionInstance.onerror = (event) => {
            console.error('🎙️ ERROR:', event.error);
            setIsListening(false);
            if (event.error !== 'aborted') {
              setError(`Voice error: ${event.error}`);
              setStatus('error');
              setTimeout(() => {
                setError('');
                setStatus('ready');
              }, 2000);
            } else {
              setStatus('ready');
            }
          };

          recognitionInstance.onend = () => {
            setIsListening(false);
            if (status !== 'processing') {
              setStatus('ready');
            }
          };
          
          setRecognition(recognitionInstance);
        } catch (error) {
          console.error('🎙️ INIT FAILED:', error);
          setError('Voice init failed');
          return;
        }
      } else {
        setError('Speech not supported');
        return;
      }
    }
    
    if (isListening) {
      if (recognition && recognition !== 'ready') {
        recognition.abort();
      }
      setIsListening(false);
      setStatus('ready');
      setError('');
    } else {
      setTranscript('');
      setParsedCommand(null);
      setError('');
      
      if (recognition && recognition !== 'ready') {
        try {
          // Check if recognition is already running
          if (!isListening) {
            recognition.start();
          }
        } catch (error) {
          console.error('🎙️ START ERROR:', error);
          setError('Start failed');
          setStatus('ready');
        }
      }
    }
  };


  // English only - no language info needed

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography 
        variant="h4" 
        gutterBottom 
        className="gradient-text"
        sx={{ 
          fontWeight: 600, 
          mb: 4,
          fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        🧠 Enhanced Voice Control
      </Typography>





      {/* English Only - No Language Selector Needed */}
      
      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 3, 
            borderRadius: 3,
            backdropFilter: 'blur(10px)',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}
        >
          {error}
        </Alert>
      )}

      {useLLMParsing && llmStatus === 'unavailable' && (
        <Alert 
          severity="info" 
          sx={{ 
            mb: 3, 
            borderRadius: 3,
            backdropFilter: 'blur(10px)',
            background: 'rgba(33, 150, 243, 0.1)',
            border: '1px solid rgba(33, 150, 243, 0.3)',
          }}
        >
          AI mode selected but Groq API key not found. Using enhanced fallback parsing with date recognition. 
          Add VITE_GROQ_API_KEY to your .env file to enable full AI parsing.
        </Alert>
      )}

      {/* Voice Control Button */}
      <Box sx={{ position: 'relative', display: 'inline-block', mb: 4 }}>
        {status === 'listening' && (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: 1, 
            mb: 2,
            animation: 'fadeInUp 0.3s ease-out'
          }}>
            {[0, 1, 2].map((i) => (
              <Box
                key={i}
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: '#2563EB',
                  animation: `scalePulse 1.5s ease-in-out infinite`,
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </Box>
        )}

        <Button
          variant="contained"
          onClick={toggleListening}
          disabled={status === 'processing'}
          aria-label={isListening ? "Stop voice command listening" : "Start voice command listening"}
          startIcon={
            status === 'listening' ? <MicOffIcon /> : 
            status === 'processing' ? <CircularProgress size={20} color="inherit" /> : 
            status === 'preparing' ? <CircularProgress size={20} color="inherit" /> : 
            status === 'success' ? <CheckCircleIcon /> : 
            status === 'error' ? <ErrorIcon /> : 
            <PsychologyIcon />
          }
          sx={{
            minWidth: 200,
            height: 56,
            borderRadius: 3,
            fontSize: '1.1rem',
            fontWeight: 600,
            background: status === 'listening' 
              ? 'linear-gradient(45deg, #f44336 30%, #ff5722 90%)'
              : 'linear-gradient(45deg, #9c27b0 30%, #e91e63 90%)',
            boxShadow: status === 'listening' 
              ? `0 0 20px rgba(244, 67, 54, 0.5)`
              : `0 0 20px rgba(156, 39, 176, 0.3)`,
            animation: status === 'listening' ? `${pulseAnimation} 2s infinite` : 'none',
            '&:hover': {
              transform: 'scale(1.05)',
            },
            '&:disabled': {
              opacity: 0.6,
              transform: 'none',
            },
          }}
        >
          {status === 'listening' ? '🔴 Stop Listening' : 
           status === 'processing' ? 'Processing...' : 
           status === 'preparing' ? 'Preparing...' : 
           status === 'success' ? 'Success!' : 
           status === 'error' ? 'Try Again' : 
           '🧠 AI Voice Recognition'}
        </Button>

        {status === 'listening' && (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'end',
            gap: 0.5,
            mt: 2,
            height: 40,
          }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <Box
                key={i}
                sx={{
                  width: 4,
                  backgroundColor: '#3B82F6',
                  borderRadius: '2px 2px 0 0',
                  animation: `scalePulse ${0.8 + (i * 0.1)}s ease-in-out infinite`,
                  height: `${20 + Math.sin(i * 0.5) * 15}px`,
                }}
              />
            ))}
          </Box>
        )}
      </Box>

      {/* Status Display */}
      <Typography 
        variant="body1" 
        sx={{ 
          mb: 1,
          fontWeight: 500,
          color: status === 'listening' ? 'primary.main' : 'text.secondary',
          animation: status === 'listening' ? `${floatAnimation} 2s ease-in-out infinite` : 'none',
        }}
      >
        {status === 'listening' ? 
          '🎙️ Listening in English...' : 
         status === 'processing' ? 
          (useLLMParsing && llmStatus === 'available' ? '🧠 AI is understanding your command...' : 'Processing your request...') : 
         status === 'preparing' ? 
          '🔄 Preparing voice recognition...' : 
         status === 'success' ? 'Command executed successfully!' : 
         status === 'error' ? (error || 'Try again') : 
         'Click the button and speak in English'}
      </Typography>

      {/* Transcript and Parsed Command Display */}
      <Box sx={{ mb: 2, minHeight: 60 }}>
        {transcript && (
          <Fade in={!!transcript}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 3, 
                mb: 2,
                borderRadius: 2,
                background: theme.palette.mode === 'dark' 
                  ? 'rgba(16, 185, 129, 0.1)' 
                  : '#D1FAE5',
                border: `1px solid ${theme.palette.success.main}`,
                animation: 'fadeInUp 0.3s ease-out',
              }}
            >
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: 500,
                  color: 'text.secondary',
                  mb: 1
                }}
              >
                You said:
              </Typography>
              <Typography 
                variant="body1" 
                sx={{ 
                  fontWeight: 500,
                  color: 'success.main',
                  textAlign: 'center',
                }}
              >
                "{transcript}"
              </Typography>
            </Paper>
          </Fade>
        )}

        {parsedCommand && (
          <Fade in={!!parsedCommand}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 3, 
                borderRadius: 2,
                background: theme.palette.mode === 'dark' 
                  ? 'rgba(156, 39, 176, 0.1)' 
                  : '#F3E5F5',
                border: `1px solid ${theme.palette.primary.main}`,
                animation: 'fadeInUp 0.3s ease-out',
              }}
            >
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: 500,
                  color: 'text.secondary',
                  mb: 2
                }}
              >
                AI Understanding:
              </Typography>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', mb: 2 }}>
                <Chip 
                  label={`Intent: ${parsedCommand.intent}`} 
                  color="primary" 
                  size="small" 
                />
                <Chip 
                  label={`Confidence: ${Math.round(parsedCommand.confidence * 100)}%`} 
                  color={parsedCommand.confidence > 0.8 ? 'success' : parsedCommand.confidence > 0.5 ? 'warning' : 'error'} 
                  size="small" 
                />
                {parsedCommand.taskTitle && (
                  <Chip 
                    label={`Task: ${parsedCommand.taskTitle}`} 
                    color="secondary" 
                    size="small" 
                  />
                )}
                {parsedCommand.priority && (
                  <Chip 
                    label={`Priority: ${parsedCommand.priority}`} 
                    color="info" 
                    size="small" 
                  />
                )}
              </Box>
              
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'text.tertiary',
                  textAlign: 'center',
                  display: 'block',
                  fontStyle: 'italic'
                }}
              >
                {parsedCommand.reasoning}
              </Typography>
            </Paper>
          </Fade>
        )}

        {status === 'listening' && !transcript && (
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: 2,
              animation: `${floatAnimation} 2s ease-in-out infinite`
            }}
          >
            <GraphicEqIcon 
              sx={{ 
                color: 'error.main', 
                fontSize: '2rem',
                animation: `${pulseAnimation} 1s ease-in-out infinite`
              }} 
            />
            <Typography variant="h6" sx={{ color: 'error.main', fontWeight: 600 }}>
              🎧 Listening... Speak now!
            </Typography>
          </Box>
        )}

        {status === 'processing' && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <CircularProgress size={24} sx={{ color: 'primary.main' }} />
            <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 600 }}>
              {useLLMParsing && llmStatus === 'available' ? '🧠 AI is understanding...' : '🤖 Processing your command...'}
            </Typography>
          </Box>
        )}
      </Box>



      {/* Usage Instructions */}
      <Paper 
        sx={{ 
          p: 3, 
          borderRadius: 2, 
          mb: 2,
          background: theme.palette.mode === 'dark' 
            ? 'rgba(37, 99, 235, 0.05)' 
            : '#DBEAFE',
          border: theme.palette.mode === 'dark' 
            ? '1px solid rgba(37, 99, 235, 0.2)'
            : '1px solid rgba(37, 99, 235, 0.2)',
        }}
      >
        <Typography 
          variant="body2"
          sx={{ 
            fontWeight: 500,
            color: 'text.secondary',
            textAlign: 'center',
            mb: 2,
          }}
        >
          Enhanced Voice Commands:
        </Typography>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', mb: 2 }}>
          <Chip label="Add task buy milk tomorrow" size="small" color="success" />
          <Chip label="Mark grocery task as done" size="small" color="warning" />
          <Chip label="Delete meeting task" size="small" color="error" />
          <Chip label="Show all pending tasks" size="small" color="info" />
        </Box>

        <Typography 
          variant="caption" 
          sx={{ 
            color: 'text.tertiary',
            textAlign: 'center',
            display: 'block',
            fontSize: '0.75rem',
            mb: 1,
          }}
        >
          {useLLMParsing && llmStatus === 'available' 
            ? '🧠 AI understands natural language, dates, and priorities in English'
            : useLLMParsing && llmStatus === 'unavailable'
            ? '🔄 Enhanced fallback with date recognition - Add VITE_GROQ_API_KEY to .env for full AI'
            : '🎤 Basic mode - simple commands work best'
          }
        </Typography>

        <Typography 
          variant="caption" 
          sx={{ 
            color: 'text.tertiary',
            textAlign: 'center',
            display: 'block',
            fontSize: '0.75rem',
          }}
        >
          💡 Speak clearly and wait for the button to turn red before speaking
        </Typography>
      </Paper>
    </Box>
  );
};

export default EnhancedVoiceControl;