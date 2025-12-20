import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Grid,
  Card,
  CardContent,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useTheme,
  Container,
  Divider
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  VolumeUp as VolumeUpIcon,
  Mic as MicIcon,
  Psychology as PsychologyIcon
} from '@mui/icons-material';
import { feedback } from '../utils/speech';

const VoiceGuide = () => {
  const theme = useTheme();
  const [playingExample, setPlayingExample] = useState(null);

  const playExample = async (text, index) => {
    if (playingExample === index) return;
    
    setPlayingExample(index);
    try {
      await feedback.success(`Example: ${text}`);
    } catch (error) {
      console.error('Voice example failed:', error);
    }
    setTimeout(() => setPlayingExample(null), 2000);
  };

  const commandCategories = [
    {
      title: "Task Creation",
      icon: "➕",
      color: "success",
      commands: [
        { text: "Add task buy milk", description: "Creates a simple task" },
        { text: "Create task call doctor tomorrow", description: "Creates task with due date" },
        { text: "New high priority task finish report", description: "Creates task with high priority" },
        { text: "Add urgent task meeting at 3pm", description: "Creates urgent task" },
        { text: "Create low priority task clean garage someday", description: "Creates low priority task" }
      ]
    },
    {
      title: "Task Status Updates",
      icon: "🔄",
      color: "warning",
      commands: [
        { text: "Mark task 1 complete", description: "Marks first task as completed" },
        { text: "Mark milk task as done", description: "Completes task by name" },
        { text: "Set task 2 to pending", description: "Sets task status to pending" },
        { text: "Make first task in progress", description: "Sets task to in progress" },
        { text: "Complete second task", description: "Marks task as complete" }
      ]
    },
    {
      title: "Priority Management",
      icon: "🎯",
      color: "info",
      commands: [
        { text: "Set priority of task 2 to high", description: "Changes task priority" },
        { text: "Make task 1 urgent", description: "Sets task as high priority" },
        { text: "Change first task priority to low", description: "Sets low priority" },
        { text: "Priority of milk task to medium", description: "Sets medium priority" }
      ]
    },
    {
      title: "Due Date Management",
      icon: "📅",
      color: "secondary",
      commands: [
        { text: "Set due date of task 1 to tomorrow", description: "Sets due date to tomorrow" },
        { text: "Change due date of task 2 to next week", description: "Sets due date to next week" },
        { text: "Update due date of milk task to January 15th", description: "Sets specific date" }
      ]
    },
    {
      title: "Task Deletion",
      icon: "🗑️",
      color: "error",
      commands: [
        { text: "Delete task 1", description: "Deletes first task" },
        { text: "Remove milk task", description: "Deletes task by name" },
        { text: "Delete all tasks", description: "Deletes all tasks" },
        { text: "Remove second task", description: "Deletes second task" }
      ]
    },
    {
      title: "Bulk Operations",
      icon: "📋",
      color: "primary",
      commands: [
        { text: "Mark all tasks as complete", description: "Completes all tasks" },
        { text: "Set all tasks to pending", description: "Sets all tasks to pending" },
        { text: "Mark all tasks as in progress", description: "Sets all to in progress" },
        { text: "Delete all completed tasks", description: "Removes completed tasks" }
      ]
    },
    {
      title: "Information & Reading",
      icon: "📖",
      color: "info",
      commands: [
        { text: "Read all tasks", description: "Lists all your tasks" },
        { text: "Show all pending tasks", description: "Shows pending tasks" },
        { text: "List all tasks", description: "Reads task list aloud" },
        { text: "What tasks do I have", description: "Shows your task summary" }
      ]
    }
  ];

  const tips = [
    {
      title: "Speak Clearly",
      description: "Speak in a clear, normal voice. Avoid background noise.",
      icon: "🎤"
    },
    {
      title: "Use Task Numbers",
      description: "Reference tasks by number (task 1, task 2) or ordinals (first task, second task).",
      icon: "🔢"
    },
    {
      title: "Natural Language",
      description: "Use natural phrases - the AI understands context and variations.",
      icon: "🧠"
    },
    {
      title: "Priority Keywords",
      description: "Use words like 'urgent', 'important', 'high', 'low', 'medium' for priorities.",
      icon: "⭐"
    },
    {
      title: "Date Recognition",
      description: "Say 'tomorrow', 'next week', 'January 15th', or other natural date phrases.",
      icon: "📅"
    }
  ];

  return (
    <Box sx={{ 
      minHeight: '100vh',
      minWidth: '100vw',
      backgroundColor: 'background.default',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      overflow: 'auto',
    }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 2 }}>
          <PsychologyIcon sx={{ fontSize: 48, color: 'primary.main' }} />
          <Typography variant="h3" component="h1" sx={{ fontWeight: 700, color: 'primary.main' }}>
            Voice Commands Guide
          </Typography>
        </Box>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
          Master voice control with these commands. Click the speaker icon to hear examples!
        </Typography>
      </Box>

      {/* Quick Tips */}
      <Paper sx={{ p: 3, mb: 4, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Typography variant="h5" sx={{ color: 'white', mb: 3, fontWeight: 600 }}>
          💡 Quick Tips for Better Voice Recognition
        </Typography>
        <Grid container spacing={2}>
          {tips.map((tip, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Typography sx={{ fontSize: '1.5rem' }}>{tip.icon}</Typography>
                <Box>
                  <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 600 }}>
                    {tip.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                    {tip.description}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Command Categories */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 600, textAlign: 'center' }}>
          Voice Command Categories
        </Typography>
        
        {commandCategories.map((category, categoryIndex) => (
          <Accordion key={categoryIndex} sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography sx={{ fontSize: '1.5rem' }}>{category.icon}</Typography>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {category.title}
                </Typography>
                <Chip 
                  label={`${category.commands.length} commands`} 
                  size="small" 
                  color={category.color}
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                {category.commands.map((command, commandIndex) => (
                  <Grid item xs={12} md={6} key={commandIndex}>
                    <Card sx={{ height: '100%' }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => playExample(command.text, `${categoryIndex}-${commandIndex}`)}
                            disabled={playingExample === `${categoryIndex}-${commandIndex}`}
                            sx={{ minWidth: 40, p: 1 }}
                          >
                            <VolumeUpIcon fontSize="small" />
                          </Button>
                          <Box sx={{ flex: 1 }}>
                            <Typography 
                              variant="subtitle1" 
                              sx={{ 
                                fontWeight: 600, 
                                color: 'primary.main',
                                fontFamily: 'monospace',
                                mb: 1
                              }}
                            >
                              "{command.text}"
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {command.description}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>


      </Container>
    </Box>
  );
};

export default VoiceGuide;