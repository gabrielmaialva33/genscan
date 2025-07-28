# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ CRITICAL RULE: ALWAYS USE ADONISJS COMMANDS

**NEVER manually create files in this project.** Always use AdonisJS Ace commands:

- `node ace make:controller` for controllers
- `node ace make:model` for models
- `node ace make:migration` for migrations
- `node ace make:service` for services
- See "AdonisJS Commands Reference" section below for complete list

This ensures proper file structure, naming conventions, and boilerplate code.

## Common Development Commands

### Development

- `pnpm run dev` - Start development server with hot reload
- `pnpm run build` - Build application for production
- `pnpm start` - Start production server

### Testing

- `pnpm test` - Run unit tests only (2s timeout)
- `pnpm run test:e2e` - Run all tests (functional and e2e, 30s timeout)
- `pnpm run test:ui` - Run UI tests with Vitest
- `pnpm run test:ui:watch` - Run UI tests in watch mode

### Code Quality

- `pnpm run lint` - Run ESLint
- `pnpm run lint:fix` - Fix linting issues automatically
- `pnpm run format` - Format code with Prettier
- `pnpm run typecheck` - Run TypeScript type checking

### Database

- `node ace migration:run` - Run pending migrations
- `node ace db:seed` - Run database seeders
- `node ace migration:rollback` - Rollback last migration
- `node ace migration:fresh` - Drop all tables and re-migrate
- `node ace migration:refresh` - Rollback and re-run all migrations
- `node ace migration:status` - Check migration status

### Docker

- `pnpm run docker` - Run migrations, seeders, and start server

### Queue Management (Bull Queue)

- Check queue status and jobs via Redis integration
- Family tree discovery jobs are processed asynchronously

## Project Overview: Genscan - Family Tree Builder

Genscan is a modern genealogy platform that integrates with Brazilian genealogy APIs (Findexbuscas) to automatically discover and build family trees. Built with AdonisJS v6 backend and React 19 frontend using Inertia.js.

### Key Technologies

- **Backend**: AdonisJS v6 (Node.js framework)
- **Frontend**: React 19 with Inertia.js for SPA-like experience
- **Database**: PostgreSQL (production), SQLite (testing)
- **Cache**: Redis (API responses, permissions, queue)
- **Queue**: Bull Queue for async processing
- **Styling**: TailwindCSS v4
- **Visualization**: D3.js with family-chart library
- **Authentication**: Multiple guards - JWT (default), API tokens, session, basic auth
- **Validation**: VineJS
- **Testing**: Japa framework with MSW for mocking
- **External APIs**: Findexbuscas (Brazilian genealogy data)

### Unique Features

#### Genealogy Domain

1. **Family Tree Discovery**
   - Import entire family trees using Brazilian CPF
   - Import family members by mother's name
   - Automatic relationship detection and inference
   - Smart duplicate detection and merging
   - Multi-level depth control (up to 5 levels)
   - Batch processing with queue system

2. **Data Enrichment Services** (`app/services/genealogy/`)
   - `cpf_discovery_service.ts` - Find people by CPF
   - `children_by_mother_discovery_service.ts` - Find children by mother's name
   - `children_by_father_discovery_service.ts` - Find children by father's name
   - `relationship_inference_service.ts` - Infer missing relationships
   - `sibling_validation_service.ts` - Validate sibling relationships
   - `name_matching_service.ts` - Fuzzy name matching
   - `person_data_aggregator_service.ts` - Merge data from multiple sources
   - `date_validation_service.ts` - Validate and parse Brazilian date formats

3. **External API Integration** (`app/services/integrations/`)
   - Findexbuscas API client with rate limiting
   - Response caching to minimize API calls
   - Automatic retry with exponential backoff
   - Data mapping and normalization

4. **Visualization**
   - Interactive family tree charts using D3.js
   - Multiple layout options
   - Zoom, pan, and navigation features
   - Export capabilities

### Project Structure

#### Backend Architecture (`app/`)

