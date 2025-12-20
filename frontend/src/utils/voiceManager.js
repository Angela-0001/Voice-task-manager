// Centralized Voice Manager to prevent conflicts and improve performance
class VoiceManager {
  constructor() {
    this.activeRecognition = null;
    this.activeSpeech = null;
    this.isRecognitionActive = false;
    this.isSpeechActive = false;
    this.recognitionQueue = [];
    this.speechQueue = [];
  }

  // Stop all active voice operations
  stopAll() {
    this.stopRecognition();
    this.stopSpeech();
  }

  // Stop active speech recognition
  stopRecognition() {
    if (this.activeRecognition && this.isRecognitionActive) {
      try {
        this.activeRecognition.stop();
      } catch (error) {
      }
    }
    this.activeRecognition = null;
    this.isRecognitionActive = false;
  }

  // Stop active speech synthesis
  stopSpeech() {
    if (this.isSpeechActive && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (error) {
      }
    }
    this.activeSpeech = null;
    this.isSpeechActive = false;
  }

  // Start speech recognition (stops any existing first)
  startRecognition(config = {}) {
    return new Promise((resolve, reject) => {
      // Stop any existing recognition
      this.stopRecognition();

      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.activeRecognition = new SpeechRecognition();

        // Configure recognition
        this.activeRecognition.continuous = config.continuous || false;
        this.activeRecognition.interimResults = config.interimResults || false;
        this.activeRecognition.lang = config.lang || 'en-US';
        this.activeRecognition.maxAlternatives = 1;

        // Event handlers
        this.activeRecognition.onstart = () => {
          this.isRecognitionActive = true;
          if (config.onStart) config.onStart();
        };

        this.activeRecognition.onresult = (event) => {
          const result = event.results[event.results.length - 1];
          if (result.isFinal) {
            const transcript = result[0].transcript.trim();
            if (config.onResult) config.onResult(transcript);
            resolve(transcript);
          }
        };

        this.activeRecognition.onerror = (event) => {
          console.error('🎙️ VoiceManager: Recognition error:', event.error);
          this.isRecognitionActive = false;
          if (config.onError) config.onError(event.error);
          reject(new Error(event.error));
        };

        this.activeRecognition.onend = () => {
          this.isRecognitionActive = false;
          if (config.onEnd) config.onEnd();
        };

        // Start recognition
        this.activeRecognition.start();
      } catch (error) {
        console.error('🎙️ VoiceManager: Failed to start recognition:', error);
        reject(error);
      }
    });
  }

  // Speak text (stops any existing speech first)
  speak(text, options = {}) {
    return new Promise((resolve) => {
      // Stop any existing speech
      this.stopSpeech();

      if (!text || !('speechSynthesis' in window)) {
        resolve();
        return;
      }

      try {
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Apply options
        utterance.rate = options.rate || 1.0;
        utterance.pitch = options.pitch || 1.0;
        utterance.volume = options.volume || 1.0;
        utterance.lang = options.lang || 'en-US';

        if (options.voice) {
          utterance.voice = options.voice;
        }

        // Event handlers
        utterance.onstart = () => {
          this.isSpeechActive = true;
        };

        utterance.onend = () => {
          this.isSpeechActive = false;
          resolve();
        };

        utterance.onerror = (event) => {
          this.isSpeechActive = false;
          console.error('🔊 VoiceManager: Speech error:', event);
          resolve();
        };

        // Start speech
        this.activeSpeech = utterance;
        window.speechSynthesis.speak(utterance);
      } catch (error) {
        console.error('🔊 VoiceManager: Failed to speak:', error);
        resolve();
      }
    });
  }

  // Check if recognition is active
  isRecognitionRunning() {
    return this.isRecognitionActive;
  }

  // Check if speech is active
  isSpeechRunning() {
    return this.isSpeechActive;
  }

  // Get status
  getStatus() {
    return {
      recognition: this.isRecognitionActive,
      speech: this.isSpeechActive,
      hasActiveRecognition: !!this.activeRecognition,
      hasActiveSpeech: !!this.activeSpeech
    };
  }
}

// Create singleton instance
const voiceManager = new VoiceManager();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    voiceManager.stopAll();
  });

  // Expose for debugging
  window.voiceManager = voiceManager;
}

export default voiceManager;