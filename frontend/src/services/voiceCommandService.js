import fallbackParser from './fallbackParser';

class VoiceCommandService {
  constructor() {
    this.model = import.meta.env?.VITE_LLM_MODEL || 'llama3.2:3b';
    this.currentTasks = [];
    this.contextDate = new Date();
  }

  updateContext(tasks) {
    this.currentTasks = tasks || [];
    this.contextDate = new Date();
  }

  generatePrompt(userTranscript) {
    const today = this.contextDate.toISOString().split('T')[0];
    const time = this.contextDate.toTimeString().split(' ')[0].substring(0, 5);

    const taskList = this.currentTasks.slice(0, 10).map(task => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : null
    }));

    const prompt = `You are a voice command parser for a task management system. Convert natural speech into structured JSON commands.

CRITICAL RULES:
1. Output ONLY valid JSON - no markdown, no explanations, no extra text
2. Support batch operations (e.g., "mark all tasks as completed")
3. Extract ALL intents from a single sentence
4. Handle multiple commands in one sentence
5. Parse complex commands like: "delete all pending tasks and mark grocery as high priority tomorrow"

CURRENT CONTEXT:
Today's Date: ${today}
Current Time: ${time}
Existing Tasks: ${JSON.stringify(taskList)}

OUTPUT SCHEMA:
{
  "commands": [
    {
      "action": "CREATE | UPDATE | DELETE | DELETE_ALL | UPDATE_ALL | READ",
      "target": "single | all | filtered",
      "taskId": "string | null",
      "taskTitle": "string | null",
      "filters": {
        "status": "pending | in-progress | completed | null",
        "priority": "LOW | MEDIUM | HIGH | null"
      },
      "updates": {
        "status": "pending | in-progress | completed | null",
        "priority": "LOW | MEDIUM | HIGH | null",
        "dueDate": "ISO_DATE | null"
      },
      "confidence": 0.0-1.0
    }
  ],
  "rawTranscript": "string",
  "interpretation": "brief explanation"
}

ACTION DEFINITIONS:

1. DELETE (single task)
   - Keywords: "delete", "remove", "erase", "cancel"
   - Examples: "delete grocery task", "remove meeting"
   - Output: {"action": "DELETE", "target": "single", "taskTitle": "grocery"}

2. DELETE_ALL (multiple/all tasks)
   - Keywords: "delete all", "remove all", "clear"
   - Examples: "delete all tasks", "clear all pending tasks", "remove all completed"
   - Output: {"action": "DELETE_ALL", "target": "all", "filters": {...}}

3. UPDATE (single task status/priority/date)
   - Keywords: "mark", "set", "change", "update", "make"
   - Examples: "mark grocery as completed", "set dentist to high priority"
   - Output: {"action": "UPDATE", "target": "single", "taskTitle": "grocery", "updates": {"status": "completed"}}

4. UPDATE_ALL (batch status/priority update)
   - Keywords: "mark all", "set all", "change all"
   - Examples: "mark all tasks as pending", "set all to high priority"
   - Output: {"action": "UPDATE_ALL", "target": "all", "updates": {"status": "pending"}}

5. CREATE (new task)
   - Keywords: "add", "create", "new", "remind me"
   - Examples: "add task buy milk", "create meeting tomorrow high priority"
   - Output: {"action": "CREATE", "taskTitle": "buy milk", "updates": {...}}

6. READ (list/show tasks)
   - Keywords: "show", "list", "read", "tell me"
   - Examples: "show all pending tasks", "list high priority tasks"
   - Output: {"action": "READ", "filters": {...}}

STATUS VALUES:
- "pending" | "in-progress" | "completed"
- Aliases: "done" = completed, "todo" = pending, "working" = in-progress

PRIORITY VALUES:
- "LOW" | "MEDIUM" | "HIGH"
- Keywords: urgent/important/critical = HIGH, normal = MEDIUM, low/later = LOW

DATE PARSING:
Relative dates (calculate from ${today}):
- "today" → ${today}
- "tomorrow" → ${new Date(Date.now() + 86400000).toISOString().split('T')[0]}
- "day after tomorrow" → ${new Date(Date.now() + 172800000).toISOString().split('T')[0]}
- "next week" → ${new Date(Date.now() + 604800000).toISOString().split('T')[0]}

Time expressions:
- "morning" → 09:00, "afternoon" → 14:00, "evening" → 18:00, "night" → 20:00

COMPLEX COMMAND PARSING:
When user says multiple things in one sentence, create multiple command objects.

Example: "delete all pending tasks and mark grocery as high priority tomorrow"
Output:
{
  "commands": [
    {
      "action": "DELETE_ALL",
      "target": "filtered",
      "filters": {"status": "pending"},
      "confidence": 0.95
    },
    {
      "action": "UPDATE",
      "target": "single",
      "taskTitle": "grocery",
      "updates": {
        "priority": "HIGH",
        "dueDate": "${new Date(Date.now() + 86400000).toISOString().split('T')[0]}T00:00:00Z"
      },
      "confidence": 0.9
    }
  ],
  "rawTranscript": "delete all pending tasks and mark grocery as high priority tomorrow",
  "interpretation": "Delete all pending tasks, then update grocery task to high priority with due date tomorrow"
}

TASK MATCHING (for single operations):
1. Look at existing tasks list
2. Match by title (exact or partial)
3. If multiple matches, pick most recent or ask for clarification
4. Set confidence lower if ambiguous

FILTER MATCHING (for batch operations):
"all tasks" → no filters
"all pending tasks" → {"status": "pending"}
"all high priority tasks" → {"priority": "HIGH"}
"all completed tasks" → {"status": "completed"}
"all pending high priority tasks" → {"status": "pending", "priority": "HIGH"}

Now parse this command: "${userTranscript}"

Return ONLY the JSON response, nothing else.`;

    return prompt;
  }

  async parseVoiceCommand(transcript) {
    if (!transcript || transcript.trim().length === 0) {
      return {
        commands: [],
        rawTranscript: transcript,
        interpretation: 'No speech detected',
        parserUsed: 'none',
        confidence: 0.0
      };
    }

    try {
      const llmResult = await this.parseWithLLM(transcript);
      if (llmResult && llmResult.commands && llmResult.commands.length > 0) {
        return { 
          ...llmResult, 
          parserUsed: 'llm',
          ...this.convertToLegacyFormat(llmResult.commands[0])
        };
      }
    } catch (error) {
    }

    const fallbackResult = fallbackParser(transcript, this.currentTasks);
    const legacyFormat = this.convertToLegacyFormat(fallbackResult.commands[0]);
    
    return {
      ...fallbackResult,
      ...legacyFormat
    };
  }

  async parseWithLLM(transcript) {
    const prompt = this.generatePrompt(transcript);
    const response = await this.callLLM(prompt);
    
    if (!response) {
      throw new Error('No response from LLM');
    }

    let parsedCommand;
    try {
      const cleanResponse = this.cleanLLMResponse(response);
      parsedCommand = JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('Invalid JSON response from LLM');
    }

    // Validate structure
    if (!parsedCommand.commands || !Array.isArray(parsedCommand.commands)) {
      throw new Error('Invalid response structure - missing commands array');
    }

    return parsedCommand;
  }

  // Convert new command format to legacy format for backward compatibility
  convertToLegacyFormat(command) {
    if (!command) {
      return {
        intent: 'UNKNOWN',
        confidence: 0.0,
        taskTitle: null,
        taskId: null,
        status: null,
        priority: null,
        dueDate: null,
        tags: null,
        description: null,
        filter: null,
        reasoning: 'No command found'
      };
    }

    // Map new actions to legacy intents
    const intentMap = {
      'CREATE': 'CREATE',
      'UPDATE': 'UPDATE',
      'DELETE': 'DELETE',
      'DELETE_ALL': 'BULK_DELETE',
      'UPDATE_ALL': 'BULK_UPDATE',
      'READ': 'READ'
    };

    return {
      intent: intentMap[command.action] || 'UNKNOWN',
      confidence: command.confidence || 0.5,
      taskTitle: command.taskTitle || null,
      taskId: command.taskId || null,
      status: command.updates?.status || null,
      priority: command.updates?.priority || null,
      dueDate: command.updates?.dueDate || null,
      tags: null,
      description: null,
      filter: command.filters || null,
      reasoning: `${command.action} operation`,
      // New format data
      bulkOperation: command.target === 'all' || command.target === 'filtered',
      applyToAll: command.target === 'all',
      filters: command.filters || null,
      updates: command.updates || null
    };
  }

  async callLLM(prompt) {
    const providers = [
      {
        url: 'http://localhost:11434/api/generate',
        body: {
          model: this.model,
          prompt: prompt,
          stream: false,
          format: 'json', // Force JSON output
          options: {
            temperature: 0.1,
            top_p: 0.9,
            max_tokens: 800 // Increased for complex commands
          }
        },
        headers: { 'Content-Type': 'application/json' },
        name: 'Ollama'
      },
      ...(import.meta.env?.VITE_GROQ_API_KEY ? [{
        url: 'https://api.groq.com/openai/v1/chat/completions',
        body: {
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 800,
          response_format: { type: "json_object" }
        },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`
        },
        name: 'Groq'
      }] : []),
      ...(import.meta.env?.VITE_GEMINI_API_KEY ? [{
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
        body: {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 800
          }
        },
        headers: { 'Content-Type': 'application/json' },
        name: 'Gemini'
      }] : [])
    ];

    for (const provider of providers) {
      try {
        const response = await fetch(provider.url, {
          method: 'POST',
          headers: provider.headers,
          body: JSON.stringify(provider.body)
        });

        if (!response.ok) continue;

        const data = await response.json();
        
        let text = '';
        if (data.response) {
          text = data.response;
        } else if (data.choices && data.choices[0]?.message?.content) {
          text = data.choices[0].message.content;
        } else if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
          text = data.candidates[0].content.parts[0].text;
        }

        if (text) return text;
      } catch (error) {
        continue;
      }
    }

    throw new Error('All LLM providers failed');
  }

  cleanLLMResponse(response) {
    let cleaned = response.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
    }
    
    return cleaned.trim();
  }

  // Legacy methods removed - using new dual-system approach

  async executeCommands(commands, executeCallback) {
    const results = [];
    
    for (const command of commands) {
      try {
        if (command.confidence < 0.5) {
          results.push({ success: false, reason: 'Low confidence', command });
          continue;
        }

        const result = await this.executeCommand(command, executeCallback);
        results.push({ success: true, result, command });
      } catch (error) {
        results.push({ success: false, error: error.message, command });
      }
    }

    return results;
  }

  async executeCommand(command, executeCallback) {
    switch (command.action) {
      case 'CREATE':
        return await executeCallback('create', {
          title: command.taskTitle,
          ...command.updates
        });

      case 'UPDATE':
        return await executeCallback('update', {
          taskId: command.taskId,
          taskTitle: command.taskTitle,
          updates: command.updates
        });

      case 'DELETE':
        return await executeCallback('delete', {
          taskId: command.taskId,
          taskTitle: command.taskTitle
        });

      case 'DELETE_ALL':
        return await executeCallback('deleteAll', {
          filters: command.filters
        });

      case 'UPDATE_ALL':
        return await executeCallback('updateAll', {
          filters: command.filters,
          updates: command.updates
        });

      case 'READ':
        return await executeCallback('read', {
          filters: command.filters
        });

      default:
        throw new Error(`Unknown action: ${command.action}`);
    }
  }


}

export const voiceCommandService = new VoiceCommandService();
export default voiceCommandService;