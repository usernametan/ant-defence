# `src/shared/`

**Owner:** Nobody — READ-ONLY contract after this foundation task.

This folder defines the contract shared by every track: domain types (`types.ts`),
the typed event bus (`events.ts`), and the simulation interface plus weapon
balance table (`api.ts`).

Do not edit these files without asking the user. Render, UI, and audio code may
only read `GameState` and subscribe to bus events.
