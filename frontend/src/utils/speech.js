// English-only speech synthesis utility

// Speech settings - English only
let speechSettings = {
  enabled: true,
  currentLanguage: 'en-US',
  currentGender: 'female',
  volume: 1.0,
  rate: 1.0,
  pitch: 1.0
};

let availableVoices = [];

// Initialize voices
const initializeVoices = () => {
  if ('speechSynthesis' in window) {
    const updateVoices = () => {
      availableVoices = window.speechSynthesis.getVoices();
      
      // Log English voices for debugging
      const englishVoices = availableVoices.filter(voice =>
        voice.lang.startsWith('en-US') || voice.lang.startsWith('en-GB')
      );
      
      // Make voice info available globally for debugging
      window.voiceDebug = {
        getAllVoices: () => availableVoices.map(v => ({ name: v.name, lang: v.lang })),
        getEnglishVoices: () => englishVoices.map(v => ({ name: v.name, lang: v.lang })),
        testVoice: (voiceName) => {
          const voice = availableVoices.find(v => v.name.includes(voiceName));
          if (voice) {
            const utterance = new SpeechSynthesisUtterance(`Hello, I am ${voice.name}`);
            utterance.voice = voice;
            window.speechSynthesis.speak(utterance);
          } else {
          }
        },
        testDateExtraction: (text) => {
          const today = new Date();
          const textLower = text.toLowerCase();
          
          if (textLower.includes('tomorrow')) {
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            return tomorrow.toISOString();
          }
          
          return 'No date detected';
        }
      };

      if (availableVoices.length > 0) {
        console.log('- List all 27 voices');
        console.log('- List English voices only');
        console.log('- Test a specific voice');
        console.log('- Test date extraction');
      }
    };
    
    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
  }
};

initializeVoices();

// Get current voice based on settings
const getCurrentVoice = () => {
  if (availableVoices.length === 0) {
    return null;
  }

  // Define preferred voices only (restrictive list)
  const preferredVoices = {
    female: [
      'Microsoft Zira - English (United States)',
      'Microsoft Susan - English (United States)', 
      'Google US English Female',
      'Samantha'
    ],
    male: [
      'Microsoft David - English (United States)',
      'Microsoft Mark - English (United States)',
      'Google US English Male', 
      'Alex'
    ]
  };

  // Find only preferred English voices
  const englishVoices = availableVoices.filter(voice => 
    voice.lang.startsWith('en-US') || voice.lang.startsWith('en-GB')
  );

  if (englishVoices.length > 0) {
    // Get preferred voices for current gender
    const genderPreferences = preferredVoices[speechSettings.currentGender] || preferredVoices.male;
    
    // Find the first available preferred voice
    for (const preferredName of genderPreferences) {
      const voice = englishVoices.find(v => v.name === preferredName);
      if (voice) {
        return voice;
      }
    }
    
    // Fallback to any voice matching gender keywords
    if (speechSettings.currentGender === 'female') {
      const femaleVoice = englishVoices.find(voice => 
        voice.name.toLowerCase().includes('female') ||
        voice.name.toLowerCase().includes('zira') ||
        voice.name.toLowerCase().includes('susan')
      );
      if (femaleVoice) return femaleVoice;
    } else {
      const maleVoice = englishVoices.find(voice => 
        voice.name.toLowerCase().includes('male') ||
        voice.name.toLowerCase().includes('david') ||
        voice.name.toLowerCase().includes('mark')
      );
      if (maleVoice) return maleVoice;
    }
    
    // Last resort: use first English voice
    return englishVoices[0];
  }
  
  // Fallback to any available voice
  const fallbackVoice = availableVoices[0] || null;
  return fallbackVoice;
};

// Get voice settings
const getVoiceSettings = () => {
  return {
    pitch: speechSettings.pitch,
    rate: speechSettings.rate,
    volume: speechSettings.volume
  };
};

// Create utterance with settings
const createUtterance = (text, options = {}) => {
  const voice = getCurrentVoice();
  const settings = getVoiceSettings();
  
  return {
    text: text,
    rate: options.rate || settings.rate,
    pitch: options.pitch || settings.pitch,
    volume: options.volume || settings.volume,
    lang: options.lang || speechSettings.currentLanguage,
    voice: voice
  };
};

// Main speak function
export const speak = (text, options = {}) => {
  return new Promise((resolve) => {
    if (!text || !speechSettings.enabled || !('speechSynthesis' in window)) {
      resolve();
      return;
    }

    try {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utteranceConfig = createUtterance(text, options);
      const utterance = new SpeechSynthesisUtterance(utteranceConfig.text);
      
      // Apply settings
      utterance.rate = utteranceConfig.rate;
      utterance.pitch = utteranceConfig.pitch;
      utterance.volume = utteranceConfig.volume;
      utterance.lang = utteranceConfig.lang;
      
      if (utteranceConfig.voice) {
        utterance.voice = utteranceConfig.voice;
      }

      // Event handlers
      utterance.onend = () => {
        resolve();
      };

      utterance.onerror = (event) => {
        console.error('🔊 Speech error:', event.error);
        resolve();
      };

      // Speak);
      window.speechSynthesis.speak(utterance);
      
    } catch (error) {
      console.error('🔊 Speech synthesis error:', error);
      resolve();
    }
  });
};

