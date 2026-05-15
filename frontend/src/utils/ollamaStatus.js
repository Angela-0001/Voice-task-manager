// AI Status Checker - Groq API

export class AIStatus {
  getStatusMessage() {
    const apiKey = import.meta.env?.VITE_GROQ_API_KEY;

    if (apiKey) {
      return {
        status: 'ready',
        message: '🧠 AI voice parsing ready (Groq)',
        color: 'success'
      };
    }

    return {
      status: 'unavailable',
      message: '🔧 Add VITE_GROQ_API_KEY to .env for AI voice parsing',
      color: 'warning',
      action: 'Get free API key',
      actionUrl: 'https://console.groq.com/keys'
    };
  }

  isReady() {
    return !!import.meta.env?.VITE_GROQ_API_KEY;
  }
}

export const ollamaStatus = new AIStatus();
