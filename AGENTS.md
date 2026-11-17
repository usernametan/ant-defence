# Agent Collaboration Rules — The Art of Alchemy

Two AI agents work in parallel on this repository (`OpenCode` = main agent, `Antigravity` = side jobs). Follow these rules strictly:

## Ownership Boundaries
- **OpenCode owns:**
  - `src/game/` (`scenes/`, `entities/`, `combat/`, `maps/`)
  - `src/alchemy/`
  - `src/dialogue/runner.ts`
  - `src/main.tsx`
  - `src/App.tsx`
- **Antigravity owns:**
  - `src/data/`
  - `src/dialogue/scripts/`
  - `src/ui/`

## Shared & Protected Files
- **`src/shared/` is READ-ONLY.** If a change to `src/shared/types.ts` or `src/shared/events.ts` is needed, stop and ask the user.
- **Never edit `package.json` or config files** (`package-lock.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `.github/workflows/ci.yml`). Ask the user first.
- **Communicate across tracks only through `src/shared/types.ts` and `src/shared/events.ts`.**

## Workflow & Code Standards
- Run `npm run typecheck` before every commit.
- Commit small and often on your own branch (`track-opencode` or `track-antigravity`). **Never commit directly to `main` after this task.**
- **No `any`** in TypeScript.
- **No old-game code** (Monster Frontier / Ant Defence is discarded).
- **All art loads through `src/assets/manifest.ts`.**
