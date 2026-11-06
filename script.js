const THREE = AFRAME.THREE;

const STATES = {
  idle:     { color: '#2d2f36', emissive: '#000000', lift: 0,      scale: 1 },
  hover:    { color: '#56627a', emissive: '#141a26', lift: 0.03,   scale: 1.03 },
  press:    { color: '#d19a2a', emissive: '#3d2a05', lift: -0.012, scale: 0.97 },
  sel:      { color: '#8a6a1c', emissive: '#2a1f05', lift: 0,      scale: 1 },
  selHover: { color: '#b38a26', emissive: '#3a2b06', lift: 0.03,   scale: 1.03 },
  off:      { color: '#1c1d22', emissive: '#000000', lift: 0,      scale: 1 },
};

const setHelp = (hidden) => {
  const help = document.getElementById('help');
  if (help) help.hidden = hidden;
};

const setText = (el, value) => {
  if (el.dataset.value === value) return;
  el.dataset.value = value;
  el.setAttribute('text', 'value', value);
};

AFRAME.registerComponent('start-pitch', {
  schema: { type: 'number' },
  init() {
    setTimeout(() => {
      this.el.components['look-controls'].pitchObject.rotation.x = THREE.MathUtils.degToRad(this.data);
    }, 300);
  },
});

AFRAME.registerComponent('ui-button', {
  schema: { enabled: { default: true }, selected: { default: false } },

  init() {
    this.hovering = 0;
    this.pressed = false;
    this.baseZ = this.el.object3D.position.z;
    this.lift = 0;
    this.scale = 1;
    this.color = new THREE.Color(STATES.idle.color);
    this.emissive = new THREE.Color(STATES.idle.emissive);
    this.outline = this.el.querySelector('.outline');
    this.bar = this.el.querySelector('.bar');

    this.el.addEventListener('mouseenter', () => this.hovering++);
    this.el.addEventListener('mouseleave', () => { this.hovering = Math.max(0, this.hovering - 1); });
    this.el.addEventListener('mousedown', () => { this.pressed = true; });
    this.el.addEventListener('mouseup', () => { this.pressed = false; });
  },

  update() {
    if (this.bar) this.bar.object3D.visible = this.data.selected;
  },

  tick(time, delta) {
    const mesh = this.el.getObject3D('mesh');
    if (!mesh) return;
    const { enabled, selected } = this.data;
    const hover = this.hovering > 0;
    let state = STATES.idle;
    if (!enabled) state = STATES.off;
    else if (this.pressed) state = STATES.press;
    else if (selected) state = hover ? STATES.selHover : STATES.sel;
    else if (hover) state = STATES.hover;

    const k = 1 - Math.exp(-(delta / 1000) * 22);
    this.color.lerp(new THREE.Color(state.color), k);
    this.emissive.lerp(new THREE.Color(state.emissive), k);
    this.lift += (state.lift - this.lift) * k;
    this.scale += (state.scale - this.scale) * k;

    mesh.material.color.copy(this.color);
    mesh.material.emissive.copy(this.emissive);
    this.el.object3D.position.z = this.baseZ + this.lift;
    this.el.object3D.scale.set(this.scale, this.scale, 1);
    if (this.outline) this.outline.object3D.visible = enabled && hover && !this.pressed;
  },
});

AFRAME.registerComponent('enter-museum', {
  init() {
    this.el.addEventListener('click', () => {
      document.querySelector('#intro').object3D.visible = false;
      document.querySelector('#gallery').object3D.visible = true;
      this.el.sceneEl.setAttribute('raycaster', 'objects', '.clickable');
    });
  },
});

AFRAME.registerComponent('media-item', {
  schema: {
    target: { type: 'selector' },
    video: { type: 'selector' },
    title: { default: '' },
  },
  init() {
    this.el.addEventListener('click', () => {
      document.querySelector('#gallery').components.viewer.show(this.el);
    });
  },
});

AFRAME.registerComponent('video-control', {
  schema: { action: { oneOf: ['toggle', 'mute', 'seek'] } },
  init() {
    this.el.addEventListener('click', (e) => {
      document.querySelector('#gallery').components.viewer[this.data.action](e, this.el);
    });
  },
});

