/* Cursor bulge (WebGL) for the hero portrait and the work teasers.
 *
 * Each target becomes a Three.js plane whose vertices lift toward the camera
 * in a broad, soft bubble centred on the cursor — the image seems to peel off
 * the page and magnify wherever you point. Same shader as the Website2 work
 * cards (displacement = (1 - smoothstep(0, RADIUS, screenDist)) * AMOUNT).
 *
 * Each target is a container element holding an <img>. The injected canvas
 * rotates with the container (if it's tilted, e.g. the hero portrait), and the
 * cursor is inverse-rotated into the image's local space. The <img> stays in
 * the DOM (texture source, alt text, reserved space, fallback) and is hidden
 * once the canvas takes over.
 *
 * Progressive enhancement: fine-pointer, hover-capable, non-reduced-motion,
 * with THREE present and same-origin images (WebGL can't texture a file://
 * image). Each instance renders only while hovered or settling. */
(function () {
  var ok = window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
           !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!ok || !window.THREE) return;

  var FOV = 28, CAM_Z = 2.04;
  var PLANE_H = 2 * CAM_Z * Math.tan((FOV * Math.PI / 180) / 2); // fills the view vertically

  // The canvas is rendered larger than the element (BLEED each side) and the
  // image plane is inset back to the element's size, so the bulge has room to
  // expand outward instead of being clipped at the canvas edge. INSET scales
  // both the plane and the cursor mapping down into that central region.
  var BLEED = 0.14;
  var INSET = 1 / (1 + 2 * BLEED);

  var VERT = [
    '#define BUBBLE_AMOUNT 0.2',
    '#define BUBBLE_RADIUS 0.9',
    'uniform vec2 uMouse;',   // cursor in NDC (-1..1), y up
    'uniform float uHover;',  // 0..1 fade
    'varying vec2 vUv;',
    'void main() {',
    '  vUv = uv;',
    '  vec4 pos = modelViewMatrix * vec4(position, 1.0);',
    '  vec4 screen = projectionMatrix * pos;',
    '  vec2 ndc = screen.xy / screen.w;',
    '  float d = length(uMouse - ndc);',
    '  float strength = 1.0 - smoothstep(0.0, BUBBLE_RADIUS, d);',
    '  pos.z += strength * BUBBLE_AMOUNT * uHover;',       // lift toward the camera
    '  gl_Position = projectionMatrix * pos;',
    '}'
  ].join('\n');

  var FRAG = [
    'uniform sampler2D uTex;',
    'uniform float uPlaneAspect;',
    'uniform float uTexAspect;',
    'uniform float uHover;',
    'uniform float uDarken;',  // max darkening at full hover (0 = none)
    'varying vec2 vUv;',
    'void main() {',
    '  float pa = uPlaneAspect, ta = uTexAspect;',
    '  vec2 ratio = vec2(min(pa / ta, 1.0), min(ta / pa, 1.0));',  // object-fit: cover
    '  vec2 uv = vUv * ratio + (1.0 - ratio) * 0.5;',
    '  vec4 c = texture2D(uTex, uv);',
    '  c.rgb *= (1.0 - uHover * uDarken);',  // darken the whole image on hover
    '  gl_FragColor = c;',
    '}'
  ].join('\n');

  function Distort(el, darken) {
    var img = el.querySelector('img');
    if (!img) return;
    this.el = el;
    this.img = img;
    this.darken = darken || 0;
    this.mouse = new THREE.Vector2(0, 0);   // smoothed cursor (NDC)
    this.target = new THREE.Vector2(0, 0);  // raw cursor (NDC)
    this.hover = 0;
    this.hoverTarget = 0;
    this.theta = 0;
    this.rafId = null;

    var self = this;
    function start() {
      var d = img.decode ? img.decode() : Promise.reject();
      d.then(function () { self.init(); }, function () { self.init(); }); // decode first (no black frame)
    }
    if (img.complete && img.naturalWidth) start();
    else img.addEventListener('load', start, { once: true });
  }

  Distort.prototype.readAngle = function () {
    var t = getComputedStyle(this.el).transform;
    var m = t && t.match(/matrix\(([^)]+)\)/);
    if (!m) return 0;
    var v = m[1].split(',').map(parseFloat);
    return Math.atan2(v[1], v[0]); // radians
  };

  // canvas is BLEED-larger than the element on every side and offset so its
  // centre aligns with the element (the element box still equals the image)
  Distort.prototype.sizeCanvas = function (w, h) {
    var padX = w * BLEED, padY = h * BLEED;
    this.renderer.setSize(w + 2 * padX, h + 2 * padY);
    this.renderer.domElement.style.left = -padX + 'px';
    this.renderer.domElement.style.top = -padY + 'px';
  };

  Distort.prototype.buildMesh = function (w, h) {
    if (this.mesh) { this.scene.remove(this.mesh); this.mesh.geometry.dispose(); }
    var aspect = w / h; // element aspect (== oversized-canvas aspect)
    this.uniforms.uPlaneAspect.value = aspect;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(PLANE_H * aspect, PLANE_H, 20, 20), this.material);
    this.mesh.scale.set(INSET, INSET, 1); // shrink to the element region, leaving the bleed margin
    this.scene.add(this.mesh);
  };

  Distort.prototype.render = function () { this.renderer.render(this.scene, this.camera); };

  // map the cursor into the (unrotated) local space of the element
  Distort.prototype.setTarget = function (cx, cy) {
    var r = this.el.getBoundingClientRect();
    var dx = cx - (r.left + r.width / 2);
    var dy = cy - (r.top + r.height / 2);
    var cs = Math.cos(this.theta), sn = Math.sin(this.theta);
    var lx = dx * cs + dy * sn;                 // inverse-rotate by -theta
    var ly = -dx * sn + dy * cs;
    // scale into the inset plane region so the bubble still tracks the cursor
    this.target.set((lx / (this.el.offsetWidth / 2)) * INSET, -(ly / (this.el.offsetHeight / 2)) * INSET);
  };

  Distort.prototype.step = function () {
    this.mouse.lerp(this.target, 0.15);
    this.hover += (this.hoverTarget - this.hover) * 0.12;
    if (this.hoverTarget === 0 && this.hover < 0.002) {
      this.hover = 0;
      this.uniforms.uHover.value = 0;
      this.render();
      this.rafId = null;
      return;
    }
    this.uniforms.uMouse.value.copy(this.mouse);
    this.uniforms.uHover.value = this.hover;
    this.render();
    var self = this;
    this.rafId = requestAnimationFrame(function () { self.step(); });
  };

  Distort.prototype.ensureLoop = function () {
    if (this.rafId === null) {
      var self = this;
      this.rafId = requestAnimationFrame(function () { self.step(); });
    }
  };

  Distort.prototype.init = function () {
    if (this.renderer) return;
    var el = this.el, img = this.img;
    var w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) { // not laid out yet — wait for a real size
      var self0 = this;
      var ro0 = new ResizeObserver(function () {
        if (el.clientWidth && el.clientHeight) { ro0.disconnect(); self0.init(); }
      });
      ro0.observe(el);
      return;
    }

    try { this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); }
    catch (e) { return; } // WebGL unavailable — keep the plain <img>
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    var canvas = this.renderer.domElement;
    el.appendChild(canvas);
    this.sizeCanvas(w, h); // oversized canvas + offset (bleed room for the bulge)

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(FOV, w / h, 0.01, 100);
    this.camera.position.z = CAM_Z;

    var texture = new THREE.Texture(img);
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;

    this.uniforms = {
      uTex: { value: texture },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uHover: { value: 0 },
      uDarken: { value: this.darken },
      uPlaneAspect: { value: w / h },
      uTexAspect: { value: img.naturalWidth / img.naturalHeight }
    };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: VERT, fragmentShader: FRAG, transparent: true
    });

    this.buildMesh(w, h);
    // Cross-origin images (e.g. opened via file://) throw a SecurityError on
    // texture upload — bail and keep the plain <img>.
    try { this.render(); }
    catch (e) { this.renderer.dispose(); if (canvas.parentNode) canvas.remove(); this.renderer = null; return; }

    img.style.opacity = '0';
    var self = this, tex = texture;
    requestAnimationFrame(function () { tex.needsUpdate = true; self.render(); }); // re-upload safety net

    this.theta = this.readAngle();

    el.addEventListener('pointerenter', function (e) {
      self.setTarget(e.clientX, e.clientY);
      self.mouse.copy(self.target);
      self.hoverTarget = 1;
      self.ensureLoop();
    });
    el.addEventListener('pointermove', function (e) { self.setTarget(e.clientX, e.clientY); self.ensureLoop(); });
    el.addEventListener('pointerleave', function () { self.hoverTarget = 0; self.ensureLoop(); });

    if ('ResizeObserver' in window) {
      new ResizeObserver(function () {
        var nw = el.clientWidth, nh = el.clientHeight;
        if (!nw || !nh) return;
        self.sizeCanvas(nw, nh);
        self.buildMesh(nw, nh);
        self.theta = self.readAngle();
        self.render();
      }).observe(el);
    }
  };

  document.querySelectorAll('.hero__image, .work__teaser').forEach(function (el) {
    new Distort(el, el.classList.contains('work__teaser') ? 0.7 : 0); // teasers darken on hover
  });
})();
