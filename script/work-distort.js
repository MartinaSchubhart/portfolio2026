/* Cursor bulge (raw WebGL, no library) for the work cards.
 *
 * Each card becomes a subdivided plane whose vertices lift toward the camera in
 * a broad, soft bubble centred on the cursor — the image seems to peel off the
 * page and magnify wherever you point. The canvas is rendered larger than the
 * card (a bleed margin each side) with the image plane inset back to the card's
 * size, so the bulge expands outward instead of being clipped at the edge.
 *
 * Per-card config via data attributes (defaults preserve the base behaviour):
 *   data-bulge-amount="0.12"    -> bulge strength (default 0.2)
 *   data-bulge-bleed="gap"      -> fixed px bleed = one full --grid-gap
 *   data-bulge-bleed="half-gap" -> fixed px bleed = half of --grid-gap
 *                                  (default: fractional BLEED of the card)
 *
 * Progressive enhancement: desktop, fine-pointer, hover-capable, non-reduced-
 * motion, WebGL present, same-origin image. Otherwise the plain <img> stays.
 * Each card renders only while hovered or settling. */
(function () {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(min-width: 700px)').matches) return;

  var cards = document.querySelectorAll('.work__card');
  if (!cards.length) return;

  /* camera + plane constants (match the previous Three.js setup) */
  var FOV = 28, CAM_Z = 2.04;
  var PLANE_H = 2 * CAM_Z * Math.tan((FOV * Math.PI / 180) / 2); // fills the view vertically
  var BLEED = 0.14; // default fractional bleed each side
  var SEG = 24;     // plane subdivisions (smoothness of the bubble)

  /* one shared unit grid in [-0.5, 0.5]²; uv is derived as pos + 0.5 */
  function makeGrid(n) {
    var pos = [], idx = [];
    for (var j = 0; j <= n; j++)
      for (var i = 0; i <= n; i++) pos.push(i / n - 0.5, j / n - 0.5);
    for (var jj = 0; jj < n; jj++)
      for (var ii = 0; ii < n; ii++) {
        var a = jj * (n + 1) + ii, b = a + 1, c = a + (n + 1), d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    return { pos: new Float32Array(pos), idx: new Uint16Array(idx), count: idx.length };
  }
  var GRID = makeGrid(SEG);

  function perspective(fovYdeg, aspect, near, far) {
    var f = 1 / Math.tan((fovYdeg * Math.PI / 180) / 2), nf = 1 / (near - far);
    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * nf, -1,
      0, 0, 2 * far * near * nf, 0
    ]);
  }

  var VERT = [
    'attribute vec2 aPos;',            // unit grid position in [-0.5, 0.5]
    'uniform mat4 uProj;',
    'uniform float uCamZ;',
    'uniform vec2 uSize;',             // plane size in view units (already inset)
    'uniform vec2 uMouse;',            // cursor in NDC (-1..1), y up
    'uniform float uHover;',           // 0..1 fade
    'uniform float uAmount;',          // bulge strength
    'varying vec2 vUv;',
    '#define BUBBLE_RADIUS 0.9',
    'void main() {',
    '  vUv = aPos + 0.5;',
    '  vec3 p = vec3(aPos * uSize, -uCamZ);',   // model+view: scale to size, push in front of camera
    '  vec4 screen = uProj * vec4(p, 1.0);',
    '  vec2 ndc = screen.xy / screen.w;',
    '  float d = length(uMouse - ndc);',
    '  float strength = 1.0 - smoothstep(0.0, BUBBLE_RADIUS, d);',
    '  p.z += strength * uAmount * uHover;',     // lift toward the camera
    '  gl_Position = uProj * vec4(p, 1.0);',
    '}'
  ].join('\n');

  var FRAG = [
    'precision highp float;', // must match the vertex shader's default (shared uHover/vUv)
    'uniform sampler2D uTex;',
    'uniform float uPlaneAspect;',
    'uniform float uTexAspect;',
    'uniform float uHover;',
    'uniform float uDarken;',          // max darkening at full hover (0 = none)
    'varying vec2 vUv;',
    'void main() {',
    '  float pa = uPlaneAspect, ta = uTexAspect;',
    '  vec2 ratio = vec2(min(pa / ta, 1.0), min(ta / pa, 1.0));', // object-fit: cover
    '  vec2 uv = vUv * ratio + (1.0 - ratio) * 0.5;',
    '  vec4 c = texture2D(uTex, uv);',
    '  c.rgb *= (1.0 - uHover * uDarken);',       // darken the whole image on hover
    '  gl_FragColor = c;',
    '}'
  ].join('\n');

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); return null; }
    return s;
  }

  function Distort(el) {
    var img = el.querySelector('img');
    if (!img) return;
    this.el = el;
    this.img = img;

    var amt = parseFloat(el.getAttribute('data-bulge-amount'));
    this.amount = isNaN(amt) ? 0.2 : amt;
    this.darken = 0.5;
    var bleedAttr = el.getAttribute('data-bulge-bleed');
    if (bleedAttr === 'gap' || bleedAttr === 'half-gap') {
      var gap = parseFloat(getComputedStyle(el).getPropertyValue('--grid-gap'));
      if (isNaN(gap)) gap = 48;
      this.bleedPx = bleedAttr === 'gap' ? gap : gap / 2;
    } else {
      this.bleedPx = null;
    }

    this.mouseX = 0; this.mouseY = 0;   // smoothed cursor (NDC)
    this.targetX = 0; this.targetY = 0; // raw cursor (NDC)
    this.hover = 0; this.hoverTarget = 0;
    this.insetX = 1; this.insetY = 1;
    this.rafId = null;

    var self = this;
    function start() {
      var d = img.decode ? img.decode() : Promise.reject();
      d.then(function () { self.init(); }, function () { self.init(); }); // decode first (no black frame)
    }
    if (img.complete && img.naturalWidth) start();
    else img.addEventListener('load', start, { once: true });
  }

  Distort.prototype.init = function () {
    if (this.gl) return;
    var el = this.el, img = this.img;
    if (!el.clientWidth || !el.clientHeight) { // not laid out yet — wait for a real size
      var self0 = this;
      var ro0 = new ResizeObserver(function () {
        if (el.clientWidth && el.clientHeight) { ro0.disconnect(); self0.init(); }
      });
      ro0.observe(el);
      return;
    }

    var canvas = document.createElement('canvas');
    var opts = { alpha: true, antialias: true, premultipliedAlpha: false };
    var gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
    if (!gl) return; // no WebGL — keep the plain <img>

    var vs = compile(gl, gl.VERTEX_SHADER, VERT), fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(prog)); return; }
    gl.useProgram(prog);

    var pbuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pbuf);
    gl.bufferData(gl.ARRAY_BUFFER, GRID.pos, gl.STATIC_DRAW);
    var aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    var ibuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, GRID.idx, gl.STATIC_DRAW);

    this.u = {
      proj: gl.getUniformLocation(prog, 'uProj'),
      size: gl.getUniformLocation(prog, 'uSize'),
      mouse: gl.getUniformLocation(prog, 'uMouse'),
      hover: gl.getUniformLocation(prog, 'uHover'),
      planeAspect: gl.getUniformLocation(prog, 'uPlaneAspect')
    };

    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    } catch (e) { return; } // cross-origin image — bail, keep the <img>
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(gl.getUniformLocation(prog, 'uTex'), 0);

    /* uniforms that never change per frame */
    gl.uniform1f(gl.getUniformLocation(prog, 'uCamZ'), CAM_Z);
    gl.uniform1f(gl.getUniformLocation(prog, 'uAmount'), this.amount);
    gl.uniform1f(gl.getUniformLocation(prog, 'uDarken'), this.darken);
    gl.uniform1f(gl.getUniformLocation(prog, 'uTexAspect'), img.naturalWidth / img.naturalHeight);

    gl.clearColor(0, 0, 0, 0);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    this.canvas = canvas;
    this.gl = gl;
    el.appendChild(canvas);
    this.resize();
    this.render();
    img.style.opacity = '0';

    var self = this;
    el.addEventListener('pointerenter', function (e) {
      self.setTarget(e.clientX, e.clientY);
      self.mouseX = self.targetX; self.mouseY = self.targetY;
      self.hoverTarget = 1; self.ensureLoop();
    });
    el.addEventListener('pointermove', function (e) { self.setTarget(e.clientX, e.clientY); self.ensureLoop(); });
    el.addEventListener('pointerleave', function () { self.hoverTarget = 0; self.ensureLoop(); });

    if ('ResizeObserver' in window) {
      new ResizeObserver(function () {
        if (el.clientWidth && el.clientHeight) { self.resize(); self.render(); }
      }).observe(el);
    }
  };

  /* size the (oversized) canvas + recompute the size/projection uniforms */
  Distort.prototype.resize = function () {
    var el = this.el, gl = this.gl, canvas = this.canvas;
    var w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return;
    var padX = this.bleedPx != null ? this.bleedPx : w * BLEED;
    var padY = this.bleedPx != null ? this.bleedPx : h * BLEED;
    var Wo = w + 2 * padX, Ho = h + 2 * padY;               // oversized canvas (CSS px)
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(Wo * dpr);
    canvas.height = Math.round(Ho * dpr);
    canvas.style.width = Wo + 'px';
    canvas.style.height = Ho + 'px';
    canvas.style.left = -padX + 'px';
    canvas.style.top = -padY + 'px';
    gl.viewport(0, 0, canvas.width, canvas.height);

    this.insetX = w / Wo;                                    // card region within the oversized canvas
    this.insetY = h / Ho;
    var planeW = PLANE_H * (Wo / Ho);
    gl.uniform2f(this.u.size, planeW * this.insetX, PLANE_H * this.insetY);
    gl.uniform1f(this.u.planeAspect, w / h);                 // image maps to the card region
    gl.uniformMatrix4fv(this.u.proj, false, perspective(FOV, Wo / Ho, 0.01, 100));
  };

  Distort.prototype.render = function () {
    var gl = this.gl;
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(this.u.mouse, this.mouseX, this.mouseY);
    gl.uniform1f(this.u.hover, this.hover);
    gl.drawElements(gl.TRIANGLES, GRID.count, gl.UNSIGNED_SHORT, 0);
  };

  /* map the cursor into the card's inset region, in NDC */
  Distort.prototype.setTarget = function (cx, cy) {
    var r = this.el.getBoundingClientRect();
    var lx = cx - (r.left + r.width / 2);
    var ly = cy - (r.top + r.height / 2);
    this.targetX = (lx / (this.el.offsetWidth / 2)) * this.insetX;
    this.targetY = -(ly / (this.el.offsetHeight / 2)) * this.insetY;
  };

  Distort.prototype.step = function () {
    this.mouseX += (this.targetX - this.mouseX) * 0.15;
    this.mouseY += (this.targetY - this.mouseY) * 0.15;
    this.hover += (this.hoverTarget - this.hover) * 0.12;
    if (this.hoverTarget === 0 && this.hover < 0.002) {
      this.hover = 0;
      this.render();
      this.rafId = null;
      return;
    }
    this.render();
    var self = this;
    this.rafId = requestAnimationFrame(function () { self.step(); });
  };

  Distort.prototype.ensureLoop = function () {
    if (this.rafId == null && this.gl) {
      var self = this;
      this.rafId = requestAnimationFrame(function () { self.step(); });
    }
  };

  cards.forEach(function (el) { new Distort(el); });
})();
