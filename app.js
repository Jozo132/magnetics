(function () {
  const simCanvas = document.getElementById("simCanvas");
  const plotCanvas = document.getElementById("plotCanvas");
  const ctx = simCanvas.getContext("2d");
  const pctx = plotCanvas.getContext("2d");

  const TRACK_SAMPLE_LIMIT = 5000;
  const FIXED_DT = 1 / 180;
  const MAX_STEPS_PER_FRAME = 12;
  const LINEAR_DAMPING = 0.996;
  const ANGULAR_DAMPING = 0.994;
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
  const SOUTH_POLE_COLOR = { r: 96, g: 165, b: 250 };
  const NORTH_POLE_COLOR = { r: 248, g: 113, b: 113 };
  const CONSTRAINT_PICK_DISTANCE = 12;
  const ROTATE_HANDLE_OFFSET = 34;
  const ROTATE_HANDLE_RADIUS = 9;
  const MIN_GRANULES_PER_AXIS = 2;
  const MAX_GRANULES_PER_AXIS = 6;
  const GRANULE_AXIS_TARGET_DIVISOR = 3;
  const MIN_GRANULE_SPACING = 14;
  const MAX_GRANULE_SPACING = 34;
  const CIRCLE_GRANULE_CLIP_RADIUS_FACTOR = 0.88;
  const CIRCLE_GRANULE_CLIP_SPACING_FACTOR = 0.35;
  const MIN_GRANULE_SAMPLE_RADIUS = 8;
  const GRANULE_SAMPLE_RADIUS_FACTOR = 0.68;
  const GRANULE_POINT_RADIUS = 3.2;
  const MIN_GRANULE_ARROW_LENGTH = 4;
  const MAX_GRANULE_ARROW_LENGTH = 12;
  const GRANULE_MOMENT_ARROW_SCALE = 0.18;
  const GRANULE_FORCE_ARROW_SCALE = 0.014;
  const MAX_GRANULE_FORCE_ARROW_LENGTH = 12;
  const GRANULE_INDUCTION_ITERATIONS = 2;
  const MIN_GRANULE_POLE_EXTENT = 4;
  const GRANULE_POLE_EXTENT_SAMPLE_RADIUS_FACTOR = 0.55;
  const MIN_GRANULE_POLE_STRENGTH = 0.2;
  const GRANULE_PERMANENT_MOMENT_COLOR = "rgba(251,146,60,0.9)";
  const GRANULE_INDUCED_MOMENT_COLOR = "rgba(226,232,240,0.82)";
  const GRANULE_PERMANENT_POINT_COLOR = "rgba(253,186,116,0.95)";
  const GRANULE_INDUCED_POINT_COLOR = "rgba(191,219,254,0.9)";

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
      fieldArrowSpacing: 22,
      fieldSampleResolution: 6,
      fieldScale: 1800,
      fieldThreshold: 0.01,
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
    interaction: {
      mode: null,
      bodyId: null,
      pointerOffset: { x: 0, y: 0 },
      pointerAngleDelta: 0,
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

  function bodyArea(body) {
    if (body.type === "circle") return Math.PI * body.radius * body.radius;
    return body.width * body.height;
  }

  function bodyBoundingRadius(body) {
    if (body.type === "circle") return body.radius;
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
    return magneticEnabled(body) || hasFerromagneticResponse(body);
  }

  function buildGranuleAxisSamples(length, minimumCount = MIN_GRANULES_PER_AXIS) {
    const safeLength = Math.max(length, MIN_GRANULE_SPACING);
    const estimatedCount = Math.round(
      safeLength / clamp(safeLength / GRANULE_AXIS_TARGET_DIVISOR, MIN_GRANULE_SPACING, MAX_GRANULE_SPACING)
    );
    const count = clamp(estimatedCount, minimumCount, MAX_GRANULES_PER_AXIS);
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

  function buildBodyGranuleLayout(body) {
    if (!bodyUsesMagneticGranules(body)) return [];

    const localPoints = [];
    if (body.type === "circle") {
      const diameter = body.radius * 2;
      const xAxis = buildGranuleAxisSamples(diameter);
      const yAxis = buildGranuleAxisSamples(diameter);
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
      return localPoints.map((localPos) => ({ localPos, share, sampleRadius }));
    }

    const xAxis = buildGranuleAxisSamples(body.width);
    const yAxis = buildGranuleAxisSamples(body.height);
    for (const y of yAxis.samples) {
      for (const x of xAxis.samples) {
        localPoints.push(v(x, y));
      }
    }
    const sampleRadius = granuleSampleRadius(xAxis, yAxis);
    const share = 1 / Math.max(1, localPoints.length);
    return localPoints.map((localPos) => ({ localPos, share, sampleRadius }));
  }

  function syncBodyDerived(body) {
    const material = materialById(body.materialId);
    body.materialId = material.id;
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
      materialId: body.materialId,
      massOverride: body.massOverride,
      fixed: body.fixed,
      magnetic: {
        enabled: body.magnetic.enabled,
        model: body.magnetic.model,
        localAngle: body.magnetic.localAngle,
        strength: body.magnetic.strength,
        polarity: body.magnetic.polarity,
        remanence: body.magnetic.remanence,
      },
    };
  }

  function applyBodySetup(body, setup) {
    body.type = setup.type;
    body.pos = v(setup.pos.x, setup.pos.y);
    body.angle = setup.angle;
    body.width = setup.width;
    body.height = setup.height;
    body.radius = setup.radius;
    body.materialId = setup.materialId;
    body.massOverride = setup.massOverride == null ? null : setup.massOverride;
    body.fixed = Boolean(setup.fixed);
    body.magnetic = {
      enabled: Boolean(setup.magnetic?.enabled),
      model: setup.magnetic?.model || "permanentDipole",
      localAngle: Number(setup.magnetic?.localAngle) || 0,
      strength: Math.max(0, Number(setup.magnetic?.strength) || 0),
      polarity: Number(setup.magnetic?.polarity) === -1 ? -1 : 1,
      remanence: Math.max(0, Number(setup.magnetic?.remanence) || 0),
    };
    body.vel = v(0, 0);
    body.force = v(0, 0);
    body.angularVel = 0;
    body.torque = 0;
    syncBodyDerived(body);
    body.setup = JSON.parse(JSON.stringify(setup));
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
      materialId: input.materialId,
      massOverride: input.massOverride,
      fixed: input.fixed,
      magnetic: {
        enabled: input.magneticEnabled,
        model: input.magneticModel,
        localAngle: input.magneticAngle,
        strength: input.magneticStrength,
        polarity: input.magneticPolarity,
        remanence: input.magneticRemanence,
      },
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
    body.materialId = input.materialId;
    body.massOverride = input.massOverride;
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
      angle: ((Number(getEl("shapeAngle").value) || 0) * Math.PI) / 180,
      massOverride: massText === "" ? null : Math.max(0.05, Number(massText) || 0.05),
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
    getEl("shapeAngle").value = (((body.setup ? body.setup.angle : body.angle) * 180) / Math.PI).toFixed(2);
    getEl("shapeMass").value = body.massOverride == null ? "" : body.massOverride.toFixed(2);
    getEl("shapeMaterial").value = material.id;
    getEl("shapeFixed").checked = body.fixed;
    getEl("shapeMagnetic").checked = magneticEnabled(body);
    getEl("shapeMagModel").value = body.magnetic.model;
    getEl("shapeMagAngle").value = ((body.magnetic.localAngle * 180) / Math.PI).toFixed(2);
    getEl("shapePolarity").value = String(body.magnetic.polarity || 1);
    getEl("shapeMoment").value = body.magnetic.strength.toFixed(2);
    getEl("shapeRemanence").value = body.magnetic.remanence.toFixed(2);
    toggleShapeInputs();
  }

  function clearShapeForm() {
    getEl("shapeType").value = "rectangle";
    getEl("shapeX").value = 180;
    getEl("shapeY").value = 180;
    getEl("shapeW").value = 90;
    getEl("shapeH").value = 50;
    getEl("shapeR").value = 28;
    getEl("shapeAngle").value = 0;
    getEl("shapeMass").value = "";
    getEl("shapeMaterial").value = state.selectedMaterialId || state.materials[0]?.id || "";
    getEl("shapeFixed").checked = false;
    getEl("shapeMagnetic").checked = false;
    getEl("shapeMagModel").value = "permanentDipole";
    getEl("shapeMagAngle").value = 0;
    getEl("shapePolarity").value = "1";
    getEl("shapeMoment").value = 40;
    getEl("shapeRemanence").value = materialById(getEl("shapeMaterial").value).remanenceDefault.toFixed(2);
    toggleShapeInputs();
  }

  function setSelectedBody(bodyId) {
    state.selectedBodyId = bodyId == null ? null : Number(bodyId);
    loadSelectedBodyIntoForm();
    refreshShapeTable();
    refreshStatusSummary();
    if (state.selectedBodyId != null) showEditorView("shape");
  }

  function loadSelectedBodyIntoForm() {
    const body = state.bodies.find((entry) => entry.id === state.selectedBodyId);
    if (!body) {
      clearShapeForm();
      return;
    }
    populateShapeForm(body);
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
      const magneticLabel = magneticEnabled(body)
        ? `${body.magnetic.model === "inducedDipole" ? "Induced" : "Permanent"} · ${body.magnetic.polarity === -1 ? "S→N" : "N→S"}`
        : bodyUsesMagneticGranules(body)
          ? "Ferromagnetic granules"
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

  function inducedMagneticMoment(body, field, geometryShare = 1) {
    if (!hasFerromagneticResponse(body)) return v(0, 0);
    const fieldMagnitude = len(field);
    if (fieldMagnitude < 1e-6) return v(0, 0);
    const material = materialById(body.materialId);
    const susceptibility = Math.max(0, material.susceptibility);
    if (susceptibility === 0) return v(0, 0);
    const geometryScale =
      (body.type === "circle" ? Math.PI * body.radius * body.radius : body.width * body.height) * Math.max(0, geometryShare);
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
      const layout = body.granules?.length ? body.granules : [{ localPos: v(0, 0), share: 1, sampleRadius: 10 }];
      const permanentMoment = magneticEnabled(body) ? configuredMagneticMoment(body) : v(0, 0);
      for (const layoutGranule of layout) {
        granules.push({
          id: nextGranuleId++,
          body,
          bodyId: body.id,
          pos: add(body.pos, rotate(layoutGranule.localPos, body.angle)),
          localPos: layoutGranule.localPos,
          share: layoutGranule.share,
          sampleRadius: layoutGranule.sampleRadius,
          permanentMoment: mul(permanentMoment, layoutGranule.share),
          inducedMoment: v(0, 0),
          effectiveMoment: mul(permanentMoment, layoutGranule.share),
          externalField: v(0, 0),
          force: v(0, 0),
        });
      }
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

    for (let iteration = 0; iteration < GRANULE_INDUCTION_ITERATIONS; iteration += 1) {
      applyInducedGranuleMoments(granules);
    }

    for (const granule of granules) {
      const field = magneticFieldAtPointFromGranules(granule.pos, granules, { excludeBodyId: granule.bodyId });
      granule.externalField = field;
      if (len(granule.effectiveMoment) < 1e-6 && len(field) < 1e-6) continue;

      const epsilon = clamp(granule.sampleRadius * 0.35, MIN_MAGNETIC_GRADIENT_EPSILON, MAX_MAGNETIC_GRADIENT_EPSILON);
      const energyDensityAt = (point) => dot(granule.effectiveMoment, magneticFieldAtPointFromGranules(point, granules, { excludeBodyId: granule.bodyId }));
      const gradX = (energyDensityAt(add(granule.pos, v(epsilon, 0))) - energyDensityAt(add(granule.pos, v(-epsilon, 0)))) / (2 * epsilon);
      const gradY = (energyDensityAt(add(granule.pos, v(0, epsilon))) - energyDensityAt(add(granule.pos, v(0, -epsilon)))) / (2 * epsilon);
      let force = mul(v(gradX, gradY), MAGNETIC_FORCE_SCALE);
      const maxGranuleForce = MAX_MAGNETIC_FORCE / Math.max(1, granuleCounts.get(granule.bodyId) || 1);
      if (len(force) > maxGranuleForce) force = mul(unit(force), maxGranuleForce);
      granule.force = force;

      const accumulator = bodyAccumulators.get(granule.bodyId);
      accumulator.force = add(accumulator.force, force);
      accumulator.torque += cross(sub(granule.pos, granule.body.pos), force);
      accumulator.torque += cross(granule.effectiveMoment, field) * MAGNETIC_TORQUE_SCALE;
    }

    return { granules, bodyAccumulators };
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

  function magneticFieldAtPointFromGranules(point, granules, options = {}) {
    const { excludeBodyId = null, excludeGranuleId = null } = options;
    let field = v(0, 0);
    for (const granule of granules) {
      if (excludeGranuleId != null && granule.id === excludeGranuleId) continue;
      if (excludeBodyId != null && granule.bodyId === excludeBodyId) continue;
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

  function fieldArrowColorAtPoint(point, granules = state.magneticGranules) {
    const { northInfluence, southInfluence } = magneticPoleBiasAtPoint(point, granules);
    const totalInfluence = northInfluence + southInfluence;
    if (totalInfluence <= 1e-6) return DEFAULT_FIELD_ARROW_COLOR;
    const blend = clamp((northInfluence - southInfluence) / totalInfluence, -1, 1);
    const northDominanceRatio = (blend + 1) * 0.5;
    const red = Math.round(lerp(SOUTH_POLE_COLOR.r, NORTH_POLE_COLOR.r, northDominanceRatio));
    const green = Math.round(lerp(SOUTH_POLE_COLOR.g, NORTH_POLE_COLOR.g, northDominanceRatio));
    const blue = Math.round(lerp(SOUTH_POLE_COLOR.b, NORTH_POLE_COLOR.b, northDominanceRatio));
    const alpha = lerp(0.42, 0.82, Math.abs(blend));
    return `rgba(${red},${green},${blue},${alpha.toFixed(3)})`;
  }

  function applyMagnetics() {
    const magneticAnalysis = getMagneticGranuleAnalysis(true);
    for (const body of state.bodies) {
      const accumulator = magneticAnalysis.bodyAccumulators.get(body.id);
      if (!accumulator) continue;
      let magneticForce = accumulator.force;
      if (len(magneticForce) > MAX_MAGNETIC_FORCE) magneticForce = mul(unit(magneticForce), MAX_MAGNETIC_FORCE);
      body.force = add(body.force, magneticForce);
      body.torque += accumulator.torque;
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

  function detectCollision(a, b) {
    const radiusDistance = len(sub(b.pos, a.pos));
    if (radiusDistance > bodyBoundingRadius(a) + bodyBoundingRadius(b)) return null;
    if (a.type === "circle" && b.type === "circle") return circleCircleCollision(a, b);
    if (a.type === "rectangle" && b.type === "rectangle") return rectRectCollision(a, b);
    if (a.type === "circle" && b.type === "rectangle") return circleRectCollision(a, b, false);
    if (a.type === "rectangle" && b.type === "circle") return circleRectCollision(b, a, true);
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

  function drawField(granules) {
    const arrowSpacing = clamp(Number(state.display.fieldArrowSpacing) || 22, 8, 200);
    const resolution = clamp(Number(state.display.fieldSampleResolution) || 6, 2, arrowSpacing);
    const scale = clamp(Number(state.display.fieldScale) || 1800, MIN_FIELD_SCALE, MAX_FIELD_SCALE);
    const threshold = Math.max(0, Number(state.display.fieldThreshold) || 0);
    const subsamples = Math.max(1, Math.ceil(arrowSpacing / resolution));
    const offsetStart = -((subsamples - 1) * resolution) / 2;
    const worldTopLeft = screenToWorld(v(0, 0));
    const worldBottomRight = screenToWorld(v(simCanvas.width, simCanvas.height));
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

  function drawBodyGranules(body, granules) {
    if (!granules?.length) return;
    const momentColor = magneticEnabled(body) ? GRANULE_PERMANENT_MOMENT_COLOR : GRANULE_INDUCED_MOMENT_COLOR;
    const pointColor = magneticEnabled(body) ? GRANULE_PERMANENT_POINT_COLOR : GRANULE_INDUCED_POINT_COLOR;
    for (const granule of granules) {
      ctx.fillStyle = pointColor;
      ctx.beginPath();
      ctx.arc(granule.pos.x, granule.pos.y, GRANULE_POINT_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      const momentMagnitude = len(granule.effectiveMoment);
      if (momentMagnitude > 1e-4) {
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
        drawArrow(
          granule.pos,
          mul(unit(granule.force), Math.min(MAX_GRANULE_FORCE_ARROW_LENGTH, forceMagnitude * GRANULE_FORCE_ARROW_SCALE)),
          "rgba(34,197,94,0.72)",
          0.35
        );
      }
    }
  }

  function drawBody(body, granules) {
    const selected = body.id === state.selectedBodyId;
    const material = materialById(body.materialId);
    ctx.save();
    ctx.translate(body.pos.x, body.pos.y);
    ctx.rotate(body.angle);
    ctx.lineWidth = selected ? 3 : 1.5;
    ctx.strokeStyle = selected ? "#facc15" : magneticEnabled(body) ? "#f97316" : "#38bdf8";
    ctx.fillStyle = magneticEnabled(body) ? "rgba(124,45,18,0.35)" : "rgba(30,41,59,0.7)";

    if (body.type === "circle") {
      ctx.beginPath();
      ctx.arc(0, 0, body.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.rect(-body.width * 0.5, -body.height * 0.5, body.width, body.height);
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "12px Inter, sans-serif";
    ctx.fillText(`#${body.id}${body.fixed ? " 📌" : ""}`, 8, -8);
    ctx.fillText(material.name, 8, 8);

    if (magneticEnabled(body)) {
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
    }
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
        materialId: body.materialId,
        massOverride: body.massOverride,
        fixed: body.fixed,
        magnetic: body.magnetic,
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
        fieldArrowSpacing: Number(data.display?.fieldArrowSpacing) || 22,
        fieldSampleResolution: Number(data.display?.fieldSampleResolution) || 6,
        fieldScale: Number(data.display?.fieldScale) || 1800,
        fieldThreshold: Math.max(0, Number(data.display?.fieldThreshold) || 0.01),
      };

      state.bodies = [];
      for (const source of data.bodies || []) {
        const body = {
          id: Number(source.id) || nextBodyId++,
          type: source.type === "circle" ? "circle" : "rectangle",
          pos: v(Number(source.pos?.x) || 0, Number(source.pos?.y) || 0),
          vel: v(Number(source.vel?.x) || 0, Number(source.vel?.y) || 0),
          force: v(0, 0),
          angle: Number(source.angle) || 0,
          angularVel: Number(source.angularVel) || 0,
          torque: 0,
          width: Number(source.width) || 40,
          height: Number(source.height) || 40,
          radius: Number(source.radius) || 20,
          materialId: source.materialId || state.materials[0].id,
          massOverride: source.massOverride == null ? null : Number(source.massOverride),
          fixed: Boolean(source.fixed),
          magnetic: {
            enabled: Boolean(source.magnetic?.enabled),
            model: source.magnetic?.model || "permanentDipole",
            localAngle: Number(source.magnetic?.localAngle) || 0,
            strength: Math.max(0, Number(source.magnetic?.strength) || 0),
            polarity: Number(source.magnetic?.polarity) === -1 ? -1 : 1,
            remanence: Math.max(0, Number(source.magnetic?.remanence) || 0),
          },
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
              materialId: body.setup.materialId || body.materialId,
              massOverride: body.setup.massOverride == null ? null : Number(body.setup.massOverride),
              fixed: Boolean(body.setup.fixed),
              magnetic: {
                enabled: Boolean(body.setup.magnetic?.enabled),
                model: body.setup.magnetic?.model || body.magnetic.model,
                localAngle: Number(body.setup.magnetic?.localAngle) || body.magnetic.localAngle,
                strength: Math.max(0, Number(body.setup.magnetic?.strength) || body.magnetic.strength),
                polarity: Number(body.setup.magnetic?.polarity) === -1 ? -1 : 1,
                remanence: Math.max(0, Number(body.setup.magnetic?.remanence) || body.magnetic.remanence),
              },
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
    getEl("fieldSpacing").value = state.display.fieldArrowSpacing;
    getEl("fieldResolution").value = state.display.fieldSampleResolution;
    getEl("fieldScale").value = state.display.fieldScale;
    getEl("fieldThreshold").value = state.display.fieldThreshold;
  }

  function applyDisplayInputs() {
    state.display.fieldArrowSpacing = Math.max(8, Number(getEl("fieldSpacing").value) || 22);
    state.display.fieldSampleResolution = Math.max(2, Number(getEl("fieldResolution").value) || 6);
    state.display.fieldScale = clamp(Number(getEl("fieldScale").value) || 1800, MIN_FIELD_SCALE, MAX_FIELD_SCALE);
    state.display.fieldThreshold = Math.max(0, Number(getEl("fieldThreshold").value) || 0);
  }

  function pointInBody(point, body) {
    if (body.type === "circle") return len(sub(point, body.pos)) <= body.radius;
    const local = inverseRotate(sub(point, body.pos), body.angle);
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

  function syncSelectedBodyInspector(useSetup = true) {
    const body = state.bodies.find((entry) => entry.id === state.selectedBodyId);
    if (!body) return;
    const source = useSetup && body.setup ? body.setup : body;
    getEl("shapeX").value = source.pos.x.toFixed(2);
    getEl("shapeY").value = source.pos.y.toFixed(2);
    getEl("shapeAngle").value = ((source.angle * 180) / Math.PI).toFixed(2);
  }

  function setInteractionSummary(text) {
    getEl("interactionSummary").textContent = text;
  }

  function stopBodyInteraction() {
    state.interaction.mode = null;
    state.interaction.bodyId = null;
    state.interaction.pointerOffset = { x: 0, y: 0 };
    state.interaction.pointerAngleDelta = 0;
    setInteractionSummary("Left drag moves · rotate handle turns · right drag pans");
  }

  function toggleShapeInputs() {
    const isCircle = getEl("shapeType").value === "circle";
    getEl("shapeW").disabled = isCircle;
    getEl("shapeH").disabled = isCircle;
    getEl("shapeR").disabled = !isCircle;
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

    for (const id of ["fieldSpacing", "fieldResolution", "fieldScale", "fieldThreshold"]) {
      getEl(id).addEventListener("input", applyDisplayInputs);
    }

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

    simCanvas.addEventListener("contextmenu", (event) => {
      event.preventDefault();
    });
    simCanvas.addEventListener("mousedown", (event) => {
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
      const point = worldPointFromMouseEvent(event);
      const selectedBody = state.bodies.find((body) => body.id === state.selectedBodyId);
      if (selectedBody && pointHitsRotateHandle(point, selectedBody)) {
        state.interaction.mode = "rotate";
        state.interaction.bodyId = selectedBody.id;
        state.interaction.pointerAngleDelta = Math.atan2(point.y - selectedBody.pos.y, point.x - selectedBody.pos.x) - selectedBody.angle;
        setInteractionSummary(`Rotating shape #${selectedBody.id}`);
        return;
      }

      const body = pickBody(point);
      if (body) {
        setSelectedBody(body.id);
        state.interaction.mode = "drag";
        state.interaction.bodyId = body.id;
        state.interaction.pointerOffset = sub(body.pos, point);
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
      if (state.view.isPanning && state.view.inputSource === "mouse") {
        const rect = simCanvas.getBoundingClientRect();
        const scaleX = simCanvas.width / rect.width;
        const scaleY = simCanvas.height / rect.height;
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
      const point = worldPointFromMouseEvent(event);
      if (state.interaction.mode === "drag") {
        body.pos = add(point, state.interaction.pointerOffset);
        body.vel = v(0, 0);
        body.force = v(0, 0);
        body.angularVel = 0;
        body.torque = 0;
      } else if (state.interaction.mode === "rotate") {
        body.angle = Math.atan2(point.y - body.pos.y, point.x - body.pos.x) - state.interaction.pointerAngleDelta;
        body.angularVel = 0;
        body.torque = 0;
      }
      body.setup = captureBodySetup(body);
      invalidateMagneticAnalysis();
      syncSelectedBodyInspector(false);
    });
    window.addEventListener("mouseup", (event) => {
      if (event.button === RIGHT_MOUSE_BUTTON) {
        state.view.isPanning = false;
        state.view.inputSource = null;
        simCanvas.classList.remove("is-panning");
        if (!state.interaction.mode) setInteractionSummary("Left drag moves · rotate handle turns · right drag pans");
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
      stopBodyInteraction();
    });
  }

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
    materialId: "iron",
    magneticEnabled: false,
    magneticModel: "inducedDipole",
    magneticAngle: 0,
    magneticPolarity: 1,
    magneticStrength: 8,
    magneticRemanence: 0.12,
  });
  addConstraint({ aId: 1, bId: 2, distance: 250, stiffness: 4.2 });
  setSelectedBody(1);

  requestAnimationFrame(frame);
})();
