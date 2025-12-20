# VoiceTask - Voice-Controlled Task Manager

A modern, voice-controlled task management application built with React, GraphQL, and MongoDB. Manage your tasks using natural language voice commands with AI-powered parsing.

## 🎙️ Features

- **Voice Control**: Create, update, and manage tasks using natural language voice commands
- **AI-Powered Parsing**: Enhanced voice command understanding with Ollama integration
- **Real-time Updates**: GraphQL subscriptions for instant UI updates
- **User Authentication**: Secure login/registration with JWT tokens
- **Anonymous Mode**: Use without registration with session-based storage
- **Voice Memos**: Attach voice recordings to tasks
- **Task Statistics**: Visual analytics and productivity insights
- **Dark/Light Theme**: Beautiful glassmorphism UI with theme switching
- **Responsive Design**: Works on desktop and mobile devices

## 🚀 Voice Commands

### Task Creation
- "Add task buy milk"
- "Create task call doctor tomorrow"
- "New high priority task finish report"
- "Add urgent task meeting at 3pm"

### Task Management
- "Mark task 1 complete"
- "Delete second task"
- "Set priority of task 2 to high"
- "Mark all tasks as done"

### Information
- "Read all tasks"
- "Show pending tasks"
- "What tasks are due today?"

## 🛠️ Tech Stack

### Frontend
- **React 18+** - Modern React with Hooks
- **Apollo Client** - GraphQL client with caching
- **Material-UI v5** - Component library with theming
- **Vite** - Fast build tool and dev server
- **Web Speech API** - Browser-native speech recognition

### Backend
- **Node.js** - Runtime environment
- **Apollo Server** - GraphQL API server
- **MongoDB** - NoSQL database with Mongoose ODM
- **JWT** - Authentication tokens
- **GridFS** - File storage for voice memos

### AI Integration
- **Ollama** - Local LLM for enhanced voice parsing
- **Fallback Parser** - Rule-based parsing when AI unavailable

## 📦 Installation

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm start
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Optional: AI Enhancement
Install Ollama for enhanced voice parsing:
```bash
# Install Ollama from https://ollama.com
ollama serve
ollama pull llama3.2:3b
```

## 🌐 Environment Variables

### Backend (.env)
```env
MONGODB_URI=mongodb://localhost:27017/voicetask
JWT_SECRET=your-secret-key
PORT=5014
FRONTEND_URL=http://localhost:8083
```

### Frontend (.env)
```env
VITE_GRAPHQL_ENDPOINT=http://localhost:5014/graphql
VITE_LLM_ENDPOINT=http://localhost:11434/api/generate
VITE_LLM_MODEL=llama3.2:3b
```

## 🎯 Usage

1. **Start the application**: Both backend and frontend servers
2. **Open browser**: Navigate to http://localhost:8083
3. **Grant permissions**: Allow microphone access when prompted
4. **Start speaking**: Click the voice button and give commands
5. **Manage tasks**: Use voice or traditional UI interactions

## 📱 Screenshots

[Add screenshots of your application here]

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Web Speech API for browser-native voice recognition
- Ollama for local LLM integration
- Material-UI for beautiful components
- Apollo GraphQL for efficient data management

## 🐛 Known Issues

- Voice recognition requires HTTPS in production
- Some browsers may have limited voice synthesis options
- Ollama integration requires local installation

## 🔮 Future Features

- [ ] Multi-language support
- [ ] Voice command customization
- [ ] Team collaboration features
- [ ] Calendar integration
- [ ] Mobile app (React Native)
- [ ] Offline mode with sync

---

Built with ❤️ by Angela-0001