// Enhanced Fallback Parser - Rule-Based, No LLM Required
// Handles complex batch operations and multiple commands

const PATTERNS = {
  // DELETE patterns
  DELETE_ALL: [
    /delete\s+all\s+(tasks?)?/i,
    /remove\s+all\s+(tasks?)?/i,
    /clear\s+all\s+(tasks?)?/i,
    /delete\s+everything/i,
  ],
  DELETE_FILTERED: [
    /delete\s+all\s+(pending|completed|in-progress)\s+tasks?/i,
    /remove\s+all\s+(pending|completed|in-progress)/i,
    /delete\s+all\s+(high|medium|low)\s+priority/i,
  ],
  DELETE_SINGLE: [
    /delete\s+(task\s+)?(.+)/i,
    /remove\s+(task\s+)?(.+)/i,
    /cancel\s+(.+)/i,
  ],
  
  // UPDATE STATUS patterns
  UPDATE_ALL_STATUS: [
    /mark\s+all\s+(tasks?\s+)?as\s+(pending|in-progress|completed)/i,
    /set\s+all\s+(tasks?\s+)?to\s+(pending|in-progress|completed)/i,
    /change\s+all\s+(tasks?\s+)?to\s+(pending|in-progress|completed)/i,
  ],
  UPDATE_FILTERED_STATUS: [
    /mark\s+all\s+(pending|completed|in-progress)\s+as\s+(pending|in-progress|completed)/i,
    /mark\s+all\s+(high|medium|low)\s+priority\s+as\s+(pending|in-progress|completed)/i,
  ],
  UPDATE_SINGLE_STATUS: [
    /mark\s+(.+?)\s+as\s+(pending|in-progress|completed)/i,
    /set\s+(.+?)\s+to\s+(pending|in-progress|completed)/i,
    /(.+?)\s+(is\s+)?(done|completed|finished)/i,
  ],
  
  // UPDATE PRIORITY patterns
  UPDATE_ALL_PRIORITY: [
    /set\s+all\s+(tasks?\s+)?to\s+(high|medium|low)\s+priority/i,
    /mark\s+all\s+as\s+(high|medium|low)\s+priority/i,
    /change\s+all\s+to\s+(urgent|important|normal|low)/i,
  ],
  UPDATE_SINGLE_PRIORITY: [
    /set\s+(.+?)\s+to\s+(high|medium|low)\s+priority/i,
    /mark\s+(.+?)\s+as\s+(urgent|important|high|medium|low)/i,
    /(.+?)\s+(is\s+)?(urgent|high|important)/i,
  ],
  
  // UPDATE DUE DATE patterns
  UPDATE_DATE: [
    /set\s+(.+?)\s+(to\s+)?(today|tomorrow|yesterday)/i,
    /change\s+(.+?)\s+(to\s+)?(today|tomorrow|day after tomorrow)/i,
    /(.+?)\s+(for\s+|by\s+)?(today|tomorrow|yesterday)/i,
  ],

  // CREATE patterns
  CREATE: [
    /add\s+(task\s+)?(.+)/i,
    /create\s+(task\s+)?(.+)/i,
    /new\s+(task\s+)?(.+)/i,
    /remind\s+me\s+to\s+(.+)/i,
    /i\s+need\s+to\s+(.+)/i,
  ],

  // READ patterns
  READ: [
    /show\s+(me\s+)?(all\s+)?(tasks?|pending|completed|in-progress)/i,
    /list\s+(all\s+)?(tasks?|pending|completed|in-progress)/i,
    /what\s+(tasks?|pending|completed|in-progress)/i,
  ],
};

const DATE_KEYWORDS = {
  'today': 0,
  'tomorrow': 1,
  'day after tomorrow': 2,
  'yesterday': -1,
  'day before yesterday': -2,
  'next week': 7,
};

const TIME_KEYWORDS = {
  'morning': '09:00',
  'afternoon': '14:00',
  'evening': '18:00',
  'night': '20:00',
};

function fallbackParser(transcript, tasks) {
  const result = {
    commands: [],
    rawTranscript: transcript,
    interpretation: '',
    parserUsed: 'fallback'
  };

  const text = transcript.toLowerCase().trim();

  // Split on "and" to handle multiple commands
  const parts = text.split(/\s+and\s+/);

  for (const part of parts) {
    const command = parseSingleCommand(part, tasks);
    if (command) {
      result.commands.push(command);
    }
  }

  if (result.commands.length === 0) {
    // No patterns matched - try to infer
    result.commands.push(inferCommand(text, tasks));
  }

  result.interpretation = generateInterpretation(result.commands);

  return result;
}

