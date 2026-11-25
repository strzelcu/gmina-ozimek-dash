# Ozimek municipality dashboards

`strzelcu/gmina-ozimek-dash` is the source for the catalogue of Ozimek and its 13 villages. Each locality has its own dashboard with weather, air quality, IMGW warnings and water gauges, and municipal waste collection dates. [Official catalogue](https://strzelcu.github.io/gmina-ozimek/) · [Szczedrzyk dashboard](https://strzelcu.github.io/gmina-ozimek/szczedrzyk/)

The dashboards run without visitor analytics or activity tracking. The browser stores recent forecasts, readings and warnings locally to keep data available when a source is temporarily unavailable. [Report an issue](https://github.com/strzelcu/gmina-ozimek-dash/issues)

## Repository layout

| Path | Purpose |
| --- | --- |
| `dashboard/localities/` | One YAML configuration per locality |
| `dashboard/src/` | Shared catalogue, dashboard and footer components |
| `dashboard/tests/` | Locality checks and Playwright tests |
| `dashboard/skills/ozimek-dashboard/` | Instructions, schema and example for adding a locality |
| `redirect/index.html` | Redirect to the published Szczedrzyk dashboard |
| `src/` | Source of the original standalone Szczedrzyk page |

## Local development

Run these commands with Node.js 24 from the repository root.

```sh
npm ci
npm ci --prefix dashboard
npm run check --prefix dashboard
npm run build --prefix dashboard
npm run preview --prefix dashboard
```

The preview uses `/gmina-ozimek/` by default. Set `DASHBOARD_BASE_PATH` to use a different prefix for the build, preview and browser tests. Run `npm run data --prefix dashboard` to fetch optional starting data for local development. [Dashboard guide and test commands](dashboard/README.md) · [Instructions for adding a locality](dashboard/skills/ozimek-dashboard/SKILL.md)

## Publishing

The Pages workflow in `strzelcu/strzelcu.github.io` builds a pinned commit from `strzelcu/gmina-ozimek-dash` and publishes the catalogue at `/gmina-ozimek/`. To release a new version, update the pinned commit in a pull request to the hosting repository. YAML validation, unit tests and Playwright must pass before publication. Revert the hosting commit to roll back a release. [Production workflow](https://github.com/strzelcu/strzelcu.github.io/blob/main/.github/workflows/pages.yml)

The hosting workflow serves `/szczedrzyk/` as a redirect to the published Szczedrzyk dashboard. This repository runs the same checks and publishes that redirect at its own Pages address, `/gmina-ozimek-dash/`. The canonical catalogue and locality URLs use `/gmina-ozimek/`. [Source repository workflow](.github/workflows/pages.yml)
