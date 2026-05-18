# magnetics

A reusable deterministic 2D physics + magnetics simulation web app.

## Run

Open `index.html` in a browser.

## Features

- Draw 2D solid shapes (rectangles and circles) with explicit dimensions
- Add constraints (distance joints) between bodies
- Optional magnetic properties per body
- Real-time simulation with visible magnetic fields, forces, and torques, now using balanced granule interactions to avoid unphysical momentum spikes
- Startup bodies are unconstrained and use zero default surface resistance so motion stays inertial until you add joints or drag
- Per-shape magnetic mesh granularity and surface resistance controls for tuning stability versus detail
- Pole painting, polyline shapes, heatmap/arrow field rendering, and optional field-line tracing
- Track force/torque/pose metrics and plot over time
- Import/export complete projects as JSON
