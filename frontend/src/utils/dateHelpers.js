// Date and calendar helper functions

/**
 * Get the number of days in a given month
 */
export const getDaysInMonth = (date) => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

/**
 * Get the first day of the week for a given month (0 = Sunday, 6 = Saturday)
 */
export const getFirstDayOfMonth = (date) => {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
};

/**
 * Get formatted month name and year
 */
export const getMonthName = (date) => {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

/**
 * Check if a date is today
 */
export const isToday = (date) => {
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

/**
 * Check if two dates are the same day
 */
export const isSameDate = (date1, date2) => {
  if (!date1 || !date2) return false;
  return date1.toDateString() === date2.toDateString();
};

/**
 * Generate calendar grid with 42 cells (6 weeks)
 */
export const generateCalendarDays = (currentDate) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  
  const days = [];
  
  // Previous month overflow days
  const prevMonth = new Date(year, month - 1, 0);
  const daysInPrevMonth = prevMonth.getDate();
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const date = new Date(year, month - 1, day);
    days.push({
      date,
      day,
      isCurrentMonth: false,
      isPrevMonth: true,
    });
  }
  
  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    days.push({
      date,
      day,
      isCurrentMonth: true,
      isPrevMonth: false,
    });
  }
  
  // Next month overflow days
  const remainingCells = 42 - days.length;
  for (let day = 1; day <= remainingCells; day++) {
    const date = new Date(year, month + 1, day);
    days.push({
      date,
      day,
      isCurrentMonth: false,
      isPrevMonth: false,
    });
  }
  
  return days;
};

/**
 * Group tasks by their due date
 */
export const groupTasksByDate = (tasks) => {
  const grouped = {};
  tasks.forEach(task => {
    if (task.dueDate) {
      const dateKey = new Date(task.dueDate).toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(task);
    }
  });
  return grouped;
};

/**
 * Get tasks for a specific date
 */
export const getTasksForDate = (tasks, date) => {
  const tasksByDate = groupTasksByDate(tasks);
  return tasksByDate[date.toDateString()] || [];
};

/**
 * Get date range for the last N days
 */
export const getLastNDays = (n) => {
  const days = [];
  const today = new Date();
  
  for (let i = n - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    days.push(date);
  }
  
  return days;
};

/**
 * Format date for display
 */
export const formatDate = (date, options = {}) => {
  const defaultOptions = { 
    month: 'short', 
    day: 'numeric',
    ...options 
  };
  return date.toLocaleDateString('en-US', defaultOptions);
};

/**
 * Check if a task is overdue
 */
export const isTaskOverdue = (task) => {
  if (!task.dueDate || task.status === 'completed') return false;
  const dueDate = new Date(task.dueDate);
  const now = new Date();
  return dueDate < now;
};

/**
 * Get days until due date
 */
export const getDaysUntilDue = (task) => {
  if (!task.dueDate) return null;
  const dueDate = new Date(task.dueDate);
  const now = new Date();
  const diffTime = dueDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};