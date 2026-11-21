# `src/app/`

Game-loop glue: fixed-step driver, input capture, and the React ↔ sim bridge.
This is the only layer that owns the `SimApi` instance and wires it to the
renderer, UI, and audio layers.
