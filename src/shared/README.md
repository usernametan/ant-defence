# `src/shared/`

Shared domain contract for Zone Control: domain types (`types.ts`), the typed
event bus (`events.ts`), and the simulation interface plus weapon balance table
(`api.ts`).

Render, UI, and audio code may only read `GameState` and subscribe to bus
events.