// Settings management
const saveSettings = () => {
  try {
    localStorage.setItem('voiceSpeechSettings', JSON.stringify(speechSettings));
  } catch (error) {
  }
};

const loadSettings = () => {
  try {
    const saved = localStorage.getItem('voiceSpeechSettings');
    if (saved) {
      const parsed = JSON.parse(saved);
      speechSettings = { ...speechSettings, ...parsed };
    }
  } catch (error) {
  }
};

// Load settings on initialization
loadSettings();

// Settings setters
export const setLanguage = (languageCode) => {
  speechSettings.currentLanguage = languageCode;
  saveSettings();
};

export const setGender = (gender) => {
  speechSettings.currentGender = gender;
  saveSettings();
};

export const setVolume = (volume) => {
  speechSettings.volume = Math.max(0, Math.min(1, volume));
  saveSettings();
};

export const setRate = (rate) => {
  speechSettings.rate = Math.max(0.1, Math.min(10, rate));
  saveSettings();
};

export const setPitch = (pitch) => {
  speechSettings.pitch = Math.max(0, Math.min(2, pitch));
  saveSettings();
};

export const setSpeechEnabled = (enabled) => {
  speechSettings.enabled = Boolean(enabled);
  saveSettings();
  return speechSettings.enabled;
};

export const toggleSpeech = () => {
  speechSettings.enabled = !speechSettings.enabled;
  saveSettings();
  return speechSettings.enabled;
};

// Getters
export const getCurrentLanguage = () => {
  try {
    return speechSettings.currentLanguage || 'en-US';
  } catch (error) {
    return 'en-US';
  }
};

export const getCurrentGender = () => {
  try {
    return speechSettings.currentGender || 'female';
  } catch (error) {
    return 'female';
  }
};

export const getVolume = () => speechSettings.volume;
export const getRate = () => speechSettings.rate;
export const getPitch = () => speechSettings.pitch;
export const isSpeechEnabled = () => speechSettings.enabled;

// Test current voice
export const testCurrentVoice = () => {
  const voice = getCurrentVoice();
  if (voice) {
    speak(`Hello! I am ${voice.name}. This is how I sound.`);
    return voice;
  } else {
    return null;
  }
};

// Get all available voices (for debugging)
export const getAllVoices = () => {
  return availableVoices.map(voice => ({
    name: voice.name,
    lang: voice.lang,
    gender: voice.name.toLowerCase().includes('female') || voice.name.toLowerCase().includes('zira') || voice.name.toLowerCase().includes('susan') ? 'female' : 'male'
  }));
};

// List English voices specifically
export const getEnglishVoices = () => {
  return availableVoices
    .filter(voice => voice.lang.startsWith('en-US') || voice.lang.startsWith('en-GB'))
    .map(voice => ({
      name: voice.name,
      lang: voice.lang,
      gender: voice.name.toLowerCase().includes('female') || voice.name.toLowerCase().includes('zira') || voice.name.toLowerCase().includes('susan') ? 'female' : 'male'
    }));
};

// Stop speech
export const stopSpeech = () => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};

// Enhanced feedback system
export const feedback = {
  welcome: () => {
    const message = 'Welcome to VoiceTask! Ready to manage your tasks with voice commands.';
    return speak(message);
  },
  
  taskAdded: (title) => {
    const message = `Task added successfully: ${title}`;
    return speak(message);
  },
  
  taskDeleted: (title) => {
    const message = `Task deleted successfully: ${title}`;
    return speak(message);
  },
  
  taskCompleted: (title) => {
    const message = `Task marked as completed: ${title}`;
    return speak(message);
  },
  
  taskNotFound: () => {
    const message = 'Task not found';
    return speak(message);
  },
  
  listening: () => {
    const message = 'Listening for your command';
    return speak(message);
  },
  
  commandNotUnderstood: () => {
    const message = 'Sorry, I did not understand that command';
    return speak(message);
  },

  error: (message) => {
    return speak(`Error: ${message}`);
  },

  success: (message) => {
    return speak(`Success: ${message}`);
  },

  taskInProgress: (title) => {
    const message = `Task marked as in progress: ${title}`;
    return speak(message);
  },

  taskUpdated: (title) => {
    const message = `Task updated successfully: ${title}`;
    return speak(message);
  }
};

export default {
  speak,
  feedback,
  setLanguage,
  setGender,
  setVolume,
  setRate,
  setPitch,
  setSpeechEnabled,
  toggleSpeech,
  getCurrentLanguage,
  getCurrentGender,
  getVolume,
  getRate,
  getPitch,
  isSpeechEnabled,
  testCurrentVoice,
  stopSpeech,
  getAllVoices,
  getEnglishVoices
};