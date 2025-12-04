# Back Objects Microservice

A NestJS microservice for managing dynamic objects, object definitions, properties, values, and pages. Built with TypeScript, TypeORM, PostgreSQL, and follows domain-driven design principles with spec-driven development using OpenSpec.

## 📋 Table of Contents

- [Description](#description)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Quality](#code-quality)
- [Documentation](#documentation)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Contributing](#contributing)

## Description

The Back Objects Microservice provides a flexible system for managing dynamic objects with configurable definitions, properties, and values. It supports:

- **Dynamic Objects**: Flexible object instances with configurable properties
- **Object Definitions**: Templates that define object structure
- **Object Properties**: Configurable attributes for objects
- **Object Values**: Actual data values for object properties
- **Pages**: Page configurations and layouts
- **Multi-tenancy**: Tenant-based data isolation
- **Audit Trail**: Created/updated by tracking

## Tech Stack

- **Framework**: [NestJS](https://nestjs.com/) v9.0.0
- **Language**: TypeScript 4.7.4
- **Database**: PostgreSQL with TypeORM 0.3.20
- **Logging**: Pino (nestjs-pino)
- **Validation**: class-validator, class-transformer
- **API Documentation**: Swagger/OpenAPI
- **Testing**: Jest
- **Code Quality**: ESLint, Prettier, Husky
- **Spec-Driven Development**: OpenSpec

## Architecture

### Module Organization

The project follows a modular architecture pattern:

- **Context Modules** (`src/context/`): Feature modules containing controllers and module definitions
- **Shared Services** (`src/shared/context/`): Business logic services organized by domain
- **Infrastructure** (`src/shared/infrastructure/`): Cross-cutting concerns (logging, persistence, messaging)
- **Domain Layer** (`src/shared/context/*/domain/`): DTOs, stubs, mappers, and domain logic

### Key Features

- **Dependency Injection**: Constructor-based DI with named data sources
- **Structured Logging**: Pino logger with correlation IDs
- **Request Tracking**: Correlation ID middleware for request tracing
- **Transaction Support**: TypeORM transactions for batch operations
- **Validation**: Comprehensive DTO validation with class-validator
- **API Documentation**: Auto-generated Swagger documentation

## Getting Started

### Prerequisites

- Node.js (v16+)
- Yarn package manager
- PostgreSQL database
- Git

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd back-objects-ms
   ```

2. **Install dependencies:**
   ```bash
   yarn install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=your_username
   DB_PASSWORD=your_password
   DB_DATABASE=your_database
   DB_SCHEMA=public
   ```

4. **Initialize OpenSpec (if not already done):**
   ```bash
   npm install -g @fission-ai/openspec@latest
   openspec init
   ```

5. **Set up Husky git hooks:**
   ```bash
   npx husky init
   # Edit .husky/pre-commit to run tests
   ```

### Running the Application

```bash
# Development mode (with watch)
yarn dev

# Development mode
yarn start

# Production mode
yarn prod

# Debug mode
yarn debug
```

The application will be available at `http://localhost:3000`

### API Documentation

Once the application is running, access the Swagger documentation at:
- **Swagger UI**: `http://localhost:3000/docs`

## Development Workflow

### OpenSpec Integration

This project uses **OpenSpec** for spec-driven development. Before implementing features:

1. **Create a change proposal:**
   ```
   /openspec:proposal Add new feature description
   ```
   Or use Claude Code with the proposal command

2. **Review and refine:**
   - Review the generated `proposal.md` and `tasks.md`
   - Refine requirements with the AI assistant
   - Update spec deltas as needed

3. **Implement:**
   ```
   /openspec:apply change-name
   ```
   - Work through tasks in `tasks.md` sequentially
   - Mark tasks complete as you progress

4. **Archive after completion:**
   ```
   /openspec:archive change-name
   ```

**Important:** Always read `openspec/AGENTS.md` before starting work. See [OpenSpec Documentation](openspec/AGENTS.md) for details.

### Code Standards

This project follows strict coding standards defined in Cursor Rules:

- **Best Practices**: See `.cursor/rules/best-practices.mdc`
- **Testing Standards**: See `.cursor/rules/testing-standards.mdc`
- **Documentation Standards**: See `.cursor/rules/documentation-standards.mdc`

**Key Requirements:**
- ✅ All new features must have at least 5 unit tests
- ✅ All bug fixes must have regression tests
- ✅ Tests run automatically before commits (Husky)
- ✅ Business documentation goes in `docs/` directory
- ✅ Always create new cursor rules to extend existing ones

## Testing

### Running Tests

```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test:watch

# Run tests with coverage
yarn test:cov

# Run e2e tests
yarn test:e2e

# Debug tests
yarn test:debug
```

### Test Requirements

- **New Features**: Minimum 5 unit tests covering:
  1. Happy path / success scenario
  2. Error handling (at least 2 different error cases)
  3. Edge cases / boundary conditions
  4. Validation scenarios
  5. Integration with dependencies

- **Bug Fixes**: Minimum 2 tests:
  1. Test that reproduces the original bug (fails before fix, passes after)
  2. Test for related edge cases

- **Pre-Commit**: Tests run automatically via Husky git hooks before commits

See [Testing Standards](.cursor/rules/testing-standards.mdc) for detailed guidelines.

## Code Quality

### Linting and Formatting

```bash
# Run linter
yarn lint

# Format code
yarn format

# Run both (lint + format)
yarn pretty:lint
```

### Pre-Commit Hooks

Husky automatically runs:
- Unit tests (`yarn test`)
- Linting (via lint-staged)

**To skip hooks (emergency only):**
```bash
git commit --no-verify -m "emergency fix"
```

### Code Review Checklist

Before submitting code, ensure:
- [ ] All tests pass (`yarn test`)
- [ ] Linting passes (`yarn lint`)
- [ ] Code is formatted (`yarn format`)
- [ ] Logging is implemented for important operations
- [ ] Error handling is comprehensive
- [ ] DTOs have validation decorators
- [ ] Swagger documentation is complete
- [ ] No `any` types (unless absolutely necessary)
- [ ] Related entities are validated
- [ ] Transactions are used for batch operations
- [ ] Relations are explicitly loaded when needed

## Documentation

### Business Documentation

All business-related documentation and guidelines are stored in the `docs/` directory:

- **AI Coding Tools**: `docs/AI coding/01-ai-coding-tools-installation-guide.md`
- **Project Documentation**: Follow the pattern in `docs/` directory
- **Documentation Standards**: See `.cursor/rules/documentation-standards.mdc`

### Code Documentation

- **API Documentation**: Auto-generated Swagger docs at `/docs`
- **Code Comments**: JSDoc for complex methods
- **Architecture**: Documented in cursor rules

### Documentation Structure

Follow the established pattern:
- Numbered prefixes: `01-{topic}.md`, `02-{topic}.md`, etc.
- Project-specific subdirectories: `docs/{project-name}/`
- Markdown format with Mermaid diagrams when appropriate

## API Documentation

### Swagger UI

Access interactive API documentation at:
- **URL**: `http://localhost:3000/docs`
- **Features**: 
  - Interactive API testing
  - Request/response schemas
  - Authentication (if configured)

### Postman Collections

Postman collections are available in `postman-collections/`:
- `Objects Microservice.postman_collection.json`
- `pages.postman_collection.json`

## Project Structure

```
back-objects-ms/
├── .cursor/
│   ├── commands/          # Custom slash commands
│   └── rules/             # Cursor rules (best practices, testing, documentation)
├── docs/                  # Business documentation
│   └── AI coding/        # AI coding tools and workflows
├── openspec/              # Spec-driven development
│   ├── AGENTS.md         # OpenSpec instructions
│   ├── project.md        # Project conventions
│   ├── specs/            # Current specifications
│   └── changes/          # Proposed changes
├── src/
│   ├── context/          # Feature modules (controllers + modules)
│   │   ├── dynamic-objects/
│   │   ├── object-definitions/
│   │   ├── object-properties/
│   │   ├── object-values/
│   │   └── pages/
│   ├── shared/
│   │   ├── context/      # Business logic services
│   │   │   └── {feature}/
│   │   │       ├── {feature}.service.ts
│   │   │       └── domain/
│   │   │           ├── dtos/
│   │   │           └── stubs/
│   │   ├── infrastructure/  # Cross-cutting concerns
│   │   │   ├── logger/
│   │   │   ├── persistance/
│   │   │   └── sqs/
│   │   └── middleware/
│   └── main.ts
├── test/                 # E2E tests
├── postman-collections/   # Postman API collections
└── package.json
```

## Database Migrations

### Generate Migration

```bash
yarn migration:generate -- -n MigrationName
```

### Create Empty Migration

```bash
yarn migration:create -n MigrationName
```

### Run Migrations

Migrations are handled by TypeORM. Configure in your database setup.

## Contributing

### Before You Start

1. **Read the guidelines:**
   - `.cursor/rules/best-practices.mdc` - Coding standards
   - `.cursor/rules/testing-standards.mdc` - Testing requirements
   - `.cursor/rules/documentation-standards.mdc` - Documentation patterns
   - `openspec/AGENTS.md` - Spec-driven development workflow

2. **Check OpenSpec:**
   ```bash
   openspec list              # See active changes
   openspec list --specs      # See existing capabilities
   ```

3. **Create proposals for:**
   - New features or capabilities
   - Breaking changes (API, schema)
   - Architecture changes
   - Performance optimizations that change behavior

### Development Process

1. **Create OpenSpec proposal** (if needed)
2. **Create feature branch** from main
3. **Implement following cursor rules**
4. **Write tests** (minimum 5 for new features)
5. **Update documentation** if needed
6. **Run quality checks:**
   ```bash
   yarn test
   yarn lint
   yarn format
   ```
7. **Commit** (tests run automatically via Husky)
8. **Create Pull Request**

### Extending Cursor Rules

When introducing new patterns or conventions:
- **ALWAYS** create new `.mdc` files in `.cursor/rules/`
- **NEVER** modify existing cursor rules directly
- Use descriptive filenames: `{topic}-{purpose}.mdc`
- Reference existing rules to avoid duplication

## Environment Variables

Required environment variables (configure in `.env`):

```env
# Server
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_DATABASE=your_database
DB_SCHEMA=public
DB_SYNCHRONIZE=false
DB_LOGGING=false

# AWS SQS (if using)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
```

## Scripts

| Script | Description |
|--------|-------------|
| `yarn dev` | Start in watch mode |
| `yarn start` | Start in development mode |
| `yarn prod` | Start in production mode |
| `yarn build` | Build for production |
| `yarn test` | Run unit tests |
| `yarn test:watch` | Run tests in watch mode |
| `yarn test:cov` | Run tests with coverage |
| `yarn test:e2e` | Run e2e tests |
| `yarn lint` | Run linter |
| `yarn format` | Format code |
| `yarn pretty:lint` | Format and lint |
| `yarn migration:generate` | Generate TypeORM migration |
| `yarn migration:create` | Create empty migration |

## Support and Resources

### Documentation

- **Cursor Rules**: `.cursor/rules/` - Best practices and standards
- **OpenSpec Guide**: `openspec/AGENTS.md` - Spec-driven development
- **AI Coding Tools**: `docs/AI coding/01-ai-coding-tools-installation-guide.md`
- **NestJS Docs**: [https://docs.nestjs.com](https://docs.nestjs.com)

### Getting Help

- Check existing code in the codebase for patterns
- Review cursor rules for coding standards
- Consult OpenSpec documentation for workflow
- Review similar features before creating new ones

## License

UNLICENSED - Private project

---

**Built with ❤️ using NestJS, TypeScript, and OpenSpec**
