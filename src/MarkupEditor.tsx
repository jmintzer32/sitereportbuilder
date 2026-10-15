import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Circle, Edit3, MessageSquare, Pencil, Slash, Square, Trash2, Type, Undo2 } from 'lucide-react';
import { Box, MARKUP_COLORS, MARKUP_WEIGHTS, Point, Shape, ShapeType, drawShape, loadImage } from './markup';

const TOOLS: { type: ShapeType; label: string; icon: React.ReactNode }[] = [
  { type: 'pen', label: 'Pen', icon: <Pencil className="w-5 h-5" /> },
  { type: 'line', label: 'Line', icon: <Slash className="w-5 h-5" /> },
  { type: 'arrow', label: 'Arrow', icon: <ArrowUpRight className="w-5 h-5" /> },
  { type: 'circle', label: 'Circle', icon: <Circle className="w-5 h-5" /> },
  { type: 'rect', label: 'Box', icon: <Square className="w-5 h-5" /> },
  { type: 'callout', label: 'Callout', icon: <MessageSquare className="w-5 h-5" /> },
  { type: 'text', label: 'Text', icon: <Type className="w-5 h-5" /> },
];

const HINTS: Record<ShapeType, string> = {
  pen: 'Draw freehand with your finger.',
  line: 'Drag to draw a straight line.',
  arrow: 'Drag from the tail toward the problem.',
  circle: 'Drag across the area to circle it.',
  rect: 'Drag to draw a box.',
  callout: 'Press on the problem, drag to where the label should go, then type.',
  text: 'Tap where the text should go, then type.',
};

interface EditorState {
  shapes: Shape[];
  history: string[];
  tool: ShapeType | null;
  color: string;
  size: number;
  live: Shape | null;
  selected: Shape | null;
  pendingText: Shape | null;
  editTarget: Shape | null;
  drag: { start: Point; orig: Shape; key: 'a' | 'b' | null; moved: boolean } | null;
}

interface Props {
  original: string;
  initialShapes: Shape[];
  onCancel: () => void;
  onDone: (shapes: Shape[]) => void;
}

