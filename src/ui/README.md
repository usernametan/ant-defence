# `src/ui/`

React overlays and menus (HUD, scoreboard, pause and match-end screens). UI
reads `GameState` from the sim bridge and sends intents through `src/app/`; it
must not import the simulation implementation directly.
