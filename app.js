(function () {
  const simCanvas = document.getElementById("simCanvas");
  const plotCanvas = document.getElementById("plotCanvas");
  const ctx = simCanvas.getContext("2d");
  const pctx = plotCanvas.getContext("2d");

  const TRACK_SAMPLE_LIMIT = 5000;
  const FIXED_DT = 1 / 180;
  const MAX_STEPS_PER_FRAME = 12;
  const LINEAR_DAMPING = 1;
  const ANGULAR_DAMPING = 1;
  const MASS_SCALE = 0.00012;
  const MAGNETIC_FIELD_SCALE = 2600;
  const MAGNETIC_FORCE_SCALE = 120;
  const MAGNETIC_TORQUE_SCALE = 0.45;
  const MAX_MAGNETIC_FORCE = 16000;
  const MIN_MAGNETIC_DISTANCE = 18;
  const INDUCED_MAGNETIC_RESPONSE_SCALE = 0.00034;
  const MIN_EFFECTIVE_MAGNETIC_MOMENT = 0.02;
  const MAGNETIC_GRADIENT_EPSILON_SCALE = 0.07;
  const MIN_MAGNETIC_GRADIENT_EPSILON = 2;
  const MAX_MAGNETIC_GRADIENT_EPSILON = 10;
  const MIN_FIELD_SCALE = 10;
  const MAX_FIELD_SCALE = 100000;
  const BODY_TYPES = ["rectangle", "circle", "polyline"];
  const MAX_FIELD_ARROW_LENGTH = 26;
  const MIN_FIELD_ARROW_LENGTH = 3.5;
  const FIELD_ARROW_LENGTH_SCALE_DIVISOR = 1500;
  const FIELD_STRENGTH_RATIO_DIVISOR = 5;
  const ARROW_STRENGTH_NORMALIZER = 18;
  const MIN_ARROW_STRENGTH_SCALE = 0.18;
  const MIN_POLE_INFLUENCE_DISTANCE_SQUARED = 36;
  const POSITION_CORRECTION_PERCENT = 0.72;
  const POSITION_CORRECTION_SLOP = 0.01;
  const DEFAULT_RESTITUTION = 0.32;
  const DEFAULT_FRICTION = 0.42;
  const LEFT_MOUSE_BUTTON = 0;
  const RIGHT_MOUSE_BUTTON = 2;
  const DEFAULT_FIELD_ARROW_COLOR = "rgba(147,197,253,0.5)";
  const DEFAULT_HEATMAP_ALPHA = 0.72;
  const HEATMAP_TILE_OVERLAP = 1;
  const SOUTH_POLE_COLOR = { r: 96, g: 165, b: 250 };
  const NORTH_POLE_COLOR = { r: 248, g: 113, b: 113 };
  const CONSTRAINT_PICK_DISTANCE = 12;
  const ROTATE_HANDLE_OFFSET = 34;
  const ROTATE_HANDLE_RADIUS = 9;
  const RESIZE_HANDLE_RADIUS = 8;
  const POLYLINE_VERTEX_HANDLE_RADIUS = 8;
  const POLYLINE_INSERT_HANDLE_RADIUS = 7;
  const POLYLINE_EDGE_PICK_DISTANCE = 12;
  const MIN_POLYLINE_VERTICES = 3;
  const MIN_BODY_AXIS_SIZE = 12;
  const MIN_CIRCLE_RADIUS = 8;
  const BRUSH_BASE_RADIUS_FACTOR = 0.85;
  const BRUSH_RADIUS_SCALE_FACTOR = 1.45;
  // Granule tuning values control how each rigid body is discretized for magnetic sampling and visualization.
  const MIN_GRANULES_PER_AXIS = 2;
  const DEFAULT_GRANULES_PER_AXIS = 4;
  const MAX_GRANULES_PER_AXIS = 10;
  const CIRCLE_GRANULE_CLIP_RADIUS_FACTOR = 0.88;
  const CIRCLE_GRANULE_CLIP_SPACING_FACTOR = 0.35;
  const MIN_GRANULE_SAMPLE_RADIUS = 8;
  const DEFAULT_GRANULE_SAMPLE_RADIUS = 10;
  const GRANULE_SAMPLE_RADIUS_FACTOR = 0.68;
  const GRANULE_POINT_RADIUS = 3.2;
  const GRANULE_PIXEL_PADDING = 1;
  const MIN_GRANULE_ARROW_LENGTH = 4;
  const MAX_GRANULE_ARROW_LENGTH = 12;
  const GRANULE_MOMENT_ARROW_SCALE = 0.18;
  const GRANULE_FORCE_ARROW_SCALE = 0.014;
  const MAX_GRANULE_FORCE_ARROW_LENGTH = 12;
  const GRANULE_INDUCTION_ITERATIONS = 2;
  const MIN_GRANULE_POLE_EXTENT = 4;
  const GRANULE_POLE_EXTENT_SAMPLE_RADIUS_FACTOR = 0.55;
  const MIN_GRANULE_POLE_STRENGTH = 0.2;
  const DEFAULT_SURFACE_RESISTANCE = 0;
  const MAX_SURFACE_RESISTANCE = 5;
  const GRANULE_PERMANENT_MOMENT_COLOR = "rgba(251,146,60,0.9)";
  const GRANULE_INDUCED_MOMENT_COLOR = "rgba(226,232,240,0.82)";
  const GRANULE_PERMANENT_POINT_COLOR = "rgba(253,186,116,0.95)";
  const GRANULE_INDUCED_POINT_COLOR = "rgba(191,219,254,0.9)";
  const NEUTRAL_GRANULE_COLOR = "rgba(148,163,184,0.86)";
  const FIELD_LINE_STEP = 9;
  const FIELD_LINE_MAX_STEPS = 320;
  const FIELD_LINE_LOOP_THRESHOLD = 8;

  const MATERIAL_PRESETS = [
    {
      id: "air",
      name: "Air",
      density: 0.0012,
      permeability: 1,
      susceptibility: 0,
      conductivity: 0,
      remanenceDefault: 0,
      builtin: true,
    },
    {
      id: "plastic",
      name: "Plastic",
      density: 1.15,
      permeability: 1.05,
      susceptibility: 0.01,
      conductivity: 0,
      remanenceDefault: 0,
      builtin: true,
    },
    {
      id: "aluminum",
      name: "Aluminum",
      density: 2.7,
      permeability: 1.02,
      susceptibility: 0.02,
      conductivity: 37.7,
      remanenceDefault: 0,
      builtin: true,
    },
    {
      id: "steel",
      name: "Steel",
      density: 7.85,
      permeability: 120,
      susceptibility: 0.6,
      conductivity: 6.9,
      remanenceDefault: 0.18,
      builtin: true,
    },
    {
      id: "iron",
      name: "Iron",
      density: 7.87,
      permeability: 210,
      susceptibility: 0.85,
      conductivity: 10,
      remanenceDefault: 0.24,
      builtin: true,
    },
    {
      id: "ferrite",
      name: "Ferrite",
      density: 5.1,
      permeability: 85,
      susceptibility: 0.42,
      conductivity: 0.2,
      remanenceDefault: 0.34,
      builtin: true,
    },
    {
      id: "neodymium",
      name: "Neodymium",
      density: 7.5,
      permeability: 1.12,
      susceptibility: 1.2,
      conductivity: 6.7,
      remanenceDefault: 1.28,
      builtin: true,
    },
  ];

  let running = false;
  let lastTs = performance.now();
  let accumulator = 0;
  let worldTime = 0;
  let nextBodyId = 1;
  let nextConstraintId = 1;
  let customMaterialCounter = 1;

  const state = {
    gravity: { x: 0, y: 0 },
    bodies: [],
    constraints: [],
    materials: MATERIAL_PRESETS.map((material) => ({ ...material })),
    display: {
      fieldRenderMode: "arrows",
      fieldArrowSpacing: 22,
      fieldSampleResolution: 6,
      fieldScale: 1800,
      fieldThreshold: 0.01,
      fieldLinesEnabled: false,
      fieldLineCount: 3,
    },
    tracking: {
      bodyId: null,
      metric: "force",
      samples: [],
    },
    selectedBodyId: null,
    selectedConstraintId: null,
    selectedMaterialId: "steel",
    editorView: "shape",
    view: {
      pan: { x: 0, y: 0 },
      isPanning: false,
      inputSource: null,
      lastPointerClient: { x: 0, y: 0 },
    },
    pointer: {
      world: null,
      insideCanvas: false,
    },
    interaction: {
      mode: null,
      bodyId: null,
      pointerOffset: { x: 0, y: 0 },
      pointerAngleDelta: 0,
      handle: null,
      startSetup: null,
      startLocalPoint: null,
      startPoints: null,
    },
    poleBrush: {
      enabled: false,
      mode: 1,
      radius: 1,
    },
    magneticAnalysis: null,
    magneticAnalysisDirty: true,
    magneticGranules: [],
  };

  const v = (x = 0, y = 0) => ({ x, y });
  const add = (a, b) => v(a.x + b.x, a.y + b.y);
  const sub = (a, b) => v(a.x - b.x, a.y - b.y);
  const mul = (a, s) => v(a.x * s, a.y * s);
  const dot = (a, b) => a.x * b.x + a.y * b.y;
  const cross = (a, b) => a.x * b.y - a.y * b.x;
  const len = (a) => Math.hypot(a.x, a.y);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const unit = (a) => {
    const magnitude = len(a);
    if (magnitude < 1e-8) return v(1, 0);
    return v(a.x / magnitude, a.y / magnitude);
  };
  const perp = (a) => v(-a.y, a.x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rotate = (point, angle) => {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return v(point.x * c - point.y * s, point.x * s + point.y * c);
  };
  const inverseRotate = (point, angle) => rotate(point, -angle);
  const crossSV = (scalar, vector) => v(-scalar * vector.y, scalar * vector.x);

  function getEl(id) {
    return document.getElementById(id);
  }

  function invalidateMagneticAnalysis() {
    state.magneticAnalysis = null;
    state.magneticAnalysisDirty = true;
    state.magneticGranules = [];
  }

  function getMagneticGranuleAnalysis(forceRefresh = false) {
    if (!forceRefresh && !state.magneticAnalysisDirty && state.magneticAnalysis) return state.magneticAnalysis;
    const magneticAnalysis = buildMagneticGranuleAnalysis();
    state.magneticAnalysis = magneticAnalysis;
    state.magneticAnalysisDirty = false;
    state.magneticGranules = magneticAnalysis.granules;
    return magneticAnalysis;
  }

  function screenToWorld(point) {
    return sub(point, state.view.pan);
  }

  function worldToScreen(point) {
    return add(point, state.view.pan);
  }

  function canvasPointFromMouseEvent(event) {
    const rect = simCanvas.getBoundingClientRect();
    const scaleX = simCanvas.width / rect.width;
    const scaleY = simCanvas.height / rect.height;
    return v((event.clientX - rect.left) * scaleX, (event.clientY - rect.top) * scaleY);
  }

  function worldPointFromMouseEvent(event) {
    return screenToWorld(canvasPointFromMouseEvent(event));
  }

  function localPointToWorld(body, localPoint) {
    return add(body.pos, rotate(localPoint, body.angle));
  }

  function worldPointToLocal(body, worldPoint) {
    return inverseRotate(sub(worldPoint, body.pos), body.angle);
  }

  function traceBodyPath(pathContext, body) {
    if (body.type === "circle") {
      pathContext.beginPath();
      pathContext.arc(0, 0, body.radius, 0, Math.PI * 2);
      return;
    }
    if (body.type === "polyline") {
      const points = body.points?.length ? body.points : defaultPolylinePoints();
      pathContext.beginPath();
      pathContext.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i += 1) pathContext.lineTo(points[i].x, points[i].y);
      pathContext.closePath();
      return;
    }
    pathContext.beginPath();
    pathContext.rect(-body.width * 0.5, -body.height * 0.5, body.width, body.height);
  }

  function distancePointToSegment(point, a, b) {
    const segment = sub(b, a);
    const lengthSquared = dot(segment, segment);
    if (lengthSquared <= 1e-8) return len(sub(point, a));
    const t = clamp(dot(sub(point, a), segment) / lengthSquared, 0, 1);
    const projection = add(a, mul(segment, t));
    return len(sub(point, projection));
  }

  function materialById(materialId) {
    return state.materials.find((material) => material.id === materialId) || state.materials[0];
  }

  function defaultPolylinePoints() {
    return [
      v(-60, -20),
      v(0, -55),
      v(65, -10),
      v(25, 50),
      v(-45, 30),
    ];
  }

  function parsePolylinePoints(text) {
    const lines = String(text || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const points = [];
    for (const line of lines) {
      const [rawX, rawY] = line.split(/[,\s]+/);
      const x = Number(rawX);
      const y = Number(rawY);
      if (Number.isFinite(x) && Number.isFinite(y)) points.push(v(x, y));
    }
    return points.length >= 3 ? points : defaultPolylinePoints();
  }

  function formatPolylinePoints(points) {
    return (points?.length ? points : defaultPolylinePoints()).map((point) => `${point.x.toFixed(0)},${point.y.toFixed(0)}`).join("\n");
  }

  function setPolylineSummary(points) {
    const count = Math.max(0, points?.length || 0);
    getEl("shapePolylineSummary").textContent =
      count > 0
        ? `${count} vertex${count === 1 ? "" : "es"} in the scene editor. Drag points, drag edges, or use insert handles to refine the outline.`
        : "Polyline scene editing is ready.";
  }

  function polygonBounds(points) {
    const source = points?.length ? points : defaultPolylinePoints();
    let minX = source[0].x;
    let maxX = source[0].x;
    let minY = source[0].y;
    let maxY = source[0].y;
    for (const point of source) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }
    return { minX, maxX, minY, maxY, width: Math.max(5, maxX - minX), height: Math.max(5, maxY - minY) };
  }

  function polygonArea(points) {
    const source = points?.length ? points : defaultPolylinePoints();
    let area = 0;
    for (let i = 0; i < source.length; i += 1) {
      const current = source[i];
      const next = source[(i + 1) % source.length];
      area += current.x * next.y - next.x * current.y;
    }
    return Math.abs(area) * 0.5;
  }

  function localPointInPolygon(point, polygon) {
    const source = polygon?.length ? polygon : defaultPolylinePoints();
    let inside = false;
    for (let i = 0, j = source.length - 1; i < source.length; j = i, i += 1) {
      const a = source[i];
      const b = source[j];
      const deltaY = b.y - a.y;
      if (Math.abs(deltaY) < 1e-10) continue;
      const intersects =
        a.y > point.y !== b.y > point.y &&
        point.x < ((b.x - a.x) * (point.y - a.y)) / deltaY + a.x;
      if (intersects) inside = !inside;
    }
    return inside;
  }

  function bodyHasPaintedPoles(body) {
    return Array.isArray(body.polePaint) && body.polePaint.some((value) => Math.abs(Number(value) || 0) > 0.001);
  }

  function bodyArea(body) {
    if (body.type === "circle") return Math.PI * body.radius * body.radius;
    if (body.type === "polyline") return polygonArea(body.points);
    return body.width * body.height;
  }

  function bodyBoundingRadius(body) {
    if (body.type === "circle") return body.radius;
    if (body.type === "polyline") {
      let maxRadius = Math.hypot(body.width * 0.5, body.height * 0.5);
      for (const point of body.points || []) {
        maxRadius = Math.max(maxRadius, Math.hypot(point.x, point.y));
      }
      return maxRadius;
    }
    return Math.hypot(body.width * 0.5, body.height * 0.5);
  }

  function magneticEnabled(body) {
    return Boolean(body.magnetic && body.magnetic.enabled);
  }

  function magneticAxis(body) {
    const angle = body.angle + (body.magnetic?.localAngle || 0);
    return v(Math.cos(angle), Math.sin(angle));
  }

  function hasFerromagneticResponse(body) {
    const material = materialById(body.materialId);
    return material.permeability > 1.05 || Math.abs(material.susceptibility) > 0.02;
  }

  function bodyUsesMagneticGranules(body) {
    // Every body now exposes editable material granules so neutral, north, and south pixels can be painted directly.
    return true;
  }

  function bodyHasMagneticBehavior(body) {
    return magneticEnabled(body) || bodyHasPaintedPoles(body);
  }

  // Creates centered sample positions along one local axis so the body can be split into evenly spaced magnetic granules.
  function buildGranuleAxisSamples(length, requestedCount = DEFAULT_GRANULES_PER_AXIS) {
    const safeLength = Math.max(length, MIN_GRANULE_SAMPLE_RADIUS * 2);
    const count = clamp(Math.round(requestedCount) || DEFAULT_GRANULES_PER_AXIS, MIN_GRANULES_PER_AXIS, MAX_GRANULES_PER_AXIS);
    const spacing = safeLength / count;
    const start = -safeLength * 0.5 + spacing * 0.5;
    return {
      count,
      spacing,
      samples: Array.from({ length: count }, (_, index) => start + index * spacing),
    };
  }

  function granuleSampleRadius(xAxis, yAxis) {
    return Math.max(MIN_GRANULE_SAMPLE_RADIUS, Math.min(xAxis.spacing, yAxis.spacing) * GRANULE_SAMPLE_RADIUS_FACTOR);
  }

  // Returns local-space granule descriptors { localPos, share, sampleRadius } for the body's current geometry.
  function buildBodyGranuleLayout(body) {
    if (!bodyUsesMagneticGranules(body)) return [];

    const baseGranularity = clamp(
      Math.round(Number(body.meshGranularity) || DEFAULT_GRANULES_PER_AXIS),
      MIN_GRANULES_PER_AXIS,
      MAX_GRANULES_PER_AXIS
    );
    const localPoints = [];
    if (body.type === "circle") {
      const diameter = body.radius * 2;
      const xAxis = buildGranuleAxisSamples(diameter, baseGranularity);
      const yAxis = buildGranuleAxisSamples(diameter, baseGranularity);
      const clipRadius = Math.max(
        body.radius * CIRCLE_GRANULE_CLIP_RADIUS_FACTOR,
        body.radius - Math.min(xAxis.spacing, yAxis.spacing) * CIRCLE_GRANULE_CLIP_SPACING_FACTOR
      );
      for (const y of yAxis.samples) {
        for (const x of xAxis.samples) {
          if (Math.hypot(x, y) <= clipRadius) localPoints.push(v(x, y));
        }
      }
      if (!localPoints.length) localPoints.push(v(0, 0));
      const sampleRadius = granuleSampleRadius(xAxis, yAxis);
      const share = 1 / localPoints.length;
      return localPoints.map((localPos) => ({
        localPos,
        share,
        sampleRadius,
        cellWidth: xAxis.spacing,
        cellHeight: yAxis.spacing,
      }));
    }

    if (body.type === "polyline") {
      const bounds = polygonBounds(body.points);
      const maxDimension = Math.max(bounds.width, bounds.height, 1);
      const xAxis = buildGranuleAxisSamples(bounds.width, (bounds.width / maxDimension) * baseGranularity);
      const yAxis = buildGranuleAxisSamples(bounds.height, (bounds.height / maxDimension) * baseGranularity);
      const center = v((bounds.minX + bounds.maxX) * 0.5, (bounds.minY + bounds.maxY) * 0.5);
      for (const y of yAxis.samples) {
        for (const x of xAxis.samples) {
          const localPos = add(v(x, y), center);
          if (localPointInPolygon(localPos, body.points)) localPoints.push(localPos);
        }
      }
      if (!localPoints.length) localPoints.push(v(center.x, center.y));
      const sampleRadius = granuleSampleRadius(xAxis, yAxis);
      const share = 1 / localPoints.length;
      return localPoints.map((localPos) => ({
        localPos,
        share,
        sampleRadius,
        cellWidth: xAxis.spacing,
        cellHeight: yAxis.spacing,
      }));
    }

    const maxDimension = Math.max(body.width, body.height, 1);
    const xAxis = buildGranuleAxisSamples(body.width, (body.width / maxDimension) * baseGranularity);
    const yAxis = buildGranuleAxisSamples(body.height, (body.height / maxDimension) * baseGranularity);
    for (const y of yAxis.samples) {
      for (const x of xAxis.samples) {
        localPoints.push(v(x, y));
      }
    }
    const sampleRadius = granuleSampleRadius(xAxis, yAxis);
    const share = 1 / Math.max(1, localPoints.length);
    return localPoints.map((localPos) => ({
      localPos,
      share,
      sampleRadius,
      cellWidth: xAxis.spacing,
      cellHeight: yAxis.spacing,
    }));
  }

  function syncBodyDerived(body) {
    const material = materialById(body.materialId);
    body.materialId = material.id;
    body.type = BODY_TYPES.includes(body.type) ? body.type : "rectangle";
    body.points = (body.points?.length ? body.points : defaultPolylinePoints()).map((point) => v(Number(point.x) || 0, Number(point.y) || 0));
    if (body.type === "polyline") {
      const bounds = polygonBounds(body.points);
      body.width = bounds.width;
      body.height = bounds.height;
    }
    body.radius = clamp(Number(body.radius) || 20, 3, 300);
    body.width = clamp(Number(body.width) || 40, 5, simCanvas.width);
    body.height = clamp(Number(body.height) || 40, 5, simCanvas.height);
    if (body.massOverride == null || body.massOverride === "") body.massOverride = null;
    else {
      const parsedMassOverride = Number(body.massOverride);
      body.massOverride = Number.isFinite(parsedMassOverride) ? Math.max(0.05, parsedMassOverride) : 0.05;
    }

    body.fixed = Boolean(body.fixed);
    const autoMass = Math.max(0.05, bodyArea(body) * material.density * MASS_SCALE);
    body.mass = body.massOverride == null ? autoMass : body.massOverride;
    body.invMass = body.fixed || body.mass <= 0 ? 0 : 1 / body.mass;
    body.meshGranularity = clamp(
      Math.round(Number(body.meshGranularity) || DEFAULT_GRANULES_PER_AXIS),
      MIN_GRANULES_PER_AXIS,
      MAX_GRANULES_PER_AXIS
    );
    const parsedSurfaceResistance = Number(body.surfaceResistance);
    body.surfaceResistance = clamp(
      Number.isFinite(parsedSurfaceResistance) ? parsedSurfaceResistance : DEFAULT_SURFACE_RESISTANCE,
      0,
      MAX_SURFACE_RESISTANCE
    );

    if (body.type === "circle") body.inertia = 0.5 * body.mass * body.radius * body.radius;
    else body.inertia = (body.mass * (body.width * body.width + body.height * body.height)) / 12;
    body.invInertia = body.fixed || body.inertia <= 0 ? 0 : 1 / body.inertia;
    body.restitution = DEFAULT_RESTITUTION;
    body.friction = DEFAULT_FRICTION;

    if (!body.magnetic) body.magnetic = {};
    body.magnetic.enabled = Boolean(body.magnetic.enabled);
    body.magnetic.model = body.magnetic.model || "permanentDipole";
    body.magnetic.localAngle = Number(body.magnetic.localAngle) || 0;
    body.magnetic.strength = Math.max(0, Number(body.magnetic.strength) || 0);
    body.magnetic.polarity = Number(body.magnetic.polarity) === -1 ? -1 : 1;
    body.magnetic.remanence = Math.max(0, Number(body.magnetic.remanence) || material.remanenceDefault || 0);
    body.granules = buildBodyGranuleLayout(body);
    const previousPolePaint = Array.isArray(body.polePaint) ? body.polePaint.slice() : [];
    body.polePaint = body.granules.map((_, index) => Number(previousPolePaint[index]) || 0);
    invalidateMagneticAnalysis();

    if (!body.setup) body.setup = captureBodySetup(body);
  }

  function captureBodySetup(body) {
    return {
      type: body.type,
      pos: { x: body.pos.x, y: body.pos.y },
      angle: body.angle,
      width: body.width,
      height: body.height,
      radius: body.radius,
      points: body.points.map((point) => ({ x: point.x, y: point.y })),
      materialId: body.materialId,
      massOverride: body.massOverride,
      meshGranularity: body.meshGranularity,
      surfaceResistance: body.surfaceResistance,
      fixed: body.fixed,
      magnetic: {
        enabled: body.magnetic.enabled,
        model: body.magnetic.model,
        localAngle: body.magnetic.localAngle,
        strength: body.magnetic.strength,
        polarity: body.magnetic.polarity,
        remanence: body.magnetic.remanence,
      },
      polePaint: body.polePaint.slice(),
    };
  }

  function applyBodySetup(body, setup) {
    body.type = setup.type;
    body.pos = v(setup.pos.x, setup.pos.y);
    body.angle = setup.angle;
    body.width = setup.width;
    body.height = setup.height;
    body.radius = setup.radius;
    body.points = (setup.points?.length ? setup.points : defaultPolylinePoints()).map((point) => v(Number(point.x) || 0, Number(point.y) || 0));
    body.materialId = setup.materialId;
    body.massOverride = setup.massOverride == null ? null : setup.massOverride;
    body.meshGranularity = setup.meshGranularity;
    body.surfaceResistance = setup.surfaceResistance;
    body.fixed = Boolean(setup.fixed);
    body.magnetic = {
      enabled: Boolean(setup.magnetic?.enabled),
      model: setup.magnetic?.model || "permanentDipole",
      localAngle: Number(setup.magnetic?.localAngle) || 0,
      strength: Math.max(0, Number(setup.magnetic?.strength) || 0),
      polarity: Number(setup.magnetic?.polarity) === -1 ? -1 : 1,
      remanence: Math.max(0, Number(setup.magnetic?.remanence) || 0),
    };
    body.polePaint = Array.isArray(setup.polePaint) ? setup.polePaint.map((value) => Number(value) || 0) : [];
    body.vel = v(0, 0);
    body.force = v(0, 0);
    body.angularVel = 0;
    body.torque = 0;
    syncBodyDerived(body);
    body.setup = captureBodySetup(body);
  }

  function newBodyFromInput(input) {
    const body = {
      id: nextBodyId++,
      type: input.type,
      pos: v(input.x, input.y),
      vel: v(0, 0),
      force: v(0, 0),
      angle: input.angle,
      angularVel: 0,
      torque: 0,
      width: input.width,
      height: input.height,
      radius: input.radius,
      points: input.points,
      materialId: input.materialId,
      massOverride: input.massOverride,
      meshGranularity: input.meshGranularity,
      surfaceResistance: input.surfaceResistance,
      fixed: input.fixed,
      magnetic: {
        enabled: input.magneticEnabled,
        model: input.magneticModel,
        localAngle: input.magneticAngle,
        strength: input.magneticStrength,
        polarity: input.magneticPolarity,
        remanence: input.magneticRemanence,
      },
      polePaint: [],
      setup: null,
    };
    syncBodyDerived(body);
    body.setup = captureBodySetup(body);
    return body;
  }

  function addBody(input) {
    const body = newBodyFromInput(input);
    state.bodies.push(body);
    refreshUiLists();
    setSelectedBody(body.id);
    return body;
  }

  function updateBodyFromInput(body, input) {
    body.type = input.type;
    body.pos = v(input.x, input.y);
    body.angle = input.angle;
    body.width = input.width;
    body.height = input.height;
    body.radius = input.radius;
    body.points = input.points;
    body.materialId = input.materialId;
    body.massOverride = input.massOverride;
    body.meshGranularity = input.meshGranularity;
    body.surfaceResistance = input.surfaceResistance;
    body.fixed = input.fixed;
    body.magnetic = {
      enabled: input.magneticEnabled,
      model: input.magneticModel,
      localAngle: input.magneticAngle,
      strength: input.magneticStrength,
      polarity: input.magneticPolarity,
      remanence: input.magneticRemanence,
    };
    body.vel = v(0, 0);
    body.force = v(0, 0);
    body.angularVel = 0;
    body.torque = 0;
    syncBodyDerived(body);
    body.setup = captureBodySetup(body);
    refreshUiLists();
    setSelectedBody(body.id);
  }

  function removeBody(bodyId) {
    state.bodies = state.bodies.filter((body) => body.id !== bodyId);
    state.constraints = state.constraints.filter((constraint) => constraint.aId !== bodyId && constraint.bId !== bodyId);
    if (state.tracking.bodyId === bodyId) state.tracking.bodyId = null;
    if (state.selectedBodyId === bodyId) state.selectedBodyId = null;
    if (!state.constraints.some((constraint) => constraint.id === state.selectedConstraintId)) state.selectedConstraintId = null;
    state.tracking.samples = [];
    invalidateMagneticAnalysis();
    refreshUiLists();
    loadSelectedBodyIntoForm();
    loadSelectedConstraintIntoForm();
  }

  function normalizeConstraintInput(input) {
    return {
      aId: Number(input.aId),
      bId: Number(input.bId),
      distance: Math.max(1, Number(input.distance) || 1),
      stiffness: Math.max(0.1, Number(input.stiffness) || 0.1),
    };
  }

  function addConstraint(input) {
    const normalized = normalizeConstraintInput(input);
    const a = state.bodies.find((body) => body.id === normalized.aId);
    const b = state.bodies.find((body) => body.id === normalized.bId);
    if (!a || !b || normalized.aId === normalized.bId) return null;
    const constraint = {
      id: `constraint-${nextConstraintId++}`,
      ...normalized,
    };
    state.constraints.push(constraint);
    state.selectedConstraintId = constraint.id;
    refreshUiLists();
    loadSelectedConstraintIntoForm();
    return constraint;
  }

  function updateConstraintFromInput(constraint, input) {
    const normalized = normalizeConstraintInput(input);
    const a = state.bodies.find((body) => body.id === normalized.aId);
    const b = state.bodies.find((body) => body.id === normalized.bId);
    if (!constraint || !a || !b || normalized.aId === normalized.bId) return;
    Object.assign(constraint, normalized);
    state.selectedConstraintId = constraint.id;
    refreshUiLists();
    loadSelectedConstraintIntoForm();
  }

  function removeConstraint(constraintId) {
    state.constraints = state.constraints.filter((constraint) => constraint.id !== constraintId);
    if (state.selectedConstraintId === constraintId) state.selectedConstraintId = null;
    refreshUiLists();
    loadSelectedConstraintIntoForm();
  }

  function readShapeInput() {
    const massText = getEl("shapeMass").value.trim();
    const type = getEl("shapeType").value;
    const materialId = getEl("shapeMaterial").value || state.materials[0].id;
    const material = materialById(materialId);

    return {
      type,
      x: Number(getEl("shapeX").value) || simCanvas.width * 0.5,
      y: Number(getEl("shapeY").value) || simCanvas.height * 0.5,
      width: Math.max(5, Number(getEl("shapeW").value) || 5),
      height: Math.max(5, Number(getEl("shapeH").value) || 5),
      radius: Math.max(3, Number(getEl("shapeR").value) || 3),
      points: parsePolylinePoints(getEl("shapePolyline").value),
      angle: ((Number(getEl("shapeAngle").value) || 0) * Math.PI) / 180,
      massOverride: massText === "" ? null : Math.max(0.05, Number(massText) || 0.05),
      meshGranularity: clamp(
        Math.round(Number(getEl("shapeGranularity").value) || DEFAULT_GRANULES_PER_AXIS),
        MIN_GRANULES_PER_AXIS,
        MAX_GRANULES_PER_AXIS
      ),
      surfaceResistance: (() => {
        const parsedSurfaceResistance = Number(getEl("shapeSurfaceResistance").value);
        return clamp(
          Number.isFinite(parsedSurfaceResistance) ? parsedSurfaceResistance : DEFAULT_SURFACE_RESISTANCE,
          0,
          MAX_SURFACE_RESISTANCE
        );
      })(),
      materialId,
      fixed: getEl("shapeFixed").checked,
      magneticEnabled: getEl("shapeMagnetic").checked,
      magneticModel: getEl("shapeMagModel").value,
      magneticAngle: ((Number(getEl("shapeMagAngle").value) || 0) * Math.PI) / 180,
      magneticPolarity: Number(getEl("shapePolarity").value) === -1 ? -1 : 1,
      magneticStrength: Math.max(0, Number(getEl("shapeMoment").value) || 0),
      magneticRemanence: Math.max(0, Number(getEl("shapeRemanence").value) || material.remanenceDefault || 0),
    };
  }

  function populateShapeForm(body) {
    const material = materialById(body.materialId);
    getEl("shapeType").value = body.type;
    getEl("shapeX").value = body.setup ? body.setup.pos.x.toFixed(2) : body.pos.x.toFixed(2);
    getEl("shapeY").value = body.setup ? body.setup.pos.y.toFixed(2) : body.pos.y.toFixed(2);
    getEl("shapeW").value = body.width.toFixed(2);
    getEl("shapeH").value = body.height.toFixed(2);
    getEl("shapeR").value = body.radius.toFixed(2);
    getEl("shapePolyline").value = formatPolylinePoints(body.points);
    getEl("shapeAngle").value = (((body.setup ? body.setup.angle : body.angle) * 180) / Math.PI).toFixed(2);
    getEl("shapeMass").value = body.massOverride == null ? "" : body.massOverride.toFixed(2);
    getEl("shapeGranularity").value = String(body.meshGranularity);
    getEl("shapeSurfaceResistance").value = body.surfaceResistance.toFixed(3);
    getEl("shapeMaterial").value = material.id;
    getEl("shapeFixed").checked = body.fixed;
    getEl("shapeMagnetic").checked = bodyHasMagneticBehavior(body);
    getEl("shapeMagModel").value = body.magnetic.model;
    getEl("shapeMagAngle").value = ((body.magnetic.localAngle * 180) / Math.PI).toFixed(2);
    getEl("shapePolarity").value = String(body.magnetic.polarity || 1);
    getEl("shapeMoment").value = body.magnetic.strength.toFixed(2);
    getEl("shapeRemanence").value = body.magnetic.remanence.toFixed(2);
    getEl("poleBrushStrength").value = body.magnetic.strength.toFixed(2);
    setPolylineSummary(body.points);
    toggleShapeInputs();
  }

  function clearShapeForm() {
    getEl("shapeType").value = "rectangle";
    getEl("shapeX").value = 180;
    getEl("shapeY").value = 180;
    getEl("shapeW").value = 90;
    getEl("shapeH").value = 50;
    getEl("shapeR").value = 28;
    getEl("shapePolyline").value = formatPolylinePoints(defaultPolylinePoints());
    getEl("shapeAngle").value = 0;
    getEl("shapeMass").value = "";
    getEl("shapeGranularity").value = DEFAULT_GRANULES_PER_AXIS;
    getEl("shapeSurfaceResistance").value = DEFAULT_SURFACE_RESISTANCE.toFixed(3);
    getEl("shapeMaterial").value = state.selectedMaterialId || state.materials[0]?.id || "";
    getEl("shapeFixed").checked = false;
    getEl("shapeMagnetic").checked = false;
    getEl("shapeMagModel").value = "permanentDipole";
    getEl("shapeMagAngle").value = 0;
    getEl("shapePolarity").value = "1";
    getEl("shapeMoment").value = 40;
    getEl("shapeRemanence").value = materialById(getEl("shapeMaterial").value).remanenceDefault.toFixed(2);
    getEl("poleBrushStrength").value = 40;
    setPolylineSummary(defaultPolylinePoints());
    toggleShapeInputs();
  }

  function setSelectedBody(bodyId) {
    state.selectedBodyId = bodyId == null ? null : Number(bodyId);
    loadSelectedBodyIntoForm();
    refreshShapeTable();
    refreshStatusSummary();
    syncDisplayInputs();
    if (state.selectedBodyId != null) showEditorView("shape");
  }

  function loadSelectedBodyIntoForm() {
    const body = state.bodies.find((entry) => entry.id === state.selectedBodyId);
    if (!body) {
      clearShapeForm();
      syncDisplayInputs();
      return;
    }
    populateShapeForm(body);
    syncDisplayInputs();
  }

  function refreshSelect(select, items, valueFn, labelFn, includeEmptyLabel) {
    const previous = select.value;
    select.innerHTML = "";
    if (includeEmptyLabel != null) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = includeEmptyLabel;
      select.appendChild(option);
    }
    for (const item of items) {
      const option = document.createElement("option");
      option.value = String(valueFn(item));
      option.textContent = labelFn(item);
      select.appendChild(option);
    }
    if ([...select.options].some((option) => option.value === previous)) select.value = previous;
  }

  function readConstraintInput() {
    return {
      aId: Number(getEl("constraintA").value),
      bId: Number(getEl("constraintB").value),
      distance: Number(getEl("constraintDist").value),
      stiffness: Number(getEl("constraintK").value),
    };
  }

  function populateConstraintForm(constraint) {
    getEl("constraintA").value = String(constraint.aId);
    getEl("constraintB").value = String(constraint.bId);
    getEl("constraintDist").value = constraint.distance.toFixed(2);
    getEl("constraintK").value = constraint.stiffness.toFixed(2);
  }

  function clearConstraintForm() {
    const [firstBody, secondBody] = state.bodies;
    getEl("constraintA").value = firstBody ? String(firstBody.id) : "";

    let bodyBValue = "";
    if (secondBody) bodyBValue = String(secondBody.id);
    else if (firstBody) bodyBValue = String(firstBody.id);
    getEl("constraintB").value = bodyBValue;

    getEl("constraintDist").value = 120;
    getEl("constraintK").value = 8;
  }

  function clearSelectedConstraint() {
    state.selectedConstraintId = null;
    refreshConstraintTable();
    refreshStatusSummary();
  }

  function setSelectedConstraint(constraintId) {
    state.selectedConstraintId = constraintId || null;
    loadSelectedConstraintIntoForm();
    refreshConstraintTable();
    refreshStatusSummary();
    if (state.selectedConstraintId != null) showEditorView("constraint");
  }

  function loadSelectedConstraintIntoForm() {
    const constraint = state.constraints.find((entry) => entry.id === state.selectedConstraintId);
    if (!constraint) {
      clearConstraintForm();
      return;
    }
    populateConstraintForm(constraint);
  }

  function refreshMaterialOptions() {
    const label = (material) => `${material.name} (${material.id})`;
    refreshSelect(getEl("shapeMaterial"), state.materials, (material) => material.id, label);
    refreshSelect(getEl("materialSelect"), state.materials, (material) => material.id, label);

    if (!state.selectedMaterialId || !state.materials.some((material) => material.id === state.selectedMaterialId)) {
      state.selectedMaterialId = state.materials[0]?.id || null;
    }

    getEl("materialSelect").value = state.selectedMaterialId || "";
    if (state.selectedMaterialId) loadMaterialIntoForm(state.selectedMaterialId);
  }

  function refreshBodyOptions() {
    const bodyLabel = (body) => `${body.fixed ? "📌 " : ""}#${body.id} ${body.type} (${materialById(body.materialId).name})`;
    refreshSelect(getEl("constraintA"), state.bodies, (body) => body.id, bodyLabel);
    refreshSelect(getEl("constraintB"), state.bodies, (body) => body.id, bodyLabel);
    refreshSelect(getEl("trackBody"), state.bodies, (body) => body.id, bodyLabel);

    if (state.selectedBodyId == null || !state.bodies.some((body) => body.id === state.selectedBodyId)) {
      state.selectedBodyId = state.bodies[0]?.id ?? null;
    }
    if (state.tracking.bodyId == null || !state.bodies.some((body) => body.id === state.tracking.bodyId)) {
      state.tracking.bodyId = state.bodies[0]?.id ?? null;
    }

    getEl("trackBody").value = state.tracking.bodyId == null ? "" : String(state.tracking.bodyId);
  }

  function refreshConstraintOptions() {
    if (state.selectedConstraintId != null && !state.constraints.some((constraint) => constraint.id === state.selectedConstraintId)) {
      state.selectedConstraintId = null;
    }
  }

  function appendTableCell(row, text, className = "") {
    const cell = document.createElement("td");
    if (className) cell.className = className;
    cell.textContent = text;
    row.appendChild(cell);
    return cell;
  }

  function makeTableActionButton(label, action, datasetKey, datasetValue) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.dataset.action = action;
    button.dataset[datasetKey] = datasetValue;
    return button;
  }

  function refreshShapeTable() {
    const tbody = getEl("shapeTableBody");
    tbody.innerHTML = "";
    if (!state.bodies.length) {
      const row = document.createElement("tr");
      row.innerHTML = '<td class="empty-cell" colspan="5">No shapes yet.</td>';
      tbody.appendChild(row);
      return;
    }

    for (const body of state.bodies) {
      const row = document.createElement("tr");
      if (body.id === state.selectedBodyId) row.classList.add("selected");
      const material = materialById(body.materialId);
      const magneticLabel = bodyHasPaintedPoles(body)
        ? "Painted poles"
        : magneticEnabled(body)
        ? `${body.magnetic.model === "inducedDipole" ? "Induced" : "Permanent"} · ${body.magnetic.polarity === -1 ? "S→N" : "N→S"}`
        : bodyUsesMagneticGranules(body)
          ? "Neutral granules"
          : "No";
      row.dataset.bodyId = String(body.id);
      appendTableCell(row, `#${body.id}${body.fixed ? " 📌" : ""}`);
      appendTableCell(row, body.type);
      appendTableCell(row, material.name);
      appendTableCell(row, magneticLabel);
      const actionCell = document.createElement("td");
      const actionWrap = document.createElement("div");
      actionWrap.className = "table-actions";
      actionWrap.appendChild(makeTableActionButton("Edit", "edit-body", "bodyId", String(body.id)));
      actionWrap.appendChild(makeTableActionButton("Delete", "delete-body", "bodyId", String(body.id)));
      actionCell.appendChild(actionWrap);
      row.appendChild(actionCell);
      tbody.appendChild(row);
    }
  }

  function refreshConstraintTable() {
    const tbody = getEl("constraintTableBody");
    tbody.innerHTML = "";
    if (!state.constraints.length) {
      const row = document.createElement("tr");
      row.innerHTML = '<td class="empty-cell" colspan="5">No constraints yet.</td>';
      tbody.appendChild(row);
      return;
    }

    for (const constraint of state.constraints) {
      const row = document.createElement("tr");
      if (constraint.id === state.selectedConstraintId) row.classList.add("selected");
      const a = state.bodies.find((body) => body.id === constraint.aId);
      const b = state.bodies.find((body) => body.id === constraint.bId);
      row.dataset.constraintId = constraint.id;
      appendTableCell(row, constraint.id);
      appendTableCell(row, a ? `#${a.id}` : "?");
      appendTableCell(row, b ? `#${b.id}` : "?");
      appendTableCell(row, constraint.distance.toFixed(2));
      const actionCell = document.createElement("td");
      const actionWrap = document.createElement("div");
      actionWrap.className = "table-actions";
      actionWrap.appendChild(makeTableActionButton("Edit", "edit-constraint", "constraintId", constraint.id));
      actionWrap.appendChild(makeTableActionButton("Delete", "delete-constraint", "constraintId", constraint.id));
      actionCell.appendChild(actionWrap);
      row.appendChild(actionCell);
      tbody.appendChild(row);
    }
  }

  function refreshStatusSummary() {
    const selectedBody = state.bodies.find((body) => body.id === state.selectedBodyId);
    const selectedConstraint = state.constraints.find((constraint) => constraint.id === state.selectedConstraintId);
    getEl("selectionSummary").textContent = selectedBody
      ? `${selectedBody.fixed ? "📌 " : ""}Selected shape: #${selectedBody.id} ${selectedBody.type}`
      : "No shapes selected";
    getEl("constraintSummary").textContent = selectedConstraint
      ? `Selected constraint: ${selectedConstraint.id} (#${selectedConstraint.aId} ↔ #${selectedConstraint.bId})`
      : state.constraints.length
        ? `${state.constraints.length} constraint${state.constraints.length === 1 ? "" : "s"}`
        : "No constraints";
  }

  function refreshUiLists() {
    refreshMaterialOptions();
    refreshBodyOptions();
    refreshConstraintOptions();
    refreshShapeTable();
    refreshConstraintTable();
    refreshStatusSummary();
    syncDisplayInputs();
  }

  function loadMaterialIntoForm(materialId) {
    const material = materialById(materialId);
    state.selectedMaterialId = material.id;
    getEl("materialSelect").value = material.id;
    getEl("materialName").value = material.name;
    getEl("materialDensity").value = material.density;
    getEl("materialPermeability").value = material.permeability;
    getEl("materialSusceptibility").value = material.susceptibility;
    getEl("materialConductivity").value = material.conductivity;
    getEl("materialRemanence").value = material.remanenceDefault;
  }

  function readMaterialForm() {
    return {
      name: getEl("materialName").value.trim() || `Custom Material ${customMaterialCounter}`,
      density: Math.max(0.01, Number(getEl("materialDensity").value) || 0.01),
      permeability: Math.max(0.01, Number(getEl("materialPermeability").value) || 0.01),
      susceptibility: Number(getEl("materialSusceptibility").value) || 0,
      conductivity: Math.max(0, Number(getEl("materialConductivity").value) || 0),
      remanenceDefault: Math.max(0, Number(getEl("materialRemanence").value) || 0),
    };
  }

  function saveMaterial() {
    const data = readMaterialForm();
    const existing = state.materials.find((material) => material.id === state.selectedMaterialId);
    if (existing) {
      Object.assign(existing, data);
      loadMaterialIntoForm(existing.id);
    } else {
      const newMaterial = {
        id: `custom-${customMaterialCounter++}`,
        builtin: false,
        ...data,
      };
      state.materials.push(newMaterial);
      state.selectedMaterialId = newMaterial.id;
      loadMaterialIntoForm(newMaterial.id);
    }
    resyncAllBodies();
    refreshUiLists();
    loadSelectedBodyIntoForm();
  }

  function deleteMaterial() {
    const material = state.materials.find((entry) => entry.id === state.selectedMaterialId);
    if (!material) return;
    if (material.builtin) {
      alert("Built-in materials cannot be deleted.");
      return;
    }
    const fallbackId = state.materials.find((entry) => entry.id === "steel")?.id || state.materials[0]?.id;
    state.materials = state.materials.filter((entry) => entry.id !== material.id);
    for (const body of state.bodies) {
      if (body.materialId === material.id) {
        body.materialId = fallbackId;
        syncBodyDerived(body);
        body.setup = captureBodySetup(body);
      }
    }
    state.selectedMaterialId = fallbackId;
    refreshUiLists();
    loadMaterialIntoForm(state.selectedMaterialId);
    loadSelectedBodyIntoForm();
  }

  function resyncAllBodies() {
    for (const body of state.bodies) {
      syncBodyDerived(body);
    }
  }

  function resetDynamics() {
    running = false;
    getEl("startPauseBtn").textContent = "Start";
    accumulator = 0;
    worldTime = 0;
    state.tracking.samples = [];
    stopBodyInteraction();
    for (const body of state.bodies) {
      applyBodySetup(body, body.setup || captureBodySetup(body));
    }
  }

  function clearProject() {
    running = false;
    getEl("startPauseBtn").textContent = "Start";
    accumulator = 0;
    worldTime = 0;
    nextBodyId = 1;
    state.bodies = [];
    state.constraints = [];
    state.tracking = { bodyId: null, metric: "force", samples: [] };
    state.selectedBodyId = null;
    state.selectedConstraintId = null;
    invalidateMagneticAnalysis();
    state.view.pan = v(0, 0);
    state.view.isPanning = false;
    state.view.inputSource = null;
    stopBodyInteraction();
    refreshUiLists();
    clearShapeForm();
    clearConstraintForm();
  }

  function resetForces() {
    for (const body of state.bodies) {
      body.force = v(state.gravity.x * body.mass, state.gravity.y * body.mass);
      body.torque = 0;
    }
  }

  function applyConstraints() {
    for (const constraint of state.constraints) {
      const a = state.bodies.find((body) => body.id === constraint.aId);
      const b = state.bodies.find((body) => body.id === constraint.bId);
      if (!a || !b) continue;
      const delta = sub(b.pos, a.pos);
      const distance = Math.max(0.0001, len(delta));
      const direction = mul(delta, 1 / distance);
      const stretch = distance - constraint.distance;
      const relativeVelocity = dot(sub(b.vel, a.vel), direction);
      const damping = Math.sqrt(constraint.stiffness) * 0.8;
      const forceMagnitude = constraint.stiffness * stretch - damping * relativeVelocity;
      const force = mul(direction, forceMagnitude);
      a.force = add(a.force, force);
      b.force = sub(b.force, force);
    }
  }

  function configuredMagneticMoment(body) {
    if (!magneticEnabled(body)) return v(0, 0);
    const material = materialById(body.materialId);
    const axis = magneticAxis(body);
    const permeabilityScale = Math.sqrt(Math.max(0.01, material.permeability));
    const susceptibilityScale = body.magnetic.model === "inducedDipole" ? Math.max(0.05, Math.abs(material.susceptibility)) : 1;
    const magnitude = body.magnetic.strength * Math.max(0.01, body.magnetic.remanence) * permeabilityScale * susceptibilityScale * body.magnetic.polarity;
    return mul(axis, magnitude);
  }

  function balancedPolePaint(body) {
    const source = Array.isArray(body.polePaint) ? body.polePaint : [];
    const positiveCount = source.filter((value) => value > 0.001).length;
    const negativeCount = source.filter((value) => value < -0.001).length;
    if (!positiveCount && !negativeCount) return source.map(() => 0);
    const positiveScale = positiveCount > 0 ? Math.min(1, negativeCount / positiveCount || 0) : 0;
    const negativeScale = negativeCount > 0 ? Math.min(1, positiveCount / negativeCount || 0) : 0;
    return source.map((value) => {
      if (value > 0.001) return positiveScale;
      if (value < -0.001) return -negativeScale;
      return 0;
    });
  }

  function permanentMomentForGranule(body, layoutGranule, fallbackPermanentMoment, balancedPaint, layoutIndex) {
    const paintedPole = Number(balancedPaint?.[layoutIndex]) || 0;
    if (Math.abs(paintedPole) > 0.001) {
      const axis = magneticAxis(body);
      const magnitude = body.magnetic.strength * Math.max(0.01, body.magnetic.remanence) * layoutGranule.share * paintedPole;
      return mul(axis, magnitude);
    }
    if (bodyHasPaintedPoles(body)) return v(0, 0);
    return mul(fallbackPermanentMoment, layoutGranule.share);
  }

  function dipoleFieldFromMomentAtPoint(origin, moment, point) {
    if (len(moment) < 1e-8) return v(0, 0);
    const offset = sub(point, origin);
    const distance = Math.max(MIN_MAGNETIC_DISTANCE, len(offset));
    const direction = mul(offset, 1 / distance);
    const momentAlignment = dot(moment, direction);
    const scale = MAGNETIC_FIELD_SCALE / (distance * distance * distance);
    return mul(sub(mul(direction, 3 * momentAlignment), moment), scale);
  }

  function dipoleFieldFromBodyAtPoint(body, point) {
    return dipoleFieldFromMomentAtPoint(body.pos, configuredMagneticMoment(body), point);
  }

  function inducedMagneticMoment(body, field, geometryFraction = 1) {
    if (!hasFerromagneticResponse(body)) return v(0, 0);
    const fieldMagnitude = len(field);
    if (fieldMagnitude < 1e-6) return v(0, 0);
    const material = materialById(body.materialId);
    const susceptibility = Math.max(0, material.susceptibility);
    if (susceptibility === 0) return v(0, 0);
    const geometryScale =
      (body.type === "circle" ? Math.PI * body.radius * body.radius : body.width * body.height) * Math.max(0, geometryFraction);
    const magnitude =
      fieldMagnitude *
      susceptibility *
      Math.sqrt(Math.max(1, material.permeability)) *
      geometryScale *
      INDUCED_MAGNETIC_RESPONSE_SCALE;
    return mul(unit(field), magnitude);
  }

  function buildMagneticGranuleAnalysis() {
    const granules = [];
    let nextGranuleId = 1;
    for (const body of state.bodies) {
      if (!bodyUsesMagneticGranules(body)) continue;
      const layout = body.granules?.length
        ? body.granules
        : [{ localPos: v(0, 0), share: 1, sampleRadius: DEFAULT_GRANULE_SAMPLE_RADIUS, cellWidth: DEFAULT_GRANULE_SAMPLE_RADIUS * 2, cellHeight: DEFAULT_GRANULE_SAMPLE_RADIUS * 2 }];
      const permanentMoment = magneticEnabled(body) ? configuredMagneticMoment(body) : v(0, 0);
      const balancedPaint = balancedPolePaint(body);
      layout.forEach((layoutGranule, layoutIndex) => {
        const paintedPole = Number(balancedPaint[layoutIndex]) || 0;
        granules.push({
          id: nextGranuleId++,
          body,
          bodyId: body.id,
          pos: add(body.pos, rotate(layoutGranule.localPos, body.angle)),
          localPos: layoutGranule.localPos,
          share: layoutGranule.share,
          sampleRadius: layoutGranule.sampleRadius,
          cellWidth: layoutGranule.cellWidth || layoutGranule.sampleRadius * 2,
          cellHeight: layoutGranule.cellHeight || layoutGranule.sampleRadius * 2,
          polePaint: paintedPole,
          permanentMoment: permanentMomentForGranule(body, layoutGranule, permanentMoment, balancedPaint, layoutIndex),
          inducedMoment: v(0, 0),
          effectiveMoment: permanentMomentForGranule(body, layoutGranule, permanentMoment, balancedPaint, layoutIndex),
          externalField: v(0, 0),
          force: v(0, 0),
        });
      });
    }

    const bodyAccumulators = new Map(
      state.bodies.map((body) => [
        body.id,
        {
          force: v(0, 0),
          torque: 0,
        },
      ])
    );
    const granuleCounts = new Map();
    for (const granule of granules) {
      granuleCounts.set(granule.bodyId, (granuleCounts.get(granule.bodyId) || 0) + 1);
    }

    // Iterate a couple of times so induced granules can react to the field created by neighboring granules.
    for (let iteration = 0; iteration < GRANULE_INDUCTION_ITERATIONS; iteration++) {
      applyInducedGranuleMoments(granules);
    }

    for (const granule of granules) {
      granule.externalField = v(0, 0);
      granule.force = v(0, 0);
    }

    for (let i = 0; i < granules.length; i += 1) {
      const a = granules[i];
      for (let j = i + 1; j < granules.length; j += 1) {
        const b = granules[j];
        if (a.bodyId === b.bodyId) continue;
        accumulateGranulePairInteraction(a, b, bodyAccumulators, granuleCounts);
      }
    }

    for (const granule of granules) {
      const accumulator = bodyAccumulators.get(granule.bodyId);
      if (!accumulator) continue;
      accumulator.torque += cross(granule.effectiveMoment, granule.externalField) * MAGNETIC_TORQUE_SCALE;
    }

    return { granules, bodyAccumulators };
  }

  function accumulateGranulePairInteraction(a, b, bodyAccumulators, granuleCounts) {
    const fieldOnA = dipoleFieldFromMomentAtPoint(b.pos, b.effectiveMoment, a.pos);
    const fieldOnB = dipoleFieldFromMomentAtPoint(a.pos, a.effectiveMoment, b.pos);
    a.externalField = add(a.externalField, fieldOnA);
    b.externalField = add(b.externalField, fieldOnB);

    const aMomentMagnitude = len(a.effectiveMoment);
    const bMomentMagnitude = len(b.effectiveMoment);
    const fieldMagnitude = Math.max(len(fieldOnA), len(fieldOnB));
    if (aMomentMagnitude < 1e-6 && bMomentMagnitude < 1e-6 && fieldMagnitude < 1e-6) return;

    const epsilon = clamp(
      Math.min(a.sampleRadius, b.sampleRadius) * 0.35,
      MIN_MAGNETIC_GRADIENT_EPSILON,
      MAX_MAGNETIC_GRADIENT_EPSILON
    );
    const interactionPotentialAt = (point) => dot(b.effectiveMoment, dipoleFieldFromMomentAtPoint(a.pos, a.effectiveMoment, point));
    const gradX = (interactionPotentialAt(add(b.pos, v(epsilon, 0))) - interactionPotentialAt(add(b.pos, v(-epsilon, 0)))) / (2 * epsilon);
    const gradY = (interactionPotentialAt(add(b.pos, v(0, epsilon))) - interactionPotentialAt(add(b.pos, v(0, -epsilon)))) / (2 * epsilon);
    let pairForce = mul(v(gradX, gradY), MAGNETIC_FORCE_SCALE);
    const maxPairForce = Math.min(
      MAX_MAGNETIC_FORCE / Math.max(1, granuleCounts.get(a.bodyId) || 1),
      MAX_MAGNETIC_FORCE / Math.max(1, granuleCounts.get(b.bodyId) || 1)
    );
    if (len(pairForce) > maxPairForce) pairForce = mul(unit(pairForce), maxPairForce);

    a.force = sub(a.force, pairForce);
    b.force = add(b.force, pairForce);

    const bodyAccumulatorA = bodyAccumulators.get(a.bodyId);
    const bodyAccumulatorB = bodyAccumulators.get(b.bodyId);
    if (bodyAccumulatorA) {
      bodyAccumulatorA.force = sub(bodyAccumulatorA.force, pairForce);
      bodyAccumulatorA.torque += cross(sub(a.pos, a.body.pos), mul(pairForce, -1));
    }
    if (bodyAccumulatorB) {
      bodyAccumulatorB.force = add(bodyAccumulatorB.force, pairForce);
      bodyAccumulatorB.torque += cross(sub(b.pos, b.body.pos), pairForce);
    }
  }

  function applyInducedGranuleMoments(granules) {
    for (const granule of granules) {
      const field = magneticFieldAtPointFromGranules(granule.pos, granules, { excludeBodyId: granule.bodyId });
      const inducedMoment = inducedMagneticMoment(granule.body, field, granule.share);
      granule.externalField = field;
      granule.inducedMoment = inducedMoment;
      granule.effectiveMoment = add(granule.permanentMoment, inducedMoment);
    }
  }

  // Sums field contributions from all effective granules while allowing callers to exclude a whole body or a single granule.
  function magneticFieldAtPointFromGranules(point, granules, options = {}) {
    const { excludeBodyId = null, excludeGranuleId = null } = options;
    let field = v(0, 0);
    for (const granule of granules) {
      if (excludeGranuleId !== null && granule.id === excludeGranuleId) continue;
      if (excludeBodyId !== null && granule.bodyId === excludeBodyId) continue;
      if (len(granule.effectiveMoment) < 1e-8) continue;
      field = add(field, dipoleFieldFromMomentAtPoint(granule.pos, granule.effectiveMoment, point));
    }
    return field;
  }

  function magneticFieldAtPoint(point, granules = state.magneticGranules) {
    return magneticFieldAtPointFromGranules(point, granules || []);
  }

  function magneticPoleBiasAtPoint(point, granules = state.magneticGranules) {
    let northInfluence = 0;
    let southInfluence = 0;
    for (const granule of granules || []) {
      const moment = granule.effectiveMoment;
      if (len(moment) < 1e-6) continue;
      const axis = unit(moment);
      const extent = Math.max(MIN_GRANULE_POLE_EXTENT, granule.sampleRadius * GRANULE_POLE_EXTENT_SAMPLE_RADIUS_FACTOR);
      const north = add(granule.pos, mul(axis, extent));
      const south = add(granule.pos, mul(axis, -extent));
      const strength = Math.max(MIN_GRANULE_POLE_STRENGTH, len(moment));
      const northDelta = sub(point, north);
      const southDelta = sub(point, south);
      const northDistance = Math.max(MIN_POLE_INFLUENCE_DISTANCE_SQUARED, dot(northDelta, northDelta));
      const southDistance = Math.max(MIN_POLE_INFLUENCE_DISTANCE_SQUARED, dot(southDelta, southDelta));
      northInfluence += strength / northDistance;
      southInfluence += strength / southDistance;
    }
    return { northInfluence, southInfluence };
  }

  function fieldColorComponentsAtPoint(point, granules = state.magneticGranules) {
    const { northInfluence, southInfluence } = magneticPoleBiasAtPoint(point, granules);
    const totalInfluence = northInfluence + southInfluence;
    if (totalInfluence <= 1e-6) {
      return { r: 147, g: 197, b: 253, alpha: 0.5 };
    }
    const blend = clamp((northInfluence - southInfluence) / totalInfluence, -1, 1);
    const northDominanceRatio = (blend + 1) * 0.5;
    const red = Math.round(lerp(SOUTH_POLE_COLOR.r, NORTH_POLE_COLOR.r, northDominanceRatio));
    const green = Math.round(lerp(SOUTH_POLE_COLOR.g, NORTH_POLE_COLOR.g, northDominanceRatio));
    const blue = Math.round(lerp(SOUTH_POLE_COLOR.b, NORTH_POLE_COLOR.b, northDominanceRatio));
    return { r: red, g: green, b: blue, alpha: lerp(0.42, 0.82, Math.abs(blend)) };
  }

  function fieldArrowColorAtPoint(point, granules = state.magneticGranules) {
    const { r, g, b, alpha } = fieldColorComponentsAtPoint(point, granules);
    return `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
  }

  function applyMagnetics() {
    const magneticAnalysis = getMagneticGranuleAnalysis(true);
    for (const body of state.bodies) {
      const accumulator = magneticAnalysis.bodyAccumulators.get(body.id);
      if (!accumulator) continue;
      body.force = add(body.force, accumulator.force);
      body.torque += accumulator.torque;
    }
  }

  function bodySurfaceMeasure(body) {
    if (body.type === "circle") return 2 * Math.PI * body.radius;
    if (body.type === "polyline") {
      const points = body.points?.length ? body.points : defaultPolylinePoints();
      let perimeter = 0;
      for (let i = 0; i < points.length; i += 1) {
        perimeter += len(sub(points[(i + 1) % points.length], points[i]));
      }
      return perimeter;
    }
    return 2 * (body.width + body.height);
  }

  function applySurfaceResistance() {
    for (const body of state.bodies) {
      if (body.fixed) continue;
      const surfaceResistance = Math.max(0, body.surfaceResistance || 0);
      if (surfaceResistance <= 0) continue;
      const surfaceMeasure = bodySurfaceMeasure(body);
      const linearSpeed = len(body.vel);
      if (linearSpeed > 1e-6) {
        const linearDragMagnitude = surfaceResistance * surfaceMeasure * linearSpeed * 0.08;
        body.force = sub(body.force, mul(unit(body.vel), linearDragMagnitude));
      }
      if (Math.abs(body.angularVel) > 1e-6) {
        const rotationalDragMagnitude = surfaceResistance * surfaceMeasure * bodyBoundingRadius(body) * Math.abs(body.angularVel) * 0.035;
        body.torque -= Math.sign(body.angularVel) * rotationalDragMagnitude;
      }
    }
  }

  function bodyAxes(body) {
    return [rotate(v(1, 0), body.angle), rotate(v(0, 1), body.angle)];
  }

  function rectVertices(body) {
    const halfW = body.width * 0.5;
    const halfH = body.height * 0.5;
    const local = [v(-halfW, -halfH), v(halfW, -halfH), v(halfW, halfH), v(-halfW, halfH)];
    return local.map((point) => add(body.pos, rotate(point, body.angle)));
  }

  function projectVertices(axis, vertices) {
    let min = dot(vertices[0], axis);
    let max = min;
    for (let i = 1; i < vertices.length; i += 1) {
      const value = dot(vertices[i], axis);
      if (value < min) min = value;
      if (value > max) max = value;
    }
    return { min, max };
  }

  function supportPoint(body, direction) {
    const dir = unit(direction);
    if (body.type === "circle") return add(body.pos, mul(dir, body.radius));
    const vertices = rectVertices(body);
    let best = vertices[0];
    let bestScore = dot(best, dir);
    for (let i = 1; i < vertices.length; i += 1) {
      const score = dot(vertices[i], dir);
      if (score > bestScore) {
        bestScore = score;
        best = vertices[i];
      }
    }
    return best;
  }

  function circleCircleCollision(a, b) {
    const delta = sub(b.pos, a.pos);
    const distance = len(delta);
    const radiusSum = a.radius + b.radius;
    if (distance >= radiusSum) return null;
    const normal = distance < 1e-6 ? v(1, 0) : mul(delta, 1 / distance);
    const penetration = radiusSum - distance;
    const contact = add(a.pos, mul(normal, a.radius - penetration * 0.5));
    return { normal, penetration, contact };
  }

  function rectRectCollision(a, b) {
    const verticesA = rectVertices(a);
    const verticesB = rectVertices(b);
    const axes = [...bodyAxes(a), ...bodyAxes(b)];
    let bestAxis = null;
    let bestOverlap = Infinity;
    for (const rawAxis of axes) {
      const axis = unit(rawAxis);
      const projA = projectVertices(axis, verticesA);
      const projB = projectVertices(axis, verticesB);
      const overlap = Math.min(projA.max, projB.max) - Math.max(projA.min, projB.min);
      if (overlap <= 0) return null;
      if (overlap < bestOverlap) {
        bestOverlap = overlap;
        bestAxis = axis;
      }
    }
    let normal = bestAxis;
    if (dot(sub(b.pos, a.pos), normal) < 0) normal = mul(normal, -1);
    const pointA = supportPoint(a, normal);
    const pointB = supportPoint(b, mul(normal, -1));
    return { normal, penetration: bestOverlap, contact: mul(add(pointA, pointB), 0.5) };
  }

  function circleRectCollision(circle, rect, reverse) {
    const localCenter = inverseRotate(sub(circle.pos, rect.pos), rect.angle);
    const halfW = rect.width * 0.5;
    const halfH = rect.height * 0.5;
    const closestLocal = v(clamp(localCenter.x, -halfW, halfW), clamp(localCenter.y, -halfH, halfH));
    let normalLocal;
    let penetration;
    const delta = sub(closestLocal, localCenter);
    const distance = len(delta);

    if (distance > 1e-6) {
      if (distance >= circle.radius) return null;
      normalLocal = mul(delta, 1 / distance);
      penetration = circle.radius - distance;
    } else {
      const dx = halfW - Math.abs(localCenter.x);
      const dy = halfH - Math.abs(localCenter.y);
      if (dx < dy) {
        normalLocal = v(localCenter.x >= 0 ? 1 : -1, 0);
        penetration = circle.radius + dx;
        closestLocal.x = localCenter.x >= 0 ? halfW : -halfW;
      } else {
        normalLocal = v(0, localCenter.y >= 0 ? 1 : -1);
        penetration = circle.radius + dy;
        closestLocal.y = localCenter.y >= 0 ? halfH : -halfH;
      }
    }

    const normal = rotate(normalLocal, rect.angle);
    const contact = add(rect.pos, rotate(closestLocal, rect.angle));
    if (reverse) {
      return { normal: mul(normal, -1), penetration, contact };
    }
    return { normal, penetration, contact };
  }

  function collisionProxy(body) {
    if (body.type !== "polyline") return body;
    return {
      ...body,
      type: "rectangle",
      width: body.width,
      height: body.height,
    };
  }

  function detectCollision(a, b) {
    const radiusDistance = len(sub(b.pos, a.pos));
    if (radiusDistance > bodyBoundingRadius(a) + bodyBoundingRadius(b)) return null;
    const bodyA = collisionProxy(a);
    const bodyB = collisionProxy(b);
    if (bodyA.type === "circle" && bodyB.type === "circle") return circleCircleCollision(bodyA, bodyB);
    if (bodyA.type === "rectangle" && bodyB.type === "rectangle") return rectRectCollision(bodyA, bodyB);
    if (bodyA.type === "circle" && bodyB.type === "rectangle") return circleRectCollision(bodyA, bodyB, false);
    if (bodyA.type === "rectangle" && bodyB.type === "circle") return circleRectCollision(bodyB, bodyA, true);
    return null;
  }

  function positionalCorrection(a, b, collision) {
    const invMassSum = a.invMass + b.invMass;
    if (invMassSum <= 0) return;
    const correctionMagnitude = (Math.max(collision.penetration - POSITION_CORRECTION_SLOP, 0) / invMassSum) * POSITION_CORRECTION_PERCENT;
    const correction = mul(collision.normal, correctionMagnitude);
    a.pos = sub(a.pos, mul(correction, a.invMass));
    b.pos = add(b.pos, mul(correction, b.invMass));
  }

  function resolveCollision(a, b, collision) {
    positionalCorrection(a, b, collision);

    const ra = sub(collision.contact, a.pos);
    const rb = sub(collision.contact, b.pos);
    const velocityA = add(a.vel, crossSV(a.angularVel, ra));
    const velocityB = add(b.vel, crossSV(b.angularVel, rb));
    const relativeVelocity = sub(velocityB, velocityA);
    const velocityAlongNormal = dot(relativeVelocity, collision.normal);
    if (velocityAlongNormal > 0) return;

    const raCrossN = cross(ra, collision.normal);
    const rbCrossN = cross(rb, collision.normal);
    const invMassSum =
      a.invMass +
      b.invMass +
      raCrossN * raCrossN * a.invInertia +
      rbCrossN * rbCrossN * b.invInertia;
    if (invMassSum <= 1e-8) return;

    const restitution = Math.min(a.restitution, b.restitution);
    const impulseMagnitude = (-(1 + restitution) * velocityAlongNormal) / invMassSum;
    const impulse = mul(collision.normal, impulseMagnitude);

    a.vel = sub(a.vel, mul(impulse, a.invMass));
    b.vel = add(b.vel, mul(impulse, b.invMass));
    a.angularVel -= cross(ra, impulse) * a.invInertia;
    b.angularVel += cross(rb, impulse) * b.invInertia;

    const tangentVelocity = sub(relativeVelocity, mul(collision.normal, velocityAlongNormal));
    const tangentLength = len(tangentVelocity);
    if (tangentLength < 1e-6) return;
    const tangent = mul(tangentVelocity, 1 / tangentLength);
    const raCrossT = cross(ra, tangent);
    const rbCrossT = cross(rb, tangent);
    const frictionDenominator =
      a.invMass +
      b.invMass +
      raCrossT * raCrossT * a.invInertia +
      rbCrossT * rbCrossT * b.invInertia;
    if (frictionDenominator <= 1e-8) return;

    let frictionImpulseMagnitude = -dot(relativeVelocity, tangent) / frictionDenominator;
    const mu = Math.sqrt(a.friction * b.friction);
    frictionImpulseMagnitude = clamp(frictionImpulseMagnitude, -impulseMagnitude * mu, impulseMagnitude * mu);
    const frictionImpulse = mul(tangent, frictionImpulseMagnitude);

    a.vel = sub(a.vel, mul(frictionImpulse, a.invMass));
    b.vel = add(b.vel, mul(frictionImpulse, b.invMass));
    a.angularVel -= cross(ra, frictionImpulse) * a.invInertia;
    b.angularVel += cross(rb, frictionImpulse) * b.invInertia;
  }

  function solveBodyCollisions() {
    for (let i = 0; i < state.bodies.length; i += 1) {
      for (let j = i + 1; j < state.bodies.length; j += 1) {
        const collision = detectCollision(state.bodies[i], state.bodies[j]);
        if (collision) resolveCollision(state.bodies[i], state.bodies[j], collision);
      }
    }
  }

  function solveBoundaryCollisions() {
    for (const body of state.bodies) {
      const radius = bodyBoundingRadius(body);
      if (body.pos.x < radius) {
        body.pos.x = radius;
        if (body.vel.x < 0) body.vel.x *= -body.restitution;
      }
      if (body.pos.x > simCanvas.width - radius) {
        body.pos.x = simCanvas.width - radius;
        if (body.vel.x > 0) body.vel.x *= -body.restitution;
      }
      if (body.pos.y < radius) {
        body.pos.y = radius;
        if (body.vel.y < 0) body.vel.y *= -body.restitution;
      }
      if (body.pos.y > simCanvas.height - radius) {
        body.pos.y = simCanvas.height - radius;
        if (body.vel.y > 0) body.vel.y *= -body.restitution;
      }
    }
  }

  function integrate(dt) {
    const linearDamping = Math.pow(LINEAR_DAMPING, dt * 120);
    const angularDamping = Math.pow(ANGULAR_DAMPING, dt * 120);

    for (const body of state.bodies) {
      if (body.fixed) {
        body.vel = v(0, 0);
        body.angularVel = 0;
        continue;
      }
      const accel = mul(body.force, body.invMass);
      body.vel = add(body.vel, mul(accel, dt));
      body.angularVel += body.torque * body.invInertia * dt;
      body.vel = mul(body.vel, linearDamping);
      body.angularVel *= angularDamping;
      body.pos = add(body.pos, mul(body.vel, dt));
      body.angle += body.angularVel * dt;
    }

    for (let iteration = 0; iteration < 4; iteration += 1) {
      solveBodyCollisions();
      solveBoundaryCollisions();
    }
    invalidateMagneticAnalysis();
  }

  function sampleTracking() {
    const { bodyId, metric } = state.tracking;
    if (!bodyId) return;
    const body = state.bodies.find((entry) => entry.id === bodyId);
    if (!body) return;

    let value = 0;
    if (metric === "force") value = len(body.force);
    else if (metric === "torque") value = body.torque;
    else if (metric === "x") value = body.pos.x;
    else if (metric === "y") value = body.pos.y;
    else if (metric === "angle") value = (body.angle * 180) / Math.PI;

    state.tracking.samples.push({ t: worldTime, v: value });
    if (state.tracking.samples.length > TRACK_SAMPLE_LIMIT) state.tracking.samples.shift();
  }

  function step(dt) {
    resetForces();
    applyConstraints();
    applyMagnetics();
    applySurfaceResistance();
    integrate(dt);
    worldTime += dt;
    sampleTracking();
  }

  function drawArrow(base, vector, color, strengthScale = null) {
    const magnitude = len(vector);
    if (magnitude < 0.001) return;
    const normalizedStrength = clamp(
      strengthScale == null ? magnitude / ARROW_STRENGTH_NORMALIZER : strengthScale,
      MIN_ARROW_STRENGTH_SCALE,
      1
    );
    const strokeWidth = lerp(0.75, 2.3, normalizedStrength);
    const headLength = lerp(4, 10, normalizedStrength);
    const headWidth = lerp(2, 5.5, normalizedStrength);
    const target = add(base, vector);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = strokeWidth;
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.lineTo(target.x, target.y);
    ctx.stroke();
    const direction = unit(vector);
    const normal = perp(direction);
    ctx.beginPath();
    ctx.moveTo(target.x, target.y);
    ctx.lineTo(
      target.x - direction.x * headLength + normal.x * headWidth,
      target.y - direction.y * headLength + normal.y * headWidth
    );
    ctx.lineTo(
      target.x - direction.x * headLength - normal.x * headWidth,
      target.y - direction.y * headLength - normal.y * headWidth
    );
    ctx.closePath();
    ctx.fill();
  }

  function visibleWorldBounds() {
    return {
      topLeft: screenToWorld(v(0, 0)),
      bottomRight: screenToWorld(v(simCanvas.width, simCanvas.height)),
    };
  }

  function drawFieldArrows(granules) {
    const arrowSpacing = clamp(Number(state.display.fieldArrowSpacing) || 22, 8, 200);
    const resolution = clamp(Number(state.display.fieldSampleResolution) || 6, 2, arrowSpacing);
    const scale = clamp(Number(state.display.fieldScale) || 1800, MIN_FIELD_SCALE, MAX_FIELD_SCALE);
    const threshold = Math.max(0, Number(state.display.fieldThreshold) || 0);
    const subsamples = Math.max(1, Math.ceil(arrowSpacing / resolution));
    const offsetStart = -((subsamples - 1) * resolution) / 2;
    const { topLeft: worldTopLeft, bottomRight: worldBottomRight } = visibleWorldBounds();
    const firstGridPoint = (coord) => Math.floor((coord - arrowSpacing * 0.5) / arrowSpacing) * arrowSpacing + arrowSpacing * 0.5;
    const startX = firstGridPoint(worldTopLeft.x);
    const startY = firstGridPoint(worldTopLeft.y);

    for (let y = startY; y <= worldBottomRight.y + arrowSpacing; y += arrowSpacing) {
      for (let x = startX; x <= worldBottomRight.x + arrowSpacing; x += arrowSpacing) {
        const worldPoint = v(x, y);
        const screenPoint = worldToScreen(worldPoint);
        let field = v(0, 0);
        let count = 0;
        for (let sy = 0; sy < subsamples; sy += 1) {
          for (let sx = 0; sx < subsamples; sx += 1) {
            const sample = add(worldPoint, v(offsetStart + sx * resolution, offsetStart + sy * resolution));
            field = add(field, magneticFieldAtPoint(sample, granules));
            count += 1;
          }
        }
        field = mul(field, 1 / count);
        const magnitude = len(field);
        if (magnitude < threshold) continue;
        const arrowLength =
          clamp(magnitude * (scale / FIELD_ARROW_LENGTH_SCALE_DIVISOR), MIN_FIELD_ARROW_LENGTH, MAX_FIELD_ARROW_LENGTH) *
          lerp(
            0.7,
            1,
            clamp((magnitude - threshold) / Math.max(FIELD_STRENGTH_RATIO_DIVISOR, 1), MIN_ARROW_STRENGTH_SCALE, 1)
          );
        const strengthRatio = clamp(arrowLength / MAX_FIELD_ARROW_LENGTH, MIN_ARROW_STRENGTH_SCALE, 1);
        drawArrow(screenPoint, mul(unit(field), arrowLength), fieldArrowColorAtPoint(worldPoint, granules), strengthRatio);
      }
    }
  }

  function drawFieldHeatmap(granules) {
    const spacing = clamp(Number(state.display.fieldArrowSpacing) || 22, 8, 200);
    const threshold = Math.max(0, Number(state.display.fieldThreshold) || 0);
    const scale = clamp(Number(state.display.fieldScale) || 1800, MIN_FIELD_SCALE, MAX_FIELD_SCALE);
    const { topLeft, bottomRight } = visibleWorldBounds();
    const firstGridPoint = (coord) => Math.floor(coord / spacing) * spacing;

    for (let y = firstGridPoint(topLeft.y); y <= bottomRight.y + spacing; y += spacing) {
      for (let x = firstGridPoint(topLeft.x); x <= bottomRight.x + spacing; x += spacing) {
        const worldPoint = v(x + spacing * 0.5, y + spacing * 0.5);
        const field = magneticFieldAtPoint(worldPoint, granules);
        const magnitude = len(field);
        if (magnitude < threshold) continue;
        const strength = clamp((magnitude - threshold) / Math.max(scale * 0.02, 1), 0, 1);
        const { r, g, b } = fieldColorComponentsAtPoint(worldPoint, granules);
        const alpha = strength * DEFAULT_HEATMAP_ALPHA;
        const screenPoint = worldToScreen(v(x, y));
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
        ctx.fillRect(screenPoint.x, screenPoint.y, spacing + HEATMAP_TILE_OVERLAP, spacing + HEATMAP_TILE_OVERLAP);
      }
    }
  }

  function collectFieldLineSources(granules) {
    const sources = [];
    const paintedGranules = granules.filter((granule) => Math.abs(granule.polePaint) > 0.001);
    for (const granule of paintedGranules) {
      const axis = magneticAxis(granule.body);
      const sign = granule.polePaint > 0 ? 1 : -1;
      const extent = Math.max(MIN_GRANULE_POLE_EXTENT, granule.sampleRadius * 0.5);
      sources.push({
        pos: add(granule.pos, mul(axis, extent * sign)),
        sign,
        axis,
        sampleRadius: granule.sampleRadius,
      });
    }
    if (sources.length) return sources;

    for (const body of state.bodies) {
      if (!magneticEnabled(body)) continue;
      const axis = magneticAxis(body);
      const extent = body.type === "circle" ? body.radius : Math.max(body.width, body.height) * 0.45;
      const northSign = body.magnetic.polarity === -1 ? -1 : 1;
      sources.push({ pos: add(body.pos, mul(axis, extent * northSign)), sign: 1, axis, sampleRadius: extent * 0.25 });
      sources.push({ pos: add(body.pos, mul(axis, -extent * northSign)), sign: -1, axis, sampleRadius: extent * 0.25 });
    }
    return sources;
  }

  function traceFieldLine(startPoint, sign, granules, bounds) {
    const points = [worldToScreen(startPoint)];
    let current = startPoint;
    let lastDirection = null;
    for (let stepIndex = 0; stepIndex < FIELD_LINE_MAX_STEPS; stepIndex += 1) {
      const field = magneticFieldAtPoint(current, granules);
      const magnitude = len(field);
      if (magnitude < Math.max(0.0001, state.display.fieldThreshold * 0.25)) break;
      const direction = mul(unit(field), sign);
      if (lastDirection && dot(direction, lastDirection) < -0.35) break;
      const next = add(current, mul(direction, FIELD_LINE_STEP));
      if (
        next.x < bounds.minX ||
        next.x > bounds.maxX ||
        next.y < bounds.minY ||
        next.y > bounds.maxY
      ) {
        break;
      }
      const nextScreenPoint = worldToScreen(next);
      const recentPointStart = Math.max(0, points.length - 24);
      let loopsBack = false;
      for (let pointIndex = recentPointStart; pointIndex < points.length; pointIndex += 1) {
        if (len(sub(points[pointIndex], nextScreenPoint)) < FIELD_LINE_LOOP_THRESHOLD) {
          loopsBack = true;
          break;
        }
      }
      if (loopsBack) break;
      points.push(nextScreenPoint);
      current = next;
      lastDirection = direction;
    }
    return points;
  }

  function drawFieldLines(granules) {
    if (!state.display.fieldLinesEnabled) return;
    const sources = collectFieldLineSources(granules);
    if (!sources.length) return;
    const lineCount = clamp(Math.round(Number(state.display.fieldLineCount) || 3), 1, 12);
    const { topLeft, bottomRight } = visibleWorldBounds();
    const bounds = {
      minX: topLeft.x - simCanvas.width,
      maxX: bottomRight.x + simCanvas.width,
      minY: topLeft.y - simCanvas.height,
      maxY: bottomRight.y + simCanvas.height,
    };

    for (const source of sources) {
      const tangent = perp(source.axis);
      for (let i = 0; i < lineCount; i += 1) {
        const offset = lineCount === 1 ? 0 : (i / (lineCount - 1) - 0.5) * source.sampleRadius * 1.6;
        const start = add(source.pos, mul(tangent, offset));
        const points = traceFieldLine(start, source.sign > 0 ? 1 : -1, granules, bounds);
        if (points.length < 2) continue;
        ctx.strokeStyle = source.sign > 0 ? "rgba(251,113,133,0.68)" : "rgba(96,165,250,0.68)";
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let pointIndex = 1; pointIndex < points.length; pointIndex += 1) {
          ctx.lineTo(points[pointIndex].x, points[pointIndex].y);
        }
        ctx.stroke();
      }
    }
  }

  function drawField(granules) {
    if (state.display.fieldRenderMode === "heatmap") drawFieldHeatmap(granules);
    else drawFieldArrows(granules);
    drawFieldLines(granules);
  }

  function bodyResizeHandles(body) {
    if (body.type === "circle") {
      return [
        { kind: "resize", axisX: "max", axisY: null, localPos: v(body.radius, 0) },
        { kind: "resize", axisX: "min", axisY: null, localPos: v(-body.radius, 0) },
        { kind: "resize", axisX: null, axisY: "min", localPos: v(0, -body.radius) },
        { kind: "resize", axisX: null, axisY: "max", localPos: v(0, body.radius) },
      ];
    }
    if (body.type === "polyline") return [];
    const halfW = body.width * 0.5;
    const halfH = body.height * 0.5;
    return [
      { kind: "resize", axisX: "min", axisY: "min", localPos: v(-halfW, -halfH) },
      { kind: "resize", axisX: "max", axisY: "min", localPos: v(halfW, -halfH) },
      { kind: "resize", axisX: "max", axisY: "max", localPos: v(halfW, halfH) },
      { kind: "resize", axisX: "min", axisY: "max", localPos: v(-halfW, halfH) },
      { kind: "resize", axisX: null, axisY: "min", localPos: v(0, -halfH) },
      { kind: "resize", axisX: "max", axisY: null, localPos: v(halfW, 0) },
      { kind: "resize", axisX: null, axisY: "max", localPos: v(0, halfH) },
      { kind: "resize", axisX: "min", axisY: null, localPos: v(-halfW, 0) },
    ];
  }

  function polylineInsertHandles(body) {
    if (body.type !== "polyline") return [];
    const points = body.points?.length ? body.points : defaultPolylinePoints();
    return points.map((point, index) => {
      const next = points[(index + 1) % points.length];
      return {
        kind: "insert-vertex",
        edgeIndex: index,
        localPos: v((point.x + next.x) * 0.5, (point.y + next.y) * 0.5),
      };
    });
  }

  function polylineVertexHandles(body) {
    if (body.type !== "polyline") return [];
    const points = body.points?.length ? body.points : defaultPolylinePoints();
    return points.map((point, index) => ({
      kind: "vertex",
      vertexIndex: index,
      localPos: point,
    }));
  }

  function pickSelectedBodyHandle(point, body) {
    const handleRadius = body.type === "polyline" ? POLYLINE_VERTEX_HANDLE_RADIUS + 3 : RESIZE_HANDLE_RADIUS + 4;
    for (const handle of polylineVertexHandles(body)) {
      if (len(sub(point, localPointToWorld(body, handle.localPos))) <= handleRadius) return handle;
    }
    for (const handle of polylineInsertHandles(body)) {
      if (len(sub(point, localPointToWorld(body, handle.localPos))) <= POLYLINE_INSERT_HANDLE_RADIUS + 4) return handle;
    }
    for (const handle of bodyResizeHandles(body)) {
      if (len(sub(point, localPointToWorld(body, handle.localPos))) <= RESIZE_HANDLE_RADIUS + 4) return handle;
    }
    return null;
  }

  function pickPolylineEdge(point, body) {
    if (body.type !== "polyline") return null;
    const points = body.points?.length ? body.points : defaultPolylinePoints();
    let best = null;
    let bestDistance = POLYLINE_EDGE_PICK_DISTANCE;
    for (let index = 0; index < points.length; index += 1) {
      const start = localPointToWorld(body, points[index]);
      const end = localPointToWorld(body, points[(index + 1) % points.length]);
      const distance = distancePointToSegment(point, start, end);
      if (distance <= bestDistance) {
        bestDistance = distance;
        best = { edgeIndex: index };
      }
    }
    return best;
  }

  function drawBodyGranules(body, granules) {
    if (!granules?.length) return;
    const momentColor = magneticEnabled(body) ? GRANULE_PERMANENT_MOMENT_COLOR : GRANULE_INDUCED_MOMENT_COLOR;
    ctx.save();
    ctx.translate(body.pos.x, body.pos.y);
    ctx.rotate(body.angle);
    traceBodyPath(ctx, body);
    ctx.clip();
    for (const granule of granules) {
      const cellWidth = Math.max(4, (granule.cellWidth || granule.sampleRadius * 2) - GRANULE_PIXEL_PADDING * 1.25);
      const cellHeight = Math.max(4, (granule.cellHeight || granule.sampleRadius * 2) - GRANULE_PIXEL_PADDING * 1.25);
      const color =
        granule.polePaint > 0.001
          ? "rgba(248,113,113,0.95)"
          : granule.polePaint < -0.001
            ? "rgba(96,165,250,0.95)"
            : NEUTRAL_GRANULE_COLOR;
      ctx.fillStyle = color;
      if (body.type === "circle") {
        ctx.beginPath();
        ctx.ellipse(granule.localPos.x, granule.localPos.y, cellWidth * 0.45, cellHeight * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(granule.localPos.x - cellWidth * 0.5, granule.localPos.y - cellHeight * 0.5, cellWidth, cellHeight);
      }
    }
    ctx.restore();
    for (const granule of granules) {
      const momentMagnitude = len(granule.effectiveMoment);
      if (momentMagnitude > 1e-4 && Math.abs(granule.polePaint) <= 0.001) {
        const arrowLength = clamp(momentMagnitude * GRANULE_MOMENT_ARROW_SCALE, MIN_GRANULE_ARROW_LENGTH, MAX_GRANULE_ARROW_LENGTH);
        drawArrow(
          granule.pos,
          mul(unit(granule.effectiveMoment), arrowLength),
          momentColor,
          clamp(arrowLength / MAX_GRANULE_ARROW_LENGTH, MIN_ARROW_STRENGTH_SCALE, 1)
        );
      }

      const forceMagnitude = len(granule.force);
      if (forceMagnitude > 1e-3) {
        const scaledForceLength = forceMagnitude * GRANULE_FORCE_ARROW_SCALE;
        drawArrow(
          granule.pos,
          mul(unit(granule.force), Math.min(MAX_GRANULE_FORCE_ARROW_LENGTH, scaledForceLength)),
          "rgba(34,197,94,0.72)",
          0.35
        );
      }
    }
  }

  function drawSelectedBodyEditHandles(body) {
    if (body.type === "polyline") {
      const points = body.points?.length ? body.points : defaultPolylinePoints();
      ctx.save();
      ctx.translate(body.pos.x, body.pos.y);
      ctx.rotate(body.angle);
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = "rgba(250,204,21,0.92)";
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let index = 1; index < points.length; index += 1) ctx.lineTo(points[index].x, points[index].y);
      ctx.closePath();
      ctx.stroke();
      for (const handle of polylineInsertHandles(body)) {
        ctx.save();
        ctx.translate(handle.localPos.x, handle.localPos.y);
        ctx.rotate(Math.PI * 0.25);
        ctx.fillStyle = "rgba(34,211,238,0.94)";
        ctx.fillRect(-POLYLINE_INSERT_HANDLE_RADIUS, -POLYLINE_INSERT_HANDLE_RADIUS, POLYLINE_INSERT_HANDLE_RADIUS * 2, POLYLINE_INSERT_HANDLE_RADIUS * 2);
        ctx.restore();
      }
      for (const handle of polylineVertexHandles(body)) {
        ctx.fillStyle = "rgba(250,204,21,0.96)";
        ctx.strokeStyle = "#0f172a";
        ctx.beginPath();
        ctx.arc(handle.localPos.x, handle.localPos.y, POLYLINE_VERTEX_HANDLE_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
      return;
    }
    for (const handle of bodyResizeHandles(body)) {
      const world = localPointToWorld(body, handle.localPos);
      ctx.fillStyle = "rgba(34,211,238,0.94)";
      ctx.strokeStyle = "#0f172a";
      ctx.beginPath();
      ctx.arc(world.x, world.y, RESIZE_HANDLE_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  function drawBody(body, granules) {
    const selected = body.id === state.selectedBodyId;
    const material = materialById(body.materialId);
    ctx.save();
    ctx.translate(body.pos.x, body.pos.y);
    ctx.rotate(body.angle);
    ctx.lineWidth = selected ? 3 : 1.5;
    ctx.strokeStyle = selected ? "#facc15" : bodyHasMagneticBehavior(body) ? "#f97316" : "#38bdf8";
    ctx.fillStyle = bodyHasMagneticBehavior(body) ? "rgba(124,45,18,0.24)" : "rgba(30,41,59,0.7)";

    traceBodyPath(ctx, body);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "12px Inter, sans-serif";
    ctx.fillText(`#${body.id}${body.fixed ? " 📌" : ""}`, 8, -8);
    ctx.fillText(material.name, 8, 8);

    if (magneticEnabled(body) && !bodyHasPaintedPoles(body)) {
      const localAngle = body.magnetic.localAngle;
      const axis = v(Math.cos(localAngle), Math.sin(localAngle));
      const extent = body.type === "circle" ? body.radius : Math.max(body.width, body.height) * 0.45;
      const northSign = body.magnetic.polarity === -1 ? -1 : 1;
      const north = mul(axis, extent * northSign);
      const south = mul(axis, -extent * northSign);
      ctx.strokeStyle = "#fda4af";
      ctx.beginPath();
      ctx.moveTo(south.x, south.y);
      ctx.lineTo(north.x, north.y);
      ctx.stroke();
      ctx.fillStyle = "#fb7185";
      ctx.beginPath();
      ctx.arc(north.x, north.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText("N", north.x + 6, north.y - 4);
      ctx.fillStyle = "#60a5fa";
      ctx.beginPath();
      ctx.arc(south.x, south.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText("S", south.x + 6, south.y - 4);
    }

    ctx.restore();

    drawBodyGranules(body, granules);
    drawArrow(body.pos, mul(unit(body.force), Math.min(32, len(body.force) * 0.02)), "#22c55e");
    drawArrow(body.pos, v(0, clamp(-body.torque * 0.04, -26, 26)), "#a78bfa");

    if (selected) {
      const handle = selectedBodyRotateHandle(body);
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(body.pos.x, body.pos.y);
      ctx.lineTo(handle.x, handle.y);
      ctx.stroke();
      ctx.fillStyle = state.interaction.mode === "rotate" ? "#f59e0b" : "#facc15";
      ctx.beginPath();
      ctx.arc(handle.x, handle.y, ROTATE_HANDLE_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#0f172a";
      ctx.stroke();
      drawSelectedBodyEditHandles(body);
    }
  }

  function drawBrushCursor() {
    const pointer = state.pointer.world;
    const body = state.bodies.find((entry) => entry.id === state.selectedBodyId);
    if (!state.poleBrush.enabled || !pointer || !body || !pointInBody(pointer, body)) return;
    const localPointer = worldPointToLocal(body, pointer);
    const screenPointer = worldToScreen(pointer);
    let previewRadius = 18;
    if (body.granules?.length) {
      let closestGranule = body.granules[0];
      let closestDistance = len(sub(localPointer, closestGranule.localPos));
      for (const granule of body.granules) {
        const distance = len(sub(localPointer, granule.localPos));
        if (distance < closestDistance) {
          closestGranule = granule;
          closestDistance = distance;
        }
      }
      previewRadius = closestGranule.sampleRadius * (BRUSH_BASE_RADIUS_FACTOR + state.poleBrush.radius * BRUSH_RADIUS_SCALE_FACTOR);
    }
    ctx.save();
    ctx.strokeStyle = state.poleBrush.mode > 0 ? "rgba(248,113,113,0.94)" : state.poleBrush.mode < 0 ? "rgba(96,165,250,0.94)" : "rgba(148,163,184,0.94)";
    ctx.fillStyle = "rgba(15,23,42,0.16)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(screenPointer.x, screenPointer.y, previewRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function zeroBodyMotion(body) {
    body.vel = v(0, 0);
    body.force = v(0, 0);
    body.angularVel = 0;
    body.torque = 0;
  }

  function commitDirectBodyEdit(body) {
    zeroBodyMotion(body);
    syncBodyDerived(body);
    body.setup = captureBodySetup(body);
    invalidateMagneticAnalysis();
    syncSelectedBodyInspector(false);
    syncDisplayInputs();
  }

  function updateResizingBody(body, worldPoint) {
    const start = state.interaction.startSetup;
    const handle = state.interaction.handle;
    if (!start || !handle) return;
    const localPoint = inverseRotate(sub(worldPoint, start.pos), start.angle);
    if (start.type === "circle") {
      let minX = -start.radius;
      let maxX = start.radius;
      let minY = -start.radius;
      let maxY = start.radius;
      if (handle.axisX === "min") minX = Math.min(localPoint.x, maxX - MIN_CIRCLE_RADIUS * 2);
      if (handle.axisX === "max") maxX = Math.max(localPoint.x, minX + MIN_CIRCLE_RADIUS * 2);
      if (handle.axisY === "min") minY = Math.min(localPoint.y, maxY - MIN_CIRCLE_RADIUS * 2);
      if (handle.axisY === "max") maxY = Math.max(localPoint.y, minY + MIN_CIRCLE_RADIUS * 2);
      const radius = Math.max(MIN_CIRCLE_RADIUS, Math.max(maxX - minX, maxY - minY) * 0.5);
      const centerOffset = v((minX + maxX) * 0.5, (minY + maxY) * 0.5);
      body.pos = add(start.pos, rotate(centerOffset, start.angle));
      body.radius = radius;
      body.angle = start.angle;
    } else {
      let minX = -start.width * 0.5;
      let maxX = start.width * 0.5;
      let minY = -start.height * 0.5;
      let maxY = start.height * 0.5;
      if (handle.axisX === "min") minX = Math.min(localPoint.x, maxX - MIN_BODY_AXIS_SIZE);
      if (handle.axisX === "max") maxX = Math.max(localPoint.x, minX + MIN_BODY_AXIS_SIZE);
      if (handle.axisY === "min") minY = Math.min(localPoint.y, maxY - MIN_BODY_AXIS_SIZE);
      if (handle.axisY === "max") maxY = Math.max(localPoint.y, minY + MIN_BODY_AXIS_SIZE);
      body.width = Math.max(MIN_BODY_AXIS_SIZE, maxX - minX);
      body.height = Math.max(MIN_BODY_AXIS_SIZE, maxY - minY);
      const centerOffset = v((minX + maxX) * 0.5, (minY + maxY) * 0.5);
      body.pos = add(start.pos, rotate(centerOffset, start.angle));
      body.angle = start.angle;
    }
    commitDirectBodyEdit(body);
  }

  function updatePolylineVertex(body, worldPoint) {
    const startPoints = state.interaction.startPoints;
    const handle = state.interaction.handle;
    if (!startPoints || !handle) return;
    body.points = startPoints.map((point) => v(point.x, point.y));
    body.points[handle.vertexIndex] = worldPointToLocal(body, worldPoint);
    commitDirectBodyEdit(body);
  }

  function updatePolylineEdge(body, worldPoint) {
    const startPoints = state.interaction.startPoints;
    const handle = state.interaction.handle;
    const startLocal = state.interaction.startLocalPoint;
    if (!startPoints || !handle || !startLocal) return;
    const localPoint = worldPointToLocal(body, worldPoint);
    const localDelta = sub(localPoint, startLocal);
    const nextIndex = (handle.edgeIndex + 1) % startPoints.length;
    body.points = startPoints.map((point) => v(point.x, point.y));
    body.points[handle.edgeIndex] = add(body.points[handle.edgeIndex], localDelta);
    body.points[nextIndex] = add(body.points[nextIndex], localDelta);
    commitDirectBodyEdit(body);
  }

  function insertPolylineVertex(body, edgeIndex, localPoint) {
    const nextIndex = (edgeIndex + 1) % body.points.length;
    body.points.splice(nextIndex, 0, v(localPoint.x, localPoint.y));
    commitDirectBodyEdit(body);
    return nextIndex;
  }

  function removePolylineVertex(body, vertexIndex) {
    if (body.type !== "polyline" || (body.points?.length || 0) <= MIN_POLYLINE_VERTICES) return false;
    body.points.splice(vertexIndex, 1);
    commitDirectBodyEdit(body);
    setInteractionSummary(`Removed vertex ${vertexIndex + 1} from shape #${body.id}`);
    return true;
  }

  function render() {
    const magneticAnalysis = getMagneticGranuleAnalysis();
    const granulesByBody = new Map();
    for (const granule of magneticAnalysis.granules) {
      if (!granulesByBody.has(granule.bodyId)) granulesByBody.set(granule.bodyId, []);
      granulesByBody.get(granule.bodyId).push(granule);
    }
    ctx.clearRect(0, 0, simCanvas.width, simCanvas.height);
    drawField(magneticAnalysis.granules);

    ctx.save();
    ctx.translate(state.view.pan.x, state.view.pan.y);
    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = 1;
    for (const constraint of state.constraints) {
      const a = state.bodies.find((body) => body.id === constraint.aId);
      const b = state.bodies.find((body) => body.id === constraint.bId);
      if (!a || !b) continue;
      ctx.strokeStyle = constraint.id === state.selectedConstraintId ? "#facc15" : "#22d3ee";
      ctx.lineWidth = constraint.id === state.selectedConstraintId ? 2.6 : 1.2;
      ctx.beginPath();
      ctx.moveTo(a.pos.x, a.pos.y);
      ctx.lineTo(b.pos.x, b.pos.y);
      ctx.stroke();
    }

    for (const body of state.bodies) drawBody(body, granulesByBody.get(body.id));
    ctx.restore();
    drawBrushCursor();
  }

  function renderPlot() {
    pctx.clearRect(0, 0, plotCanvas.width, plotCanvas.height);
    const samples = state.tracking.samples;
    pctx.strokeStyle = "#334155";
    pctx.beginPath();
    pctx.moveTo(0, plotCanvas.height * 0.5);
    pctx.lineTo(plotCanvas.width, plotCanvas.height * 0.5);
    pctx.stroke();

    if (samples.length < 2) return;
    const minT = samples[0].t;
    const maxT = samples[samples.length - 1].t;
    const minV = Math.min(...samples.map((sample) => sample.v));
    const maxV = Math.max(...samples.map((sample) => sample.v));
    const tSpan = Math.max(0.0001, maxT - minT);
    const vSpan = Math.max(0.0001, maxV - minV);

    pctx.strokeStyle = "#22d3ee";
    pctx.beginPath();
    for (let i = 0; i < samples.length; i += 1) {
      const sample = samples[i];
      const x = ((sample.t - minT) / tSpan) * plotCanvas.width;
      const y = plotCanvas.height - ((sample.v - minV) / vSpan) * plotCanvas.height;
      if (i === 0) pctx.moveTo(x, y);
      else pctx.lineTo(x, y);
    }
    pctx.stroke();
  }

  function frame(ts) {
    const elapsed = Math.min(0.1, (ts - lastTs) / 1000);
    lastTs = ts;
    if (running) {
      accumulator += elapsed;
      let steps = 0;
      while (accumulator >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
        step(FIXED_DT);
        accumulator -= FIXED_DT;
        steps += 1;
      }
    }
    render();
    renderPlot();
    requestAnimationFrame(frame);
  }

  function exportProject() {
    const payload = {
      nextBodyId,
      nextConstraintId,
      customMaterialCounter,
      worldTime,
      display: state.display,
      materials: state.materials,
      bodies: state.bodies.map((body) => ({
        id: body.id,
        type: body.type,
        pos: body.pos,
        vel: body.vel,
        force: body.force,
        angle: body.angle,
        angularVel: body.angularVel,
        torque: body.torque,
        width: body.width,
        height: body.height,
        radius: body.radius,
        points: body.points,
        materialId: body.materialId,
        massOverride: body.massOverride,
        meshGranularity: body.meshGranularity,
        surfaceResistance: body.surfaceResistance,
        fixed: body.fixed,
        magnetic: body.magnetic,
        polePaint: body.polePaint,
        setup: body.setup,
      })),
      constraints: state.constraints,
      tracking: state.tracking,
      selectedBodyId: state.selectedBodyId,
      selectedConstraintId: state.selectedConstraintId,
      selectedMaterialId: state.selectedMaterialId,
    };
    getEl("projectJson").value = JSON.stringify(payload, null, 2);
  }

  function importProject() {
    try {
      const data = JSON.parse(getEl("projectJson").value);
      state.materials = (data.materials || MATERIAL_PRESETS).map((material) => ({ ...material }));
      if (!state.materials.length) state.materials = MATERIAL_PRESETS.map((material) => ({ ...material }));

      state.display = {
        fieldRenderMode: data.display?.fieldRenderMode === "heatmap" ? "heatmap" : "arrows",
        fieldArrowSpacing: Number(data.display?.fieldArrowSpacing) || 22,
        fieldSampleResolution: Number(data.display?.fieldSampleResolution) || 6,
        fieldScale: Number(data.display?.fieldScale) || 1800,
        fieldThreshold: Math.max(0, Number(data.display?.fieldThreshold) || 0.01),
        fieldLinesEnabled: Boolean(data.display?.fieldLinesEnabled),
        fieldLineCount: clamp(Math.round(Number(data.display?.fieldLineCount) || 3), 1, 12),
      };

      state.bodies = [];
      for (const source of data.bodies || []) {
        const body = {
          id: Number(source.id) || nextBodyId++,
          type: BODY_TYPES.includes(source.type) ? source.type : "rectangle",
          pos: v(Number(source.pos?.x) || 0, Number(source.pos?.y) || 0),
          vel: v(Number(source.vel?.x) || 0, Number(source.vel?.y) || 0),
          force: v(0, 0),
          angle: Number(source.angle) || 0,
          angularVel: Number(source.angularVel) || 0,
          torque: 0,
          width: Number(source.width) || 40,
          height: Number(source.height) || 40,
          radius: Number(source.radius) || 20,
          points: (source.points?.length ? source.points : defaultPolylinePoints()).map((point) => v(Number(point.x) || 0, Number(point.y) || 0)),
          materialId: source.materialId || state.materials[0].id,
          massOverride: source.massOverride == null ? null : Number(source.massOverride),
          meshGranularity: clamp(
            Math.round(Number(source.meshGranularity) || DEFAULT_GRANULES_PER_AXIS),
            MIN_GRANULES_PER_AXIS,
            MAX_GRANULES_PER_AXIS
          ),
          surfaceResistance: (() => {
            const parsedSurfaceResistance = Number(source.surfaceResistance);
            return clamp(
              Number.isFinite(parsedSurfaceResistance) ? parsedSurfaceResistance : DEFAULT_SURFACE_RESISTANCE,
              0,
              MAX_SURFACE_RESISTANCE
            );
          })(),
          fixed: Boolean(source.fixed),
          magnetic: {
            enabled: Boolean(source.magnetic?.enabled),
            model: source.magnetic?.model || "permanentDipole",
            localAngle: Number(source.magnetic?.localAngle) || 0,
            strength: Math.max(0, Number(source.magnetic?.strength) || 0),
            polarity: Number(source.magnetic?.polarity) === -1 ? -1 : 1,
            remanence: Math.max(0, Number(source.magnetic?.remanence) || 0),
          },
          polePaint: Array.isArray(source.polePaint) ? source.polePaint.map((value) => Number(value) || 0) : [],
          setup: source.setup || null,
        };
        syncBodyDerived(body);
        body.setup = body.setup
          ? {
              ...body.setup,
              pos: { x: Number(body.setup.pos?.x) || body.pos.x, y: Number(body.setup.pos?.y) || body.pos.y },
              angle: Number(body.setup.angle) || body.angle,
              width: Number(body.setup.width) || body.width,
              height: Number(body.setup.height) || body.height,
              radius: Number(body.setup.radius) || body.radius,
              points: (body.setup.points?.length ? body.setup.points : body.points).map((point) => v(Number(point.x) || 0, Number(point.y) || 0)),
              materialId: body.setup.materialId || body.materialId,
              massOverride: body.setup.massOverride == null ? null : Number(body.setup.massOverride),
              meshGranularity: clamp(
                Math.round(Number(body.setup.meshGranularity) || body.meshGranularity),
                MIN_GRANULES_PER_AXIS,
                MAX_GRANULES_PER_AXIS
              ),
              surfaceResistance: (() => {
                const parsedSurfaceResistance = Number(body.setup.surfaceResistance);
                return clamp(
                  Number.isFinite(parsedSurfaceResistance) ? parsedSurfaceResistance : body.surfaceResistance,
                  0,
                  MAX_SURFACE_RESISTANCE
                );
              })(),
              fixed: Boolean(body.setup.fixed),
              magnetic: {
                enabled: Boolean(body.setup.magnetic?.enabled),
                model: body.setup.magnetic?.model || body.magnetic.model,
                localAngle: Number(body.setup.magnetic?.localAngle) || body.magnetic.localAngle,
                strength: Math.max(0, Number(body.setup.magnetic?.strength) || body.magnetic.strength),
                polarity: Number(body.setup.magnetic?.polarity) === -1 ? -1 : 1,
                remanence: Math.max(0, Number(body.setup.magnetic?.remanence) || body.magnetic.remanence),
              },
              polePaint: Array.isArray(body.setup.polePaint)
                ? body.setup.polePaint.map((value) => Number(value) || 0)
                : body.polePaint.slice(),
            }
          : captureBodySetup(body);
        state.bodies.push(body);
      }

      state.constraints = (data.constraints || []).map((constraint) => ({
        id: String(constraint.id || `constraint-${nextConstraintId++}`),
        aId: Number(constraint.aId),
        bId: Number(constraint.bId),
        distance: Math.max(1, Number(constraint.distance) || 1),
        stiffness: Math.max(0.1, Number(constraint.stiffness) || 0.1),
      }));
      state.tracking = data.tracking || { bodyId: null, metric: "force", samples: [] };
      state.tracking.samples = [];
      nextBodyId = Math.max(Number(data.nextBodyId) || 1, ...state.bodies.map((body) => body.id + 1), 1);
      nextConstraintId = Math.max(
        Number(data.nextConstraintId) || 1,
        state.constraints.reduce((maxId, constraint) => {
          const match = /constraint-(\d+)/.exec(String(constraint.id));
          return Math.max(maxId, match ? Number(match[1]) + 1 : 1);
        }, 1)
      );
      customMaterialCounter = Number(data.customMaterialCounter) || customMaterialCounter;
      worldTime = Number(data.worldTime) || 0;
      state.selectedBodyId = data.selectedBodyId || state.bodies[0]?.id || null;
      state.selectedConstraintId = data.selectedConstraintId || null;
      state.selectedMaterialId = data.selectedMaterialId || state.materials[0]?.id || null;
      invalidateMagneticAnalysis();
      state.view.pan = v(0, 0);
      state.view.isPanning = false;
      state.view.inputSource = null;
      stopBodyInteraction();
      accumulator = 0;
      running = false;
      getEl("startPauseBtn").textContent = "Start";
      syncDisplayInputs();
      refreshUiLists();
      loadSelectedBodyIntoForm();
      loadSelectedConstraintIntoForm();
    } catch (error) {
      alert(`Invalid project JSON format. Please import a valid Magnetics 2D Lab project. ${error.message}`);
    }
  }

  function syncDisplayInputs() {
    getEl("fieldRenderMode").value = state.display.fieldRenderMode;
    getEl("fieldSpacing").value = state.display.fieldArrowSpacing;
    getEl("fieldResolution").value = state.display.fieldSampleResolution;
    getEl("fieldScale").value = state.display.fieldScale;
    getEl("fieldThreshold").value = state.display.fieldThreshold;
    getEl("fieldLinesEnabled").checked = Boolean(state.display.fieldLinesEnabled);
    getEl("fieldLineCount").value = state.display.fieldLineCount;
    getEl("poleBrushEnabled").checked = Boolean(state.poleBrush.enabled);
    getEl("poleBrushMode").value = String(state.poleBrush.mode);
    getEl("poleBrushRadius").value = String(state.poleBrush.radius);
    const selectedBody = state.bodies.find((entry) => entry.id === state.selectedBodyId);
    const brushStrength = selectedBody ? selectedBody.magnetic.strength : Math.max(0, Number(getEl("poleBrushStrength").value) || 40);
    getEl("sceneBrushSize").value = String(state.poleBrush.radius);
    getEl("sceneBrushStrength").value = String(Math.round(brushStrength));
    getEl("sceneBrushSizeValue").textContent = String(state.poleBrush.radius);
    getEl("sceneBrushStrengthValue").textContent = String(Math.round(brushStrength));
    getEl("sceneSelectToolBtn").classList.toggle("active", !state.poleBrush.enabled);
    getEl("sceneBrushToolBtn").classList.toggle("active", state.poleBrush.enabled);
    for (const button of document.querySelectorAll("[data-scene-brush-mode]")) {
      button.classList.toggle("active", Number(button.dataset.sceneBrushMode) === state.poleBrush.mode);
    }
    const bodyType = selectedBody?.type || null;
    getEl("sceneToolState").textContent = state.poleBrush.enabled ? "Pole Brush" : "Select";
    getEl("sceneToolHint").textContent = selectedBody
      ? bodyType === "polyline"
        ? "Drag vertex handles, drag edges, or use cyan insert handles to add new vertices."
        : bodyType === "circle"
          ? "Drag cyan edge handles to resize, drag the body to move, and use the gold handle to rotate."
          : "Drag cyan edge or corner handles to resize, drag the body to move, and use the gold handle to rotate."
      : "Select a shape to edit it with direct handles in the scene.";
  }

  function applyDisplayInputs() {
    state.display.fieldRenderMode = getEl("fieldRenderMode").value === "heatmap" ? "heatmap" : "arrows";
    state.display.fieldArrowSpacing = Math.max(8, Number(getEl("fieldSpacing").value) || 22);
    state.display.fieldSampleResolution = Math.max(2, Number(getEl("fieldResolution").value) || 6);
    state.display.fieldScale = clamp(Number(getEl("fieldScale").value) || 1800, MIN_FIELD_SCALE, MAX_FIELD_SCALE);
    state.display.fieldThreshold = Math.max(0, Number(getEl("fieldThreshold").value) || 0);
    state.display.fieldLinesEnabled = getEl("fieldLinesEnabled").checked;
    state.display.fieldLineCount = clamp(Math.round(Number(getEl("fieldLineCount").value) || 3), 1, 12);
    state.poleBrush.enabled = getEl("poleBrushEnabled").checked;
    state.poleBrush.mode = Number(getEl("poleBrushMode").value) === -1 ? -1 : Number(getEl("poleBrushMode").value) === 0 ? 0 : 1;
    state.poleBrush.radius = clamp(Math.round(Number(getEl("poleBrushRadius").value) || 1), 0, 6);
    const brushStrength = Math.max(0, Number(getEl("poleBrushStrength").value) || 0);
    const body = state.bodies.find((entry) => entry.id === state.selectedBodyId);
    if (body && brushStrength > 0 && body.magnetic.strength !== brushStrength) {
      body.magnetic.strength = brushStrength;
      body.setup = captureBodySetup(body);
      invalidateMagneticAnalysis();
    }
    syncDisplayInputs();
  }

  function pointInBody(point, body) {
    if (body.type === "circle") return len(sub(point, body.pos)) <= body.radius;
    const local = inverseRotate(sub(point, body.pos), body.angle);
    if (body.type === "polyline") return localPointInPolygon(local, body.points);
    return Math.abs(local.x) <= body.width * 0.5 && Math.abs(local.y) <= body.height * 0.5;
  }

  function selectedBodyRotateHandle(body) {
    const direction = rotate(v(0, -1), body.angle);
    const extent = body.type === "circle" ? body.radius : Math.max(body.width, body.height) * 0.5;
    return add(body.pos, mul(direction, extent + ROTATE_HANDLE_OFFSET));
  }

  function pointHitsRotateHandle(point, body) {
    return len(sub(point, selectedBodyRotateHandle(body))) <= ROTATE_HANDLE_RADIUS + 4;
  }

  function pickBody(point) {
    for (let i = state.bodies.length - 1; i >= 0; i -= 1) {
      if (pointInBody(point, state.bodies[i])) return state.bodies[i];
    }
    return null;
  }

  function pickConstraint(point) {
    let bestConstraint = null;
    let bestDistance = CONSTRAINT_PICK_DISTANCE;
    for (const constraint of state.constraints) {
      const a = state.bodies.find((body) => body.id === constraint.aId);
      const b = state.bodies.find((body) => body.id === constraint.bId);
      if (!a || !b) continue;
      const distance = distancePointToSegment(point, a.pos, b.pos);
      if (distance <= bestDistance) {
        bestDistance = distance;
        bestConstraint = constraint;
      }
    }
    return bestConstraint;
  }

  function paintBodyGranules(body, worldPoint) {
    if (!body || !body.granules?.length) return false;
    const localPoint = inverseRotate(sub(worldPoint, body.pos), body.angle);
    const brushMode = state.poleBrush.mode;
    const brushRadius = Math.max(0, state.poleBrush.radius || 0);
    let changed = false;
    for (let index = 0; index < body.granules.length; index += 1) {
      const granule = body.granules[index];
      const influenceRadius = granule.sampleRadius * (BRUSH_BASE_RADIUS_FACTOR + brushRadius * BRUSH_RADIUS_SCALE_FACTOR);
      if (len(sub(localPoint, granule.localPos)) > influenceRadius) continue;
      const currentPole = Number(body.polePaint[index]) || 0;
      if (currentPole === brushMode) continue;
      body.polePaint[index] = brushMode;
      changed = true;
    }
    if (!changed) return false;
    if (brushMode !== 0) {
      body.magnetic.enabled = true;
      body.magnetic.strength = Math.max(body.magnetic.strength, Math.max(1, Number(getEl("poleBrushStrength").value) || 40));
    }
    body.setup = captureBodySetup(body);
    invalidateMagneticAnalysis();
    refreshShapeTable();
    return true;
  }

  function resetBodyPolePaint(body) {
    if (!body) return;
    body.polePaint = body.granules.map(() => 0);
    body.setup = captureBodySetup(body);
    invalidateMagneticAnalysis();
    refreshShapeTable();
    loadSelectedBodyIntoForm();
  }

  function syncSelectedBodyInspector(useSetup = true) {
    const body = state.bodies.find((entry) => entry.id === state.selectedBodyId);
    if (!body) return;
    const source = useSetup && body.setup ? body.setup : body;
    getEl("shapeX").value = source.pos.x.toFixed(2);
    getEl("shapeY").value = source.pos.y.toFixed(2);
    getEl("shapeAngle").value = ((source.angle * 180) / Math.PI).toFixed(2);
    getEl("shapePolyline").value = formatPolylinePoints(source.points);
    setPolylineSummary(source.points);
  }

  function setSectionCollapsed(section, collapsed) {
    const content = section.querySelector(".section-content");
    const toggle = section.querySelector(".section-toggle");
    if (!content || !toggle) return;
    content.classList.toggle("hidden", collapsed);
    toggle.textContent = collapsed ? "Expand" : "Minimize";
    toggle.setAttribute("aria-expanded", String(!collapsed));
  }

  function enableCollapsibleSections() {
    for (const section of document.querySelectorAll(".panel-section")) {
      if (section.dataset.collapsibleReady === "true") continue;
      const heading = section.querySelector(":scope > .section-heading") || section.querySelector(":scope > h3");
      if (!heading) continue;
      let header = heading;
      if (heading.tagName === "H3") {
        header = document.createElement("div");
        header.className = "section-heading";
        section.insertBefore(header, heading);
        header.appendChild(heading);
      }
      const content = document.createElement("div");
      content.className = "section-content";
      while (header.nextSibling) content.appendChild(header.nextSibling);
      section.appendChild(content);
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "section-toggle";
      toggle.addEventListener("click", () => setSectionCollapsed(section, !content.classList.contains("hidden")));
      header.appendChild(toggle);
      setSectionCollapsed(section, false);
      section.dataset.collapsibleReady = "true";
    }
  }

  function setInteractionSummary(text) {
    getEl("interactionSummary").textContent = text;
  }

  function setPoleBrushEnabled(enabled) {
    getEl("poleBrushEnabled").checked = Boolean(enabled);
    applyDisplayInputs();
  }

  function stopBodyInteraction() {
    state.interaction.mode = null;
    state.interaction.bodyId = null;
    state.interaction.pointerOffset = { x: 0, y: 0 };
    state.interaction.pointerAngleDelta = 0;
    state.interaction.handle = null;
    state.interaction.startSetup = null;
    state.interaction.startLocalPoint = null;
    state.interaction.startPoints = null;
    setInteractionSummary("Drag shapes · resize edges or corners · edit polyline lines · right drag pans");
  }

  function toggleShapeInputs() {
    const type = getEl("shapeType").value;
    const isCircle = type === "circle";
    const isPolyline = type === "polyline";
    getEl("shapeW").disabled = isCircle || isPolyline;
    getEl("shapeH").disabled = isCircle || isPolyline;
    getEl("shapeR").disabled = !isCircle;
    getEl("shapePolylineWrap").classList.toggle("hidden", !isPolyline);
  }

  function setEditorView(view) {
    const validView = ["shape", "constraint", "options"].includes(view) ? view : "shape";
    state.editorView = validView;
    for (const panel of ["shape", "constraint", "options"]) {
      getEl(`${panel}Panel`).classList.toggle("hidden", panel !== validView);
      getEl(`${panel}TabBtn`).classList.toggle("active", panel === validView);
    }
  }

  function showEditorView(view) {
    setEditorView(view);
  }

  function cancelCanvasInteraction() {
    stopBodyInteraction();
  }

  function wireUi() {
    getEl("startPauseBtn").addEventListener("click", () => {
      running = !running;
      getEl("startPauseBtn").textContent = running ? "Pause" : "Start";
    });

    getEl("stepBtn").addEventListener("click", () => step(FIXED_DT));
    getEl("resetBtn").addEventListener("click", resetDynamics);
    getEl("clearProjectBtn").addEventListener("click", clearProject);
    getEl("openShapeModalBtn").addEventListener("click", () => showEditorView("shape"));
    getEl("openConstraintModalBtn").addEventListener("click", () => showEditorView("constraint"));
    getEl("openOptionsModalBtn").addEventListener("click", () => showEditorView("options"));
    for (const id of ["shapeTabBtn", "constraintTabBtn", "optionsTabBtn"]) {
      getEl(id).addEventListener("click", (event) => setEditorView(event.target.dataset.editorView));
    }
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") cancelCanvasInteraction();
    });

    getEl("addShapeBtn").addEventListener("click", () => {
      addBody(readShapeInput());
    });
    getEl("newShapeBtn").addEventListener("click", () => {
      state.selectedBodyId = null;
      clearShapeForm();
      refreshShapeTable();
      refreshStatusSummary();
    });
    getEl("updateShapeBtn").addEventListener("click", () => {
      const body = state.bodies.find((entry) => entry.id === state.selectedBodyId);
      if (!body) return;
      updateBodyFromInput(body, readShapeInput());
    });
    getEl("deleteShapeBtn").addEventListener("click", () => {
      if (state.selectedBodyId != null) removeBody(state.selectedBodyId);
    });

    getEl("shapeTableBody").addEventListener("click", (event) => {
      const actionButton = event.target.closest("button[data-action]");
      if (actionButton) {
        const bodyId = Number(actionButton.dataset.bodyId);
        if (actionButton.dataset.action === "edit-body") setSelectedBody(bodyId);
        if (actionButton.dataset.action === "delete-body") removeBody(bodyId);
        return;
      }
      const row = event.target.closest("tr[data-body-id]");
      if (row) setSelectedBody(Number(row.dataset.bodyId));
    });

    getEl("shapeType").addEventListener("change", toggleShapeInputs);
    getEl("shapeMaterial").addEventListener("change", () => {
      const material = materialById(getEl("shapeMaterial").value);
      getEl("shapeRemanence").value = material.remanenceDefault.toFixed(2);
    });

    getEl("newConstraintBtn").addEventListener("click", () => {
      state.selectedConstraintId = null;
      clearConstraintForm();
      refreshConstraintTable();
    });
    getEl("addConstraintBtn").addEventListener("click", () => {
      addConstraint(readConstraintInput());
    });
    getEl("updateConstraintBtn").addEventListener("click", () => {
      const constraint = state.constraints.find((entry) => entry.id === state.selectedConstraintId);
      if (!constraint) return;
      updateConstraintFromInput(constraint, readConstraintInput());
    });
    getEl("deleteConstraintBtn").addEventListener("click", () => {
      if (state.selectedConstraintId != null) removeConstraint(state.selectedConstraintId);
    });
    getEl("constraintTableBody").addEventListener("click", (event) => {
      const actionButton = event.target.closest("button[data-action]");
      if (actionButton) {
        const constraintId = actionButton.dataset.constraintId;
        if (actionButton.dataset.action === "edit-constraint") setSelectedConstraint(constraintId);
        if (actionButton.dataset.action === "delete-constraint") removeConstraint(constraintId);
        return;
      }
      const row = event.target.closest("tr[data-constraint-id]");
      if (row) setSelectedConstraint(row.dataset.constraintId);
    });

    getEl("materialSelect").addEventListener("change", (event) => loadMaterialIntoForm(event.target.value));
    getEl("newMaterialBtn").addEventListener("click", () => {
      state.selectedMaterialId = null;
      getEl("materialSelect").value = "";
      getEl("materialName").value = `Custom Material ${customMaterialCounter}`;
      getEl("materialDensity").value = 7.8;
      getEl("materialPermeability").value = 10;
      getEl("materialSusceptibility").value = 0.4;
      getEl("materialConductivity").value = 5;
      getEl("materialRemanence").value = 0.5;
    });
    getEl("saveMaterialBtn").addEventListener("click", saveMaterial);
    getEl("deleteMaterialBtn").addEventListener("click", deleteMaterial);

    for (const id of [
      "fieldRenderMode",
      "fieldSpacing",
      "fieldResolution",
      "fieldScale",
      "fieldThreshold",
      "fieldLinesEnabled",
      "fieldLineCount",
      "poleBrushEnabled",
      "poleBrushMode",
      "poleBrushRadius",
      "poleBrushStrength",
    ]) {
      getEl(id).addEventListener("input", applyDisplayInputs);
      getEl(id).addEventListener("change", applyDisplayInputs);
    }
    getEl("resetPolePaintBtn").addEventListener("click", () => {
      const body = state.bodies.find((entry) => entry.id === state.selectedBodyId);
      resetBodyPolePaint(body);
    });

    getEl("startTrackingBtn").addEventListener("click", () => {
      state.tracking.bodyId = Number(getEl("trackBody").value) || null;
      state.tracking.metric = getEl("trackMetric").value;
      state.tracking.samples = [];
    });
    getEl("clearTrackingBtn").addEventListener("click", () => {
      state.tracking.samples = [];
    });

    getEl("exportBtn").addEventListener("click", exportProject);
    getEl("importBtn").addEventListener("click", importProject);

    getEl("sceneSelectToolBtn").addEventListener("click", () => setPoleBrushEnabled(false));
    getEl("sceneBrushToolBtn").addEventListener("click", () => setPoleBrushEnabled(true));
    for (const button of document.querySelectorAll("[data-scene-brush-mode]")) {
      button.addEventListener("click", () => {
        getEl("poleBrushMode").value = button.dataset.sceneBrushMode;
        applyDisplayInputs();
      });
    }
    getEl("sceneBrushSize").addEventListener("input", () => {
      getEl("poleBrushRadius").value = getEl("sceneBrushSize").value;
      applyDisplayInputs();
    });
    getEl("sceneBrushStrength").addEventListener("input", () => {
      getEl("poleBrushStrength").value = getEl("sceneBrushStrength").value;
      applyDisplayInputs();
    });

    simCanvas.addEventListener("contextmenu", (event) => {
      event.preventDefault();
    });
    simCanvas.addEventListener("mouseenter", () => {
      state.pointer.insideCanvas = true;
    });
    simCanvas.addEventListener("mouseleave", () => {
      state.pointer.insideCanvas = false;
      state.pointer.world = null;
    });
    simCanvas.addEventListener("dblclick", (event) => {
      if (event.button !== LEFT_MOUSE_BUTTON) return;
      const body = state.bodies.find((entry) => entry.id === state.selectedBodyId);
      if (!body || body.type !== "polyline") return;
      const point = worldPointFromMouseEvent(event);
      const handle = pickSelectedBodyHandle(point, body);
      if (handle?.kind === "vertex") removePolylineVertex(body, handle.vertexIndex);
    });
    simCanvas.addEventListener("mousedown", (event) => {
      state.pointer.world = worldPointFromMouseEvent(event);
      if (event.button === RIGHT_MOUSE_BUTTON) {
        event.preventDefault();
        state.view.isPanning = true;
        state.view.inputSource = "mouse";
        state.view.lastPointerClient = { x: event.clientX, y: event.clientY };
        simCanvas.classList.add("is-panning");
        setInteractionSummary("Panning viewport");
        return;
      }

      if (event.button !== LEFT_MOUSE_BUTTON) return;
      const point = state.pointer.world;
      const selectedBody = state.bodies.find((body) => body.id === state.selectedBodyId);
      if (state.poleBrush.enabled && selectedBody && pointInBody(point, selectedBody)) {
        state.interaction.mode = "paint";
        state.interaction.bodyId = selectedBody.id;
        paintBodyGranules(selectedBody, point);
        setInteractionSummary(`Painting poles on shape #${selectedBody.id}`);
        return;
      }
      if (selectedBody && pointHitsRotateHandle(point, selectedBody)) {
        state.interaction.mode = "rotate";
        state.interaction.bodyId = selectedBody.id;
        state.interaction.pointerAngleDelta = Math.atan2(point.y - selectedBody.pos.y, point.x - selectedBody.pos.x) - selectedBody.angle;
        state.interaction.startSetup = captureBodySetup(selectedBody);
        setInteractionSummary(`Rotating shape #${selectedBody.id}`);
        return;
      }
      if (selectedBody) {
        const handle = pickSelectedBodyHandle(point, selectedBody);
        if (handle?.kind === "resize") {
          state.interaction.mode = "resize";
          state.interaction.bodyId = selectedBody.id;
          state.interaction.handle = handle;
          state.interaction.startSetup = captureBodySetup(selectedBody);
          setInteractionSummary(`Resizing shape #${selectedBody.id}`);
          return;
        }
        if (handle?.kind === "vertex") {
          state.interaction.mode = "vertex";
          state.interaction.bodyId = selectedBody.id;
          state.interaction.handle = handle;
          state.interaction.startPoints = selectedBody.points.map((entry) => v(entry.x, entry.y));
          setInteractionSummary(`Dragging vertex ${handle.vertexIndex + 1} on shape #${selectedBody.id}`);
          return;
        }
        if (handle?.kind === "insert-vertex") {
          const insertedIndex = insertPolylineVertex(selectedBody, handle.edgeIndex, handle.localPos);
          state.interaction.mode = "vertex";
          state.interaction.bodyId = selectedBody.id;
          state.interaction.handle = { kind: "vertex", vertexIndex: insertedIndex };
          state.interaction.startPoints = selectedBody.points.map((entry) => v(entry.x, entry.y));
          setInteractionSummary(`Inserted a new vertex on shape #${selectedBody.id}`);
          return;
        }
        const polylineEdge = pickPolylineEdge(point, selectedBody);
        if (polylineEdge) {
          state.interaction.mode = "edge";
          state.interaction.bodyId = selectedBody.id;
          state.interaction.handle = polylineEdge;
          state.interaction.startPoints = selectedBody.points.map((entry) => v(entry.x, entry.y));
          state.interaction.startLocalPoint = worldPointToLocal(selectedBody, point);
          setInteractionSummary(`Dragging edge ${polylineEdge.edgeIndex + 1} on shape #${selectedBody.id}`);
          return;
        }
      }

      const body = pickBody(point);
      if (body) {
        setSelectedBody(body.id);
        state.interaction.mode = "drag";
        state.interaction.bodyId = body.id;
        state.interaction.pointerOffset = sub(body.pos, point);
        state.interaction.startSetup = captureBodySetup(body);
        setInteractionSummary(`Dragging shape #${body.id}`);
        return;
      }

      const constraint = pickConstraint(point);
      if (constraint) {
        setSelectedConstraint(constraint.id);
        setInteractionSummary(`Selected constraint: ${constraint.id}`);
        return;
      }

      clearSelectedConstraint();
    });
    window.addEventListener("mousemove", (event) => {
      const canvasRect = simCanvas.getBoundingClientRect();
      const shouldTrackPointer = state.pointer.insideCanvas || state.interaction.mode || state.view.isPanning;
      state.pointer.world = shouldTrackPointer ? worldPointFromMouseEvent(event) : null;
      if (state.view.isPanning && state.view.inputSource === "mouse") {
        const scaleX = simCanvas.width / canvasRect.width;
        const scaleY = simCanvas.height / canvasRect.height;
        state.view.pan = add(
          state.view.pan,
          v((event.clientX - state.view.lastPointerClient.x) * scaleX, (event.clientY - state.view.lastPointerClient.y) * scaleY)
        );
        state.view.lastPointerClient = { x: event.clientX, y: event.clientY };
        return;
      }

      if (!state.interaction.mode) return;
      const body = state.bodies.find((entry) => entry.id === state.interaction.bodyId);
      if (!body) return;
      const point = state.pointer.world;
      if (state.interaction.mode === "drag") {
        body.pos = add(point, state.interaction.pointerOffset);
        zeroBodyMotion(body);
        body.setup = captureBodySetup(body);
        invalidateMagneticAnalysis();
      } else if (state.interaction.mode === "paint") {
        paintBodyGranules(body, point);
      } else if (state.interaction.mode === "rotate") {
        body.angle = Math.atan2(point.y - body.pos.y, point.x - body.pos.x) - state.interaction.pointerAngleDelta;
        zeroBodyMotion(body);
        body.setup = captureBodySetup(body);
        invalidateMagneticAnalysis();
      } else if (state.interaction.mode === "resize") {
        updateResizingBody(body, point);
      } else if (state.interaction.mode === "vertex") {
        updatePolylineVertex(body, point);
      } else if (state.interaction.mode === "edge") {
        updatePolylineEdge(body, point);
      }
      if (state.interaction.mode === "drag" || state.interaction.mode === "rotate") {
        syncSelectedBodyInspector(false);
      }
    });
    window.addEventListener("mouseup", (event) => {
      if (event.button === RIGHT_MOUSE_BUTTON) {
        state.view.isPanning = false;
        state.view.inputSource = null;
        simCanvas.classList.remove("is-panning");
        if (!state.interaction.mode) setInteractionSummary("Drag shapes · resize edges or corners · edit polyline lines · right drag pans");
      }
      if (event.button === LEFT_MOUSE_BUTTON && state.interaction.mode) {
        syncSelectedBodyInspector();
        stopBodyInteraction();
      }
    });
    window.addEventListener("blur", () => {
      state.view.isPanning = false;
      state.view.inputSource = null;
      simCanvas.classList.remove("is-panning");
      state.pointer.world = null;
      state.pointer.insideCanvas = false;
      stopBodyInteraction();
    });
  }

  enableCollapsibleSections();
  wireUi();
  refreshUiLists();
  clearShapeForm();
  clearConstraintForm();
  syncDisplayInputs();
  setEditorView("shape");

  addBody({
    type: "rectangle",
    x: 250,
    y: 250,
    width: 120,
    height: 52,
    radius: 20,
    angle: 0.3,
    massOverride: null,
    meshGranularity: 4,
    surfaceResistance: DEFAULT_SURFACE_RESISTANCE,
    materialId: "steel",
    magneticEnabled: true,
    magneticModel: "permanentDipole",
    magneticAngle: 0,
    magneticPolarity: 1,
    magneticStrength: 28,
    magneticRemanence: 0.22,
  });
  addBody({
    type: "circle",
    x: 560,
    y: 250,
    width: 40,
    height: 40,
    radius: 36,
    angle: -0.3,
    massOverride: null,
    meshGranularity: 5,
    surfaceResistance: DEFAULT_SURFACE_RESISTANCE,
    materialId: "neodymium",
    magneticEnabled: true,
    magneticModel: "permanentDipole",
    magneticAngle: 0,
    magneticPolarity: -1,
    magneticStrength: 36,
    magneticRemanence: 1.28,
  });
  addBody({
    type: "rectangle",
    x: 430,
    y: 430,
    width: 150,
    height: 30,
    radius: 20,
    angle: 0.15,
    massOverride: 4.8,
    meshGranularity: 3,
    surfaceResistance: DEFAULT_SURFACE_RESISTANCE,
    materialId: "iron",
    magneticEnabled: false,
    magneticModel: "inducedDipole",
    magneticAngle: 0,
    magneticPolarity: 1,
    magneticStrength: 8,
    magneticRemanence: 0.12,
  });
  // The startup scene intentionally begins unconstrained so motion stays free until the user adds joints explicitly.
  setSelectedBody(1);

  requestAnimationFrame(frame);
})();
