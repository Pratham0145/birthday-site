/* ============================================================================
   infinite-zoom.js

   This is the ORIGINAL infinite-zoom engine, wrapped in a module so the
   birthday site can open and close it as a surprise experience.

   What changed vs. the standalone HTML file:
     - the code lives inside InfiniteZoom.mount(...) instead of the global scope
     - images load lazily, the first time the experience is opened
     - listeners are attached on open() and removed on close()
     - the render loop stops while the experience is closed (saves battery)
     - the hint badge is handed in by the site instead of being hard-coded

   What did NOT change: the layer configuration, computeWorldMatrices(), the
   view/easing model, zoomAround(), rotateAround(), the wheel/shift-wheel
   handlers, Q/E/0 keys, mouse panning, pinch + two-finger rotation with their
   clamps and angle unwrapping, the double-tap guards, DPR handling and the
   circular clipping. That is all byte-for-byte the same maths.
   ========================================================================= */

window.InfiniteZoom = (function () {
  /* --- layer configuration --------------------------------------------- *
   * Drop your own 1.png … 4.png into assets/zoom/ to replace the
   * placeholders. `target` is the circle on THIS layer that the NEXT layer
   * nests inside, in that image's own pixel coordinates.
   * ------------------------------------------------------------------- */
  const LAYERS_CONFIG = [
    {
      src: 'assets/zoom/1.png',
      width: 1000,
      height: 1250,
      isCircleMask: false,
      target: { cx: 810, cy: 280, d: 406 }
    },
    {
      src: 'assets/zoom/2.png',
      width: 1000,
      height: 1000,
      isCircleMask: true,
      target: { cx: 760, cy: 475, d: 380 }
    },
    {
      src: 'assets/zoom/3.png',
      width: 1000,
      height: 1000,
      isCircleMask: true,
      target: { cx: 701, cy: 231, d: 330 }
    },
    {
      src: 'assets/zoom/4.png',
      width: 1000,
      height: 1000,
      isCircleMask: true,
      target: null
    }
  ];

  let canvas, ctx, hint;
  let layers = [];
  let loadedCount = 0;
  let ready = false;
  let loadStarted = false;
  let active = false;
  let rafId = null;
  let onReadyCb = null;

  let view = {
    x: 0, y: 0, scale: 1, rotation: 0,
    targetX: 0, targetY: 0, targetScale: 1, targetRotation: 0
  };

  let isDragging = false;
  let startX = 0, startY = 0;
  let lastTouchDist = 0;
  let lastTouchCenter = { x: 0, y: 0 };
  let lastTouchAngle = null;
  let hasInteracted = false;

  let lastTap = 0;
  let touchStartTime = 0;
  let touchMoved = false;
  let multiTouchOccurred = false;
  let touchStartPos = { x: 0, y: 0 };
  const TAP_MOVE_THRESHOLD = 10;   // px of finger movement that disqualifies a "tap"
  const TAP_MAX_DURATION = 250;    // ms — longer presses aren't taps

  let lastFrameTime = performance.now();

  /* --------------------------------------------------------------------- */
  function loadLayers() {
    if (loadStarted) return;
    loadStarted = true;

    LAYERS_CONFIG.forEach((cfg, idx) => {
      const img = new Image();
      // DO NOT add crossOrigin here for local file:// usage
      img.src = cfg.src;
      layers.push({
        ...cfg,
        img: img,
        loaded: false,
        worldScale: 1,
        worldX: 0,
        worldY: 0
      });
      img.onload = () => {
        layers[idx].loaded = true;
        loadedCount++;
        if (loadedCount === LAYERS_CONFIG.length) {
          computeWorldMatrices();
          resize();
          initView();
          ready = true;
          if (onReadyCb) onReadyCb();
          if (active) startLoop();
        }
      };
      img.onerror = (e) => {
        console.error('Failed to load image:', cfg.src, e);
        // Keep the experience usable even if one layer is missing.
        loadedCount++;
        if (loadedCount === LAYERS_CONFIG.length) {
          computeWorldMatrices();
          resize();
          initView();
          ready = true;
          if (onReadyCb) onReadyCb();
          if (active) startLoop();
        }
      };
    });
  }

  function computeWorldMatrices() {
    layers[0].worldScale = 1;
    layers[0].worldX = 0;
    layers[0].worldY = 0;

    for (let i = 1; i < layers.length; i++) {
      const parent = layers[i - 1];
      const curr = layers[i];
      const target = parent.target;
      if (!target) break;

      const relScale = target.d / curr.width;
      curr.worldScale = parent.worldScale * relScale;

      const childOriginX = target.cx - (curr.width / 2) * relScale;
      const childOriginY = target.cy - (curr.height / 2) * relScale;

      curr.worldX = parent.worldX + childOriginX * parent.worldScale;
      curr.worldY = parent.worldY + childOriginY * parent.worldScale;
    }
  }

  function resize() {
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    // Pin the CSS box to the same pixel size the maths assumes, so a mobile
    // URL bar can never stretch the picture.
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }

  function initView() {
    const root = layers[0];
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

    const scaleX = (screenW * 0.92) / root.width;
    const scaleY = (screenH * 0.92) / root.height;
    const initScale = Math.min(scaleX, scaleY);

    view.rotation = view.targetRotation = 0;
    view.scale = view.targetScale = initScale;
    view.x = view.targetX = (screenW - root.width * initScale) / 2;
    view.y = view.targetY = (screenH - root.height * initScale) / 2;
  }

  function markInteracted() {
    if (!hasInteracted) {
      hasInteracted = true;
      if (hint) hint.classList.add('hint-fade');
    }
  }

  function zoomAround(screenPivotX, screenPivotY, factor) {
    markInteracted();
    const MIN_SCALE = 0.2;
    const MAX_SCALE = 3000;

    const newScale = Math.min(Math.max(view.targetScale * factor, MIN_SCALE), MAX_SCALE);
    const effectiveFactor = newScale / view.targetScale;

    view.targetX = screenPivotX - (screenPivotX - view.targetX) * effectiveFactor;
    view.targetY = screenPivotY - (screenPivotY - view.targetY) * effectiveFactor;
    view.targetScale = newScale;
  }

  // Rotates the view by deltaAngle (radians) while keeping the given screen
  // point fixed in place — same "zoom toward a pivot" idea, applied to rotation.
  function rotateAround(screenPivotX, screenPivotY, deltaAngle) {
    markInteracted();
    const cos = Math.cos(deltaAngle);
    const sin = Math.sin(deltaAngle);
    const dx = screenPivotX - view.targetX;
    const dy = screenPivotY - view.targetY;
    const rotatedX = dx * cos - dy * sin;
    const rotatedY = dx * sin + dy * cos;

    view.targetX = screenPivotX - rotatedX;
    view.targetY = screenPivotY - rotatedY;
    view.targetRotation += deltaAngle;
  }

  /* --- input handlers (identical behaviour to the original file) -------- */

  function onWheel(e) {
    e.preventDefault();
    if (e.shiftKey) {
      // Shift + wheel rotates around the cursor instead of zooming.
      rotateAround(e.clientX, e.clientY, e.deltaY * 0.002);
      return;
    }
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    zoomAround(e.clientX, e.clientY, factor);
  }

  // Keyboard rotate for desktop/trackpad users: Q/E rotate around screen
  // center, "0" straightens the view back out.
  function onKeyDown(e) {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    if (e.key === 'q' || e.key === 'Q') {
      rotateAround(cx, cy, -0.08);
    } else if (e.key === 'e' || e.key === 'E') {
      rotateAround(cx, cy, 0.08);
    } else if (e.key === '0') {
      rotateAround(cx, cy, -view.targetRotation);
    }
  }

  function onMouseDown(e) {
    isDragging = true;
    startX = e.clientX - view.targetX;
    startY = e.clientY - view.targetY;
  }

  function onMouseMove(e) {
    if (!isDragging) return;
    markInteracted();
    view.targetX = e.clientX - startX;
    view.targetY = e.clientY - startY;
  }

  function onMouseUp() { isDragging = false; }

  function onTouchStart(e) {
    if (e.touches.length === 1) {
      isDragging = true;
      startX = e.touches[0].clientX - view.targetX;
      startY = e.touches[0].clientY - view.targetY;

      touchStartTime = performance.now();
      touchMoved = false;
      multiTouchOccurred = false;
      touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      isDragging = false;
      multiTouchOccurred = true; // a pinch happened — lifting fingers is never a "tap"
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist = Math.hypot(dx, dy);
      lastTouchCenter = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2
      };
      lastTouchAngle = Math.atan2(dy, dx);
    }
  }

  function onTouchMove(e) {
    e.preventDefault();
    markInteracted();

    if (e.touches.length === 1 && isDragging) {
      const dx = e.touches[0].clientX - touchStartPos.x;
      const dy = e.touches[0].clientY - touchStartPos.y;
      if (Math.hypot(dx, dy) > TAP_MOVE_THRESHOLD) touchMoved = true;

      view.targetX = e.touches[0].clientX - startX;
      view.targetY = e.touches[0].clientY - startY;
    } else if (e.touches.length === 2) {
      touchMoved = true;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const center = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2
      };

      const angle = Math.atan2(dy, dx);

      if (lastTouchDist > 0) {
        // Clamp the per-event factor — a single noisy touch reading can otherwise
        // spike the zoom by a huge amount in one frame, which reads as a "jump".
        let factor = dist / lastTouchDist;
        factor = Math.min(Math.max(factor, 0.85), 1.18);
        zoomAround(center.x, center.y, factor);
        view.targetX += (center.x - lastTouchCenter.x);
        view.targetY += (center.y - lastTouchCenter.y);
      }

      if (lastTouchAngle !== null) {
        // Wrap the angle delta into [-π, π] so crossing the ±180° seam
        // doesn't register as a near-full spin.
        let deltaAngle = angle - lastTouchAngle;
        deltaAngle = Math.atan2(Math.sin(deltaAngle), Math.cos(deltaAngle));
        // Clamp per-event, same reasoning as the zoom factor clamp above.
        deltaAngle = Math.min(Math.max(deltaAngle, -0.25), 0.25);
        rotateAround(center.x, center.y, deltaAngle);
      }

      lastTouchDist = dist;
      lastTouchCenter = center;
      lastTouchAngle = angle;
    }
  }

  function onTouchEnd(e) {
    const currentTime = performance.now();

    // Only ever a candidate "tap" if this touch session was a single finger,
    // never moved beyond the threshold, and was brief. This is what stops a
    // two-finger pinch release (two touchend events firing close together)
    // from being misread as a double-tap and firing a surprise extra zoom.
    const wasSingleTap =
      !multiTouchOccurred &&
      !touchMoved &&
      (currentTime - touchStartTime) < TAP_MAX_DURATION &&
      e.touches.length === 0;

    if (wasSingleTap) {
      const tapLength = currentTime - lastTap;
      if (tapLength < 300 && tapLength > 0) {
        const touch = e.changedTouches[0];
        zoomAround(touch.clientX, touch.clientY, 2.5);
        e.preventDefault();
        lastTap = 0; // consume it so a stray 3rd tap doesn't chain another zoom
      } else {
        lastTap = currentTime;
      }
    }

    if (e.touches.length < 2) {
      lastTouchDist = 0;
      lastTouchAngle = null;
    }

    if (e.touches.length === 0) {
      isDragging = false;
      multiTouchOccurred = false;
      touchMoved = false;
    } else if (e.touches.length === 1) {
      // One finger remains after a pinch ends — resume single-finger panning
      // from exactly where that finger currently is, so there's no snap.
      isDragging = true;
      startX = e.touches[0].clientX - view.targetX;
      startY = e.touches[0].clientY - view.targetY;
    }
  }

  /* --- render loop ------------------------------------------------------ */

  function renderLoop(now) {
    if (!active) { rafId = null; return; }
    if (now === undefined) now = performance.now();
    const dt = Math.min(now - lastFrameTime, 48); // clamp so a dropped/backgrounded frame can't jump
    lastFrameTime = now;

    // 0.16 was tuned assuming a steady 60fps (≈16.7ms/frame). Rescale it to the
    // actual elapsed time so easing speed doesn't vary with the device's frame rate.
    const ease = 1 - Math.pow(1 - 0.16, dt / 16.67);

    view.scale += (view.targetScale - view.scale) * ease;
    view.x += (view.targetX - view.x) * ease;
    view.y += (view.targetY - view.y) * ease;

    // Rotation eases the short way around (never the "long way" through
    // a full extra turn), and independently of the target's own wrapping.
    let rotDelta = view.targetRotation - view.rotation;
    rotDelta = Math.atan2(Math.sin(rotDelta), Math.cos(rotDelta));
    view.rotation += rotDelta * ease;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    ctx.fillStyle = '#120e0b';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    // Camera transform: pan, then rotate, then zoom. Everything drawn after
    // this is in unrotated "world" space (the same space computeWorldMatrices
    // works in), so rotation stays a pure camera effect and never disturbs how
    // the nested zoom regions line up.
    ctx.save();
    ctx.translate(view.x, view.y);
    ctx.rotate(view.rotation);
    ctx.scale(view.scale, view.scale);

    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      if (!layer.loaded) continue;

      const worldW = layer.width * layer.worldScale;
      if (worldW * view.scale < 0.5) continue; // too small to matter on screen

      ctx.save();
      ctx.translate(layer.worldX, layer.worldY);
      ctx.scale(layer.worldScale, layer.worldScale);

      if (layer.isCircleMask) {
        const radius = layer.width / 2;
        ctx.beginPath();
        ctx.arc(radius, radius, radius - 0.2 / layer.worldScale, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
      }

      ctx.drawImage(layer.img, 0, 0, layer.width, layer.height);
      ctx.restore();
    }

    ctx.restore(); // camera transform
    ctx.restore(); // dpr scale
    rafId = requestAnimationFrame(renderLoop);
  }

  function startLoop() {
    if (rafId === null) {
      lastFrameTime = performance.now();
      rafId = requestAnimationFrame(renderLoop);
    }
  }

  /* --- listener wiring -------------------------------------------------- */

  function attach() {
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('resize', resize);
  }

  function detach() {
    window.removeEventListener('wheel', onWheel, { passive: false });
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('touchstart', onTouchStart, { passive: false });
    window.removeEventListener('touchmove', onTouchMove, { passive: false });
    window.removeEventListener('touchend', onTouchEnd);
    window.removeEventListener('resize', resize);
  }

  /* --- public API ------------------------------------------------------- */

  return {
    /** Point the engine at its canvas and hint badge. Does not load images. */
    mount(canvasEl, hintEl) {
      canvas = canvasEl;
      ctx = canvas.getContext('2d');
      hint = hintEl || null;
    },

    /** Begin downloading the layer images (called when she reaches the card). */
    preload() { loadLayers(); },

    /** Enter the experience. */
    open(onReady) {
      onReadyCb = onReady || null;
      active = true;
      hasInteracted = false;
      if (hint) hint.classList.remove('hint-fade');
      loadLayers();
      if (ready) {
        resize();
        initView();
        if (onReadyCb) onReadyCb();
        startLoop();
      }
      attach();
    },

    /** Leave the experience: stop the loop and release every listener. */
    close() {
      active = false;
      isDragging = false;
      lastTouchDist = 0;
      lastTouchAngle = null;
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
      detach();
    },

    isReady() { return ready; }
  };
})();
