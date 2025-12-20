import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Box,
  Grid,
  LinearProgress,
  Chip,
  useTheme as useMuiTheme,
  Paper,
  alpha,
  Button,
} from '@mui/material';
import {
  BarChart as BarChartIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
  Today as TodayIcon,
  CalendarMonth as CalendarIcon,
  Speed as SpeedIcon,
  Analytics as StatsIcon,
  PlayArrow as InProgressIcon,
  Flag,
  VolumeUp as VolumeUpIcon,
  RecordVoiceOver as RecordVoiceOverIcon,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
} from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import { GET_TASKS } from '../graphql/queries';
import { 
  calculateTaskStats,
  getStatusDistribution,
  getPriorityDistribution,
  getCompletionTrend,
  getProductivityMetrics
} from '../utils/statsHelpers';
import { feedback, speak } from '../utils/speech';

const StatsPage = () => {
  const muiTheme = useMuiTheme();
  const { getGlassmorphismStyle } = useTheme();
  const [isPlayingVoiceover, setIsPlayingVoiceover] = useState(false);
  
  // Fetch tasks data
  const { data: tasksData, loading, error } = useQuery(GET_TASKS, {
    errorPolicy: 'all',
    fetchPolicy: 'cache-first',
  });

  // Get tasks from query
  const tasks = tasksData?.tasks?.tasks || [];

  // Calculate enhanced statistics using utility functions
  const enhancedStats = useMemo(() => {
    const stats = calculateTaskStats(tasks);
    const productivity = getProductivityMetrics(tasks);
    return { ...stats, ...productivity };
  }, [tasks]);

  const statusDistributionData = useMemo(() => {
    return getStatusDistribution(tasks, muiTheme);
  }, [tasks, muiTheme]);

  const priorityData = useMemo(() => {
    return getPriorityDistribution(tasks, muiTheme);
  }, [tasks, muiTheme]);

  const completionTrendData = useMemo(() => {
    return getCompletionTrend(tasks, 7);
  }, [tasks]);

  // Recent activity (last 5 completed tasks)
  const recentActivity = useMemo(() => {
    return tasks
      .filter(task => task.status === 'completed' && task.completedAt)
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
      .slice(0, 5);
  }, [tasks]);

  // Auto-play voiceover when page loads and data is ready
  useEffect(() => {
    if (!loading && !error && tasks.length >= 0) {
      // Small delay to ensure page is fully rendered
      const timer = setTimeout(() => {
        playStatsVoiceover();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [loading, error, tasks.length]);

  // Voiceover function to explain all charts
  const playStatsVoiceover = async () => {
    if (isPlayingVoiceover) return;
    
    setIsPlayingVoiceover(true);
    
    // Cancel any ongoing speech to prevent interference
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      // Small delay to ensure speech is fully cancelled
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    try {
      await speak('Welcome to task statistics');
      
    } catch (error) {
      console.error('Voiceover failed:', error);
      await speak('Voiceover failed to play');
    } finally {
      setIsPlayingVoiceover(false);
    }
  };

  // Custom label function for pie chart
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null;
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="12"
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const StatCard = ({ title, value, icon, color = 'primary', subtitle, progress }) => (
    <Card 
      elevation={0}
      sx={{ 
        ...getGlassmorphismStyle(),
        borderRadius: 3,
        height: '100%',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 8px 32px ${muiTheme.palette[color].main}20`,
        }
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{ 
            p: 1.5, 
            borderRadius: 2, 
            backgroundColor: `${color}.main`,
            color: 'white',
            mr: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {icon}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: `${color}.main` }}>
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
          </Box>
        </Box>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {subtitle}
          </Typography>
        )}
        {progress !== undefined && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress 
              variant="determinate" 
              value={progress} 
              sx={{ 
                borderRadius: 1,
                height: 8,
                backgroundColor: `${color}.light`,
                '& .MuiLinearProgress-bar': {
                  backgroundColor: `${color}.main`,
                }
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {progress.toFixed(1)}% completion rate
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box sx={{ 
        minHeight: '100vh',
        backgroundColor: 'background.default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Typography>Loading stats...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ 
        minHeight: '100vh',
        backgroundColor: 'background.default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Typography color="error">Error loading stats: {error.message}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh',
      minWidth: '100vw',
      backgroundColor: 'background.default',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      overflow: 'auto',
    }}>
      <Container maxWidth="lg" sx={{ 
        py: 4,
        width: '100%',
        maxWidth: '1200px !important',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        {/* Header */}
        <Box sx={{ 
          textAlign: 'center', 
          mb: 6,
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto 48px auto',
        }}>
          <BarChartIcon sx={{ 
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
            Task Statistics
          </Typography>
          
          <Typography 
            variant="h6" 
            sx={{ 
              color: 'text.secondary',
              maxWidth: 600,
              mx: 'auto',
              mb: 3,
            }}
          >
            Track your productivity and task completion progress
          </Typography>


        </Box>

        {/* Overview Cards */}
        <Grid container spacing={3} sx={{ 
          mb: 4,
          justifyContent: 'center',
          maxWidth: '1200px',
          margin: '0 auto 32px auto',
        }}>
          <Grid item xs={6} sm={6} md={3}>
            <Card sx={{ 
              ...getGlassmorphismStyle(),
              textAlign: 'center', 
              p: 2,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: `0 8px 32px ${muiTheme.palette.primary.main}20`,
              }
            }}>
              <AssignmentIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {enhancedStats.totalTasks}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Tasks
              </Typography>
            </Card>
          </Grid>

          <Grid item xs={6} sm={6} md={3}>
            <Card sx={{ 
              ...getGlassmorphismStyle(),
              textAlign: 'center', 
              p: 2,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: `0 8px 32px ${muiTheme.palette.success.main}20`,
              }
            }}>
              <CheckCircleIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                {enhancedStats.completedTasks}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Completed
              </Typography>
            </Card>
          </Grid>

          <Grid item xs={6} sm={6} md={3}>
            <Card sx={{ 
              ...getGlassmorphismStyle(),
              textAlign: 'center', 
              p: 2,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: `0 8px 32px ${muiTheme.palette.info.main}20`,
              }
            }}>
              <InProgressIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'info.main' }}>
                {enhancedStats.inProgressTasks}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                In Progress
              </Typography>
            </Card>
          </Grid>

          <Grid item xs={6} sm={6} md={3}>
            <Card sx={{ 
              ...getGlassmorphismStyle(),
              textAlign: 'center', 
              p: 2,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: `0 8px 32px ${muiTheme.palette.warning.main}20`,
              }
            }}>
              <ScheduleIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                {enhancedStats.pendingTasks}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pending
              </Typography>
            </Card>
          </Grid>
        </Grid>

        {/* Charts Row */}
        <Grid container spacing={3} sx={{ 
          mb: 4,
          justifyContent: 'center',
          maxWidth: '1200px',
          margin: '0 auto 32px auto',
        }}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ 
              ...getGlassmorphismStyle(),
              p: 3, 
              height: 350,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              }
            }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                📊 Status Distribution
              </Typography>
              {statusDistributionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={statusDistributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomizedLabel}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280 }}>
                  <Typography color="text.secondary">No data to display</Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ 
              ...getGlassmorphismStyle(),
              p: 3, 
              height: 350,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              }
            }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                📈 Priority Distribution
              </Typography>
              {priorityData && priorityData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={priorityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={muiTheme.palette.divider} />
                    <XAxis dataKey="name" tick={{ fill: muiTheme.palette.text.secondary }} />
                    <YAxis tick={{ fill: muiTheme.palette.text.secondary }} />
                    <RechartsTooltip />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {priorityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280 }}>
                  <Typography color="text.secondary">No priority data to display</Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Completion Trend */}
        <Grid container spacing={3} sx={{ 
          mb: 4,
          justifyContent: 'center',
          maxWidth: '1200px',
          margin: '0 auto 32px auto',
        }}>
          <Grid item xs={12}>
            <Paper sx={{ 
              ...getGlassmorphismStyle(),
              p: 3, 
              height: 350,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              }
            }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                📉 Completion Trend (Last 7 Days)
              </Typography>
              {completionTrendData && completionTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={completionTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={muiTheme.palette.divider} />
                    <XAxis dataKey="date" tick={{ fill: muiTheme.palette.text.secondary }} />
                    <YAxis tick={{ fill: muiTheme.palette.text.secondary }} />
                    <RechartsTooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="completed" 
                      stroke={muiTheme.palette.success.main}
                      strokeWidth={3}
                      dot={{ fill: muiTheme.palette.success.main, strokeWidth: 2, r: 4 }}
                      name="Tasks Completed"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280 }}>
                  <Typography color="text.secondary">No completion trend data available</Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Insights */}
        <Grid container spacing={3} sx={{ 
          mb: 4,
          justifyContent: 'center',
          maxWidth: '1200px',
          margin: '0 auto 32px auto',
        }}>
          <Grid item xs={12}>
            <Card sx={{ 
              ...getGlassmorphismStyle(),
              p: 3,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              }
            }}>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
                💡 Insights
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      {enhancedStats.completionRate}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Completion Rate
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                      {enhancedStats.pendingTasks + enhancedStats.inProgressTasks}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Tasks Remaining
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                      {enhancedStats.avgDailyCompletions || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Avg. Daily Completions
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Card>
          </Grid>
        </Grid>

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <Card 
            elevation={0}
            sx={{ 
              ...getGlassmorphismStyle(),
              borderRadius: 3,
              transition: 'all 0.3s ease',
              maxWidth: '1200px',
              width: '100%',
              margin: '0 auto',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              }
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                🎉 Recent Completions
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {recentActivity.map((task, index) => (
                  <Box 
                    key={task.id}
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      p: 2, 
                      borderRadius: 2,
                      backgroundColor: alpha(muiTheme.palette.success.main, 0.1),
                      border: `1px solid ${alpha(muiTheme.palette.success.main, 0.2)}`,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: alpha(muiTheme.palette.success.main, 0.15),
                        transform: 'translateX(4px)',
                      }
                    }}
                  >
                    <CheckCircleIcon sx={{ color: 'success.main', mr: 2 }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {task.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Completed {new Date(task.completedAt).toLocaleDateString()} at {new Date(task.completedAt).toLocaleTimeString()}
                      </Typography>
                    </Box>
                    <Chip 
                      label={task.priority} 
                      size="small"
                      color={task.priority === 'high' ? 'error' : task.priority === 'medium' ? 'warning' : 'success'}
                    />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        )}
      </Container>
    </Box>
  );
};

export default StatsPage;
