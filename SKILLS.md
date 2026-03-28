# SKILLS.md

The project should continue to evolve with the following engineering priorities:

## Product skills

- Nutrition-domain modeling for foods, meals, recipes, and weekly metric rollups.
- Mobile-first UI implementation that still feels polished on desktop.
- Server-backed integrations for USDA search, auth/session management, and multimodal ingestion.
- Design choices should preserve a clean future path to Capacitor-based iPhone packaging.

## Delivery skills

- Keep domain logic in isolated utilities with tests.
- Keep API integrations in Python service modules and thin route handlers.
- Prefer typed interfaces and schema validation at boundaries.
- Favor incremental delivery over large rewrites.

## Quality bar

- New features should ship with tests where behavior is deterministic.
- UI changes should remain responsive at phone widths.
- External API dependencies should be isolated behind adapter modules.
- Setup and workflow changes should be reflected in project documentation immediately.
