// Statistics calculation helper functions

/**
 * Calculate basic task statistics
 */
export const calculateTaskStats = (tasks) => {
  const totalTasks = tasks.length;
  const pendingTasks = tasks.filter(task => task.status === 'pending').length;
  const inProgressTasks = tasks.filter(task => task.status === 'in_progress').length;
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return {
    totalTasks,
    pendingTasks,
    inProgressTasks,
    completedTasks,
    completionRate,
  };
};

/**
 * Get task distribution by status for pie chart
 */
export const getStatusDistribution = (tasks, theme) => {
  const stats = calculateTaskStats(tasks);
  
  return [
    {
      name: 'Pending',
      value: stats.pendingTasks,
      color: theme.palette.warning.main,
    },
    {
      name: 'In Progress',
      value: stats.inProgressTasks,
      color: theme.palette.info.main,
    },
    {
      name: 'Completed',
      value: stats.completedTasks,
      color: theme.palette.success.main,
    },
  ].filter(item => item.value > 0);
};

/**
 * Get task distribution by priority for bar chart
 */
export const getPriorityDistribution = (tasks, theme) => {
  const lowPriority = tasks.filter(task => task.priority === 'low').length;
  const mediumPriority = tasks.filter(task => task.priority === 'medium').length;
  const highPriority = tasks.filter(task => task.priority === 'high').length;

  return [
    {
      name: 'Low',
      count: lowPriority,
      fill: theme.palette.success.main,
    },
    {
      name: 'Medium',
      count: mediumPriority,
      fill: theme.palette.warning.main,
    },
    {
      name: 'High',
      count: highPriority,
      fill: theme.palette.error.main,
    },
  ];
};

/**
 * Get completion trend data for line chart (last N days)
 */
export const getCompletionTrend = (tasks, days = 7) => {
  const trendData = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    const completedOnDate = tasks.filter(task => {
      if (task.status === 'completed' && task.updatedAt) {
        const taskDate = new Date(task.updatedAt);
        return taskDate.toDateString() === date.toDateString();
      }
      return false;
    }).length;

    trendData.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      completed: completedOnDate,
    });
  }
  
  return trendData;
};

/**
 * Get tasks created over time
 */
export const getCreationTrend = (tasks, days = 7) => {
  const trendData = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    const createdOnDate = tasks.filter(task => {
      if (task.createdAt) {
        const taskDate = new Date(task.createdAt);
        return taskDate.toDateString() === date.toDateString();
      }
      return false;
    }).length;

    trendData.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      created: createdOnDate,
    });
  }
  
  return trendData;
};

/**
 * Calculate productivity metrics
 */
export const getProductivityMetrics = (tasks) => {
  const stats = calculateTaskStats(tasks);
  const completionTrend = getCompletionTrend(tasks, 7);
  
  const avgDailyCompletions = completionTrend.reduce((sum, day) => sum + day.completed, 0) / 7;
  const overdueTasks = tasks.filter(task => {
    if (!task.dueDate || task.status === 'completed') return false;
    const dueDate = new Date(task.dueDate);
    const now = new Date();
    return dueDate < now;
  }).length;

  const upcomingTasks = tasks.filter(task => {
    if (!task.dueDate || task.status === 'completed') return false;
    const dueDate = new Date(task.dueDate);
    const now = new Date();
    const diffTime = dueDate - now;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays <= 7 && diffDays > 0;
  }).length;

  return {
    ...stats,
    avgDailyCompletions: Math.round(avgDailyCompletions * 10) / 10,
    overdueTasks,
    upcomingTasks,
  };
};

/**
 * Get task distribution by creation date (monthly)
 */
export const getMonthlyTaskDistribution = (tasks) => {
  const monthlyData = {};
  
  tasks.forEach(task => {
    if (task.createdAt) {
      const date = new Date(task.createdAt);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = 0;
      }
      monthlyData[monthKey]++;
    }
  });

  return Object.entries(monthlyData)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => new Date(a.month) - new Date(b.month));
};

/**
 * Get priority distribution percentages
 */
export const getPriorityPercentages = (tasks) => {
  const total = tasks.length;
  if (total === 0) return { low: 0, medium: 0, high: 0 };

  const lowCount = tasks.filter(task => task.priority === 'low').length;
  const mediumCount = tasks.filter(task => task.priority === 'medium').length;
  const highCount = tasks.filter(task => task.priority === 'high').length;

  return {
    low: Math.round((lowCount / total) * 100),
    medium: Math.round((mediumCount / total) * 100),
    high: Math.round((highCount / total) * 100),
  };
};