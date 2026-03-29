# Dashboard Follow-Ups: 2026-03-29

This note captures the current dashboard interaction model and the recommended improvements that were intentionally deferred.

## Current dashboard state

The dashboard now uses a simpler, analysis-first layout:

- compact app header instead of the older marketing-style hero
- interactive summary cards in the header for:
  - net calories
  - protein
  - carbs
  - fat
  - fiber
- one main overview chart driven by the currently selected header metric
- timeframe tabs for `1D`, `1W`, `1M`, and `3M`
- a smaller secondary metrics area focused on weight, adherence, and missing inputs
- seeded preview/demo data still appears when backend or session state is unavailable

## Interaction model now in place

- `Net Calories` is the default selected dashboard metric.
- Tapping `Protein`, `Carbs`, `Fat`, or `Fiber` changes the chart to that metric.
- For `1W`, `1M`, and `3M`, the chart currently treats the visible series as daily totals compared against a flat daily goal guide.
- The chart now includes a legend for the active data series and its goal line.
- The previous duplicate macro summary section below the chart was removed to keep the page simpler.

## Important current limitations

### 1D chart modeling

The `1D` view is not yet the final intended experience.

Recommended future behavior:

- use an event-based intraday chart
- plot meals/snacks as timestamped calorie or macro increases
- plot exercise as timestamped net-calorie reductions or allowance adjustments
- use a step or event-line presentation instead of reusing the multi-day daily-total model

### Fiber tracking

Fiber remains visible in the header because it is an important nutrition summary metric, but it is still a placeholder in the current dashboard.

Recommended future behavior:

- add fiber to the saved backend nutrition totals
- expose fiber in the frontend API types and calculations
- drive the fiber header card and chart from real persisted data instead of a placeholder goal

### Metric-specific chart data

The current macro chart modes derive visible trend points from the currently available calorie totals and macro totals rather than from dedicated persisted per-day macro series.

Recommended future behavior:

- persist or derive true per-day protein, carb, fat, and fiber totals for each timeframe
- drive the chart from that actual metric history rather than proportional approximation

## Recommended next dashboard improvements

1. Implement the true intraday `1D` event chart for meals and exercise.
2. Add real fiber tracking to backend totals, frontend types, and dashboard calculations.
3. Replace the current approximate macro trend derivation with real metric-specific daily history.
4. Add an optional `Daily` vs `Cumulative` toggle only if users later need both views for longer timeframes.
5. Tighten the selected-card styling and chart legend styling for stronger visual emphasis.
6. Revisit whether `3M` should stay daily or move to weekly aggregation once real data density increases.

## Files affected by the current dashboard model

- [frontend/App.tsx](/home/brianminer/workspace/svelte/frontend/App.tsx)
- [frontend/src/types.ts](/home/brianminer/workspace/svelte/frontend/src/types.ts)
- [frontend/src/components/dashboard/DashboardHeaderMetrics.tsx](/home/brianminer/workspace/svelte/frontend/src/components/dashboard/DashboardHeaderMetrics.tsx)
- [frontend/src/components/dashboard/DashboardTimeRangeTabs.tsx](/home/brianminer/workspace/svelte/frontend/src/components/dashboard/DashboardTimeRangeTabs.tsx)
- [frontend/src/components/dashboard/DashboardHeroChart.tsx](/home/brianminer/workspace/svelte/frontend/src/components/dashboard/DashboardHeroChart.tsx)
- [frontend/src/components/dashboard/DashboardSecondaryMetrics.tsx](/home/brianminer/workspace/svelte/frontend/src/components/dashboard/DashboardSecondaryMetrics.tsx)