function parseSingleCommand(text, tasks) {
  
  // 1. Check CREATE patterns first
  for (const pattern of PATTERNS.CREATE) {
    const match = text.match(pattern);
    if (match) {
      const taskTitle = (match[2] || match[1]).trim();
      
      const command = {
        action: 'CREATE',
        target: 'single',
        taskTitle: cleanTaskTitle(taskTitle),
        updates: {},
        confidence: 0.8
      };

      // Extract priority from title
      const priority = extractPriority(taskTitle);
      if (priority) {
        command.updates.priority = priority;
      }

      // Extract date from title
      const dueDate = extractDate(taskTitle);
      if (dueDate) {
        command.updates.dueDate = dueDate;
      }
      return command;
    }
  }

  // 2. Check DELETE patterns
  for (const pattern of PATTERNS.DELETE_ALL) {
    if (pattern.test(text)) {
      return {
        action: 'DELETE_ALL',
        target: 'all',
        filters: {},
        confidence: 1.0
      };
    }
  }

  for (const pattern of PATTERNS.DELETE_FILTERED) {
    const match = text.match(pattern);
    if (match) {
      const filter = match[1]; // pending, completed, high, etc.
      return {
        action: 'DELETE_ALL',
        target: 'filtered',
        filters: parseFilter(filter),
        confidence: 0.9
      };
    }
  }

  for (const pattern of PATTERNS.DELETE_SINGLE) {
    const match = text.match(pattern);
    if (match) {
      const taskName = match[2] || match[1];
      const matchedTask = findTaskByName(taskName, tasks);
      return {
        action: 'DELETE',
        target: 'single',
        taskId: matchedTask?.id,
        taskTitle: matchedTask?.title || taskName,
        confidence: matchedTask ? 0.85 : 0.6
      };
    }
  }

  // 3. Check UPDATE STATUS patterns
  for (const pattern of PATTERNS.UPDATE_ALL_STATUS) {
    const match = text.match(pattern);
    if (match) {
      const status = normalizeStatus(match[2]);
      return {
        action: 'UPDATE_ALL',
        target: 'all',
        filters: {},
        updates: { status },
        confidence: 0.95
      };
    }
  }

  for (const pattern of PATTERNS.UPDATE_FILTERED_STATUS) {
    const match = text.match(pattern);
    if (match) {
      const filterValue = match[1];
      const newStatus = normalizeStatus(match[2]);
      return {
        action: 'UPDATE_ALL',
        target: 'filtered',
        filters: parseFilter(filterValue),
        updates: { status: newStatus },
        confidence: 0.9
      };
    }
  }

  for (const pattern of PATTERNS.UPDATE_SINGLE_STATUS) {
    const match = text.match(pattern);
    if (match) {
      const taskName = match[1];
      const status = normalizeStatus(match[2] || match[3]);
      const matchedTask = findTaskByName(taskName, tasks);
      return {
        action: 'UPDATE',
        target: 'single',
        taskId: matchedTask?.id,
        taskTitle: matchedTask?.title || taskName,
        updates: { status },
        confidence: matchedTask ? 0.85 : 0.6
      };
    }
  }

  // 4. Check UPDATE PRIORITY patterns
  for (const pattern of PATTERNS.UPDATE_ALL_PRIORITY) {
    const match = text.match(pattern);
    if (match) {
      const priority = normalizePriority(match[2]);
      return {
        action: 'UPDATE_ALL',
        target: 'all',
        updates: { priority },
        confidence: 0.95
      };
    }
  }

  for (const pattern of PATTERNS.UPDATE_SINGLE_PRIORITY) {
    const match = text.match(pattern);
    if (match) {
      const taskName = match[1];
      const priority = normalizePriority(match[2] || match[3]);
      const matchedTask = findTaskByName(taskName, tasks);
      return {
        action: 'UPDATE',
        target: 'single',
        taskId: matchedTask?.id,
        taskTitle: matchedTask?.title || taskName,
        updates: { priority },
        confidence: matchedTask ? 0.85 : 0.6
      };
    }
  }

  // 5. Check UPDATE DATE patterns
  for (const pattern of PATTERNS.UPDATE_DATE) {
    const match = text.match(pattern);
    if (match) {
      const taskName = match[1];
      const dateKeyword = match[3] || match[2];
      const dueDate = parseDateKeyword(dateKeyword);
      const matchedTask = findTaskByName(taskName, tasks);
      return {
        action: 'UPDATE',
        target: 'single',
        taskId: matchedTask?.id,
        taskTitle: matchedTask?.title || taskName,
        updates: { dueDate },
        confidence: matchedTask ? 0.8 : 0.5
      };
    }
  }

  // 6. Check READ patterns
  for (const pattern of PATTERNS.READ) {
    const match = text.match(pattern);
    if (match) {
      const filterType = match[3] || match[2];
      return {
        action: 'READ',
        target: filterType === 'tasks' ? 'all' : 'filtered',
        filters: parseFilter(filterType),
        confidence: 0.9
      };
    }
  }

  return null;
}