- **controllers/**: HTTP request handlers organized by domain
  - `family_tree/` - Family tree management and chart data
  - `person/` - Person CRUD and import operations
  - `inertia/` - Inertia.js page controllers
- **models/**: Lucid ORM models with UUID primary keys
  - `person.ts` - Core person entity
  - `person_detail.ts` - Additional person information
  - `relationship.ts` - Family relationships
  - `family_tree.ts` - Family tree containers
  - `family_tree_member.ts` - Tree membership
  - `data_import.ts` - Import tracking
- **services/**: Business logic layer
  - `genealogy/` - Core genealogy algorithms
  - `family_trees/` - Tree management
  - `people/` - Person operations
  - `integrations/` - External API clients
- **jobs/**: Background jobs
  - `family_tree_discovery_job.ts` - Async family import
- **repositories/**: Data access layer
- **middleware/**: HTTP middleware for auth, ACL, ownership
- **validators/**: Request validation schemas
- **serializers/**: Data transformation for API responses

#### Frontend (`inertia/`)

- **pages/**: React page components
- **components/**: Reusable UI components
  - `charts/` - Data visualization components
  - `effects/` - Visual effects (DNA particles, magnetic buttons)
  - `landing/` - Landing page sections
- **hooks/**: Custom React hooks
- **services/**: API client services

#### Configuration (`config/`)

- **findex.ts**: Findexbuscas API configuration
- **auth.ts**: Multi-guard authentication
- **database.ts**: PostgreSQL/SQLite configuration
- **queue.ts**: Bull Queue configuration
- **redis.ts**: Redis caching configuration

### Authentication & Authorization

- **Multiple Auth Guards**: JWT (default), API tokens, session, basic auth
- **RBAC System**: Roles and permissions with inheritance
- **Permission Caching**: Redis-based caching for performance
- **Ownership Validation**: Resource-level access control

### Import Aliases

- `#controllers/*` → `./app/controllers/*.js`
- `#models/*` → `./app/models/*.js`
- `#services/*` → `./app/services/*.js`
- `#repositories/*` → `./app/repositories/*.js`
- `#jobs/*` → `./app/jobs/*.js`
- `#serializers/*` → `./app/serializers/*.js`
- And all standard aliases...

### Database Schema

- **UUID Primary Keys**: All tables use UUIDs
- **Soft Deletes**: User model supports soft deletion
- **Audit Logging**: Track all data changes
- **Relationships**: Complex many-to-many for family relationships

### Testing Strategy

- **Unit tests**: Service and utility testing
- **Functional tests**: API endpoint testing
- **UI tests**: React component testing with Vitest
- **Mocking**: MSW for external API mocking

## AdonisJS Commands Reference (MUST USE)

### File Generation Commands

#### Controllers

```bash
node ace make:controller User
# Creates: app/controllers/users_controller.ts

node ace make:controller Post --resource
# Creates controller with all RESTful methods
```

#### Models

```bash
node ace make:model User
# Creates: app/models/user.ts

node ace make:model Post -m
# Creates model with migration
```

#### Migrations

```bash
node ace make:migration users
# Creates: database/migrations/[timestamp]_create_users_table.ts

node ace make:migration add_email_to_users --alter
# Creates migration for altering existing table
```

#### Services

```bash
node ace make:service users/CreateUser
# Creates: app/services/users/create_user.ts

node ace make:service genealogy/DiscoverFamily
# Creates: app/services/genealogy/discover_family.ts
```

#### Jobs (for Queue)

```bash
node ace make:job ProcessImport
# Creates: app/jobs/process_import.ts

node ace make:job genealogy/DiscoverRelatives
# Creates: app/jobs/genealogy/discover_relatives.ts
```

#### Middleware

```bash
node ace make:middleware Auth
# Creates: app/middleware/auth_middleware.ts

node ace make:middleware RateLimit --stack=router
# Creates middleware for router stack
```

#### Validators

```bash
node ace make:validator CreateUser
# Creates: app/validators/create_user.ts

node ace make:validator imports/ImportFullTree
# Creates: app/validators/imports/import_full_tree.ts
```

#### Tests

```bash
node ace make:test UserController --suite=functional
# Creates: tests/functional/user_controller.spec.ts

node ace make:test genealogy/NameMatching --suite=unit
# Creates: tests/unit/genealogy/name_matching.spec.ts
```

#### Other Resources

```bash
node ace make:factory User
# Creates: database/factories/user_factory.ts

node ace make:seeder User
# Creates: database/seeders/user_seeder.ts

node ace make:event UserRegistered
# Creates: app/events/user_registered.ts

node ace make:listener SendWelcomeEmail
# Creates: app/listeners/send_welcome_email.ts

node ace make:mail VerifyEmail
# Creates: app/mails/verify_email.ts

node ace make:exception ValidationException
# Creates: app/exceptions/validation_exception.ts

node ace make:provider AppProvider
# Creates: providers/app_provider.ts

node ace make:command SyncPermissions
# Creates: commands/sync_permissions.ts

node ace make:preload redis
# Creates: start/redis.ts

node ace make:view users/index
# Creates: resources/views/users/index.edge
```

### Migration Commands

```bash
# Run pending migrations
node ace migration:run

# Rollback last batch
node ace migration:rollback

# Rollback all migrations
node ace migration:reset

# Drop all tables and re-migrate
node ace migration:fresh

# Rollback and re-run all migrations
node ace migration:refresh

# Check migration status
node ace migration:status

# Rollback to specific batch
node ace migration:rollback --batch=2
```

### Database Seeding

```bash
# Run all seeders
node ace db:seed

# Run specific seeder
node ace db:seed --files=database/seeders/user_seeder.ts

# Run main seeder (includes all)
node ace db:seed --files=database/seeders/main/index_seeder.ts
```

### Queue Management

```bash
# Process queue jobs (handled by Bull Queue)
# Jobs are automatically processed when queue worker is running
# Check config/queue.ts for configuration
```

### Custom Commands

```bash
# Sync permissions (custom command)
node ace sync:permissions
```

### Package Management

```bash
# Install and configure a package
node ace add @adonisjs/lucid

# Configure already installed package
node ace configure @adonisjs/lucid
```

## REPL (Read-Eval-Print Loop) Usage

### Starting REPL

```bash
# Start interactive REPL session
node ace repl
```

### Common REPL Operations

#### Import Models and Services

```javascript
// Import models
const User = await importDefault('#models/user')
const Person = await importDefault('#models/person')
const FamilyTree = await importDefault('#models/family_tree')

// Import services
const FindexClient = await importDefault('#services/integrations/findex_client')
const PersonDiscoveryService = await importDefault(
  '#services/genealogy/person_discovery_by_cpf_service'
)
```

#### Working with Genealogy Data

```javascript
// Find person by CPF
const person = await Person.query().where('cpf', '12345678901').first()

// Get family tree members
const tree = await FamilyTree.find('uuid-here')
const members = await tree.related('members').query()

// Test external API
const findexClient = new FindexClient()
const data = await findexClient.searchByCPF('12345678901')
```

#### Load Application Services

```javascript
// Load specific services
await loadApp() // Access app service
await loadRouter() // Access router service
await loadConfig() // Access config service
await loadHash() // Access hash service
await loadHelpers() // Access helpers module
```

### REPL Best Practices

1. **Use for debugging genealogy algorithms**
   - Test name matching logic
   - Verify relationship inference
   - Debug duplicate detection

2. **Common Use Cases**
   - Testing external API responses
   - Debugging family tree algorithms
   - Inspecting relationship data
   - Running data migrations
   - Testing import processes

### REPL Tips

- Use `importDefault()` for cleaner imports
- Test Findexbuscas API responses before implementing
- Verify relationship calculations interactively
- Use `.ls` to list available methods
- Press Tab for auto-completion
- Use `.exit` or Ctrl+C twice to quit

## Important Instructions for AI Assistants

1. **ALWAYS USE COMMANDS** - Never create files manually
   - Use `node ace make:controller` not manual file creation
   - Use `node ace make:migration` not manual database files
   - Use `node ace make:service` not manual service files
   - Use `node ace make:job` for queue jobs

2. **Follow the Architecture**
   - Controller → Service → Repository → Model flow
   - Use dependency injection with `@inject()` decorator
   - Keep business logic in services, not controllers
   - Use jobs for long-running operations

3. **Use Import Aliases**
   - Always use `#controllers/*`, `#services/*`, etc.
   - Never use relative imports like `../../`

4. **Test Before Committing**
   - Run `pnpm lint` - Must pass
   - Run `pnpm typecheck` - Must pass
   - Run `pnpm test` - Must pass
   - Test external API integrations with mocks

5. **Genealogy-Specific Guidelines**
   - Use queue jobs for family tree imports
   - Cache external API responses in Redis
   - Implement duplicate detection for person imports
   - Validate Brazilian CPF format (11 digits)
   - Handle missing data gracefully
   - Use transactions for complex operations

6. **Example Genealogy Workflow**

   ```bash
   # User asks: "Add feature to import family by mother's name"

   # Execute in order:
   node ace make:validator imports/ImportByMother
   node ace make:service people/ImportByMotherService
   node ace make:job ImportByMotherJob
   node ace make:controller person/ImportByMother
   node ace make:test imports/ImportByMother --suite=functional
   ```

7. **External API Guidelines**
   - Always use FindexCacheService for API calls
   - Implement retry logic for failed requests
   - Log all API interactions
   - Handle rate limiting gracefully
   - Map external data to internal models properly

## Environment Variables

Key environment variables for genealogy features:

- `FINDEX_CPF_API_KEY` - Findexbuscas CPF search API key
- `FINDEX_PARENT_API_KEY` - Findexbuscas parent search API key
- `REDIS_HOST` - Redis host for caching and queues
- `REDIS_PORT` - Redis port
- `REDIS_PASSWORD` - Redis password
