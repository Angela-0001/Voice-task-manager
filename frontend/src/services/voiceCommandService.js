import fallbackParser from './fallbackParser';

class VoiceCommandService {
  constructor() {
    this.currentTasks = [];
    this.contextDate = new Date();
  }

  updateContext(tasks) {
    this.currentTasks = tasks || [];
    this.contextDate = new Date();
  }

  generatePrompt(userTranscript) {
    const today = this.contextDate.toISOString().split('T')[0];
    const taskList = this.currentTasks.slice(0, 10).map(task => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : null
    }));

    return `You are a voice command parser for a task management app. Convert natural speech into structured JSON.

RULES: Output ONLY valid JSON. Support batch operations. Extract ALL intents.

TODAY: ${today}
TASKS: ${JSON.stringify(taskList)}

SCHEMA:
{
  "commands": [{
    "action": "CREATE|UPDATE|DELETE|DELETE_ALL|UPDATE_ALL|READ",
    "target": "single|all|filtered",
    "taskId": null,
    "taskTitle": null,
    "filters": {"status": null, "priority": null},
    "updates": {"status": null, "priority": null, "dueDate": null},
    "confidence": 0.9
  }],
  "rawTranscript": "",
  "interpretation": ""
}

STATUS: pending|in-progress|completed. PRIORITY: LOW|MEDIUM|HIGH.
DATES: today=${today}, tomorrow=${new Date(Date.now() + 86400000).toISOString().split('T')[0]}

Parse: "${userTranscript}"`;
  }

  async parseVoiceCommand(transcript) {
    if (!transcript || transcript.trim().length === 0) {
      return { commands: [], rawTranscript: transcript, interpretation: 'No speech detected', parserUsed: 'none', confidence: 0.0 };
    }

    const apiKey = import.meta.env?.VITE_GROQ_API_KEY;

    if (apiKey) {
      try {
        const llmResult = await this.parseWithGroq(transcript, apiKey);
        if (llmResult && llmResult.commands && llmResult.commands.length > 0) {
          return { ...llmResult, parserUsed: 'groq', ...this.convertToLegacyFormat(llmResult.commands[0]) };
        }
      } catch (error) {
        console.warn('Groq parsing failed, using fallback:', error.message);
      }
    }

    const fallbackResult = fallbackParser(transcript, this.currentTasks);
    return { ...fallbackResult, ...this.convertToLegacyFormat(fallbackResult.commands[0]) };
  }

  async parseWithGroq(transcript, apiKey) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: this.generatePrompt(transcript) }],
        temperature: 0.1,
        max_tokens: 800,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Groq API error ' + response.status);
    }

    const data = await response.json();
    const text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!text) throw new Error('Empty response from Groq');

    const parsed = JSON.parse(this.cleanResponse(text));
    if (!parsed.commands || !Array.isArray(parsed.commands)) throw new Error('Invalid response structure');
    return parsed;
  }

  cleanResponse(text) {
    let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      cleaned = cleaned.substring(start, end + 1);
    }
    return cleaned.trim();
  }

  convertToLegacyFormat(command) {
    if (!command) {
      return { intent: 'UNKNOWN', confidence: 0.0, taskTitle: null, taskId: null, status: null, priority: null, dueDate: null, filter: null };
    }
    const intentMap = { CREATE: 'CREATE', UPDATE: 'UPDATE', DELETE: 'DELETE', DELETE_ALL: 'BULK_DELETE', UPDATE_ALL: 'BULK_UPDATE', READ: 'READ' };
    return {
      intent: intentMap[command.action] || 'UNKNOWN',
      confidence: command.confidence || 0.5,
      taskTitle: command.taskTitle || null,
      taskId: command.taskId || null,
      status: command.updates ? command.updates.status : null,
      priority: command.updates ? command.updates.priority : null,
      dueDate: command.updates ? command.updates.dueDate : null,
      filter: command.filters || null,
      bulkOperation: command.target === 'all' || command.target === 'filtered',
      applyToAll: command.target === 'all',
      filters: command.filters || null,
      updates: command.updates || null
    };
  }

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
        return await executeCallback('create', { title: command.taskTitle, ...command.updates });
      case 'UPDATE':
        return await executeCallback('update', { taskId: command.taskId, taskTitle: command.taskTitle, updates: command.updates });
      case 'DELETE':
        return await executeCallback('delete', { taskId: command.taskId, taskTitle: command.taskTitle });
      case 'DELETE_ALL':
        return await executeCallback('deleteAll', { filters: command.filters });
      case 'UPDATE_ALL':
        return await executeCallback('updateAll', { filters: command.filters, updates: command.updates });
      case 'READ':
        return await executeCallback('read', { filters: command.filters });
      default:
        throw new Error('Unknown action: ' + command.action);
    }
  }
}

export const voiceCommandService = new VoiceCommandService();
export default voiceCommandService;
