// js/voronoi.js

/**
 * Generate Voronoi-style mosaic regions for a given bounding box.
 * Returns array of { path, centroid, index } objects.
 */
export function generateVoronoiRegions(width, height, regionCount, padding = 30) {
  // Generate random seed points with padding from edges
  let points = [];
  for (let i = 0; i < regionCount; i++) {
    points.push({
      x: padding + Math.random() * (width - 2 * padding),
      y: padding + Math.random() * (height - 2 * padding),
    });
  }

  // Lloyd's relaxation — 4 iterations for more even regions
  for (let iter = 0; iter < 4; iter++) {
    const cells = computeVoronoiCells(points, width, height);
    points = cells.map(cell => getCentroid(cell));
    // Clamp back into padded area
    points = points.map(p => ({
      x: Math.max(padding, Math.min(width - padding, p.x)),
      y: Math.max(padding, Math.min(height - padding, p.y)),
    }));
  }

  // Final computation
  const cells = computeVoronoiCells(points, width, height);

  return cells.map((cell, i) => ({
    path: cellToSVGPath(cell),
    centroid: getCentroid(cell),
    index: i,
  }));
}

/**
 * Compute Voronoi cells using pixel-sampling and concave hull approach.
 * For 3-12 regions this is fast and robust.
 */
function computeVoronoiCells(points, width, height) {
  const step = 2;
  const assignments = Array.from({ length: points.length }, () => []);

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      let minDist = Infinity;
      let nearest = 0;
      for (let i = 0; i < points.length; i++) {
        const dx = x - points[i].x;
        const dy = y - points[i].y;
        const dist = dx * dx + dy * dy;
        if (dist < minDist) {
          minDist = dist;
          nearest = i;
        }
      }
      assignments[nearest].push({ x, y });
    }
  }

  // Convert pixel assignments to boundary outlines
  return assignments.map(pixels => extractBoundary(pixels, step));
}

/**
 * Extract boundary pixels from a set of region pixels,
 * then order them for a smooth outline.
 */
function extractBoundary(pixels, step) {
  if (pixels.length < 3) return pixels;

  // Create a fast lookup set
  const set = new Set();
  for (const p of pixels) {
    set.add(`${p.x},${p.y}`);
  }

  // Find boundary pixels (those with at least one missing neighbor)
  const boundary = [];
  for (const p of pixels) {
    const neighbors = [
      `${p.x - step},${p.y}`,
      `${p.x + step},${p.y}`,
      `${p.x},${p.y - step}`,
      `${p.x},${p.y + step}`,
    ];
    if (neighbors.some(n => !set.has(n))) {
      boundary.push(p);
    }
  }

  if (boundary.length < 3) return pixels.slice(0, 10);

  // Order boundary points by angle from centroid
  const c = getCentroid(boundary);
  boundary.sort((a, b) => {
    return Math.atan2(a.y - c.y, a.x - c.x) - Math.atan2(b.y - c.y, b.x - c.x);
  });

  // Simplify: sample ~40 points evenly for a smooth path
  const targetPoints = Math.min(40, boundary.length);
  const simplified = [];
  for (let i = 0; i < targetPoints; i++) {
    const idx = Math.floor((i / targetPoints) * boundary.length);
    simplified.push(boundary[idx]);
  }

  return simplified;
}

function getCentroid(polygon) {
  if (!polygon || polygon.length === 0) return { x: 0, y: 0 };
  const sum = polygon.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 }
  );
  return { x: sum.x / polygon.length, y: sum.y / polygon.length };
}

function cellToSVGPath(polygon) {
  if (!polygon || polygon.length === 0) return '';
  // Use smooth curve through points for organic look
  if (polygon.length < 3) {
    return 'M ' + polygon.map(p => `${p.x},${p.y}`).join(' L ') + ' Z';
  }

  let d = `M ${polygon[0].x},${polygon[0].y}`;

  for (let i = 0; i < polygon.length; i++) {
    const p0 = polygon[(i - 1 + polygon.length) % polygon.length];
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];
    const p3 = polygon[(i + 2) % polygon.length];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }

  d += ' Z';
  return d;
}
