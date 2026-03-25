# Memory City Technical Blueprint

## System layers

1. `core-model`
Owns the canonical data structures for semantic graphs, block libraries, variants, routes, and evaluation reports.

2. `core-generators`
Owns topological path generation and the conversion from semantic inputs to city variants.

3. `core-evaluation`
Owns metrics for path quality, mnemonic distinctiveness, fabrication fit, and formal balance.

4. `apps/web`
Owns editing workflows, visualization, state orchestration, and exports.

## Current prototype contract

The web app consumes:

- a semantic graph
- a fixed block library
- several generated variants
- one evaluation report per variant

The current pipeline is:

1. normalize a semantic graph
2. build a route skeleton
3. place semantic landmarks on a bounded grid
4. add support blocks and structured voids
5. evaluate the result
6. render 2D and 3D views

## Next engineering milestones

1. Add serialization and project save/load.
2. Split route generation from district composition.
3. Add local edit patches and partial regeneration.
4. Move evaluation to web workers.
5. Add fabrication reports and orthographic export.