function parseFilter(filterText) {
  const filter = {};

  if (/pending/i.test(filterText)) {
    filter.status = 'pending';
  } else if (/in-progress|working/i.test(filterText)) {
    filter.status = 'in-progress';
  } else if (/completed|done/i.test(filterText)) {
    filter.status = 'completed';
  }

  if (/high|urgent|important/i.test(filterText)) {
    filter.priority = 'HIGH';
  } else if (/medium|normal/i.test(filterText)) {
    filter.priority = 'MEDIUM';
  } else if (/low/i.test(filterText)) {
    filter.priority = 'LOW';
  }

  return filter;
}

function normalizeStatus(status) {
  const lower = status.toLowerCase();
  if (/done|completed|finished/i.test(lower)) return 'completed';
  if (/progress|working/i.test(lower)) return 'in-progress';
  if (/pending|todo|waiting/i.test(lower)) return 'pending';
  return lower;
}

function normalizePriority(priority) {
  const lower = priority.toLowerCase();
  if (/urgent|critical|important|high/i.test(lower)) return 'HIGH';
  if (/medium|normal|regular/i.test(lower)) return 'MEDIUM';
  if (/low|later/i.test(lower)) return 'LOW';
  return 'MEDIUM';
}

function extractPriority(text) {
  if (/urgent|critical|important|high\s+priority/i.test(text)) return 'HIGH';
  if (/medium\s+priority|normal/i.test(text)) return 'MEDIUM';
  if (/low\s+priority|later/i.test(text)) return 'LOW';
  return null;
}

function extractDate(text) {
  // First try specific date patterns
  const specificDate = parseSpecificDate(text);
  if (specificDate) {
    return specificDate;
  }

  // Then try keyword-based dates
  for (const [keyword, offset] of Object.entries(DATE_KEYWORDS)) {
    if (text.includes(keyword)) {
      return parseDateKeyword(keyword);
    }
  }
  return null;
}

function parseSpecificDate(text) {
  const currentYear = new Date().getFullYear();
  
  // Pattern for dates like "25th December", "Dec 25", "December 25th", "25/12", "12/25"
  const datePatterns = [
    // "25th December", "25 December"
    /(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i,
    // "December 25th", "December 25"
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?/i,
    // "Dec 25", "25 Dec"
    /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})/i,
    // "25/12", "12/25" (assuming DD/MM or MM/DD based on context)
    /(\d{1,2})\/(\d{1,2})/,
  ];

  const monthNames = {
    'january': 0, 'jan': 0,
    'february': 1, 'feb': 1,
    'march': 2, 'mar': 2,
    'april': 3, 'apr': 3,
    'may': 4,
    'june': 5, 'jun': 5,
    'july': 6, 'jul': 6,
    'august': 7, 'aug': 7,
    'september': 8, 'sep': 8,
    'october': 9, 'oct': 9,
    'november': 10, 'nov': 10,
    'december': 11, 'dec': 11
  };

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      let day, month;
      
      if (pattern.source.includes('january|february')) {
        // Pattern 1: "25th December" or Pattern 2: "December 25th"
        if (isNaN(match[1])) {
          // "December 25th"
          month = monthNames[match[1].toLowerCase()];
          day = parseInt(match[2]);
        } else {
          // "25th December"
          day = parseInt(match[1]);
          month = monthNames[match[2].toLowerCase()];
        }
      } else if (pattern.source.includes('jan|feb')) {
        // Pattern 3: "25 Dec" or Pattern 4: "Dec 25"
        if (isNaN(match[1])) {
          // "Dec 25"
          month = monthNames[match[1].toLowerCase()];
          day = parseInt(match[2]);
        } else {
          // "25 Dec"
          day = parseInt(match[1]);
          month = monthNames[match[2].toLowerCase()];
        }
      } else {
        // Pattern 5: "25/12" - assume DD/MM format
        day = parseInt(match[1]);
        month = parseInt(match[2]) - 1; // Month is 0-indexed
      }

      // Validate day and month
      if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
        const date = new Date(currentYear, month, day);
        
        // If the date is in the past, assume next year
        const today = new Date();
        if (date < today) {
          date.setFullYear(currentYear + 1);
        }
        
        return date.toISOString();
      }
    }
  }
  
  return null;
}

