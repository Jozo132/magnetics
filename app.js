(function () {
  const simCanvas = document.getElementById("simCanvas");
  const plotCanvas = document.getElementById("plotCanvas");
  const ctx = simCanvas.getContext("2d");
  const pctx = plotCanvas.getContext("2d");

  const K_MAGNET = 9000;
  const DRAG = 0.992;
  const ROT_DRAG = 0.99;
  const FIXED_DT = 1 / 120;
  const MAX_STEPS_PER_FRAME = 8;

  let running = false;
  let lastTs = performance.now();
  let accumulator = 0;
  let worldTime = 0;
  let nextBodyId = 1;

  const state = {
    gravity: { x: 0, y: 0 },
    bodies: [],
    constraints: [],
    tracking: {
      bodyId: null,
      metric: "force",
      samples: [],
    },
  };

  const v = (x = 0, y = 0) => ({ x, y });
  const add = (a, b) => v(a.x + b.x, a.y + b.y);
  const sub = (a, b) => v(a.x - b.x, a.y - b.y);
  const mul = (a, s) => v(a.x * s, a.y * s);
  const len = (a) => Math.hypot(a.x, a.y);
  const unit = (a) => {
    const l = len(a) || 1;
    return v(a.x / l, a.y / l);
  };

  function getEl(id) {
    return document.getElementById(id);
  }

  function addBody(input) {
    const body = {
      id: nextBodyId++,
      type: input.type,
      pos: v(input.x, input.y),
      vel: v(0, 0),
      force: v(0, 0),
      mass: Math.max(0.001, input.mass),
      invMass: 1 / Math.max(0.001, input.mass),
      angle: input.angle,
      angularVel: 0,
      torque: 0,
      width: input.width,
      height: input.height,
      radius: input.radius,
      magnetic: input.magnetic,
      magneticMoment: input.magneticMoment,
      magneticDirection: input.angle,
    };
    state.bodies.push(body);
    return body;
  }

  function addConstraint(aId, bId, distance, stiffness) {
    const a = state.bodies.find((b) => b.id === aId);
    const b = state.bodies.find((b) => b.id === bId);
    if (!a || !b || aId === bId) return;
    state.constraints.push({
      id: `${aId}-${bId}-${state.constraints.length + 1}`,
      aId,
      bId,
      distance,
      stiffness,
    });
  }

  function resetForces() {
    for (const b of state.bodies) {
      b.force = v(state.gravity.x * b.mass, state.gravity.y * b.mass);
      b.torque = 0;
    }
  }

  function applyConstraints() {
    for (const c of state.constraints) {
      const a = state.bodies.find((b) => b.id === c.aId);
      const b = state.bodies.find((b) => b.id === c.bId);
      if (!a || !b) continue;
      const delta = sub(b.pos, a.pos);
      const d = len(delta) || 0.0001;
      const dir = mul(delta, 1 / d);
      const stretch = d - c.distance;
      const springForce = c.stiffness * stretch;
      const f = mul(dir, springForce);
      a.force = add(a.force, f);
      b.force = sub(b.force, f);
    }
  }

  function magneticAxis(body) {
    return v(Math.cos(body.magneticDirection), Math.sin(body.magneticDirection));
  }

  function applyMagnetics() {
    for (let i = 0; i < state.bodies.length; i += 1) {
      for (let j = i + 1; j < state.bodies.length; j += 1) {
        const a = state.bodies[i];
        const b = state.bodies[j];
        if (!a.magnetic || !b.magnetic) continue;
        const delta = sub(b.pos, a.pos);
        const dist = Math.max(25, len(delta));
        const dir = mul(delta, 1 / dist);
        const ma = magneticAxis(a);
        const mb = magneticAxis(b);
        const align = (ma.x * dir.x + ma.y * dir.y) * (mb.x * dir.x + mb.y * dir.y);
        const mag = (K_MAGNET * a.magneticMoment * b.magneticMoment * align) / (dist * dist);
        const f = mul(dir, mag);
        a.force = add(a.force, f);
        b.force = sub(b.force, f);

        const relAB = Math.atan2(delta.y, delta.x) - a.magneticDirection;
        const relBA = Math.atan2(-delta.y, -delta.x) - b.magneticDirection;
        const torqueA = (K_MAGNET * a.magneticMoment * b.magneticMoment * Math.sin(relAB)) / (dist * dist * dist);
        const torqueB = (K_MAGNET * a.magneticMoment * b.magneticMoment * Math.sin(relBA)) / (dist * dist * dist);
        a.torque += torqueA;
        b.torque += torqueB;
      }
    }
  }

  function integrate(dt) {
    for (const b of state.bodies) {
      const accel = mul(b.force, b.invMass);
      b.vel = add(b.vel, mul(accel, dt));
      b.vel = mul(b.vel, DRAG);
      b.pos = add(b.pos, mul(b.vel, dt));

      b.angularVel += b.torque * b.invMass * 0.5 * dt;
      b.angularVel *= ROT_DRAG;
      b.angle += b.angularVel * dt;
      b.magneticDirection = b.angle;

      const radius = b.type === "circle" ? b.radius : Math.max(b.width, b.height) * 0.5;
      if (b.pos.x < radius) {
        b.pos.x = radius;
        b.vel.x *= -0.5;
      }
      if (b.pos.x > simCanvas.width - radius) {
        b.pos.x = simCanvas.width - radius;
        b.vel.x *= -0.5;
      }
      if (b.pos.y < radius) {
        b.pos.y = radius;
        b.vel.y *= -0.5;
      }
      if (b.pos.y > simCanvas.height - radius) {
        b.pos.y = simCanvas.height - radius;
        b.vel.y *= -0.5;
      }
    }
  }

  function sampleTracking() {
    const { bodyId, metric } = state.tracking;
    if (!bodyId) return;
    const b = state.bodies.find((x) => x.id === bodyId);
    if (!b) return;
    let value = 0;
    if (metric === "force") value = len(b.force);
    else if (metric === "torque") value = b.torque;
    else if (metric === "x") value = b.pos.x;
    else if (metric === "y") value = b.pos.y;
    else if (metric === "angle") value = (b.angle * 180) / Math.PI;
    state.tracking.samples.push({ t: worldTime, v: value });
    if (state.tracking.samples.length > 5000) state.tracking.samples.shift();
  }

  function step(dt) {
    resetForces();
    applyConstraints();
    applyMagnetics();
    integrate(dt);
    worldTime += dt;
    sampleTracking();
  }

  function drawArrow(base, vec, color) {
    const target = add(base, vec);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.lineTo(target.x, target.y);
    ctx.stroke();
    const d = unit(vec);
    const p = v(-d.y, d.x);
    ctx.beginPath();
    ctx.moveTo(target.x, target.y);
    ctx.lineTo(target.x - d.x * 8 + p.x * 4, target.y - d.y * 8 + p.y * 4);
    ctx.lineTo(target.x - d.x * 8 - p.x * 4, target.y - d.y * 8 - p.y * 4);
    ctx.closePath();
    ctx.fill();
  }

  function drawField() {
    const spacing = 70;
    for (let y = spacing / 2; y < simCanvas.height; y += spacing) {
      for (let x = spacing / 2; x < simCanvas.width; x += spacing) {
        let field = v(0, 0);
        for (const b of state.bodies) {
          if (!b.magnetic) continue;
          const d = sub(v(x, y), b.pos);
          const r = Math.max(30, len(d));
          const axis = magneticAxis(b);
          const gain = (K_MAGNET * b.magneticMoment) / (r * r * r);
          field = add(field, mul(axis, gain * 0.1));
        }
        const mag = Math.min(22, len(field) * 40);
        if (mag < 0.6) continue;
        drawArrow(v(x, y), mul(unit(field), mag), "rgba(147,197,253,0.6)");
      }
    }
  }

  function render() {
    ctx.clearRect(0, 0, simCanvas.width, simCanvas.height);
    drawField();

    ctx.strokeStyle = "#22d3ee";
    for (const c of state.constraints) {
      const a = state.bodies.find((b) => b.id === c.aId);
      const b = state.bodies.find((b) => b.id === c.bId);
      if (!a || !b) continue;
      ctx.beginPath();
      ctx.moveTo(a.pos.x, a.pos.y);
      ctx.lineTo(b.pos.x, b.pos.y);
      ctx.stroke();
    }

    for (const b of state.bodies) {
      ctx.save();
      ctx.translate(b.pos.x, b.pos.y);
      ctx.rotate(b.angle);
      ctx.strokeStyle = b.magnetic ? "#f97316" : "#38bdf8";
      ctx.fillStyle = "rgba(30,41,59,0.65)";
      if (b.type === "circle") {
        ctx.beginPath();
        ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.rect(-b.width * 0.5, -b.height * 0.5, b.width, b.height);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = "#e2e8f0";
      ctx.fillText(`#${b.id}`, 8, -8);
      if (b.magnetic) {
        drawArrow(v(0, 0), mul(magneticAxis(b), 24), "#fb7185");
      }
      ctx.restore();
      drawArrow(b.pos, mul(unit(b.force), Math.min(35, len(b.force) * 0.025)), "#22c55e");
      drawArrow(b.pos, v(0, Math.max(-30, Math.min(30, -b.torque * 0.2))), "#a78bfa");
    }
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
    const minV = Math.min(...samples.map((s) => s.v));
    const maxV = Math.max(...samples.map((s) => s.v));
    const tSpan = Math.max(0.0001, maxT - minT);
    const vSpan = Math.max(0.0001, maxV - minV);
    pctx.strokeStyle = "#22d3ee";
    pctx.beginPath();
    for (let i = 0; i < samples.length; i += 1) {
      const s = samples[i];
      const x = ((s.t - minT) / tSpan) * plotCanvas.width;
      const y = plotCanvas.height - ((s.v - minV) / vSpan) * plotCanvas.height;
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
      let iter = 0;
      while (accumulator >= FIXED_DT && iter < MAX_STEPS_PER_FRAME) {
        step(FIXED_DT);
        accumulator -= FIXED_DT;
        iter += 1;
      }
    }
    render();
    renderPlot();
    requestAnimationFrame(frame);
  }

  function exportProject() {
    const payload = {
      nextBodyId,
      worldTime,
      bodies: state.bodies.map((b) => ({
        id: b.id,
        type: b.type,
        pos: b.pos,
        vel: b.vel,
        mass: b.mass,
        angle: b.angle,
        angularVel: b.angularVel,
        width: b.width,
        height: b.height,
        radius: b.radius,
        magnetic: b.magnetic,
        magneticMoment: b.magneticMoment,
      })),
      constraints: state.constraints,
      tracking: state.tracking,
    };
    getEl("projectJson").value = JSON.stringify(payload, null, 2);
  }

  function importProject() {
    try {
      const data = JSON.parse(getEl("projectJson").value);
      state.bodies = [];
      state.constraints = [];
      state.tracking = data.tracking || { bodyId: null, metric: "force", samples: [] };
      nextBodyId = Number(data.nextBodyId) || 1;
      worldTime = Number(data.worldTime) || 0;
      for (const src of data.bodies || []) {
        const body = {
          ...src,
          pos: v(src.pos.x, src.pos.y),
          vel: v(src.vel.x, src.vel.y),
          force: v(0, 0),
          invMass: 1 / Math.max(0.001, src.mass),
          torque: 0,
          magneticDirection: src.angle,
        };
        state.bodies.push(body);
      }
      for (const c of data.constraints || []) state.constraints.push(c);
    } catch (err) {
      alert(`Invalid project JSON: ${err.message}`);
    }
  }

  function wireUi() {
    getEl("startPauseBtn").addEventListener("click", () => {
      running = !running;
      getEl("startPauseBtn").textContent = running ? "Pause" : "Start";
    });
    getEl("stepBtn").addEventListener("click", () => step(FIXED_DT));
    getEl("resetBtn").addEventListener("click", () => {
      state.bodies = [];
      state.constraints = [];
      state.tracking.samples = [];
      nextBodyId = 1;
      worldTime = 0;
    });
    getEl("addShapeBtn").addEventListener("click", () => {
      addBody({
        type: getEl("shapeType").value,
        x: Number(getEl("shapeX").value),
        y: Number(getEl("shapeY").value),
        width: Number(getEl("shapeW").value),
        height: Number(getEl("shapeH").value),
        radius: Number(getEl("shapeR").value),
        mass: Number(getEl("shapeMass").value),
        angle: (Number(getEl("shapeAngle").value) * Math.PI) / 180,
        magnetic: getEl("shapeMagnetic").checked,
        magneticMoment: Number(getEl("shapeMoment").value),
      });
    });
    getEl("addConstraintBtn").addEventListener("click", () => {
      addConstraint(
        Number(getEl("constraintA").value),
        Number(getEl("constraintB").value),
        Number(getEl("constraintDist").value),
        Number(getEl("constraintK").value)
      );
    });
    getEl("startTrackingBtn").addEventListener("click", () => {
      state.tracking.bodyId = Number(getEl("trackBody").value);
      state.tracking.metric = getEl("trackMetric").value;
      state.tracking.samples = [];
    });
    getEl("clearTrackingBtn").addEventListener("click", () => {
      state.tracking.samples = [];
    });
    getEl("exportBtn").addEventListener("click", exportProject);
    getEl("importBtn").addEventListener("click", importProject);
  }

  wireUi();
  addBody({
    type: "rectangle",
    x: 240,
    y: 280,
    width: 110,
    height: 54,
    radius: 20,
    mass: 1.3,
    angle: 0.3,
    magnetic: true,
    magneticMoment: 55,
  });
  addBody({
    type: "circle",
    x: 550,
    y: 260,
    width: 40,
    height: 40,
    radius: 34,
    mass: 1.1,
    angle: -0.4,
    magnetic: true,
    magneticMoment: 52,
  });
  addConstraint(1, 2, 260, 2.6);
  requestAnimationFrame(frame);
})();
