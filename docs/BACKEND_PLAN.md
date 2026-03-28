# Backend Plan

## Initial plan

The backend should remain a single Python FastAPI application with modular internals.

Primary responsibilities:

- auth and session handling
- weekly metrics aggregation
- USDA-backed food search and food normalization
- meal calculation and saved meal management
- recipe import, favorites, and scaling support
- orchestration of multimodal ingestion for labels and recipe assets

### Initial architecture

- `backend/app/routes`: thin HTTP route handlers
- `backend/app/services`: business logic
- `backend/app/models`: request and response schemas
- `backend/app/config.py`: environment-driven configuration

### Initial implementation steps

1. Create health, nutrition, meal, recipe, and vision routes.
2. Add schema validation for requests and responses.
3. Integrate USDA search.
4. Add session-aware endpoints.
5. Add ingestion endpoints for image and document processing.

## Review of initial plan

The initial plan is solid for a personal project, but it needs refinement:

- it does not define persistence boundaries versus pure computation logic
- it does not specify how long-running AI tasks should be handled
- it leaves auth/session design too vague
- it does not explicitly separate integrations from services

## Improved plan

### Module boundaries

- `routes/`: HTTP translation only
- `services/`: domain operations and orchestrated workflows
- `integrations/`: USDA, auth provider, OCR, multimodal model, file storage
- `repositories/`: database persistence operations
- `models/`: request, response, and domain schemas

### API domains

- health
- auth
- nutrition
- meals
- recipes
- ingestion
- admin or maintenance utilities later if needed

### Async strategy

Start synchronous for fast operations:

- weekly metrics reads
- meal calculations
- basic recipe saves
- food search

Introduce background execution later for:

- PDF parsing
- image OCR
- multimodal extraction
- large ingestion workflows

### Auth/session strategy

- support session-backed authenticated users
- isolate token or session verification in one auth integration module
- attach user context in middleware or request dependencies
- keep business logic functions user-aware but framework-light

### Testing strategy

- unit tests for nutrition calculations and ingestion parsers
- repository tests for persistence logic
- API tests for route behavior and validation
- integration tests for USDA and AI clients via mocks

## Implementation steps

### Step 1: backend structure hardening

- add integration and repository modules
- define service interfaces for persistence and external APIs
- standardize error handling

### Step 2: auth and user context

- implement sign-in/session verification path
- add current-user dependency
- protect user-owned resources

### Step 3: nutrition APIs

- finish USDA search adapter
- add food log create/read/update flows
- compute weekly metrics from persisted logs

### Step 4: meals and recipes

- persist saved meals
- persist favorite recipes and assets
- support scaling and derived nutrition calculations

### Step 5: ingestion

- add upload metadata handling
- process text, PDF, and image inputs
- create reviewable extraction results before final save

### Step 6: operational quality

- structured logging
- request tracing
- environment validation
- migration and seed workflows

## Definition of done for major backend milestones

### Nutrition API done

- USDA search works with configured credentials
- meal totals are deterministic and test-covered
- weekly metrics can be derived from persisted user data

### Recipes done

- recipe create/read/update flows persist correctly
- scaling logic is shared and test-covered
- assets are linked to recipes without orphaned records

### Ingestion done

- upload requests are tracked as jobs
- extraction results can be reviewed before save
- failures are recoverable and observable in logs