function cleanTaskTitle(title) {
  return title
    .replace(/urgent|critical|important|high\s+priority|medium\s+priority|low\s+priority/gi, '')
    .replace(/today|tomorrow|yesterday|day\s+after\s+tomorrow|next\s+week/gi, '')
    .replace(/morning|afternoon|evening|night/gi, '')
    // Remove specific date patterns
    .replace(/(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)/gi, '')
    .replace(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?/gi, '')
    .replace(/(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/gi, '')
    .replace(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})/gi, '')
    .replace(/(\d{1,2})\/(\d{1,2})/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseDateKeyword(keyword) {
  const today = new Date();
  const offset = DATE_KEYWORDS[keyword.toLowerCase()] || 0;

  const date = new Date(today);
  date.setDate(date.getDate() + offset);

  return date.toISOString();
}

function findTaskByName(name, tasks) {
  if (!tasks || tasks.length === 0) return null;

  const searchTerm = name.toLowerCase().trim();

  // Exact match
  let match = tasks.find(t => t.title.toLowerCase() === searchTerm);
  if (match) return match;

  // Contains match
  match = tasks.find(t => 
    t.title.toLowerCase().includes(searchTerm) ||
    searchTerm.includes(t.title.toLowerCase())
  );
  if (match) return match;

  // Fuzzy match (simple word overlap)
  const searchWords = searchTerm.split(' ');
  for (const task of tasks) {
    const taskWords = task.title.toLowerCase().split(' ');
    const overlap = searchWords.filter(w => taskWords.includes(w)).length;
    if (overlap >= Math.min(searchWords.length, taskWords.length) * 0.6) {
      return task;
    }
  }

  return null;
}

function inferCommand(text, tasks) {
  // Last resort: try to infer intent from keywords
  if (/delete|remove|erase/i.test(text)) {
    return {
      action: 'DELETE',
      target: 'single',
      taskTitle: text.replace(/delete|remove|erase|task/gi, '').trim(),
      confidence: 0.4
    };
  }

  if (/mark|set|change/i.test(text)) {
    return {
      action: 'UPDATE',
      target: 'single',
      taskTitle: text.split(/mark|set|change/i)[1]?.trim() || text,
      confidence: 0.3
    };
  }

  if (/add|create|new|remind/i.test(text)) {
    return {
      action: 'CREATE',
      target: 'single',
      taskTitle: text.replace(/add|create|new|remind\s+me\s+to|task/gi, '').trim(),
      confidence: 0.4
    };
  }

  return {
    action: 'UNKNOWN',
    confidence: 0.0
  };
}

function generateInterpretation(commands) {
  if (commands.length === 0) return 'No commands detected';

  const descriptions = commands.map(cmd => {
    switch (cmd.action) {
      case 'CREATE':
        return `Create task: ${cmd.taskTitle}`;
      case 'DELETE':
        return `Delete task: ${cmd.taskTitle}`;
      case 'DELETE_ALL':
        return cmd.filters && Object.keys(cmd.filters).length > 0
          ? `Delete all ${JSON.stringify(cmd.filters)} tasks`
          : 'Delete all tasks';
      case 'UPDATE':
        return `Update ${cmd.taskTitle}: ${JSON.stringify(cmd.updates)}`;
      case 'UPDATE_ALL':
        return `Update all tasks: ${JSON.stringify(cmd.updates)}`;
      case 'READ':
        return cmd.filters && Object.keys(cmd.filters).length > 0
          ? `Show ${JSON.stringify(cmd.filters)} tasks`
          : 'Show all tasks';
      default:
        return 'Unknown command';
    }
  });

  return descriptions.join(', then ');
}

export default fallbackParser;