AFRAME.registerComponent('viewer', {
  init() {
    this.works = [...this.el.querySelectorAll('.work')];
    this.items = [...this.el.querySelectorAll('[media-item]')];
    this.controls = [...this.el.querySelectorAll('[video-control]')];
    this.status = this.el.querySelector('.status');
    this.time = this.el.querySelector('.time');
    this.fill = this.el.querySelector('.fill');
    this.playLabel = this.el.querySelector('.play-label');
    this.muteLabel = this.el.querySelector('.mute-label');
    this.video = null;

    window.addEventListener('pointerdown', () => setHelp(true));
    this.el.sceneEl.addEventListener('enter-vr', () => setHelp(true));
    this.el.sceneEl.addEventListener('exit-vr', () => setHelp(false));
  },

  show(item) {
    const { target, video, title } = item.components['media-item'].data;
    if (this.video) this.video.pause();
    this.video = video;

    this.works.forEach((work) => { work.object3D.visible = work === target; });
    target.querySelector('.screen').emit('show');
    setText(this.status, `Showing: ${title}`);
    setText(this.muteLabel, 'Sound: on');
    setText(this.time, '');
    this.items.forEach((el) => el.setAttribute('ui-button', 'selected', el === item));
    this.controls.forEach((el) => {
      el.setAttribute('ui-button', 'enabled', !!video);
      el.classList.toggle('clickable', !!video);
    });
    this.el.sceneEl.components.raycaster.refreshObjects();

    if (video) {
      video.currentTime = 0;
      video.muted = false;
      video.play();
    }
  },

  toggle() {
    if (!this.video) return;
    if (this.video.paused) this.video.play();
    else this.video.pause();
  },

  mute() {
    if (!this.video) return;
    this.video.muted = !this.video.muted;
    setText(this.muteLabel, this.video.muted ? 'Sound: off' : 'Sound: on');
  },

  seek(e, bar) {
    if (!this.video) return;
    const local = bar.object3D.worldToLocal(e.detail.intersection.point.clone());
    const f = THREE.MathUtils.clamp(local.x / bar.getAttribute('width') + 0.5, 0, 1);
    this.video.currentTime = f * this.video.duration;
  },

  tick() {
    const video = this.video;
    if (!video) return;
    const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    const f = video.duration ? video.currentTime / video.duration : 0;
    setText(this.playLabel, video.paused ? 'Play' : 'Pause');
    setText(this.time, `${clock(video.currentTime)} / ${clock(video.duration || 0)}`);
    this.fill.object3D.scale.x = Math.max(0.0001, 0.544 * f);
  },
});

AFRAME.registerComponent('xr-pointer', {
  init() {
    this.raycaster = new THREE.Raycaster();
    this.pointers = [];
    const setup = () => {
      for (let i = 0; i < 2; i++) this.addPointer(this.el.renderer.xr.getController(i));
    };
    if (this.el.hasLoaded) setup();
    else this.el.addEventListener('loaded', setup);
  },

  addPointer(controller) {
    const ray = new THREE.Mesh(
      new THREE.CylinderGeometry(0.004, 0.004, 1, 8).translate(0, 0.5, 0).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.7 })
    );
    ray.visible = false;
    controller.add(ray);
    this.el.object3D.add(controller);

    const p = { controller, ray, active: false, source: null, hover: null, down: null, hit: null };
    controller.addEventListener('connected', (e) => {
      p.source = e.data;
      p.active = e.data.targetRayMode !== 'screen';
      ray.material.opacity = e.data.hand ? 0.35 : 0.7;
    });
    controller.addEventListener('disconnected', () => { p.active = false; });
    controller.addEventListener('selectstart', () => this.press(p));
    controller.addEventListener('selectend', () => this.release(p));
    this.pointers.push(p);
  },

  buzz(p, strength, ms) {
    const pad = p.source && p.source.gamepad;
    if (!pad) return;
    const actuator = pad.hapticActuators && pad.hapticActuators[0];
    if (actuator && actuator.pulse) actuator.pulse(strength, ms);
  },

  press(p) {
    p.ray.material.color.setHex(0xf59e0b);
    if (!p.hover) return;
    p.down = p.hover;
    p.down.emit('mousedown');
    this.buzz(p, 0.7, 50);
  },

  release(p) {
    p.ray.material.color.setHex(0x7dd3fc);
    if (!p.down) return;
    p.down.emit('mouseup');
    if (p.down === p.hover) {
      p.down.emit('click', { intersection: p.hit });
      this.buzz(p, 0.4, 30);
    }
    p.down = null;
  },

  tick() {
    if (!this.el.is('vr-mode')) return;
    const selector = this.el.getAttribute('raycaster').objects;
    const targets = [...this.el.querySelectorAll(selector)].map((el) => el.object3D);
    this.pointers.forEach((p) => {
      p.ray.visible = p.active;
      if (!p.active) return;
      p.controller.updateMatrixWorld(true);
      const origin = new THREE.Vector3().setFromMatrixPosition(p.controller.matrixWorld);
      const direction = new THREE.Vector3(0, 0, -1).transformDirection(p.controller.matrixWorld);
      this.raycaster.set(origin, direction);

      p.hit = this.raycaster.intersectObjects(targets, true)[0] || null;
      let object = p.hit && p.hit.object;
      while (object && !object.el) object = object.parent;
      const target = object ? object.el.closest(selector) : null;
      if (target !== p.hover) {
        if (p.hover) p.hover.emit('mouseleave');
        if (target) {
          target.emit('mouseenter');
          this.buzz(p, 0.3, 20);
        }
        p.hover = target;
      }
      p.ray.scale.set(1, 1, p.hit ? p.hit.distance : 2.5);
    });
  },
});
