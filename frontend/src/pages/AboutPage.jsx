import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Box,
  Chip,
  useTheme as useMuiTheme,
  alpha,
} from '@mui/material';
import {
  Mic as MicIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';


const AboutPage = () => {
  const muiTheme = useMuiTheme();
  const { getGlassmorphismStyle } = useTheme();
  const [expanded, setExpanded] = useState('what-this-app-does');

  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  const voiceCommands = [
    { category: 'Task Creation', commands: [
      '"Add task [title]"',
      '"Create task [title]"',
      '"Add task [title] today"',
      '"Add task [title] tomorrow"',
      '"Add task [title] next Monday"',
      '"Add task [title] on December 15"',
      '"Create task [title] with description [description]"',
      '"Add high priority task [title]"',
    ]},
    { category: 'Task Updates', commands: [
      '"Update task [title] to [new title]"',
      '"Change task [title] description to [new description]"',
      '"Move task [title] to tomorrow"',
      '"Change task [title] to high priority"',
    ]},
    { category: 'Task Status', commands: [
      '"Mark task [title] as completed"',
      '"Mark task [title] as done"',
      '"Complete task [title]"',
      '"Mark first task completed"',
    ]},
    { category: 'Task Management', commands: [
      '"Delete task [title]"',
      '"Remove task [title]"',
      '"Read my tasks"',
      '"What tasks are due today?"',
      '"Read completed tasks"',
    ]},
  ];

  const techStack = [
    { name: 'React 18+', description: 'Modern React with Hooks and functional components' },
    { name: 'Apollo Client', description: 'GraphQL client for state management and caching' },
    { name: 'Apollo Server', description: 'GraphQL API server with type-safe schema' },
    { name: 'MongoDB', description: 'NoSQL database with Mongoose ODM' },
    { name: 'Material-UI v5', description: 'React component library with theming' },
    { name: 'Web Speech API', description: 'Browser-native speech recognition and synthesis' },
  ];

  return (
    <Box sx={{ 
      minHeight: '100vh',
      backgroundColor: 'background.default',
      py: 4,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
    }}>
      <Container maxWidth="md" sx={{ 
        py: 4,
        width: '100%',
        maxWidth: '900px !important',
      }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <MicIcon sx={{ 
          fontSize: 80, 
          color: 'primary.main',
          mb: 3
        }} />
        
        <Typography 
          variant="h3" 
          component="h1" 
          gutterBottom 
          sx={{ 
            fontWeight: 600,
            mb: 2,
          }}
        >
          About VoiceTask
        </Typography>
        
        <Typography 
          variant="h6" 
          sx={{ 
            color: 'text.secondary',
            maxWidth: 600,
            mx: 'auto',
          }}
        >
          Learn more about this voice-controlled task manager
        </Typography>
      </Box>

      {/* What This App Does */}
      <Accordion 
        expanded={expanded === 'what-this-app-does'} 
        onChange={handleChange('what-this-app-does')}
        elevation={0}
        sx={{ 
          ...getGlassmorphismStyle(),
          mb: 3,
          borderRadius: 2,
          '&:before': { display: 'none' },
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            What This App Does
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography paragraph>
            VoiceTask is a modern task management application that combines the power 
            of voice technology with clean, intuitive design. It allows you to:
          </Typography>
          <Box component="ul" sx={{ pl: 2 }}>
            <Typography component="li" paragraph>
              Create, edit, and delete tasks using natural voice commands
            </Typography>
            <Typography component="li" paragraph>
              Receive spoken feedback and task summaries
            </Typography>
            <Typography component="li" paragraph>
              Organize tasks with priority levels and due dates
            </Typography>
            <Typography component="li" paragraph>
              Access your tasks from anywhere with seamless sync
            </Typography>
            <Typography component="li" paragraph>
              Experience full accessibility with screen reader support
            </Typography>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Voice Commands */}
      <Accordion 
        expanded={expanded === 'voice-commands'} 
        onChange={handleChange('voice-commands')}
        elevation={0}
        sx={{ 
          ...getGlassmorphismStyle(),
          mb: 3,
          borderRadius: 2,
          '&:before': { display: 'none' },
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            🎙️ Voice Commands Supported
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography paragraph color="text.secondary">
            VoiceTask supports over 15 different voice command variations with natural language processing:
          </Typography>
          {voiceCommands.map((category, index) => (
            <Box key={index} sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                {category.category}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {category.commands.map((command, cmdIndex) => (
                  <Chip
                    key={cmdIndex}
                    label={command}
                    variant="outlined"
                    size="small"
                    sx={{ 
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                    }}
                  />
                ))}
              </Box>
            </Box>
          ))}
        </AccordionDetails>
      </Accordion>

      {/* Tech Stack */}
      <Accordion 
        expanded={expanded === 'tech-stack'} 
        onChange={handleChange('tech-stack')}
        elevation={0}
        sx={{ 
          ...getGlassmorphismStyle(),
          mb: 3,
          borderRadius: 2,
          '&:before': { display: 'none' },
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            &lt;/&gt; Tech Stack
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography paragraph color="text.secondary">
            Built with modern web technologies for performance and scalability:
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {techStack.map((tech, index) => (
              <Card 
                key={index} 
                elevation={0}
                sx={{ 
                  ...getGlassmorphismStyle(),
                  borderRadius: 2,
                }}
              >
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    • {tech.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {tech.description}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Data Storage */}
      <Accordion 
        expanded={expanded === 'data-storage'} 
        onChange={handleChange('data-storage')}
        elevation={0}
        sx={{ 
          ...getGlassmorphismStyle(),
          mb: 3,
          borderRadius: 2,
          '&:before': { display: 'none' },
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            💾 Data Storage
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography paragraph>
            VoiceTask uses a modern, scalable data architecture:
          </Typography>
          <Box component="ul" sx={{ pl: 2 }}>
            <Typography component="li" paragraph>
              <strong>MongoDB Atlas</strong> for cloud storage with automatic scaling
            </Typography>
            <Typography component="li" paragraph>
              <strong>GraphQL API</strong> for efficient data operations and real-time updates
            </Typography>
            <Typography component="li" paragraph>
              <strong>Apollo Client</strong> for intelligent caching and state management
            </Typography>
            <Typography component="li" paragraph>
              <strong>Optimistic Updates</strong> for instant UI feedback
            </Typography>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Accessibility Features */}
      <Card 
        elevation={0}
        sx={{ 
          ...getGlassmorphismStyle(),
          mb: 4,
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Typography 
            variant="h5" 
            sx={{ 
              fontWeight: 'bold', 
              mb: 3,
            }}
          >
            ♿ Accessibility Features
          </Typography>
          <Typography paragraph sx={{ fontSize: '1.1rem', lineHeight: 1.7 }}>
            VoiceTask is built with accessibility in mind. All interactive elements have 
            ARIA labels, keyboard navigation is fully supported, and the voice features 
            provide an alternative input method for users with different abilities.
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Chip 
              label="Screen Reader Support" 
              color="success"
              sx={{ fontWeight: 600 }}
            />
            <Chip 
              label="Keyboard Navigation" 
              color="primary"
              sx={{ fontWeight: 600 }}
            />
            <Chip 
              label="Voice Control" 
              color="secondary"
              sx={{ fontWeight: 600 }}
            />
            <Chip 
              label="High Contrast Mode" 
              color="warning"
              sx={{ fontWeight: 600 }}
            />
            <Chip 
              label="Focus Management" 
              color="info"
              sx={{ fontWeight: 600 }}
            />
            <Chip 
              label="ARIA Labels" 
              color="primary"
              sx={{ fontWeight: 600 }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Action Button */}
      <Box sx={{ textAlign: 'center' }}>
        <Button
          variant="contained"
          size="large"
          onClick={() => window.dispatchEvent(new CustomEvent('goToTasks'))}
          sx={{
            px: 6,
            py: 2,
            fontSize: '1.2rem',
            fontWeight: 700,
          }}
        >
          Get Started
        </Button>
      </Box>
      </Container>
    </Box>
  );
};

export default AboutPage;