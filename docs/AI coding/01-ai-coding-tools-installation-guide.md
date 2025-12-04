# AI Coding Tools Installation and Usage Guide

This guide provides comprehensive installation and usage instructions for all AI coding tools mentioned in the AI coding workflows. Follow this guide to set up your development environment for AI-assisted coding.

---

## Table of Contents

1. [Core AI Coding Tools](#core-ai-coding-tools)
2. [Spec-Driven Development Tools](#spec-driven-development-tools)
3. [MCP Servers](#mcp-servers)
4. [Development Workflow Tools](#development-workflow-tools)
5. [Code Quality Tools](#code-quality-tools)
6. [Quick Start Checklist](#quick-start-checklist)

---

## Core AI Coding Tools

### 1. Claude Code

**Description:** Claude Code is an AI-powered code editor that provides intelligent code generation, editing, and assistance. It supports multi-agent architecture, MCP servers, and advanced context management.

#### Installation

1. **Download and Install:**
   - Visit [claude.ai](https://claude.ai) or download from the official Anthropic website
   - Follow the installation wizard for your operating system
   - Claude Code is available as a desktop application

2. **Account Setup:**
   - Create an Anthropic account or sign in
   - Choose your subscription tier (Pro recommended for faster responses)
   - Verify your email address

3. **Initial Configuration:**
   - Open Claude Code
   - Configure your workspace settings
   - Set up your preferred coding environment

#### Usage

- **Start a new coding session:** Open Claude Code and create a new project
- **Use slash commands:** Type `/` to see available commands
- **Multi-agent workflow:** Use `/plugins` to install and manage sub-agents
- **MCP integration:** Configure MCP servers in settings (see MCP Servers section)

#### Key Features

- Multi-agent architecture with specialized sub-agents
- Native OpenSpec integration via slash commands
- MCP server support for extended functionality
- Checkpointing system (press `escape` twice to revert)
- Context window optimization with Skills (MCP 2.0)

---

### 2. Claude Projects

**Description:** Specialized Claude environments optimized for planning and PRD generation. Uses Claude 3.7 Thinking model for systematic requirement gathering.

#### Installation

1. **Access Claude Projects:**
   - Log in to [claude.ai](https://claude.ai)
   - Navigate to "Projects" section
   - Create a new project or select an existing one

2. **Configure Project:**
   - Select **Claude 3.7 Thinking** as the model
   - Set up custom instructions (see configuration below)
   - Install required MCP servers (see MCP Servers section)

#### Configuration

**Custom Instructions Template:**

```
You are an expert product manager and technical architect. Your role is to:
1. Ask systematic clarifying questions using a Question Framework (start broad, filter to specifics)
2. Research technical architecture using available MCP servers
3. Generate comprehensive PRDs with:
   - Technical Architecture
   - Functional Requirements
   - Implementation Plan (phased approach)
   - Data Model

Always use the installed MCP servers (Brave Search, Sequential Thinking, Tavil, Fetch) for technical research.
```

#### Usage

1. **Idea Dump:** Verbally describe your product idea using Mac Whisper or direct input
2. **Systematic Questions:** Claude will ask clarifying questions to refine the vision
3. **Technical Research:** Explicitly nudge Claude to use MCP servers for architecture research
4. **PRD Generation:** Claude generates comprehensive PRD with all required sections
5. **Save PRD:** Use File System MCP to save the PRD as documentation

---

## Spec-Driven Development Tools

### 3. OpenSpec

**Description:** OpenSpec is a toolkit for spec-driven development that aligns humans and AI coding assistants on what to build before writing code. It replaces "vibe coding" with systematic workflows.

#### Installation

1. **Install OpenSpec CLI globally:**
   ```bash
   npm install -g @fission-ai/openspec@latest
   ```

2. **Verify Installation:**
   ```bash
   openspec --version
   ```

3. **Initialize OpenSpec in your project:**
   ```bash
   cd /path/to/your/project
   openspec init
   ```

   This creates:
   - `openspec/` directory structure
   - `openspec/AGENTS.md` - Instructions for AI assistants
   - `openspec/project.md` - Project conventions
   - Native slash commands for Claude Code

4. **Restart your coding assistant** (if needed) to load the new slash commands

#### Configuration

After initialization, OpenSpec creates the following structure:

```
openspec/
├── project.md              # Project conventions
├── specs/                  # Current truth - what IS built
│   └── [capability]/
│       └── spec.md         # Requirements and scenarios
└── changes/                # Proposals - what SHOULD change
    └── [change-name]/
        ├── proposal.md     # Why, what, impact
        ├── tasks.md        # Implementation checklist
        └── specs/          # Delta changes
```

#### Usage

**Claude Code Slash Commands:**

1. **Create a Change Proposal:**
   ```
   /openspec:proposal Add profile search filters
   ```
   Or use the full prompt:
   ```
   Create an OpenSpec change proposal for adding profile search filters by role and team
   ```

2. **Refine Specs and Tasks:**
   - Interact with Claude to refine requirements
   - Example: "Can you add acceptance criteria for the role and team filters?"

3. **Implement the Change:**
   ```
   /openspec:apply add-profile-filters
   ```
   - Claude implements the change by working through `tasks.md`
   - Tasks are marked complete as work progresses

4. **Archive Completed Change:**
   ```
   /openspec:archive add-profile-filters
   ```
   - Merges approved updates into source-of-truth specifications

#### CLI Commands

```bash
# List active changes
openspec list

# List all specifications
openspec list --specs

# Show change or spec details
openspec show [item]

# Validate changes or specs
openspec validate [item]

# Archive completed change
openspec archive <change-id> --yes
```

#### Best Practices

- Always create proposals for new features or breaking changes
- Review proposals before implementation
- Use spec deltas to document changes systematically
- Archive changes after deployment to keep specs current

---

## MCP Servers

**Description:** Model Context Protocol (MCP) servers extend AI assistants with additional capabilities like web search, file system access, and specialized tools.

### 4. Installing MCP Servers

#### For Claude Code / Cursor

1. **Open Settings:**
   - Cursor: `Settings` → `Cursor Settings` → `MCP`
   - Claude Code: Settings → MCP Configuration

2. **Add MCP Server:**
   - Click "Add new global MCP server" or "Add MCP server"
   - Configure using JSON format (see examples below)

#### Recommended MCP Servers

##### Sequential Thinking MCP

**Purpose:** Advanced reasoning and problem-solving capabilities

**Configuration:**
```json
{
  "mcpServers": {
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    }
  }
}
```

##### Brave Search MCP

**Purpose:** Web search capabilities for technical research

**Configuration:**
```json
{
  "mcpServers": {
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "YOUR_BRAVE_API_KEY"
      }
    }
  }
}
```

**Getting API Key:**
1. Visit [Brave Search API](https://brave.com/search/api/)
2. Sign up for an account
3. Generate an API key
4. Add to environment variables

##### File System MCP

**Purpose:** File system access for reading/writing files

**Configuration:**
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/directory"]
    }
  }
}
```

##### Tavil MCP

**Purpose:** Travel and location-based services

**Configuration:**
```json
{
  "mcpServers": {
    "tavil": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-tavil"],
      "env": {
        "TAVIL_API_KEY": "YOUR_TAVIL_API_KEY"
      }
    }
  }
}
```

##### Fetch MCP

**Purpose:** HTTP request capabilities

**Configuration:**
```json
{
  "mcpServers": {
    "fetch": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch"]
    }
  }
}
```

#### MCP Server Management

**Toggle MCP Servers at Runtime:**
- Use `/mcp` slash command in Claude Code
- Disable servers after use to reduce context window size
- Enable only when needed for specific tasks

**Best Practices:**
- Use Agent Skills (MCP 2.0) instead of verbose MCP servers when possible
- Skills use progressive disclosure, reducing token usage
- Toggle off MCP servers immediately after completing their purpose

---

## Development Workflow Tools

### 5. Sub-Agents / Plugins

**Description:** Specialized AI agents that perform focused tasks in isolated context windows, preventing context pollution in the main session.

#### Installation

1. **Access Plugins Marketplace:**
   - In Claude Code, type `/plugins`
   - Browse available plugins
   - Install required agents

#### Recommended Sub-Agents

##### UX Researcher Agent

**Purpose:** Analyzes PRDs to generate comprehensive UX research

**Installation:**
```
/plugins
# Search for "UX Researcher" and install
```

**Usage:**
- Triggered via initialization prompt
- Analyzes PRD for user experience and navigation
- Returns UX research document

##### Sprint Prioritizer Agent

**Purpose:** Breaks implementation into small, sequential sprints

**Installation:**
```
/plugins
# Search for "Sprint Prioritizer" and install
```

**Usage:**
- Chained after UX Researcher
- Converts UX output into actionable sprints
- Creates implementation roadmap

##### Codebase Analyst Sub-Agent

**Purpose:** Performs extensive codebase research and analysis

**Installation:**
```
/plugins
# Search for "Codebase Analyst" and install
```

**Usage:**
- Invoke for deep codebase analysis
- Operates in isolated context window
- Returns summarized findings

##### Test Runner Agent

**Purpose:** Creates and executes comprehensive test suites

**Installation:**
```
/plugins
# Search for "Test Runner" and install
```

**Usage:**
- Invoke during validation phase
- Creates unit tests in isolated context
- Reports test results and required fixes

##### Validator Sub-Agent

**Purpose:** Validates code quality and adherence to PRD

**Installation:**
```
/plugins
# Search for "Validator" and install
```

**Usage:**
- Invoke after implementation
- Validates code against requirements
- Reports issues and improvements

#### Best Practices

- **DO use sub-agents for:** Research, validation, testing, analysis
- **DON'T use sub-agents for:** Actual code implementation (memory not shared)
- **Chain agents:** Output of one agent can inform the next
- **Isolate context:** Sub-agents operate in separate 200k token windows

---

### 6. Context7

**Description:** Provides up-to-date, version-specific documentation and code examples directly from official sources, ensuring AI-generated code is accurate.

#### Installation

1. **Get API Key:**
   - Visit [context7.com](https://context7.com)
   - Sign up for an account
   - Generate an API key

2. **Configure MCP Server:**

   **For Cursor:**
   - Navigate to `Settings` → `Cursor Settings` → `MCP` → `Add new global MCP server`
   - Add configuration:
   ```json
   {
     "mcpServers": {
       "context7": {
         "url": "https://mcp.context7.com/mcp",
         "headers": {
           "CONTEXT7_API_KEY": "YOUR_API_KEY"
         }
       }
     }
   }
   ```

   **For Claude Code:**
   - Add similar configuration in MCP settings
   - Replace `YOUR_API_KEY` with your actual API key

3. **Set Up Auto-Invocation (Optional):**
   - Add rule in Cursor Settings → Rules:
   ```
   Always use context7 when I need code generation, setup or configuration steps, or library/API documentation.
   ```

#### Usage

- **Automatic:** Context7 is invoked automatically when relevant
- **Manual:** Add "use context7" to prompts for library documentation
- **Supported Libraries:** Over 6,000 popular libraries and frameworks

---

## Code Quality Tools

### 7. Husky (Git Hooks)

**Description:** Husky makes Git hooks easy, enabling automatic execution of scripts (like tests) before commits.

#### Installation

1. **Install Husky as dev dependency:**
   ```bash
   npm install --save-dev husky
   # or
   yarn add -D husky
   ```

2. **Initialize Husky:**
   ```bash
   npx husky init
   ```

   This creates:
   - `.husky/` directory
   - `.husky/pre-commit` file with default `npm test`
   - Updates `package.json` with `"prepare": "husky"` script

3. **Verify Installation:**
   ```bash
   git config core.hooksPath
   # Should output: .husky/_
   ```

#### Configuration

**Create Pre-Commit Hook for Tests:**

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname "$0")/_/husky.sh"

yarn test
```

**For Yarn:**
```bash
echo "yarn test" > .husky/pre-commit
chmod +x .husky/pre-commit
```

**For npm:**
```bash
echo "npm test" > .husky/pre-commit
chmod +x .husky/pre-commit
```

**For pnpm:**
```bash
echo "pnpm test" > .husky/pre-commit
chmod +x .husky/pre-commit
```

#### Advanced Configuration

**Multiple Commands in Pre-Commit:**
```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname "$0")/_/husky.sh"

yarn lint
yarn format
yarn test
```

**Commit Message Validation:**
```bash
# .husky/commit-msg
#!/usr/bin/env sh
. "$(dirname "$0")/_/husky.sh"

npx commitlint --edit $1
```

**Pre-Push Hook:**
```bash
# .husky/pre-push
#!/usr/bin/env sh
. "$(dirname "$0")/_/husky.sh"

yarn test:coverage
```

#### Testing Hooks

**Test without committing:**
```bash
# Temporarily add exit 1 to prevent commit
echo "exit 1" >> .husky/pre-commit

# Try to commit
git commit -m "test"

# Remove exit 1 after testing
# Edit .husky/pre-commit and remove the exit 1 line
```

#### Skip Hooks (When Needed)

```bash
# Skip pre-commit hook
git commit --no-verify -m "emergency fix"

# Skip all hooks
git commit --no-verify -m "message"
```

**⚠️ Warning:** Only skip hooks when absolutely necessary (emergency fixes). Regular commits should always run hooks.

---

### 8. Code Rabbit

**Description:** AI-powered code review platform that analyzes codebases and suggests improvements.

#### Installation

1. **Sign Up:**
   - Visit [coderabbit.ai](https://coderabbit.ai) or similar platform
   - Create an account
   - Connect your GitHub/GitLab repository

2. **Install GitHub App (if applicable):**
   - Navigate to GitHub Settings → Integrations
   - Install Code Rabbit GitHub App
   - Grant necessary permissions

3. **Configure Webhook (if needed):**
   - Set up webhook to trigger reviews on PR creation
   - Configure review settings and preferences

#### Usage

**Automatic Reviews:**
- Code Rabbit automatically reviews Pull Requests
- Provides suggestions and improvement recommendations
- Highlights potential issues and best practices

**Manual Review:**
- Upload code snippets for review
- Get AI-powered feedback on code quality
- Receive suggestions for improvements

**Integration with Workflow:**
- Feed Code Rabbit suggestions back to Claude Code
- Use feedback to refine implementation
- Iterate until code meets quality standards

---

## Additional Tools

### 9. ChatGPT (PRD Generation)

**Purpose:** Used for PRD scaffold generation and review

#### Setup

1. **Access ChatGPT:**
   - Visit [chatgpt.com](https://chatgpt.com)
   - Sign in or create account
   - GPT-4 access recommended for best results

2. **Use PRD Templates:**
   - Copy template from `docs/AI coding/AI Coding Workflow/PRD Generator Starter Pack/`
   - Fill in project details
   - Generate PRD scaffold prompt
   - Copy output to Claude for full PRD generation

---

### 10. Gemini (PRD Review)

**Purpose:** External perspective for PRD review and refinement

#### Setup

1. **Access Google Gemini:**
   - Visit [gemini.google.com](https://gemini.google.com)
   - Sign in with Google account
   - Access Gemini Pro or higher tier

2. **Usage:**
   - Paste PRD into Gemini
   - Use review prompt template
   - Get external feedback
   - Apply improvements to PRD in Claude

---

## Quick Start Checklist

### Initial Setup (One-Time)

- [ ] Install Claude Code desktop application
- [ ] Create Anthropic account and configure Claude Projects
- [ ] Install OpenSpec CLI globally: `npm install -g @fission-ai/openspec@latest`
- [ ] Initialize OpenSpec in project: `openspec init`
- [ ] Install Husky: `npm install --save-dev husky && npx husky init`
- [ ] Configure pre-commit hook to run tests
- [ ] Set up Context7 MCP server with API key
- [ ] Install recommended MCP servers (Sequential Thinking, Brave Search, File System, etc.)
- [ ] Install sub-agents via `/plugins` in Claude Code
- [ ] Configure Code Rabbit (if using)

### Per-Project Setup

- [ ] Create Claude Project for PRD generation
- [ ] Configure custom instructions in Claude Project
- [ ] Set up MCP servers in Claude Project
- [ ] Initialize OpenSpec: `openspec init`
- [ ] Create baseline documents (CLAUDE.md, progress.md, decisions.md)
- [ ] Install project-specific sub-agents

### Daily Workflow

- [ ] Use Claude Project for PRD/planning phase
- [ ] Review PRD with Gemini or separate Claude session
- [ ] Switch to Claude Code for implementation
- [ ] Use `/openspec:proposal` for new features
- [ ] Use `/openspec:apply` to implement changes
- [ ] Run tests before commit (via Husky hook)
- [ ] Use `/openspec:archive` after completion
- [ ] Toggle MCP servers on/off as needed with `/mcp`

---

## Troubleshooting

### OpenSpec Issues

**Problem:** Slash commands not appearing
- **Solution:** Restart Claude Code/Cursor (commands load at startup)

**Problem:** `openspec init` fails
- **Solution:** Ensure you're in project root directory with Git initialized

### Husky Issues

**Problem:** Hooks not running
- **Solution:** Verify `git config core.hooksPath` points to `.husky/_`
- **Solution:** Check that `.husky/pre-commit` is executable: `chmod +x .husky/pre-commit`

**Problem:** Tests fail but commit succeeds
- **Solution:** Check hook file has proper shebang: `#!/usr/bin/env sh`
- **Solution:** Verify hook calls test command correctly

### MCP Server Issues

**Problem:** MCP server not connecting
- **Solution:** Check JSON configuration syntax
- **Solution:** Verify API keys are set correctly
- **Solution:** Restart Claude Code/Cursor after configuration changes

**Problem:** Context window too large
- **Solution:** Disable unused MCP servers with `/mcp` command
- **Solution:** Use Agent Skills instead of verbose MCP servers when possible

### Sub-Agent Issues

**Problem:** Sub-agent not found
- **Solution:** Use `/plugins` to browse and install from marketplace
- **Solution:** Check plugin name spelling

**Problem:** Sub-agent conflicts with main session
- **Solution:** Only use sub-agents for research/validation, not code implementation
- **Solution:** Keep implementation in primary context window

---

## Resources and Documentation

- **OpenSpec:** [GitHub Repository](https://github.com/fission-ai/openspec)
- **Husky:** [Documentation](https://typicode.github.io/husky/)
- **MCP Protocol:** [Official Documentation](https://modelcontextprotocol.io)
- **Claude Code:** [Anthropic Documentation](https://docs.anthropic.com)
- **Context7:** [Documentation](https://context7.com/docs)

---

## Support and Community

- **OpenSpec Issues:** [GitHub Issues](https://github.com/fission-ai/openspec/issues)
- **Husky Support:** [GitHub Discussions](https://github.com/typicode/husky/discussions)
- **MCP Community:** [MCP Discord/Slack](https://modelcontextprotocol.io/community)

---

*Last Updated: Based on AI Coding Workflow documentation analysis*

