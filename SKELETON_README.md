# AI Coding Skeleton

This skeleton contains all the AI coding tools, configurations, and best practices extracted from the Back Objects Microservice project. Use this as a starting point for new projects to ensure consistent AI-assisted development workflows.

## 📋 Contents

### AI Assistant Configurations

- **`.claude/`**: Claude AI assistant commands and configurations
  - OpenSpec integration commands (proposal, apply, archive)
  
- **`.cursor/`**: Cursor IDE rules and commands
  - **Rules** (`.cursor/rules/`):
    - `best-practices.mdc`: Comprehensive coding standards and architecture patterns
    - `testing-standards.mdc`: Testing requirements and best practices
    - `documentation-standards.mdc`: Documentation structure and guidelines
  - **Commands** (`.cursor/commands/`):
    - OpenSpec integration commands for Cursor IDE
  
- **`.gemini/`**: Google Gemini AI assistant commands
  - OpenSpec integration commands in TOML format

### Documentation Files

- **`AGENTS.md`**: OpenSpec instructions for AI assistants
- **`CLAUDE.md`**: Claude-specific instructions
- **`README.md`**: Project README template (from Back Objects MS - customize for your project)
- **`docs/AI coding/`**: AI coding tools installation and usage guide
- **`openspec/`**: OpenSpec configuration and project structure

## 🚀 Quick Start

1. **Copy this skeleton to your new project**:
   ```bash
   cp -r /Volumes/Backup/dev/avanto/ai-coding-skeleton/.claude /path/to/your/project/
   cp -r /Volumes/Backup/dev/avanto/ai-coding-skeleton/.cursor /path/to/your/project/
   cp -r /Volumes/Backup/dev/avanto/ai-coding-skeleton/.gemini /path/to/your/project/
   cp -r /Volumes/Backup/dev/avanto/ai-coding-skeleton/docs /path/to/your/project/
   cp -r /Volumes/Backup/dev/avanto/ai-coding-skeleton/openspec /path/to/your/project/
   cp /Volumes/Backup/dev/avanto/ai-coding-skeleton/AGENTS.md /path/to/your/project/
   cp /Volumes/Backup/dev/avanto/ai-coding-skeleton/CLAUDE.md /path/to/your/project/
   ```

2. **Customize the README.md** for your specific project

3. **Initialize OpenSpec** in your project:
   ```bash
   openspec init
   ```

4. **Review and customize the cursor rules** in `.cursor/rules/` to match your project's specific needs

5. **Install AI coding tools** following the guide in `docs/AI coding/01-ai-coding-tools-installation-guide.md`

## 📚 Key Features

### Cursor Rules

The `.cursor/rules/` directory contains comprehensive coding standards:

- **Best Practices**: Architecture patterns, code organization, TypeScript standards, security, and performance guidelines
- **Testing Standards**: Requirements for unit tests, pre-commit hooks, test coverage
- **Documentation Standards**: Structure patterns, location guidelines, best practices

### OpenSpec Integration

All AI assistants (Claude, Cursor, Gemini) are configured with OpenSpec commands for:
- Creating change proposals (`/openspec-proposal`)
- Applying changes (`/openspec-apply`)
- Archiving changes (`/openspec-archive`)

### AI Coding Tools Guide

The `docs/AI coding/` directory contains:
- Installation instructions for all AI coding tools
- Usage guidelines and workflows
- Configuration examples

## 🔧 Customization

### For NestJS Projects

The skeleton is optimized for NestJS projects but can be adapted:

1. Review `.cursor/rules/best-practices.mdc` and adjust module organization patterns
2. Update architecture descriptions in the README
3. Modify OpenSpec project structure if needed

### For Other Frameworks

1. Update `.cursor/rules/best-practices.mdc` with framework-specific patterns
2. Adjust testing standards in `.cursor/rules/testing-standards.mdc`
3. Update documentation standards as needed

## 📖 Documentation Structure

The skeleton follows the documentation pattern:
- Numbered prefixes for ordered documentation (`01-`, `02-`, etc.)
- Business documentation in `docs/` directory
- Code documentation via Swagger/OpenAPI

## ✅ Checklist for New Projects

- [ ] Copy all skeleton files to your project
- [ ] Customize README.md with project-specific information
- [ ] Review and adjust cursor rules for your framework/patterns
- [ ] Initialize OpenSpec: `openspec init`
- [ ] Install AI coding tools (see `docs/AI coding/`)
- [ ] Set up Husky for pre-commit hooks
- [ ] Configure your IDE to use the cursor rules
- [ ] Test OpenSpec commands in your AI assistant
- [ ] Update project-specific documentation

## 📝 Notes

- This skeleton was extracted from the Back Objects Microservice project
- All files are ready to use but should be customized for your specific project
- The cursor rules are comprehensive but may need framework-specific adjustments
- OpenSpec commands work with Claude, Cursor, and Gemini AI assistants

## 🔗 Related Resources

- [OpenSpec Documentation](https://github.com/openspec/openspec)
- [Cursor IDE](https://cursor.sh/)
- [NestJS Documentation](https://docs.nestjs.com/)
- See `docs/AI coding/01-ai-coding-tools-installation-guide.md` for more resources

