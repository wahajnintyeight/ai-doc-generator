# Doc Gen AI

An AI-powered document generation desktop application built with Wails, React, and Go.

## About

Doc Gen AI is a professional document generation tool that leverages multiple AI providers (OpenAI, OpenRouter, Google Gemini) to create structured markdown documentation. The application features a modern, frameless UI with real-time document preview, file management, and an intelligent agent system.

## Features

- **Multi-Provider AI Support**: Choose between OpenAI, OpenRouter, or Google Gemini
- **Grouped Model Selection**: Organized dropdown with providers as headers and models grouped underneath
- **Real-time Document Preview**: Live markdown rendering with syntax highlighting
- **File Management**: Import, organize, and manage multiple document files
- **Agent Conversation**: Interactive chat interface with context-aware document generation
- **Native File System Integration**: Select output folders and write generated files directly to disk
- **Persistent Configuration**: Settings saved locally across sessions
- **Frameless Window**: Modern, custom window controls with minimize, maximize, and close
- **Theme Support**: Dark, Light, and Dracula themes
- **Resizable Panels**: Flexible workspace layout with collapsible file explorer and agent pane

## Project Structure

```
doc-gen-ai/
├── frontend/                    # React frontend
│   ├── src/
│   │   ├── components/         # UI components
│   │   │   ├── AgentPane.jsx           # AI chat interface
│   │   │   ├── FileExplorer.jsx        # File tree navigation
│   │   │   ├── LandingScreen.jsx       # Initial welcome screen
│   │   │   ├── MarkdownViewer.jsx      # Document preview
│   │   │   ├── MessageActions.jsx      # Copy/regenerate actions
│   │   │   ├── PromptComposer.jsx      # Input composer
│   │   │   ├── PromptComposerControls.jsx  # Model/provider controls
│   │   │   ├── SearchableModelDropdown.jsx # Grouped model selector
│   │   │   ├── SettingsModal.jsx       # Configuration modal
│   │   │   ├── Toolbar.jsx             # Top navigation bar
│   │   │   ├── TypingIndicator.jsx     # Loading animation
│   │   │   └── ResizeHandle.jsx        # Panel resize controls
│   │   ├── lib/                # Core logic
│   │   │   ├── agentClient.js          # AI SDK integration
│   │   │   ├── config.js               # Config management
│   │   │   ├── modelCatalog.js         # Model definitions
│   │   │   ├── openRouterClient.js     # OpenRouter API
│   │   │   └── nativeAppClient.js      # Wails bindings
│   │   ├── App.jsx             # Main application
│   │   ├── main.jsx            # React entry point
│   │   └── index.css           # Global styles
│   ├── dist/                   # Build output
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── app.go                      # Go application logic
├── main.go                     # Go entry point
├── go.mod                      # Go dependencies
├── wails.json                  # Wails configuration
└── docs/                       # Documentation
    ├── ARCHITECTURE_DIAGRAM.md
    ├── DEVELOPER_QUICKSTART.md
    ├── ERROR_HANDLING_UPDATE.md
    ├── IMPLEMENTATION_SUMMARY.md
    ├── OPENROUTER_IMPLEMENTATION_README.md
    └── OPENROUTER_MODELS_GUIDE.md
```

## Key Components

### Frontend Components

- **AgentPane**: Chat interface with message history, typing indicators, and regeneration support
- **SearchableModelDropdown**: Searchable dropdown with grouped providers and models
- **PromptComposerControls**: Unified model selector with provider grouping
- **FileExplorer**: Tree-based file navigation with folder expansion
- **MarkdownViewer**: Real-time markdown preview with syntax highlighting
- **LandingScreen**: Welcome screen with quick start prompts

### Backend (Go)

- **Config Management**: Persistent user settings in `~/.config/doc-gen-ai/config.json`
- **File Operations**: Native folder selection and file writing
- **Window Controls**: Custom frameless window management

### AI Integration

- **Multi-Provider Support**: OpenAI, OpenRouter, Google Gemini
- **Tool Calling**: Structured document generation with `write_document_file` tool
- **Context Awareness**: Active document context injection
- **Error Handling**: Graceful error messages displayed as chat bubbles

## Development

### Prerequisites

- Go 1.21+
- Node.js 18+
- Wails CLI v2

### Live Development

Run in live development mode with hot reload:

```bash
wails dev
```

This starts a Vite development server with fast hot module replacement. A dev server also runs on http://localhost:34115 for browser-based development with Go method access.

### Building

Build a production executable:

```bash
wails build
```

The compiled application will be in the `build/bin` directory.

### Frontend Development

Install dependencies:

```bash
cd frontend
npm install
```

Run frontend only (without Go backend):

```bash
npm run dev
```

## Configuration

User settings are stored in:
- Windows: `%APPDATA%/doc-gen-ai/config.json`
- macOS: `~/Library/Application Support/doc-gen-ai/config.json`
- Linux: `~/.config/doc-gen-ai/config.json`

Configuration includes:
- Theme preference
- Selected AI provider
- API key (encrypted)
- Default model
- Last used timestamp

## Usage

1. **Configure API Key**: Open Settings (gear icon) and add your API key
2. **Select Provider & Model**: Choose from the grouped model dropdown
3. **Import Documents**: Click "Import" to load existing markdown files
4. **Start Conversation**: Type a prompt to generate documentation
5. **Review & Edit**: Generated files appear in the file explorer
6. **Export**: Files are automatically saved to your selected output folder

## Technologies

- **Frontend**: React 18, Vite, TailwindCSS, Framer Motion
- **Backend**: Go, Wails v2
- **AI**: Vercel AI SDK, OpenAI, OpenRouter, Google Gemini
- **UI Libraries**: Lucide Icons, react-resizable-panels, next-themes

## License

This project uses the Wails framework. For more information about Wails project configuration, visit: https://wails.io/docs/reference/project-config
