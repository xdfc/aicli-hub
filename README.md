# AI CLI Hub

A unified desktop application for managing multiple AI CLI tools with conversation history and search capabilities.

## Features

- **CLI Management**: Auto-detect and manage multiple AI CLI tools (Claude Code, Qwen Code, Ollama, Custom commands)
- **Task Execution**: Execute prompts with real-time streaming output
- **History Records**: Automatically save and browse all execution records
- **Full-text Search**: Search through prompts and outputs with CLI filtering
- **Configuration**: Manage API keys and CLI-specific settings

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Desktop Framework | Electron | 27 |
| Frontend Framework | React | 18 |
| Build Tool | Vite | 5 |
| Styling | TailwindCSS | 3 |
| Language | TypeScript | 5 |
| Database | Better-sqlite3 | 9 |
| Process Management | Execa | 8 |
| State Management | Zustand | 4 |
| UI Components | Radix UI | Latest |

## Project Structure

```
src/
├── main/                          # Electron main process
│   ├── index.ts                   # Main process entry
│   ├── preload.ts                 # Preload script (IPC security)
│   ├── drivers/                   # CLI drivers (adapter pattern)
│   │   ├── base-driver.ts         # Base driver class
│   │   ├── claude-driver.ts       # Claude Code driver
│   │   ├── qwen-driver.ts         # Qwen Code driver
│   │   ├── ollama-driver.ts       # Ollama driver
│   │   └── custom-driver.ts       # Custom CLI driver
│   ├── services/                  # Business logic services
│   │   ├── task-executor.ts       # Task execution engine
│   │   ├── history-manager.ts     # History management
│   │   └── cli-manager.ts         # CLI detection and config
│   ├── ipc/                       # IPC event handlers
│   │   └── handlers.ts            # IPC handler functions
│   └── database/                  # Database
│       └── schema.ts              # Database table definitions
│
└── renderer/                      # React frontend
    ├── index.tsx                  # React entry
    ├── App.tsx                    # Root component
    ├── index.html                 # HTML entry
    ├── components/ui/             # UI components (Radix-based)
    ├── pages/                     # Page components
    │   ├── MainPage.tsx           # Main execution page
    │   ├── HistoryPage.tsx        # History page
    │   ├── SearchPage.tsx         # Search page
    │   └── SettingsPage.tsx       # Settings page
    ├── hooks/                     # Custom hooks
    ├── store/                     # State management (Zustand)
    └── styles/                    # Global styles
```

## Getting Started

### Prerequisites

- Node.js v18+
- npm or pnpm
- Git

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd ai-cli-hub

# Install dependencies
npm install
```

### Development

```bash
# Start development server
npm run dev
```

This will start both Vite dev server and Electron app with hot reload.

### Build

```bash
# Build the project
npm run build

# Build and package for distribution
npm run dist
```

## Supported CLI Tools

### Built-in Drivers

1. **Claude Code** - Anthropic's Claude CLI
   - Command: `claude -p <prompt>`
   - Requires: `ANTHROPIC_API_KEY`

2. **Qwen Code** - Alibaba's Qwen CLI
   - Command: `qwen chat <prompt>`
   - Requires: `QWEN_API_KEY`

3. **Ollama** - Local LLM runner
   - Command: `ollama run <model> <prompt>`
   - Configurable model (default: llama2)

### Custom CLI

You can add custom CLI tools through the driver system by extending the `BaseCLIDriver` class.

## IPC API

### Task Execution
- `execute-task(cliName, prompt)` - Execute a CLI task
- `cancel-task()` - Cancel the running task

### History Management
- `get-history(limit, offset)` - Get history records
- `search-history(query, cliName)` - Search history
- `delete-history(id)` - Delete a record
- `clear-history()` - Clear all history
- `get-history-stats()` - Get statistics

### CLI Management
- `get-cli-list()` - Get all detected CLIs
- `update-cli-config(cliName, config)` - Update CLI configuration

## Database Schema

```sql
CREATE TABLE history (
  id TEXT PRIMARY KEY,
  cliName TEXT NOT NULL,
  prompt TEXT NOT NULL,
  output TEXT,
  error TEXT,
  executionTime INTEGER,
  timestamp INTEGER NOT NULL,
  tags TEXT
);

CREATE TABLE cli_config (
  cliName TEXT PRIMARY KEY,
  config TEXT NOT NULL
);
```

## License

MIT
