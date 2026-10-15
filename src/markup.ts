// Photo markup shapes and drawing. Coordinates are 0..1 fractions of the image size,
// so the same markup draws correctly at thumbnail, editor and full resolution.

export type ShapeType = 'pen' | 'line' | 'arrow' | 'circle' | 'rect' | 'callout' | 'text';
export type Point = [number, number];

export interface Shape {
  type: ShapeType;
  color: string;
  /** Line width as a fraction of image width */
  size: number;
  /** pen */
  pts?: Point[];
  /** start point (callout: the point the leader line touches; text: centre) */
  a?: Point;
  /** end point (callout: label centre) */
  b?: Point;
  text?: string;
}

/** Original photo plus the markup drawn on it, so markup can be edited later. */
export interface PhotoMarkup {
  original: string;
  shapes: Shape[];
}

export interface Box { x: number; y: number; bw: number; bh: number; }

export const MARKUP_COLORS = [
  { name: 'Red', value: '#ef2b2b' },
  { name: 'Yellow', value: '#ffd400' },
  { name: 'Blue', value: '#00A9E0' },
  { name: 'White', value: '#ffffff' },
  { name: 'Black', value: '#111111' },
];

export const MARKUP_WEIGHTS = [0.005, 0.009, 0.015];

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function drawArrowHead(g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, lw: number) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const len = Math.max(14, lw * 4.2);
  g.beginPath();
  g.moveTo(x2, y2);
  g.lineTo(x2 - len * Math.cos(ang - 0.45), y2 - len * Math.sin(ang - 0.45));
  g.lineTo(x2 - len * Math.cos(ang + 0.45), y2 - len * Math.sin(ang + 0.45));
  g.closePath();
  g.fill();
}

function labelBox(g: CanvasRenderingContext2D, text: string, cx: number, cy: number, w: number, h: number, color: string): Box {
  const fs = Math.round(w * 0.034);
  g.font = `800 ${fs}px Inter, system-ui, sans-serif`;
  const tw = g.measureText(text).width;
  const pad = fs * 0.5;
  const bw = tw + pad * 2;
  const bh = fs * 1.7;
  const x = Math.max(4, Math.min(cx - bw / 2, w - bw - 4));
  const y = Math.max(4, Math.min(cy - bh / 2, h - bh - 4));
  g.fillStyle = '#ffffff';
  g.strokeStyle = color;
  g.lineWidth = Math.max(2, fs * 0.12);
  roundRect(g, x, y, bw, bh, fs * 0.35);
  g.fill();
  g.stroke();
  g.fillStyle = '#111111';
  g.textBaseline = 'middle';
  g.textAlign = 'left';
  g.fillText(text, x + pad, y + bh / 2 + 1);
  return { x, y, bw, bh };
}

/** Draws one shape on a w×h area. Returns the bounds of its text label, if it has one. */
export function drawShape(g: CanvasRenderingContext2D, s: Shape, w: number, h: number): Box | null {
  const lw = Math.max(2, s.size * w);
  let box: Box | null = null;
  g.save();
  g.strokeStyle = s.color;
  g.fillStyle = s.color;
  g.lineWidth = lw;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const ax = s.a ? s.a[0] * w : 0, ay = s.a ? s.a[1] * h : 0;
  const bx = s.b ? s.b[0] * w : 0, by = s.b ? s.b[1] * h : 0;
  switch (s.type) {
    case 'pen': {
      const pts = s.pts || [];
      g.beginPath();
      pts.forEach((p, i) => (i ? g.lineTo(p[0] * w, p[1] * h) : g.moveTo(p[0] * w, p[1] * h)));
      if (pts.length === 1) g.lineTo(pts[0][0] * w + 0.1, pts[0][1] * h);
      g.stroke();
      break;
    }
    case 'line':
      g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
      break;
    case 'arrow':
      g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
      drawArrowHead(g, ax, ay, bx, by, lw);
      break;
    case 'circle':
      g.beginPath();
      g.ellipse((ax + bx) / 2, (ay + by) / 2, Math.abs(bx - ax) / 2 || 1, Math.abs(by - ay) / 2 || 1, 0, 0, Math.PI * 2);
      g.stroke();
      break;
    case 'rect':
      g.beginPath();
      g.rect(Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax), Math.abs(by - ay));
      g.stroke();
      break;
    case 'callout':
      g.beginPath(); g.moveTo(bx, by); g.lineTo(ax, ay); g.stroke();
      g.beginPath(); g.arc(ax, ay, lw * 1.3, 0, Math.PI * 2); g.fill();
      if (s.text) box = labelBox(g, s.text, bx, by, w, h, s.color);
      break;
    case 'text': {
      const text = s.text || '';
      const fs = Math.round(w * 0.045);
      g.font = `900 ${fs}px Inter, system-ui, sans-serif`;
      g.textBaseline = 'middle';
      g.textAlign = 'center';
      g.lineWidth = fs * 0.18;
      g.strokeStyle = s.color === '#111111' ? '#ffffff' : '#111111';
      g.strokeText(text, ax, ay);
      g.fillText(text, ax, ay);
      const tw = g.measureText(text).width;
      box = { x: ax - tw / 2, y: ay - fs * 0.65, bw: tw, bh: fs * 1.3 };
      break;
    }
  }
  g.restore();
  return box;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = src;
  });
}

/** Renders the photo with its markup burned in, as a JPEG data URL. */
export async function renderMarkup(original: string, shapes: Shape[]): Promise<string> {
  if (shapes.length === 0) return original;
  const img = await loadImage(original);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const g = canvas.getContext('2d')!;
  g.drawImage(img, 0, 0);
  shapes.forEach(s => drawShape(g, s, canvas.width, canvas.height));
  return canvas.toDataURL('image/jpeg', 0.85);
}
