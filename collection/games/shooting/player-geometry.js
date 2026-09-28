/* Shared sprite coordinates for drawing, exhaust attachments and collisions. */
(function (root) {
  'use strict';

  const masks = new WeakMap();
  const ALPHA_THRESHOLD = 160;

  function surface(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  // Trim using the solid hull, not isolated nearly transparent edge pixels.
  function trim(image) {
    const source = surface(image.width, image.height);
    const context = source.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0);
    const { data } = context.getImageData(0, 0, source.width, source.height);
    let left = source.width, top = source.height, right = -1, bottom = -1;
    for (let y = 0; y < source.height; y++) {
      for (let x = 0; x < source.width; x++) {
        if (data[(y * source.width + x) * 4 + 3] < ALPHA_THRESHOLD) continue;
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
    }
    if (right < left) throw new Error('Player sprite has no opaque hull');
    const cropped = surface(right - left + 1, bottom - top + 1);
    cropped.getContext('2d').drawImage(source, left, top, cropped.width, cropped.height,
      0, 0, cropped.width, cropped.height);
    return cropped;
  }

  function tint(image, color) {
    const canvas = surface(image.width, image.height);
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    context.globalCompositeOperation = 'source-atop';
    context.fillStyle = color;
    context.fillRect(0, 0, canvas.width, canvas.height);
    return canvas;
  }

  // x/y are always the center of the trimmed image, in game coordinates.
  function frame(image, x, y, height) {
    return { image, x, y, w: height * image.width / image.height, h: height };
  }

  // Attachments use normalized coordinates within that SAME trimmed image.
  function attachment(body, point) {
    return { x: body.x + (point[0] - 0.5) * body.w,
      y: body.y + (point[1] - 0.5) * body.h };
  }

  function mask(body) {
    let entries = masks.get(body.image);
    if (!entries) { entries = new Map(); masks.set(body.image, entries); }
    const key = `${body.w}:${body.h}:${!!body.flipped}`;
    if (entries.has(key)) return entries.get(key);
    // Two samples per game pixel retain narrow tips and gaps between wings.
    const canvas = surface(Math.ceil(body.w * 2), Math.ceil(body.h * 2));
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (body.flipped) {
      context.translate(canvas.width, canvas.height);
      context.rotate(Math.PI);
    }
    context.drawImage(body.image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const alpha = new Uint8Array(canvas.width * canvas.height);
    for (let i = 0; i < alpha.length; i++) alpha[i] = pixels[i * 4 + 3] >= ALPHA_THRESHOLD ? 1 : 0;
    const result = { width: canvas.width, height: canvas.height, alpha };
    entries.set(key, result);
    return result;
  }

  function solidAt(body, x, y) {
    const u = (x - body.x) / body.w + 0.5;
    const v = (y - body.y) / body.h + 0.5;
    if (u < 0 || u >= 1 || v < 0 || v >= 1) return false;
    if (!body.image) return true;
    const pixels = mask(body);
    return !!pixels.alpha[Math.floor(v * pixels.height) * pixels.width + Math.floor(u * pixels.width)];
  }

  function overlaps(a, b) {
    const left = Math.max(a.x - a.w / 2, b.x - b.w / 2);
    const right = Math.min(a.x + a.w / 2, b.x + b.w / 2);
    const top = Math.max(a.y - a.h / 2, b.y - b.h / 2);
    const bottom = Math.min(a.y + a.h / 2, b.y + b.h / 2);
    if (left >= right || top >= bottom) return false;
    const cols = Math.ceil((right - left) * 2), rows = Math.ceil((bottom - top) * 2);
    for (let row = 0; row < rows; row++) {
      const y = top + (row + 0.5) * (bottom - top) / rows;
      for (let col = 0; col < cols; col++) {
        const x = left + (col + 0.5) * (right - left) / cols;
        if (solidAt(a, x, y) && solidAt(b, x, y)) return true;
      }
    }
    return false;
  }

  function drawExhaust(context, body, nozzles, time) {
    for (let i = 0; i < nozzles.length; i++) {
      const point = attachment(body, nozzles[i]);
      const pulse = Math.sin(time * 0.5 + i * 0.7);
      const length = body.h * (0.27 + pulse * 0.035);
      const radius = body.w * 0.048;
      context.save();
      context.translate(point.x, point.y);
      context.globalCompositeOperation = 'lighter';
      const gradient = context.createLinearGradient(0, -1, 0, length);
      gradient.addColorStop(0, '#efffff');
      gradient.addColorStop(0.18, '#91f5ff');
      gradient.addColorStop(0.48, '#20bdff');
      gradient.addColorStop(1, 'rgba(32,90,255,0)');
      context.fillStyle = gradient;
      context.shadowColor = '#24bfff';
      context.shadowBlur = 3;
      context.beginPath();
      // The root never moves; only the downstream tip changes length.
      context.moveTo(-radius, -1);
      context.bezierCurveTo(-radius * 1.4, length * 0.25, -radius * 0.6, length * 0.7, 0, length);
      context.bezierCurveTo(radius * 0.6, length * 0.7, radius * 1.4, length * 0.25, radius, -1);
      context.closePath();
      context.fill();
      context.restore();
    }
  }

  root.PlayerGeometry = { trim, tint, frame, attachment, solidAt, overlaps, drawExhaust };
})(typeof window === 'undefined' ? globalThis : window);
