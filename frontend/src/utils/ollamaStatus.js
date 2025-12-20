// Ollama Status Checker for Enhanced Voice Features

export class OllamaStatus {
  constructor() {
    this.endpoint = import.meta.env?.VITE_LLM_ENDPOINT || 'http://localhost:11434/api/generate';
    this.model = import.meta.env?.VITE_LLM_MODEL || 'llama3.2:3b';
    this.isAvailable = false;
    this.lastCheck = null;
  }

  // Check if Ollama is running and model is available
  async checkStatus() {
    try {
      
      // First check if Ollama service is running
      const healthResponse = await fetch('http://localhost:11434/api/tags', {
        method: 'GET',
        timeout: 3000
      });

      if (!healthResponse.ok) {
        throw new Error('Ollama service not responding');
      }

      const models = await healthResponse.json();
      const hasModel = models.models?.some(m => m.name.includes(this.model.split(':')[0]));

      if (!hasModel) {
        // Try with a smaller model
        this.model = 'llama3.2:1b';
      }

      // Test actual generation
      const testResponse = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: 'Say "OK"',
          stream: false,
          options: { max_tokens: 10 }
        }),
        timeout: 10000
      });

      if (testResponse.ok) {
        this.isAvailable = true;
        this.lastCheck = new Date();
        return { available: true, model: this.model };
      }

    } catch (error) {
      this.isAvailable = false;
    }

    return { 
      available: false, 
      message: 'Ollama not running. Please start with: ollama serve',
      installUrl: 'https://ollama.com/download'
    };
  }

  // Get user-friendly status message
  getStatusMessage() {
    if (this.isAvailable) {
      return {
        status: 'ready',
        message: `🧠 Enhanced AI voice parsing ready (${this.model})`,
        color: 'success'
      };
    }

    return {
      status: 'unavailable',
      message: '🔧 Enhanced AI features unavailable - Install Ollama for better voice parsing',
      color: 'warning',
      action: 'Install Ollama',
      actionUrl: 'https://ollama.com/download'
    };
  }

  // Quick availability check (cached)
  isReady() {
    return this.isAvailable && this.lastCheck && (Date.now() - this.lastCheck.getTime()) < 60000; // 1 minute cache
  }
}

// Global instance
export const ollamaStatus = new OllamaStatus();