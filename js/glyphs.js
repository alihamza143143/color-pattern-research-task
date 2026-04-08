// js/glyphs.js

/**
 * Generate a set of unique abstract glyphs.
 * @param {number} count — number of glyphs
 * @param {number} size — pixel size of each glyph canvas
 * @returns {string[]} — array of data URLs (PNG)
 */
export function generateGlyphs(count, size = 48) {
  const glyphs = [];
  for (let i = 0; i < count; i++) {
    glyphs.push(generateOneGlyph(size, i * 7919 + Date.now()));
  }
  return glyphs;
}

function generateOneGlyph(size, seed) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.35;

  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Draw 3-5 random strokes
  const strokeCount = 3 + Math.floor(rand() * 3);
  for (let i = 0; i < strokeCount; i++) {
    ctx.beginPath();
    const type = Math.floor(rand() * 4);

    if (type === 0) {
      // Bezier curve
      ctx.moveTo(
        cx + (rand() - 0.5) * r * 2,
        cy + (rand() - 0.5) * r * 2
      );
      ctx.bezierCurveTo(
        cx + (rand() - 0.5) * r * 2,
        cy + (rand() - 0.5) * r * 2,
        cx + (rand() - 0.5) * r * 2,
        cy + (rand() - 0.5) * r * 2,
        cx + (rand() - 0.5) * r * 2,
        cy + (rand() - 0.5) * r * 2
      );
    } else if (type === 1) {
      // Arc segment
      const arcR = r * (0.3 + rand() * 0.5);
      const startAngle = rand() * Math.PI * 2;
      const endAngle = startAngle + (0.5 + rand() * 1.5);
      ctx.arc(
        cx + (rand() - 0.5) * r * 0.8,
        cy + (rand() - 0.5) * r * 0.8,
        arcR,
        startAngle,
        endAngle
      );
    } else if (type === 2) {
      // Quadratic curve
      ctx.moveTo(
        cx + (rand() - 0.5) * r * 2,
        cy + (rand() - 0.5) * r * 2
      );
      ctx.quadraticCurveTo(
        cx + (rand() - 0.5) * r * 2,
        cy + (rand() - 0.5) * r * 2,
        cx + (rand() - 0.5) * r * 2,
        cy + (rand() - 0.5) * r * 2
      );
    } else {
      // Polyline
      const pointCount = 3 + Math.floor(rand() * 2);
      for (let j = 0; j < pointCount; j++) {
        const px = cx + (rand() - 0.5) * r * 2;
        const py = cy + (rand() - 0.5) * r * 2;
        if (j === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
    }

    ctx.stroke();
  }

  // Optional dot/loop
  if (rand() > 0.5) {
    ctx.beginPath();
    const dotR = r * (0.08 + rand() * 0.12);
    ctx.arc(
      cx + (rand() - 0.5) * r,
      cy + (rand() - 0.5) * r,
      dotR,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = '#000';
    ctx.fill();
  }

  return canvas.toDataURL('image/png');
}

/**
 * Generate a white-on-transparent version of a glyph for dark backgrounds.
 */
export function generateWhiteGlyph(dataUrl, size = 48) {
  return new Promise(resolve => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, size, size);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl); // fallback to black glyph
    img.src = dataUrl;
  });
}

/**
 * Determine if a color is "dark" (needs white glyph overlay).
 */
export function isDarkColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}
