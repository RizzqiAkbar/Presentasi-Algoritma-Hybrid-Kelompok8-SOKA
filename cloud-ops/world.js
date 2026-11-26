import * as THREE from './vendor/three.module.js';
import { fmt } from './adapter.js';

const TOP = .25, X0 = -3, WIDTH = 16;
const VM = [0x6366f1, 0xf59e0b, 0x16867b, 0xb64160, 0x527cb0, 0x7f5a37];
const TASK = [0x38bdf8, 0xa78bfa, 0x34d399];
const V3 = THREE.Vector3;

// Island, robot, crates, action pads, ants and reward motifs adapted from the teammate's dunia3d (1).html.
export class World {
  constructor(canvas, model, callbacks) {
    this.canvas = canvas; this.model = model; this.callbacks = callbacks;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(0x1c0a3b);
    this.scene.fog = new THREE.Fog(0x1c0a3b, 65, 160);
    this.camera = new THREE.PerspectiveCamera(38, 1, .1, 300);
    this.scene.add(new THREE.HemisphereLight(0xffd6e8, 0x2a1050, .75));
    const sun = new THREE.DirectionalLight(0xfff0dd, 1.05);
    sun.position.set(16, 26, 12); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 90 }); sun.shadow.bias = -.0004;
    this.scene.add(sun); sun.target.position.set(4, 0, 0); this.scene.add(sun.target);
    this.dynamic = new THREE.Group(); this.scene.add(this.dynamic);
    this.keys = new Set(); this.velocity = new V3(); this.focus = new V3(3, 0, 0); this.cameraOffset = new V3(0, 36, 28);
    this.time = 0; this.angle = 0; this.mode = 'manual'; this.cameraMode = 'overview'; this.speed = 3; this.paused = false;
    this.reduced = false; this.disposed = false; this.active = false; this.motionToken = 0; this.ants = []; this.confetti = [];
    this.robot = this.makeRobot(); this.robot.position.set(-5, .8, 0); this.scene.add(this.robot);
    this.shadow = this.mesh(new THREE.CircleGeometry(.8, 20), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: .25 }));
    this.shadow.rotation.x = -Math.PI / 2; this.scene.add(this.shadow);
    this.build(model); this.resize();
  }
  mesh(geometry, material, parent = this.dynamic) { const mesh = new THREE.Mesh(geometry, material); parent.add(mesh); return mesh; }
  material(color) { return new THREE.MeshStandardMaterial({ color, roughness: .75, flatShading: true }); }
  box(x, y, z, color, px, py, pz, parent) { const m = this.mesh(new THREE.BoxGeometry(x, y, z), this.material(color), parent); m.position.set(px, py, pz); m.castShadow = m.receiveShadow = true; return m; }
  texture(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
  label(lines, width = 3.1, color = '#fff') {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false }));
    sp.scale.set(width, width * .31, 1); sp.renderOrder = 10; this.dynamic.add(sp); this.setLabel(sp, lines, color); return sp;
  }
  setLabel(sp, lines, color = '#fff') {
    const key = lines.join('|') + color; if (key === sp.userData.key) return;
    sp.userData.key = key; sp.material.map?.dispose();
    sp.material.map = this.texture(512, 160, (c, w, h) => {
      c.fillStyle = '#231039'; c.fillRect(3, 3, w - 6, h - 6); c.strokeStyle = color; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6);
      c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; let size = lines[1] ? 72 : 88; c.font = `700 ${size}px Segoe UI`;
      while (c.measureText(lines[0]).width > w - 24 && size > 20) { size -= 2; c.font = `700 ${size}px Segoe UI`; }
      c.fillText(lines[0], w / 2, lines[1] ? 55 : 80);
      if (lines[1]) { c.font = '600 44px Segoe UI'; c.fillText(lines[1], w / 2, 122); }
    });
  }
  makeRobot() {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body); this.robotBody = body;
    const white = this.material(0xf3eefc), dark = this.material(0x2b1b4d), glow = new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x22d3ee, emissiveIntensity: 1 });
    const add = (geo, mat, x, y, z) => { const m = this.mesh(geo, mat, body); m.position.set(x, y, z); m.castShadow = true; };
    add(new THREE.CylinderGeometry(.55, .38, .28, 12), dark, 0, .35, 0);
    add(new THREE.BoxGeometry(1.1, .9, .9), white, 0, 1, 0); add(new THREE.BoxGeometry(.5, .3, .06), glow, 0, 1.05, .46);
    add(new THREE.BoxGeometry(1, .72, .85), white, 0, 1.85, 0); add(new THREE.BoxGeometry(.8, .26, .06), glow, 0, 1.88, .44);
    add(new THREE.CylinderGeometry(.04, .04, .5, 6), dark, 0, 2.45, 0);
    add(new THREE.SphereGeometry(.1, 10, 8), this.material(0xff8a3d), 0, 2.74, 0);
    add(new THREE.BoxGeometry(.22, .62, .26), dark, -.72, 1, 0); add(new THREE.BoxGeometry(.22, .62, .26), dark, .72, 1, 0);
    const ring = this.mesh(new THREE.TorusGeometry(.72, .06, 8, 32), new THREE.MeshBasicMaterial({ color: 0xff7ac8 }), body); ring.rotation.x = Math.PI / 2; ring.position.y = .16;
    g.scale.setScalar(1.15); return g;
  }
  disposeGroup(group) {
    const geometries = new Set(), materials = new Set(), textures = new Set();
    group.traverse(o => { if (o.geometry) geometries.add(o.geometry); for (const m of [].concat(o.material || [])) { materials.add(m); if (m.map) textures.add(m.map); } });
    textures.forEach(t => t.dispose()); materials.forEach(m => m.dispose()); geometries.forEach(g => g.dispose()); group.clear();
  }
  build(model) {
    this.cancelMotion(); this.disposeGroup(this.dynamic); this.model = model; this.execution = null; this.visualHeld = null;
    this.crates = []; this.lanes = []; this.pads = []; this.ants = []; this.confetti = [];
    this.laneZ = model.et[0].map((_, v) => (v - (model.et[0].length - 1) / 2) * 4.7);
    this.halfDepth = Math.max(10.8, model.et[0].length * 2.35 + 5);
    const rows = Math.min(model.et.length, 4), spread = Math.min(4.4, (this.halfDepth * 2 - 7) / rows);
    this.tray = model.et.map((_, t) => ({ x: -9.2 - Math.floor(t / rows) * 3.2, z: (t % rows - (rows - 1) / 2) * spread }));
    this.minX = Math.min(-12.8, ...this.tray.map(p => p.x - 2.5));
    const tile = this.texture(128, 128, (c, w, h) => { c.fillStyle = '#f08a55'; c.fillRect(0, 0, w, h); c.strokeStyle = '#cf6a43'; c.lineWidth = 2; c.strokeRect(1, 1, w - 2, h - 2); });
    tile.wrapS = tile.wrapT = THREE.RepeatWrapping; tile.repeat.set(11, this.halfDepth * .65);
    const islandWidth = 22 - this.minX, center = (22 + this.minX) / 2;
    const island = this.mesh(new THREE.BoxGeometry(islandWidth, .5, this.halfDepth * 2), new THREE.MeshStandardMaterial({ map: tile, roughness: .9 })); island.position.set(center, 0, 0); island.receiveShadow = true;
    this.box(islandWidth + .6, .3, this.halfDepth * 2 + .6, 0xffd6ef, center, -.13, 0);
    const floor = this.mesh(new THREE.PlaneGeometry(300, 300), this.material(0x21093f)); floor.rotation.x = -Math.PI / 2; floor.position.y = -.6;
    for (let i = 0; i < 8; i++) this.tree(this.minX + 2 + i * (islandWidth - 4) / 7, -this.halfDepth + 1, .85 + (i % 3) * .12);
    this.tree(this.minX + 1, this.halfDepth - 1, 1); this.tree(20, this.halfDepth - 1, 1.1);
    [-6, 16].forEach(x => [-1, 1].forEach(sign => this.lamp(x, sign * (this.halfDepth - 2.5))));
    const full = model.et.map(row => Math.max(...row)).reduce((a, b) => a + b, 0);
    this.scaleTarget = Math.max(1, full); this.scale = WIDTH / this.scaleTarget;
    model.et[0].forEach((_, v) => {
      const z = this.laneZ[v], color = VM[v];
      const slab = this.box(WIDTH + .4, .12, 2.6, 0x2d1560, X0 + WIDTH / 2, TOP + .06, z); slab.userData.action = { type: 'lane', vm: v };
      this.box(WIDTH + .4, .14, .1, color, X0 + WIDTH / 2, TOP + .07, z - 1.36);
      const sign = this.label([`VM${v + 1}`, 'beban 0 s'], 3.1, `#${color.toString(16).padStart(6, '0')}`); sign.position.set(X0 - 2.3, 1.7, z);
      const idle = this.mesh(new THREE.BoxGeometry(1, .07, 2.2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .25 }));
      const idleLabel = this.label(['Idle'], 2.6); idle.visible = idleLabel.visible = false;
      const ticks = [];
      for (let t = 0; t <= 4; t++) { const line = this.box(.035, .02, 2.6, 0xbaa2d9, X0 + WIDTH * t / 4, .39, z); line.castShadow = false; const label = this.label(['0'], 1.25); label.position.set(X0 + WIDTH * t / 4, .7, z + 1.75); ticks.push(label); }
      this.lanes.push({ sign, idle, idleLabel, ticks });
    });
    this.marker = this.mesh(new THREE.BoxGeometry(.06, 2.2, Math.max(7, this.laneZ.at(-1) - this.laneZ[0] + 3)), new THREE.MeshBasicMaterial({ color: 0xff3b6b, transparent: true, opacity: .35 }));
    this.markerLabel = this.label(['Makespan'], 3); this.playhead = this.mesh(this.marker.geometry.clone(), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .85 })); this.playhead.visible = false;
    this.makePad(-8, this.halfDepth - 2.5, 0x94a3b8, 'RESET', 'Kosongkan jalur', 'reset');
    this.makePad(1, this.halfDepth - 2.5, VM[0], 'ANT RESEARCH PARK', 'Max-Min + ACO', 'aco');
    this.makePad(9, this.halfDepth - 2.5, VM[1], 'GENE LAB', 'Min-Min + GA', 'ga');
    this.makePad(18, 0, 0x22c55e, 'RUN', 'Eksekusi paralel', 'run');
    model.et.forEach((row, t) => {
      const group = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: TASK[t % 3], roughness: .45, emissive: TASK[t % 3], emissiveIntensity: .12 }); this.dynamic.add(group);
      const body = this.mesh(new THREE.BoxGeometry(1, 1, 1), mat, group); body.castShadow = true;
      body.add(new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry), new THREE.LineBasicMaterial({ color: 0xffffff })));
      const progress = this.mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: .4 }), group); progress.visible = false;
      const label = this.label([`T${t + 1}`], model.et.length > 6 ? 2.5 : 3.2); group.add(label);
      group.userData.action = { type: 'task', task: t };
      this.crates.push({ group, body, mat, label, progress, target: new V3(), size: new V3(), task: t });
    });
    this.robot.position.set(-5.5, .8, 0); this.focus.set((this.minX + 20) / 2, 0, 0);
    this.retarget(true); this.updateCamera(1, true);
  }
  tree(x, z, scale) {
    const g = new THREE.Group(); this.dynamic.add(g);
    const trunk = this.mesh(new THREE.CylinderGeometry(.22, .32, 1.6, 6), this.material(0x6b3a2a), g); trunk.position.y = .8;
    [[0, 2.4, 0, 1.25], [.7, 2, .3, .85], [-.6, 2.1, -.3, .9]].forEach((b, i) => { const m = this.mesh(new THREE.IcosahedronGeometry(b[3], 0), this.material([0xff5f8f, 0xff7aa6, 0xf0457a][i]), g); m.position.set(b[0], b[1], b[2]); m.castShadow = true; });
    g.position.set(x, TOP, z); g.scale.setScalar(scale);
  }
  lamp(x, z) { this.box(.16, 2.6, .16, 0x3a2a63, x, 1.55, z); this.box(.5, .5, .5, 0xffe08a, x, 3.05, z); }
  makePad(x, z, color, title, sub, action) {
    const g = new THREE.Group(); this.dynamic.add(g);
    const base = this.mesh(new THREE.CylinderGeometry(1.55, 1.55, .14, 24), this.material(0x2a1458), g);
    const ring = this.mesh(new THREE.TorusGeometry(1.45, .09, 8, 32), new THREE.MeshBasicMaterial({ color }), g); ring.rotation.x = Math.PI / 2; ring.position.y = .1;
    const label = this.label([title, sub], 4.1); g.add(label); label.position.y = 2.5; g.position.set(x, TOP + .07, z);
    base.userData.action = { type: 'pad', action }; this.pads.push({ x, z, action, title });
  }
  retarget(immediate = false) {
    const m = this.model.metrics;
    this.scaleTarget = Math.max(m.makespan * 1.15, ...this.model.et.flat(), .000001);
    this.updateTargets(immediate); this.callbacks.change?.();
  }
  updateTargets(immediate = false) {
    const model = this.model, m = model.metrics;
    if (immediate) this.scale = WIDTH / this.scaleTarget;
    this.crates.forEach(c => {
      const t = c.task, vm = model.mapping[t], slot = m.slots.find(s => s.task === t), held = model.held === t || this.visualHeld === t;
      if (held) { c.target.set(this.robot.position.x, this.robot.position.y + 2.7, this.robot.position.z); c.size.set(1.1, 1.1, 1.1); this.setLabel(c.label, [`T${t + 1}`]); }
      else if (vm < 0) { c.target.set(this.tray[t].x, 1, this.tray[t].z); c.size.set(2, 1.1, 1.5); this.setLabel(c.label, [`T${t + 1}`, model.et[t].slice(0, 2).map((d, v) => `VM${v + 1}: ${fmt(d)}s`).join(' · ')]); }
      else { c.target.set(X0 + (slot.start + slot.duration / 2) * this.scale, .91, this.laneZ[vm]); c.size.set(slot.duration * this.scale, 1, 1.7); this.setLabel(c.label, [`T${t + 1}`, `${fmt(slot.duration)} s`]); }
      c.label.position.y = c.size.y / 2 + .8;
      if (immediate) { c.group.position.copy(c.target); c.body.scale.copy(c.size); }
    });
    this.lanes.forEach((lane, vm) => {
      this.setLabel(lane.sign, [`VM${vm + 1}`, `${fmt(m.loads[vm])} s`]);
      const idle = m.makespan - m.loads[vm]; lane.idle.visible = lane.idleLabel.visible = model.complete && idle > 1e-8;
      lane.idle.scale.x = Math.max(.001, idle * this.scale); lane.idle.position.set(X0 + (m.loads[vm] + idle / 2) * this.scale, .45, this.laneZ[vm]);
      lane.idleLabel.position.set(lane.idle.position.x, 1.5, this.laneZ[vm]); this.setLabel(lane.idleLabel, [`Idle ${fmt(idle)} s`]);
      lane.ticks.forEach((tick, i) => this.setLabel(tick, [fmt(WIDTH / this.scale * i / 4)]));
    });
    this.marker.visible = this.markerLabel.visible = m.makespan > 0;
    this.marker.position.set(X0 + m.makespan * this.scale, 1.5, 0); this.markerLabel.position.set(this.marker.position.x, 4.6, 0); this.setLabel(this.markerLabel, ['Makespan', `${fmt(m.makespan)} s`]);
  }
  nearest() {
    const r = this.robot.position;
    if (this.model.held !== null) {
      let vm = this.laneZ.reduce((a, z, v) => Math.abs(r.z - z) < Math.abs(r.z - this.laneZ[a]) ? v : a, 0);
      if (r.x >= X0 - .8 && r.x <= X0 + WIDTH + 1 && Math.abs(r.z - this.laneZ[vm]) < 2.4) return { type: 'lane', vm };
      return { type: r.x < -6.5 ? 'tray' : 'none' };
    }
    for (const p of this.pads) if (Math.hypot(r.x - p.x, r.z - p.z) < 1.9) return { type: 'pad', ...p };
    let nearest = { type: 'none' }, distance = 2.6;
    this.crates.forEach(c => { const dx = Math.max(0, Math.abs(r.x - c.target.x) - c.size.x / 2), dz = Math.max(0, Math.abs(r.z - c.target.z) - c.size.z / 2), d = Math.hypot(dx, dz); if (d < distance) { distance = d; nearest = { type: 'task', task: c.task }; } });
    return nearest;
  }
  approach(type, index) {
    if (type === 'task') { const c = this.crates[index]; return this.goTo(c.target.x + (this.model.mapping[index] < 0 ? 2.4 : 0), c.target.z + (this.model.mapping[index] < 0 ? 0 : 1.9)); }
    if (type === 'lane') return this.goTo(X0 + 2, this.laneZ[index] + 1.8);
    return this.goTo(-7.8, 0);
  }
  pointer(event) {
    if (this.mode !== 'manual' || this.execution) return;
    const rect = this.canvas.getBoundingClientRect(), pointer = new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(pointer, this.camera);
    for (const hit of ray.intersectObjects(this.dynamic.children, true)) {
      let o = hit.object; while (o && !o.userData.action) o = o.parent;
      if (!o) continue; const a = o.userData.action;
      this.cancelMotion();
      if (a.type === 'pad') { const p = this.pads.find(p => p.action === a.action); this.goTo(p.x, p.z); }
      else this.approach(a.type, a.type === 'task' ? a.task : a.vm);
      break;
    }
  }
  goTo(x, z) {
    this.motion?.resolve(false);
    if (this.reduced) { this.robot.position.x = x; this.robot.position.z = z; return Promise.resolve(true); }
    return new Promise(resolve => { this.motion = { x, z, resolve }; });
  }
  cancelMotion() { this.motionToken++; this.motion?.resolve(false); this.motion = null; this.visualHeld = null; this.velocity?.set(0, 0, 0); }
  async transition(mapping, order) {
    this.cancelMotion(); const token = this.motionToken;
    const old = this.crates.map(c => c.group.position.clone()), changed = mapping.map((v, t) => v !== this.model.mapping[t] ? t : -1).filter(t => t >= 0 && mapping[t] >= 0);
    this.model.apply(mapping, order); this.retarget();
    if (this.reduced) { this.updateTargets(true); return true; }
    for (const t of changed) {
      const destination = this.crates[t].target.clone();
      if (!await this.goTo(old[t].x, old[t].z + 1.8) || token !== this.motionToken) return false;
      this.visualHeld = t; this.callbacks.sound?.('pick');
      if (!await this.goTo(destination.x, destination.z + 1.8) || token !== this.motionToken) return false;
      this.visualHeld = null; this.callbacks.sound?.('drop'); this.retarget();
    }
    return true;
  }
  showAnt(event) {
    this.clearAnts();
    const pheromone = ['pheromone', 'evaporate', 'reinforce'].includes(event.type);
    const mapping = pheromone ? event.global || event.mapping : event.candidates?.[0].mapping;
    if (!mapping) return;
    this.canvas.dataset.antMapping = mapping.join(','); this.canvas.dataset.antKind = pheromone ? 'global-best' : 'candidate-1';
    mapping.forEach((vm, task) => {
      if (vm < 0) return;
      if (event.type === 'explore' && task > event.task) return;
      const from = new V3(this.tray[task].x, 1.5, this.tray[task].z), to = new V3(X0 + 1.2 + task * .5, 1.5, this.laneZ[vm]);
      const weight = event.tau?.[task]?.[vm] || 1;
      const route = new THREE.Line(new THREE.BufferGeometry().setFromPoints([from, to]), new THREE.LineBasicMaterial({ color: VM[vm], transparent: true, opacity: Math.min(.9, .25 + Math.log1p(weight) / 5) })); this.dynamic.add(route);
      const ant = new THREE.Group(), mat = this.material(0x4a1d12); this.dynamic.add(ant);
      [[0, .22], [.28, .17], [-.3, .27]].forEach(([x, radius]) => { const b = this.mesh(new THREE.SphereGeometry(radius, 8, 6), mat, ant); b.position.x = x; });
      ant.visible = !pheromone; ant.position.copy(from); ant.rotation.y = Math.atan2(to.x - from.x, to.z - from.z); this.ants.push({ group: ant, route, from, to, task, vm });
    });
    this.antStarted = this.time;
  }
  clearAnts() { for (const a of this.ants) { this.disposeGroup(a.group); this.dynamic.remove(a.group, a.route); a.route.geometry.dispose(); a.route.material.dispose(); } this.ants = []; delete this.canvas.dataset.antMapping; delete this.canvas.dataset.antKind; }
  execute() {
    if (!this.model.complete) return;
    this.cancelMotion(); this.execution = { time: 0, duration: this.model.metrics.makespan }; this.playhead.visible = true; this.callbacks.sound?.('start');
  }
  stopExecution() { this.execution = null; this.playhead && (this.playhead.visible = false); this.crates?.forEach(c => { c.progress.visible = false; }); }
  reward(stars) {
    if (this.reduced || stars < 2) return;
    for (let i = 0; i < 36; i++) { const mesh = this.mesh(new THREE.BoxGeometry(.22, .22, .22), new THREE.MeshBasicMaterial({ color: [0xff5f8f, 0xffd166, 0x38bdf8][i % 3] })); mesh.position.set(4 + (Math.random() - .5) * 6, 3, (Math.random() - .5) * 4); this.confetti.push({ mesh, velocity: new V3((Math.random() - .5) * 9, 8 + Math.random() * 7, (Math.random() - .5) * 8), life: 3 }); }
  }
  resize() { const { width, height } = this.canvas.getBoundingClientRect(); this.renderer.setSize(Math.max(1, width), Math.max(1, height), false); this.camera.aspect = width / Math.max(1, height); this.camera.updateProjectionMatrix(); }
  updateCamera(dt, immediate = false) {
    const overview = this.cameraMode === 'overview' || this.mode !== 'manual';
    const target = overview ? new V3((this.minX + 20) / 2, 0, 0) : new V3(this.robot.position.x, 0, this.robot.position.z);
    const halfWidth = (22 - this.minX) / 2 + 2, halfHeight = this.halfDepth + 5;
    const distance = overview ? Math.max(halfWidth / (this.camera.aspect * .33), halfHeight / .40) : 24;
    const offset = new V3(0, distance * .8, distance * .6), lerp = immediate || this.reduced ? 1 : 1 - Math.exp(-dt * 3);
    this.focus.lerp(target, lerp); this.cameraOffset.lerp(offset, lerp); this.camera.position.copy(this.focus).add(this.cameraOffset); this.camera.lookAt(this.focus.x, .5, this.focus.z);
  }
  update(dt, elapsed = dt) {
    if (!this.paused) {
      this.time += dt;
      let tx = 0, tz = 0, speed = 7;
      if (this.motion) {
        const dx = this.motion.x - this.robot.position.x, dz = this.motion.z - this.robot.position.z, d = Math.hypot(dx, dz);
        speed = Math.min(this.mode === 'manual' ? 10 : 9 * this.speed, d * 12);
        if (d < .15) { this.motion.resolve(true); this.motion = null; this.velocity.set(0, 0, 0); }
        else { tx = dx / d; tz = dz / d; }
      } else if (this.mode === 'manual' && !this.execution) {
        tx = Number(this.keys.has('d') || this.keys.has('arrowright')) - Number(this.keys.has('a') || this.keys.has('arrowleft'));
        tz = Number(this.keys.has('s') || this.keys.has('arrowdown')) - Number(this.keys.has('w') || this.keys.has('arrowup'));
        const length = Math.hypot(tx, tz); if (length) { tx /= length; tz /= length; }
      }
      this.velocity.lerp(new V3(tx * speed, 0, tz * speed), 1 - Math.exp(-dt * 12));
      this.robot.position.x = THREE.MathUtils.clamp(this.robot.position.x + this.velocity.x * dt, this.minX + .6, 21);
      this.robot.position.z = THREE.MathUtils.clamp(this.robot.position.z + this.velocity.z * dt, -this.halfDepth + .5, this.halfDepth - .5);
      if (this.velocity.length() > .3) { const target = Math.atan2(this.velocity.x, this.velocity.z), difference = ((target - this.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI; this.angle += difference * (1 - Math.exp(-dt * 12)); }
      this.robot.rotation.y = this.angle; this.robot.position.y = .8 + (this.reduced || this.velocity.length() < .3 ? 0 : Math.sin(this.time * 12) * .06);
      this.robotBody.rotation.z = this.reduced ? 0 : -this.velocity.x * .012; this.robotBody.rotation.x = this.reduced ? 0 : this.velocity.z * .012;
      this.scale += (WIDTH / this.scaleTarget - this.scale) * (this.reduced ? 1 : 1 - Math.exp(-dt * 8));
      this.updateTargets();
      this.crates.forEach(c => { const k = this.reduced ? 1 : 1 - Math.exp(-dt * 10); c.group.position.lerp(c.target, k); c.body.scale.lerp(c.size, k); });
      this.ants.forEach(a => { const progress = this.reduced ? 1 : Math.min(1, (this.time - this.antStarted) / 2.5); a.group.position.lerpVectors(a.from, a.to, progress); });
      if (this.execution) {
        const run = this.execution, m = this.model.metrics; run.time = Math.min(run.duration, run.time + elapsed * run.duration / 9 * this.speed);
        this.playhead.position.set(X0 + run.time * this.scale, 1.5, 0);
        m.slots.forEach(slot => { const c = this.crates[slot.task], p = THREE.MathUtils.clamp((run.time - slot.start) / slot.duration, 0, 1); c.progress.visible = true; c.progress.scale.set(Math.max(.001, c.size.x * p), 1.04, 1.74); c.progress.position.x = -c.size.x / 2 + c.size.x * p / 2; });
        this.callbacks.clock?.(run.time, run.duration);
        if (run.time >= run.duration) { this.execution = null; this.callbacks.finish?.(); }
      }
      for (let i = this.confetti.length - 1; i >= 0; i--) { const c = this.confetti[i]; c.life -= dt; c.velocity.y -= 16 * dt; c.mesh.position.addScaledVector(c.velocity, dt); c.mesh.rotation.x += dt * 6; if (c.life < 0 || c.mesh.position.y < 0) { this.dynamic.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh.material.dispose(); this.confetti.splice(i, 1); } }
    }
    this.shadow.position.set(this.robot.position.x, .28, this.robot.position.z); this.updateCamera(dt);
    this.canvas.dataset.robot = `${this.robot.position.x.toFixed(2)},${this.robot.position.z.toFixed(2)}`;
    this.canvas.dataset.mapping = this.model.mapping.join(','); this.canvas.dataset.execution = this.execution ? this.execution.time.toFixed(2) : 'idle';
    this.callbacks.focus?.(this.nearest());
  }
  start() {
    if (this.active || this.disposed) return; this.active = true; let last = performance.now();
    const frame = now => { if (!this.active || this.disposed) return; const elapsed = (now - last) / 1000, dt = Math.min(.05, elapsed); last = now; this.update(dt, elapsed); this.renderer.render(this.scene, this.camera); this.frame = requestAnimationFrame(frame); };
    this.frame = requestAnimationFrame(frame);
  }
  suspend() { this.active = false; cancelAnimationFrame(this.frame); this.keys.clear(); this.velocity.set(0, 0, 0); }
  dispose() { if (this.disposed) return; this.suspend(); this.disposed = true; this.cancelMotion(); this.stopExecution(); this.clearAnts(); this.disposeGroup(this.scene); this.renderer.renderLists.dispose(); this.renderer.dispose(); this.renderer.forceContextLoss(); }
}
