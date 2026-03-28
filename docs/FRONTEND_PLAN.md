# Frontend Plan

## Initial plan

The frontend should be a mobile-first TypeScript application with these responsibilities:

- user sign-in and session-aware routing
- dashboard for weekly calorie and macro progress
- food search and logging
- custom meal builder with ingredient weights and serving calculations
- recipe and favorite management
- upload flows for text, PDF, and image-based recipe input
- a clean interface that runs through Expo on browser and iPhone

### Initial architecture

- Expo / React Native in `frontend/`
- screen-based navigation inside the Expo app shell
- typed API client
- local UI state for simple views
- dedicated domain state for session, dashboard, meal builder, and recipe flows
- component-driven design with reusable cards, forms, and layout primitives

### Initial implementation steps

1. Establish app shell, theme tokens, responsive layout, and navigation.
2. Build dashboard screen against mocked and then live weekly metrics API.
3. Build meal builder screen with editable ingredient rows and server-calculated totals.
4. Build recipe favorites screen with scaling controls.
5. Add file and image upload UX for ingestion.
6. Add auth screens and protected routes.

## Review of initial plan

The initial plan is viable but has weaknesses:

- it does not define how API loading, caching, and optimistic updates should work
- it assumes route structure without naming concrete screen boundaries
- it risks mixing domain logic into components if state modules are not defined early
- it does not call out offline-tolerant or mobile-first interaction concerns clearly enough

## Improved plan

### Screen architecture

- dashboard screen
- daily log screen
- meals screen
- recipes / favorites screen
- profile / goals screen

### State architecture

- app state: session, app readiness, API health
- dashboard state: weekly metrics, current streaks, summary cards
- meal state: ingredients, serving count, calculated totals, saved templates
- recipe state: favorites, imports, scaling state, ingestion review status

### Data access architecture

- keep all HTTP calls in a small API layer
- normalize response shapes at the API boundary
- keep components presentation-focused
- centralize async state transitions for loading, success, empty, and error states

### Mobile-first UI rules

- design for narrow screens first
- use bottom-safe spacing and large tap targets
- avoid hover-dependent interaction
- make file upload and camera capture flows explicit and touch-friendly
- ensure dashboard cards stack cleanly on phone widths

### Testing strategy

- unit tests for frontend utilities and domain formatters
- component tests for critical form and calculator interactions
- smoke tests for major screens once routing expands

## Implementation steps

### Step 1: core shell

- add Expo app shell and section navigation
- create shared layout, typography, spacing, and color tokens
- add API client and environment config
- add app-level error and loading states

### Step 2: dashboard

- fetch weekly metrics from backend
- render calorie goal, calories consumed, macro progress, and adherence summary
- add loading and backend-unavailable states

### Step 3: meal builder

- editable ingredient table
- serving count adjustments
- server-side total calculation requests
- save meal template flow

### Step 4: recipes and favorites

- direct recipe entry
- scaling controls and favorite toggles backed by persistence
- favorites list and detail views
- placeholders for imported assets

### Step 5: ingestion UX

- upload text, PDF, and images
- show extraction status and review screen
- allow correction before save

### Step 6: auth and profile

- sign-in/sign-out
- goal settings
- account preferences
- protected views where appropriate

## Definition of done for major frontend milestones

### Dashboard done

- renders real backend metrics
- handles loading, empty, and error states cleanly
- works at phone widths without layout breakage
- supports timeframe switching for `1D`, `1W`, `1M`, and `3M`
- uses a trend chart, not placeholder-only visualization

### Meal builder done

- user can edit ingredients and servings
- totals round consistently with backend values
- saved meal flow is reachable and test-covered
- scaling defaults to `1.0x` and exposes common increments in a mobile-friendly control

### Recipe module done

- user can create, scale, and favorite recipes
- imported recipe assets are visible in the UI
- review and correction flow exists for extracted content

## Current implementation status

- dashboard shell exists and now includes timeframe switching, trend visualization, and macro progress
- daily log screen is wired to persisted backend food-log flows
- food search and detail selection are present
- recipe and favorites UI is only partially complete and still needs first-class persistence backing
- ingestion UI remains largely planned rather than complete
