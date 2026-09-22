/* Shared by the game and sprite review; source PNGs retain their original alpha. */
class GoatKidSprite {
  constructor(base = 'assets/sky-jump/') {
    this.idle = new Image(); this.idle.src = `${base}kid-idle-v1.png`;
    this.joy = new Image(); this.joy.src = `${base}kid-joy-v2.png`;
  }

  draw(ctx, x, footY, standingHeight, milliseconds, joyful = false) {
    const image = joyful ? this.joy : this.idle;
    if (!image.complete || !image.naturalWidth) return;
    const duration = joyful ? 105 : 240;
    const frame = Math.floor(Math.max(0, milliseconds) / duration) % 8;
    const scale = standingHeight / (joyful ? 328 : 394);
    // Different source-sheet sizes use the same visible standing height.
    // Frame positions are retained so the drawn hop rises above the platform.
    const footBaseline = joyful ? [449, 451, 405, 413, 382, 400, 405, 408][frame] : 476;
    const center = joyful ? [218, 204, 190, 178, 222, 210, 196, 188][frame] : 204;
    const hop = joyful ? [0, 5, 18, 24, 18, 7, 0, 0][frame] * standingHeight / 72 : 0;
    ctx.save();
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, frame % 4 * 384, Math.floor(frame / 4) * 512, 384, 512,
      x - center * scale, footY - hop - footBaseline * scale, 384 * scale, 512 * scale);
    ctx.restore();
  }
}
