# Ozimek municipality dashboards

The catalogue covers Ozimek and its 13 villages. Each locality has its own YAML configuration for weather, air quality, IMGW warnings and water gauges, and municipal waste schedules. [Official catalogue](https://strzelcu.github.io/gmina-ozimek/)

The former Szczedrzyk address `/szczedrzyk/` serves a static redirect to the locality page. [Szczedrzyk dashboard](https://strzelcu.github.io/gmina-ozimek/szczedrzyk/)

## Local development

Run these commands with Node.js 24 from the repository root.

```sh
npm ci
npm ci --prefix test
npm run check --prefix test
npm run build --prefix test
npm run preview --prefix test
```

The preview uses `/gmina-ozimek/` by default. `DASHBOARD_BASE_PATH` overrides the URL prefix for the build, preview and browser tests. The [dashboard guide](test/README.md) covers data sources and Playwright, and the [ozimek-dashboard skill](test/skills/ozimek-dashboard/SKILL.md) explains how to prepare another locality.

## Publishing

The Pages workflow in `strzelcu/strzelcu.github.io` builds dashboards from a pinned commit of this repository. Update that commit in a pull request to release a new version. The build validates the configurations and runs the unit and browser tests before publishing. [Production workflow](https://github.com/strzelcu/strzelcu.github.io/blob/main/.github/workflows/pages.yml)

This repository's workflow runs the dashboard checks and publishes `redirect/index.html` at the former address. To roll back the initial migration, revert the redirect commit first. Confirm that the previous site is available before reverting the catalogue publication in `strzelcu/strzelcu.github.io`.