export default function MarkupEditor({ original, initialShapes, onCancel, onDone }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const boxesRef = useRef(new Map<Shape, Box>());
  const m = useRef<EditorState>({
    shapes: JSON.parse(JSON.stringify(initialShapes)),
    history: [],
    tool: null,
    color: MARKUP_COLORS[0].value,
    size: MARKUP_WEIGHTS[1],
    live: null,
    selected: null,
    pendingText: null,
    editTarget: null,
    drag: null,
  }).current;

  // UI state mirrors the editing state so buttons re-render
  const [, setTick] = useState(0);
  const [textOpen, setTextOpen] = useState(false);
  const [textValue, setTextValue] = useState('');
  const refresh = () => setTick(t => t + 1);

  const selected = m.selected && m.shapes.includes(m.selected) ? m.selected : null;

  // ----- geometry (canvas pixels) -----
  const px = (p: Point): Point => [p[0] * sizeRef.current.w, p[1] * sizeRef.current.h];
  const segDist = (p: Point, a: Point, b: Point) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy;
    const t = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)) : 0;
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  };
  const inBox = (p: Point, b: Box | undefined, pad: number) =>
    !!b && p[0] >= b.x - pad && p[0] <= b.x + b.bw + pad && p[1] >= b.y - pad && p[1] <= b.y + b.bh + pad;

  function bounds(s: Shape) {
    const pts = s.type === 'pen' ? (s.pts || []).map(px) : [s.a, s.b].filter(Boolean).map(p => px(p!));
    let x0 = Math.min(...pts.map(p => p[0])), x1 = Math.max(...pts.map(p => p[0]));
    let y0 = Math.min(...pts.map(p => p[1])), y1 = Math.max(...pts.map(p => p[1]));
    const b = boxesRef.current.get(s);
    if (b) { x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.bw); y1 = Math.max(y1, b.y + b.bh); }
    return { x0, y0, x1, y1 };
  }

  // 'edge' = tap on the drawn line/outline; 'inside' = tap within a closed shape
  function hit(s: Shape, p: Point, tol: number, mode: 'edge' | 'inside') {
    if (inBox(p, boxesRef.current.get(s), 4)) return true;
    if (s.type === 'pen') {
      const pts = (s.pts || []).map(px);
      return pts.some((q, i) => segDist(p, q, pts[Math.min(i + 1, pts.length - 1)]) < tol);
    }
    if (s.type === 'text' || !s.a || !s.b) return false;
    const a = px(s.a), c = px(s.b);
    if (s.type === 'line' || s.type === 'arrow' || s.type === 'callout') return segDist(p, a, c) < tol;
    const x0 = Math.min(a[0], c[0]), x1 = Math.max(a[0], c[0]), y0 = Math.min(a[1], c[1]), y1 = Math.max(a[1], c[1]);
    if (s.type === 'rect') {
      if (mode === 'inside') return p[0] > x0 && p[0] < x1 && p[1] > y0 && p[1] < y1;
      return p[0] > x0 - tol && p[0] < x1 + tol && p[1] > y0 - tol && p[1] < y1 + tol &&
        Math.min(Math.abs(p[0] - x0), Math.abs(p[0] - x1), Math.abs(p[1] - y0), Math.abs(p[1] - y1)) < tol;
    }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = Math.max(1, (x1 - x0) / 2), ry = Math.max(1, (y1 - y0) / 2);
    const d = Math.hypot((p[0] - cx) / rx, (p[1] - cy) / ry);
    return mode === 'edge' ? Math.abs(d - 1) * Math.min(rx, ry) < tol : d < 1;
  }

  function findShape(p: Point) {
    const list = m.shapes.slice().reverse(); // topmost first
    return list.find(s => hit(s, p, 16, 'edge')) || list.find(s => hit(s, p, 16, 'inside')) || null;
  }

  const handlesOf = (s: Shape | null): ['a' | 'b', Point][] =>
    !s || s.type === 'pen' || s.type === 'text' || !s.a || !s.b ? [] : [['a', px(s.a)], ['b', px(s.b)]];

  // ----- drawing -----
  function draw() {
    const canvas = canvasRef.current, img = imgRef.current;
    if (!canvas || !img) return;
    const g = canvas.getContext('2d')!;
    const { w, h } = sizeRef.current;
    g.clearRect(0, 0, w, h);
    g.drawImage(img, 0, 0, w, h);
    const boxes = new Map<Shape, Box>();
    m.shapes.forEach(s => { const b = drawShape(g, s, w, h); if (b) boxes.set(s, b); });
    boxesRef.current = boxes;
    if (m.live) drawShape(g, m.live, w, h);
    if (m.pendingText) {
      const p = m.pendingText;
      if (p.type === 'callout') drawShape(g, { ...p, text: '' }, w, h);
      const at = px((p.b || p.a)!);
      g.save();
      g.fillStyle = p.color; g.strokeStyle = '#ffffff'; g.lineWidth = 2;
      g.beginPath(); g.arc(at[0], at[1], 7, 0, Math.PI * 2); g.fill(); g.stroke();
      g.restore();
    }
    const sel = m.selected && m.shapes.includes(m.selected) ? m.selected : null;
    if (sel) {
      const b = bounds(sel), pad = 10;
      g.save();
      g.setLineDash([6, 4]); g.lineWidth = 1.5; g.strokeStyle = '#00A9E0';
      g.strokeRect(b.x0 - pad, b.y0 - pad, b.x1 - b.x0 + pad * 2, b.y1 - b.y0 + pad * 2);
      g.setLineDash([]);
      handlesOf(sel).forEach(([, hp]) => {
        g.beginPath(); g.arc(hp[0], hp[1], 9, 0, Math.PI * 2);
        g.fillStyle = '#ffffff'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#00A9E0'; g.stroke();
      });
      g.restore();
    }
  }
  const update = () => { draw(); refresh(); };

  // Fit the canvas to the stage, keeping the photo's aspect ratio
  useEffect(() => {
    let cancelled = false;
    const layout = () => {
      const canvas = canvasRef.current, stage = stageRef.current, img = imgRef.current;
      if (!canvas || !stage || !img) return;
      const k = Math.min((stage.clientWidth - 16) / img.naturalWidth, (stage.clientHeight - 16) / img.naturalHeight);
      const w = Math.max(50, Math.floor(img.naturalWidth * k)), h = Math.max(40, Math.floor(img.naturalHeight * k));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      sizeRef.current = { w, h };
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.getContext('2d')!.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };
    loadImage(original).then(img => {
      if (cancelled) return;
      imgRef.current = img;
      layout();
    });
    window.addEventListener('resize', layout);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      cancelled = true;
      window.removeEventListener('resize', layout);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [original]);

  const remember = () => {
    m.history.push(JSON.stringify(m.shapes));
    if (m.history.length > 60) m.history.shift();
  };

  // ----- text entry (new text/callout, or editing an existing one) -----
  function askText(shape: Shape, existing = false) {
    m.pendingText = existing ? null : shape;
    m.editTarget = existing ? shape : null;
    setTextValue(existing ? shape.text || '' : '');
    setTextOpen(true);
    update();
    setTimeout(() => { textInputRef.current?.focus(); textInputRef.current?.select(); }, 30);
  }
  function commitText(value = textValue) {
    const t = value.trim();
    if (m.editTarget) {
      if (t && t !== m.editTarget.text) { remember(); m.editTarget.text = t; }
    } else if (m.pendingText && t) {
      remember();
      m.pendingText.text = t;
      m.shapes.push(m.pendingText);
      m.selected = m.pendingText;
    }
    m.pendingText = null;
    m.editTarget = null;
    setTextOpen(false);
    textInputRef.current?.blur();
    update();
  }
  function cancelText() {
    m.pendingText = null;
    m.editTarget = null;
    setTextOpen(false);
    update();
  }

  // ----- pointer handling -----
  const pos = (e: React.PointerEvent): Point => {
    const r = canvasRef.current!.getBoundingClientRect();
    return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))];
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (textOpen) commitText();
    const p = pos(e), pp = px(p);
    e.currentTarget.setPointerCapture(e.pointerId);

    if (!m.tool) {
      // Select mode: grab a handle of the selected shape, or pick a shape to move
      const sel = m.selected && m.shapes.includes(m.selected) ? m.selected : null;
      const handle = handlesOf(sel).find(([, hp]) => Math.hypot(hp[0] - pp[0], hp[1] - pp[1]) < 24);
      const target = handle ? sel : findShape(pp);
      if (!target) { m.selected = null; update(); return; }
      m.selected = target;
      m.drag = { start: p, orig: JSON.parse(JSON.stringify(target)), key: handle ? handle[0] : null, moved: false };
      update();
      return;
    }

    m.selected = null;
    const base = { color: m.color, size: m.size };
    if (m.tool === 'text') {
      m.tool = null;
      askText({ ...base, type: 'text', a: p });
      return;
    }
    m.live = m.tool === 'pen' ? { ...base, type: 'pen', pts: [p] } : { ...base, type: m.tool, a: p, b: p };
    if (m.tool === 'callout') m.live.size = Math.min(m.size, MARKUP_WEIGHTS[1]);
    draw();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = pos(e);
    const { w, h } = sizeRef.current;
    if (m.drag && m.selected) {
      const d = m.drag, s = m.selected, dx = p[0] - d.start[0], dy = p[1] - d.start[1];
      if (!d.moved && Math.hypot(dx * w, dy * h) < 3) return;
      if (!d.moved) {
        m.history.push(JSON.stringify(m.shapes.map(x => (x === s ? d.orig : x))));
        d.moved = true;
      }
      const mv = (q: Point): Point => [Math.min(1, Math.max(0, q[0] + dx)), Math.min(1, Math.max(0, q[1] + dy))];
      if (d.key) s[d.key] = mv(d.orig[d.key]!);
      else if (s.type === 'pen') s.pts = (d.orig.pts || []).map(mv);
      else { s.a = mv(d.orig.a!); if (d.orig.b) s.b = mv(d.orig.b); }
      draw();
      return;
    }
    if (!m.live) return;
    if (m.live.type === 'pen') m.live.pts!.push(p); else m.live.b = p;
    draw();
  };

  const onPointerUp = () => {
    if (m.drag) { m.drag = null; update(); return; }
    const s = m.live;
    m.live = null;
    if (!s) return;
    const tiny = s.type !== 'pen' && Math.hypot(s.b![0] - s.a![0], s.b![1] - s.a![1]) < 0.02;
    if (s.type === 'callout') {
      if (tiny) s.b = [Math.min(0.85, s.a![0] + 0.18), Math.max(0.08, s.a![1] - 0.16)];
      m.tool = null;
      askText(s);
      return;
    }
    if (tiny && s.type !== 'pen') { draw(); return; } // stray tap: keep the tool so they can try again
    remember();
    m.shapes.push(s);
    m.tool = null;     // each tool switches off after one use
    m.selected = s;    // keep the new markup selected so it can be nudged right away
    update();
  };

  const onPointerCancel = () => {
    if (m.drag?.moved && m.history.length) { m.shapes = JSON.parse(m.history.pop()!); m.selected = null; }
    m.drag = null;
    m.live = null;
    update();
  };

  // ----- toolbar actions -----
  const pickTool = (t: ShapeType) => {
    if (textOpen) commitText();
    m.tool = m.tool === t ? null : t; // tap again to switch off
    m.selected = null;
    update();
  };
  const pickColor = (c: string) => {
    if (selected) { remember(); selected.color = c; }
    m.color = c;
    if (m.pendingText) m.pendingText.color = c;
    update();
  };
  const pickWeight = (wt: number) => {
    if (selected && selected.type !== 'text') { remember(); selected.size = wt; }
    m.size = wt;
    update();
  };
  const deleteSelected = () => {
    if (!selected) return;
    remember();
    m.shapes = m.shapes.filter(s => s !== selected);
    m.selected = null;
    update();
  };
  const undo = () => {
    if (textOpen) { cancelText(); return; }
    if (!m.history.length) return;
    m.shapes = JSON.parse(m.history.pop()!);
    m.selected = null;
    update();
  };
  const clearAll = () => {
    if (!m.shapes.length) return;
    remember();
    m.shapes = [];
    m.selected = null;
    cancelText();
  };
  const done = () => {
    if (textOpen) commitText();
    onDone(m.shapes);
  };

  const activeColor = selected ? selected.color : m.color;
  const activeSize = selected ? selected.size : m.size;
  const canEditText = !!selected && (selected.type === 'text' || selected.type === 'callout');
  const hint = m.tool ? HINTS[m.tool] : 'Pick a tool to draw, or tap a markup to move, change or delete it.';

  return (
    <div className="fixed inset-0 z-[400] bg-stone-950 text-stone-100 flex flex-col no-print" role="dialog" aria-label="Mark up photo">
      <div className="flex items-center justify-between px-3 py-2" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
        <button type="button" onClick={onCancel} className="px-3 py-2 rounded-lg font-bold text-sm">Cancel</button>
        <span className="font-bold text-sm">Mark up photo</span>
        <button type="button" onClick={done} className="px-4 py-2 rounded-lg font-bold text-sm bg-clark-bright text-white">Done</button>
      </div>

      <div ref={stageRef} className="flex-1 min-h-0 grid place-items-center p-2">
        <canvas
          ref={canvasRef}
          className="rounded-md block"
          style={{ touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onDoubleClick={() => { if (canEditText) askText(selected!, true); }}
        />
      </div>

      {/* Fixed height so the photo never shifts while you're dragging */}
      <div className="h-[60px] flex-none flex flex-col justify-center">
        {textOpen ? (
          <form
            className="flex gap-2 px-3"
            onSubmit={(e) => { e.preventDefault(); commitText(); }}
          >
            <input
              ref={textInputRef}
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              maxLength={40}
              placeholder="Label text, e.g. Sealant gap"
              enterKeyHint="done"
              className="flex-1 min-w-0 rounded-lg border border-stone-700 bg-stone-950 text-stone-100 px-3 py-2 text-base"
            />
            <button type="submit" className="px-4 rounded-lg font-bold bg-clark-bright text-white">{m.editTarget ? 'Save' : 'Add'}</button>
            <button type="button" onClick={cancelText} className="px-3 rounded-lg font-bold bg-stone-800">Cancel</button>
          </form>
        ) : selected ? (
          <div className="flex gap-2 justify-center px-3">
            {canEditText && (
              <button type="button" onClick={() => askText(selected, true)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-sm bg-stone-800">
                <Edit3 className="w-4 h-4" /> Edit text
              </button>
            )}
            <button type="button" onClick={deleteSelected} className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-sm bg-red-900 text-white">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        ) : (
          <p className="text-xs text-stone-400 text-center px-3 m-0">{hint}</p>
        )}
      </div>

      <div className="bg-stone-900 px-2 pt-2 flex flex-col gap-2" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <div className="flex gap-1">
          {TOOLS.map(t => (
            <button
              key={t.type}
              type="button"
              onClick={() => pickTool(t.type)}
              aria-pressed={m.tool === t.type}
              className={`flex-1 min-w-0 flex flex-col items-center gap-0.5 py-1.5 rounded-xl text-[10px] font-bold ${m.tool === t.type ? 'bg-stone-800 text-white' : 'text-stone-400'}`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {MARKUP_COLORS.map(c => (
            <button
              key={c.value}
              type="button"
              aria-label={c.name}
              aria-pressed={activeColor === c.value}
              onClick={() => pickColor(c.value)}
              className={`w-6 h-6 flex-none rounded-full border-2 ${activeColor === c.value ? 'border-white ring-2 ring-clark-bright' : 'border-stone-700'}`}
              style={{ backgroundColor: c.value }}
            />
          ))}
          <span className="w-px h-6 bg-stone-700 mx-0.5 flex-none" />
          {MARKUP_WEIGHTS.map((wt, i) => (
            <button
              key={wt}
              type="button"
              aria-label={['Thin', 'Medium', 'Thick'][i] + ' line'}
              aria-pressed={activeSize === wt}
              onClick={() => pickWeight(wt)}
              className={`w-6 h-[30px] flex-none grid place-items-center rounded-lg ${activeSize === wt ? 'bg-stone-800' : ''}`}
            >
              <span className="block w-4 rounded bg-stone-100" style={{ height: 2 + i * 3 }} />
            </button>
          ))}
          <button type="button" onClick={undo} className="ml-auto flex items-center gap-1 px-2 py-1.5 rounded-lg bg-stone-800 text-xs font-bold">
            <Undo2 className="w-3.5 h-3.5" /> Undo
          </button>
          <button type="button" onClick={clearAll} className="px-2 py-1.5 rounded-lg bg-stone-800 text-xs font-bold">Clear</button>
        </div>
      </div>
    </div>
  );
}
