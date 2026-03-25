# Memory City Workspace

This folder contains the initial application scaffold for the Memory City project.

Current scope:

- monorepo structure for the app and domain packages
- first web editor shell
- demo semantic graph, variants, and evaluation profile
- 2D plan viewport
- 3D scene viewport with analytic and wood material modes
- technical blueprint and MVP backlog

## Commands

```bash
cd /Users/orsoneveraert/Documents/qgis_cli/memory-city
pnpm install
pnpm dev
pnpm build
```

## Deploy to GitHub Pages

This workspace is configured to build correctly for GitHub Pages.

Behavior:

- if the repository is named `<user>.github.io`, Vite builds with `/`
- otherwise, Vite derives `base` from the repository name and builds for `/<repo>/`
- you can override the base path with `PUBLIC_BASE_PATH` or `VITE_BASE_PATH`

Useful local test:

```bash
GITHUB_REPOSITORY=your-user/memory-city pnpm build
```

For a classic GitHub Pages deployment:

1. push the source repository
2. build with `GITHUB_REPOSITORY=<user>/<repo> pnpm build`
3. publish `apps/web/dist` to the `gh-pages` branch
4. set Pages source to `Deploy from a branch` using `gh-pages` and `/ (root)`

## Workspace structure

```text
apps/web
packages/core-model
packages/core-generators
packages/core-evaluation
docs
```

## Notes

- This is an application foundation, not yet a full generator workbench.
- The current 3D material mode includes a first-pass wood texture preview to keep the digital prototype aligned with the intended physical object language.
