import { useRef, useState, useEffect, useCallback } from "react";
import { Layers, LocateFixed, Trash2, Plus, Minus } from "lucide-react";
import mapImg from "../../imports/SCR-20260603-dz6.jpeg";
import { RoofData, PanelFieldData, RoofMargins, DEFAULT_MARGINS } from "./Sidebar";
import { MiniPreview3D } from "./MiniPreview3D";

interface Point { x: number; y: number; }

export interface DrawnRoof { id: string; points: Point[]; }
export interface DrawnPanelField { id: string; roofId: string; points: Point[]; }
export interface ObstacleData { id: string; roofId: string; points: Point[]; parallel: boolean; height: number; }

interface MapCanvasProps {
  mode: "basic" | "pro";
  activeTool: "roof" | "panel-field";
  activeSubTool?: string;
  onRoofDrawn: (roof: RoofData, points: Point[]) => void;
  onPanelFieldDrawn: (panelField: PanelFieldData, points: Point[]) => void;
  onFillRoofWithPanels: (roofId: string) => void;
  onDeleteRoof: (id: string) => void;
  onDuplicateRoof: (id: string) => void;
  onDrawingMeasure: (mm: number | null) => void;
  onHeightAdjusting: (adjusting: boolean) => void;
  onUpdateRoofPoints: (id: string, points: Point[]) => void;
  onUpdateRoofHeightDrag: (id: string, inclination: number, direction: number) => void;
  drawnRoofs: DrawnRoof[];
  drawnPanelFields: DrawnPanelField[];
  roofs?: RoofData[];
  selectedRoofId: string | null;
  selectedPanelFieldId: string | null;
  onSelectRoof: (id: string) => void;
  obstacles: ObstacleData[];
  selectedObstacleId: string | null;
  onObstacleDrawn: (obstacle: ObstacleData) => void;
  onSelectObstacle: (id: string | null) => void;
  onSelectPanelField: (id: string | null) => void;
  onUpdatePanelFieldPoints: (id: string, points: Point[]) => void;
  shadingSelectorActive: boolean;
  onShadingPick: (value: number) => void;
  multiRoofIds: string[];
  onShiftSelectRoof: (id: string) => void;
  onResetGeometry: () => void;
}

function polygonArea(points: Point[]): number {
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2 * 0.025; // rough m²
}

function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    if (((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

function countPanelsInPolygon(points: Point[], placement: "vertical" | "horizontal"): number {
  const pw = placement === "vertical" ? 24 : 38;
  const ph = placement === "vertical" ? 38 : 24;
  const gap = 3;
  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));
  let count = 0;
  for (let y = minY; y + ph <= maxY; y += ph + gap) {
    for (let x = minX; x + pw <= maxX; x += pw + gap) {
      const cx = x + pw / 2, cy = y + ph / 2;
      if (isPointInPolygon({ x: cx, y: cy }, points)) count++;
    }
  }
  return count;
}

function drawPanelGrid(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  placement: "vertical" | "horizontal",
  isSelected: boolean
) {
  if (points.length < 3) return;
  const pw = placement === "vertical" ? 24 : 38;
  const ph = placement === "vertical" ? 38 : 24;
  const gap = 3;
  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.closePath();
  ctx.clip();

  for (let y = minY; y + ph <= maxY; y += ph + gap) {
    for (let x = minX; x + pw <= maxX; x += pw + gap) {
      const cx = x + pw / 2, cy = y + ph / 2;
      if (!isPointInPolygon({ x: cx, y: cy }, points)) continue;

      // Panel body
      ctx.fillStyle = isSelected ? "#1a4a9b" : "#1a3a6b";
      ctx.fillRect(x, y, pw, ph);

      // Cell grid lines
      ctx.strokeStyle = "rgba(100,160,255,0.25)";
      ctx.lineWidth = 0.5;
      const cols = placement === "vertical" ? 6 : 10;
      const rows = placement === "vertical" ? 10 : 6;
      for (let ci = 1; ci < cols; ci++) {
        const cx2 = x + ci * pw / cols;
        ctx.beginPath(); ctx.moveTo(cx2, y); ctx.lineTo(cx2, y + ph); ctx.stroke();
      }
      for (let ri = 1; ri < rows; ri++) {
        const ry = y + ri * ph / rows;
        ctx.beginPath(); ctx.moveTo(x, ry); ctx.lineTo(x + pw, ry); ctx.stroke();
      }
    }
  }
  ctx.restore();

  // Panel field border
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.closePath();
  ctx.strokeStyle = isSelected ? "#5aabff" : "#2a6abf";
  ctx.lineWidth = isSelected ? 2 : 1.5;
  ctx.setLineDash([]);
  ctx.stroke();
}

const MARGIN_EDGE_COLORS: Record<string, string> = {
  top: "#ef4444", right: "#f59e0b", bottom: "#22c55e", left: "#3b82f6", ridge: "#a855f7",
};

function drawMarginLabels(ctx: CanvasRenderingContext2D, points: Point[], margins: RoofMargins) {
  if (points.length < 3) return;
  const edges = [
    { key: "top",    i: 0 },
    { key: "right",  i: 1 },
    { key: "bottom", i: 2 },
    { key: "left",   i: 3 },
  ];
  const n = points.length;
  edges.forEach(({ key, i }) => {
    const a = points[i % n];
    const b = points[(i + 1) % n];
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const value = (margins as any)[key] as number;
    const label = `${value} mm`;
    const color = MARGIN_EDGE_COLORS[key];

    ctx.save();
    ctx.font = "bold 10px 'Figtree', sans-serif";
    const tw = ctx.measureText(label).width;
    const pw = tw + 10, ph = 18, pr = 5;
    const rx = mx - pw / 2, ry = my - ph / 2;

    // Pill background
    ctx.beginPath();
    ctx.roundRect(rx, ry, pw, ph, pr);
    ctx.fillStyle = color + "33";
    ctx.fill();
    ctx.strokeStyle = color + "99";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Text
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, mx, my);
    ctx.restore();
  });
}

function pixelToMeters(px: number): number {
  return px * 0.158; // rough scale: 1px ≈ 158mm at this zoom
}


function polygonCentroid(points: Point[]): Point {
  const x = points.reduce((s, p) => s + p.x, 0) / points.length;
  const y = points.reduce((s, p) => s + p.y, 0) / points.length;
  return { x, y };
}

function drawHeightModeRoof(ctx: CanvasRenderingContext2D, points: Point[]) {
  if (points.length < 2) return;
  const n = points.length;

  // White polygon outline
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.closePath();
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  ctx.stroke();

  // Edge labels (rotated along each edge)
  ctx.save();
  for (let i = 0; i < n; i++) {
    const a = points[i], b = points[(i + 1) % n];
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const mm = Math.round(pixelToMeters(dist) * 1000);
    const label = mm.toLocaleString("de-CH") + " mm";
    const angle = Math.atan2(b.y - a.y, b.x - a.x);

    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(angle);
    ctx.font = "600 10px 'Figtree', sans-serif";
    const tw = ctx.measureText(label).width;
    const pw = tw + 8, ph = 16, pr = 3;
    ctx.beginPath();
    ctx.roundRect(-pw / 2, -ph - 4, pw, ph, pr);
    ctx.fillStyle = "rgba(21,27,30,0.88)";
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 0, -ph / 2 - 4);
    ctx.restore();
  }
  ctx.restore();

  // Corner nodes: circle + orange square bracket
  points.forEach((p) => {
    // Orange corner bracket
    const s = 7;
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(p.x - s, p.y - s, s * 2, s * 2);

    // White circle node
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  // Edge midpoint nodes
  for (let i = 0; i < n; i++) {
    const a = points[i], b = points[(i + 1) % n];
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    ctx.beginPath();
    ctx.arc(mx, my, 4, 0, Math.PI * 2);
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function arrowTipAtRest(points: Point[], direction: number): Point {
  const centroid = polygonCentroid(points);
  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));
  const ringRadius = Math.max(maxX - minX, maxY - minY) / 2 + 70;
  const angle = ((direction - 90) * Math.PI) / 180;
  const len = ringRadius * 0.4;
  return { x: centroid.x + Math.cos(angle) * len, y: centroid.y + Math.sin(angle) * len };
}

const CENTER_DOT_HIT = 16;

function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

// Hit-test the orange direction arrow (tip knob or shaft)
function arrowHit(points: Point[], direction: number, pt: Point): boolean {
  const tip = arrowTipAtRest(points, direction);
  const angle = Math.atan2(tip.y - polygonCentroid(points).y, tip.x - polygonCentroid(points).x);
  // Knob is drawn 9px past the shaft tip — hit-test that position
  const knob = { x: tip.x + Math.cos(angle) * 9, y: tip.y + Math.sin(angle) * 9 };
  if (Math.hypot(knob.x - pt.x, knob.y - pt.y) < 18) return true;
  return distToSegment(pt, polygonCentroid(points), knob) < 10;
}

// Hit-test the center dot (shown before a height is set)
function centerDotHit(points: Point[], pt: Point): boolean {
  const c = polygonCentroid(points);
  return Math.hypot(c.x - pt.x, c.y - pt.y) < CENTER_DOT_HIT;
}

function drawHeightDragOverlay(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  centroid: Point,
  dragCurrent: Point | null,
  currentInclination: number,
  currentDirection: number,
  showRing = true,
) {
  // Compute ring radius from bounding box
  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));
  const ringRadius = Math.max(maxX - minX, maxY - minY) / 2 + 70;

  // Compass ring (only while dragging in basic; always in pro height tool)
  if (showRing) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(centroid.x, centroid.y, ringRadius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Tick marks (every 30°)
    for (let i = 0; i < 12; i++) {
      const a = (i * 30 * Math.PI) / 180;
      const inner = ringRadius - (i % 3 === 0 ? 10 : 5);
      ctx.beginPath();
      ctx.moveTo(centroid.x + Math.cos(a) * inner, centroid.y + Math.sin(a) * inner);
      ctx.lineTo(centroid.x + Math.cos(a) * ringRadius, centroid.y + Math.sin(a) * ringRadius);
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = i % 3 === 0 ? 1.5 : 1;
      ctx.stroke();
    }
    ctx.restore();
  }

  // Direction arrow (from centroid toward drag or current direction)
  let arrowAngle: number;
  let inclination: number;
  if (dragCurrent) {
    const dx = dragCurrent.x - centroid.x;
    const dy = dragCurrent.y - centroid.y;
    arrowAngle = Math.atan2(dy, dx);
    const dist = Math.hypot(dx, dy);
    inclination = Math.min(90, Math.round((dist / ringRadius) * 90));
  } else {
    // Show current stored direction as a static arrow (short, just to indicate direction)
    arrowAngle = ((currentDirection - 90) * Math.PI) / 180;
    inclination = currentInclination;
  }

  const arrowLength = dragCurrent
    ? Math.min(ringRadius - 10, Math.hypot(dragCurrent.x - centroid.x, dragCurrent.y - centroid.y))
    : ringRadius * 0.4;

  const tipX = centroid.x + Math.cos(arrowAngle) * arrowLength;
  const tipY = centroid.y + Math.sin(arrowAngle) * arrowLength;

  // Arrow shaft
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(centroid.x, centroid.y);
  ctx.lineTo(tipX, tipY);
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.stroke();

  // Arrowhead
  const headSize = 10;
  const headAngle = 0.4;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX - headSize * Math.cos(arrowAngle - headAngle), tipY - headSize * Math.sin(arrowAngle - headAngle));
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX - headSize * Math.cos(arrowAngle + headAngle), tipY - headSize * Math.sin(arrowAngle + headAngle));
  ctx.stroke();

  // Grab knob — placed slightly past the arrow tip so the head stays visible
  const knobDist = 9;
  const knobX = tipX + Math.cos(arrowAngle) * knobDist;
  const knobY = tipY + Math.sin(arrowAngle) * knobDist;
  ctx.beginPath();
  ctx.arc(knobX, knobY, 6, 0, Math.PI * 2);
  ctx.fillStyle = "#f59e0b";
  ctx.fill();
  ctx.strokeStyle = "white";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // Angle label at center of roof
  if (dragCurrent) {
    ctx.save();
    const label = `${inclination} °`;
    ctx.font = "bold 13px 'Figtree', sans-serif";
    const tw = ctx.measureText(label).width;
    const pw = tw + 12, ph = 22, pr = 4;
    ctx.beginPath();
    ctx.roundRect(centroid.x - pw / 2, centroid.y - ph / 2, pw, ph, pr);
    ctx.fillStyle = "rgba(21,27,30,0.88)";
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, centroid.x, centroid.y);
    ctx.restore();
  }
}

// Unified roof-angle handle: center dot (unset) → arrow (set) → ring (dragging/hover)
function drawHeightHandles(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  inclination: number,
  direction: number,
  dragCurrent: Point | null,
  arrowHovered: boolean,
) {
  const centroid = polygonCentroid(points);
  const hasHeight = (inclination ?? 0) > 0;

  if (dragCurrent) {
    drawHeightDragOverlay(ctx, points, centroid, dragCurrent, inclination, direction, true);
    return;
  }
  if (hasHeight) {
    // Arrow always visible; ring appears only on hover
    drawHeightDragOverlay(ctx, points, centroid, null, inclination, direction, arrowHovered);
    return;
  }
  // No height yet: a draggable dot in the middle
  ctx.save();
  ctx.beginPath();
  ctx.arc(centroid.x, centroid.y, 9, 0, Math.PI * 2);
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(centroid.x, centroid.y, 9, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

let roofCounter = 0;
let panelFieldCounter = 0;

type DragState = {
  type: "move" | "vertex";
  kind: "roof" | "panel";
  roofId: string;
  vertexIndices?: number[];   // nodes being dragged (multi-node)
  moveIds?: string[];         // roofs being moved together (multi-roof)
  startMouse: Point;
  startPointsById: Record<string, Point[]>;
} | null;

const VERTEX_HIT_RADIUS = 10;

export function MapCanvas({
  mode, activeTool, activeSubTool, onRoofDrawn, onPanelFieldDrawn, onFillRoofWithPanels,
  onDeleteRoof, onDuplicateRoof, onDrawingMeasure, onHeightAdjusting, onUpdateRoofPoints, onUpdateRoofHeightDrag,
  drawnRoofs, drawnPanelFields, roofs = [], selectedRoofId, selectedPanelFieldId, onSelectRoof,
  obstacles, selectedObstacleId, onObstacleDrawn, onSelectObstacle,
  onSelectPanelField, onUpdatePanelFieldPoints,
  shadingSelectorActive, onShadingPick,
  multiRoofIds, onShiftSelectRoof, onResetGeometry,
}: MapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [drawingPoints, setDrawingPoints] = useState<Point[]>([]);
  const [mousePos, setMousePos] = useState<Point | null>(null);
  const [isDraggingHeight, setIsDraggingHeight] = useState(false);
  const [hasAdjustedHeight, setHasAdjustedHeight] = useState(false);
  const [dragState, setDragState] = useState<DragState>(null);
  const [cursorStyle, setCursorStyle] = useState("cursor-crosshair");
  // Live preview of dragged polygons (roofs or panel fields), keyed by id
  const [dragPreview, setDragPreview] = useState<{ id: string; points: Point[] }[] | null>(null);
  // Multi-node selection on the primary selected roof (indices into its points)
  const [selectedNodes, setSelectedNodes] = useState<number[]>([]);
  const previewFor = (id: string) => dragPreview?.find((d) => d.id === id)?.points;
  // Height drag: centroid is the fixed origin, current is where the mouse is
  const [heightDragCentroid, setHeightDragCentroid] = useState<Point | null>(null);
  const [heightDragCurrent, setHeightDragCurrent] = useState<Point | null>(null);
  // Whether the cursor is hovering the direction arrow (shows the ring as a hint)
  const [arrowHovered, setArrowHovered] = useState(false);
  // Flag: a height-drag just finished — suppress the click event that follows mouseup
  const heightDragJustFinished = useRef(false);

  const getRelativePoint = (e: React.MouseEvent): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const drawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw completed roofs
    const allSelectedRoofIds = new Set([selectedRoofId, ...multiRoofIds].filter(Boolean) as string[]);
    drawnRoofs.forEach((roof) => {
      if (roof.points.length < 2) return;
      const isSelected = allSelectedRoofIds.has(roof.id);
      const isPrimary = roof.id === selectedRoofId;
      const pts = previewFor(roof.id) ?? roof.points;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      pts.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.closePath();
      ctx.fillStyle = isSelected ? "rgba(0,104,222,0.18)" : "rgba(0,104,222,0.10)";
      ctx.fill();
      ctx.strokeStyle = isSelected ? "#0068DE" : "#0068DE99";
      ctx.lineWidth = isSelected ? 2.5 : 1.92;
      ctx.setLineDash([]);
      ctx.stroke();

      // Vertex handles in draw-roof mode for selected roofs
      if (activeSubTool === "draw-roof" && isSelected && drawingPoints.length === 0) {
        pts.forEach((p, i) => {
          const nodeSelected = isPrimary && selectedNodes.includes(i);
          ctx.beginPath();
          ctx.arc(p.x, p.y, nodeSelected ? 7 : 6, 0, Math.PI * 2);
          ctx.fillStyle = nodeSelected ? "#0068DE" : "white";
          ctx.fill();
          ctx.strokeStyle = "#0068DE";
          ctx.lineWidth = 2;
          ctx.stroke();
        });
      }
    });

    // Draw panel fields
    drawnPanelFields.forEach((pf) => {
      if (pf.points.length < 3) return;
      const pts = previewFor(pf.id) ?? pf.points;
      const isSelected = pf.id === selectedPanelFieldId;
      drawPanelGrid(ctx, pts, "vertical", isSelected);

      // Vertex handles in draw-panel mode for selected field
      if (activeSubTool === "draw-panel" && isSelected && drawingPoints.length === 0) {
        pts.forEach((p) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
          ctx.fillStyle = "white";
          ctx.fill();
          ctx.strokeStyle = "#5aabff";
          ctx.lineWidth = 2;
          ctx.stroke();
        });
      }
    });

    // Draw obstacles (red)
    obstacles.forEach((ob) => {
      if (ob.points.length < 2) return;
      const isSelected = ob.id === selectedObstacleId;
      ctx.beginPath();
      ctx.moveTo(ob.points[0].x, ob.points[0].y);
      ob.points.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.closePath();
      ctx.fillStyle = isSelected ? "rgba(239,68,68,0.28)" : "rgba(239,68,68,0.18)";
      ctx.fill();
      ctx.strokeStyle = isSelected ? "#ef4444" : "#ef4444cc";
      ctx.lineWidth = isSelected ? 2.5 : 1.92;
      ctx.setLineDash([]);
      ctx.stroke();
    });

    // Draw safety margin labels on selected roof
    if (activeSubTool === "safety-margins" && selectedRoofId) {
      const sel = drawnRoofs.find((r) => r.id === selectedRoofId);
      const roofData = roofs.find((r) => r.id === selectedRoofId);
      if (sel && roofData) drawMarginLabels(ctx, sel.points, roofData.margins);
    }

    // Roof-height mode: draw selected roof with vertex handles and labels
    if (activeSubTool === "roof-height" && selectedRoofId) {
      const sel = drawnRoofs.find((r) => r.id === selectedRoofId);
      const roofData = roofs.find((r) => r.id === selectedRoofId);
      if (sel && sel.points.length >= 3) {
        drawHeightModeRoof(ctx, sel.points);
        drawHeightHandles(ctx, sel.points, roofData?.inclination ?? 0, roofData?.direction ?? 0, heightDragCurrent, arrowHovered);
      }
    }

    // Basic mode draw-roof: same roof-angle handles on the selected roof
    if (mode === "basic" && activeSubTool === "draw-roof" && selectedRoofId && drawingPoints.length === 0) {
      const sel = drawnRoofs.find((r) => r.id === selectedRoofId);
      const roofData = roofs.find((r) => r.id === selectedRoofId);
      if (sel && sel.points.length >= 3) {
        drawHeightHandles(ctx, sel.points, roofData?.inclination ?? 0, roofData?.direction ?? 0, heightDragCurrent, arrowHovered);
      }
    }

    // Draw in-progress polygon
    if (drawingPoints.length > 0) {
      const drawColor = activeSubTool === "obstacle" ? "#ef4444" : (activeTool === "panel-field" ? "#5aabff" : "#0068DE");
      const allPoints = mousePos ? [...drawingPoints, mousePos] : drawingPoints;
      ctx.beginPath();
      ctx.moveTo(drawingPoints[0].x, drawingPoints[0].y);
      allPoints.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = 1.92;
      ctx.setLineDash([]);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(drawingPoints[0].x, drawingPoints[0].y);
      allPoints.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.strokeStyle = "white";
      ctx.setLineDash([20, 60]);
      ctx.stroke();
      ctx.setLineDash([]);

      drawingPoints.forEach((p, i) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, i === 0 ? 6 : 4, 0, Math.PI * 2);
        ctx.fillStyle = i === 0 ? drawColor : "white";
        ctx.fill();
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

    }
  }, [mode, drawnRoofs, drawnPanelFields, drawingPoints, mousePos, selectedRoofId, selectedPanelFieldId, activeTool, activeSubTool, roofs, isDraggingHeight, dragPreview, heightDragCentroid, heightDragCurrent, obstacles, selectedObstacleId, multiRoofIds, selectedNodes, arrowHovered]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    drawAll();
  }, [drawAll]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const observer = new ResizeObserver(() => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      drawAll();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [drawAll]);

  const finishRoof = (points: Point[]) => {
    roofCounter++;
    const area = polygonArea(points);
    onRoofDrawn({
      id: `roof-${Date.now()}`,
      name: `Roof ${roofCounter}`,
      area,
      inclination: 0,
      direction: 83,
      margins: { ...DEFAULT_MARGINS },
      ridgeHeight: 7369,
      eaveHeight: 3000,
    }, points);
    setDrawingPoints([]);
    setMousePos(null);
    onDrawingMeasure(null);
  };

  const finishPanelField = (points: Point[], roofId: string) => {
    const count = countPanelsInPolygon(points, "vertical");
    onPanelFieldDrawn({
      id: `pf-${Date.now()}`,
      roofId,
      name: "", // App.tsx assigns the letter name via counter
      panelCount: count,
      pvPanel: "JA Solar JAM6-60-260/SI",
      mountingSystem: "Standard pitched roof tile",
      placement: "vertical",
      rotation: 83,
      inclination: 40,
      spacingRow: 20,
      spacingCol: 20,
      offset: 0,
    }, points);
    setDrawingPoints([]);
    setMousePos(null);
    onDrawingMeasure(null);
  };

  const finishObstacle = (points: Point[], roofId: string) => {
    onObstacleDrawn({
      id: `ob-${Date.now()}`,
      roofId,
      points,
      parallel: true,
      height: 100,
    });
    setDrawingPoints([]);
    setMousePos(null);
    onDrawingMeasure(null);
  };

  const handleClick = (e: React.MouseEvent) => {
    // If a height-drag just ended, the browser fires a click right after mouseup.
    // Ignore that click so it doesn't accidentally start a new roof drawing.
    if (heightDragJustFinished.current) {
      heightDragJustFinished.current = false;
      return;
    }
    const pt = getRelativePoint(e);

    // Shading selector: pick a point on the roof to read its shading value
    if (activeSubTool === "shading-analysis" && shadingSelectorActive) {
      // Higher shading closer to an obstacle; low if clear
      let minDist = Infinity;
      obstacles.forEach((o) => {
        const c = polygonCentroid(o.points);
        minDist = Math.min(minDist, Math.hypot(c.x - pt.x, c.y - pt.y));
      });
      const value = obstacles.length === 0
        ? 0.3
        : Math.max(0.3, Math.min(20, 20 - minDist / 12));
      onShadingPick(Math.round(value * 10) / 10);
      return;
    }

    // Obstacle tool: draw a red polygon inside a roof surface
    if (activeTool === "roof" && activeSubTool === "obstacle") {
      // Not currently drawing: clicking an existing obstacle selects it
      if (drawingPoints.length === 0) {
        const existing = obstacles.find((o) => isPointInPolygon(pt, o.points));
        if (existing) { onSelectObstacle(existing.id); return; }
        // Must start inside a roof surface
        const roof = drawnRoofs.find((r) => isPointInPolygon(pt, r.points));
        if (!roof) return;
        onSelectObstacle(null);
        onSelectRoof(roof.id);
        setDrawingPoints([pt]);
        return;
      }
      // Drawing in progress: close on first point
      if (drawingPoints.length >= 3) {
        const first = drawingPoints[0];
        if (Math.hypot(pt.x - first.x, pt.y - first.y) < 15) {
          const roof = drawnRoofs.find((r) => isPointInPolygon(drawingPoints[0], r.points));
          finishObstacle(drawingPoints, roof?.id ?? selectedRoofId ?? "");
          return;
        }
      }
      setDrawingPoints((prev) => [...prev, pt]);
      return;
    }

    // Roof height: click to select (Shift = multi-select)
    if (activeTool === "roof" && activeSubTool === "roof-height") {
      const target = drawnRoofs.find((r) => isPointInPolygon(pt, r.points));
      if (target) {
        if (e.shiftKey) onShiftSelectRoof(target.id);
        else onSelectRoof(target.id);
      }
      return;
    }

    if (activeTool === "roof" && activeSubTool === "draw-roof") {
      // Mid-drawing: add points / close the shape
      if (drawingPoints.length > 0) {
        if (drawingPoints.length >= 3) {
          const first = drawingPoints[0];
          if (Math.hypot(pt.x - first.x, pt.y - first.y) < 15) {
            finishRoof(drawingPoints);
            return;
          }
        }
        setDrawingPoints((prev) => [...prev, pt]);
        return;
      }
      // Not drawing: clicking inside an existing roof selects it (handled in mousedown).
      // Clicking empty space starts a new roof.
      const inside = drawnRoofs.some((r) => isPointInPolygon(pt, r.points));
      if (inside) return;
      onSelectRoof(""); // clear selection when starting a new shape
      setSelectedNodes([]);
      setDrawingPoints([pt]);
      return;
    }

    if (activeTool === "panel-field" && activeSubTool === "draw-panel") {
      if (drawnRoofs.length === 0) return;

      // Mid-drawing: add points / close
      if (drawingPoints.length > 0) {
        const targetRoof = drawnRoofs.find((r) => r.id === selectedRoofId);
        if (drawingPoints.length >= 3) {
          const first = drawingPoints[0];
          if (Math.hypot(pt.x - first.x, pt.y - first.y) < 15) {
            finishPanelField(drawingPoints, targetRoof?.id ?? selectedRoofId ?? "");
            return;
          }
        }
        setDrawingPoints((prev) => [...prev, pt]);
        return;
      }
      // Not drawing: clicking a panel field selects it (handled in mousedown).
      // Clicking inside a roof (not a field) starts a new panel field.
      const insideField = drawnPanelFields.some((p) => isPointInPolygon(pt, p.points));
      if (insideField) return;
      const targetRoof = drawnRoofs.find((r) => isPointInPolygon(pt, r.points));
      if (!targetRoof) return;
      onSelectPanelField(null);
      onSelectRoof(targetRoof.id);
      setDrawingPoints([pt]);
      return;
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const pt = getRelativePoint(e);

    if (activeTool === "roof" && activeSubTool === "obstacle") {
      if (drawingPoints.length >= 3) {
        const roof = drawnRoofs.find((r) => isPointInPolygon(drawingPoints[0], r.points));
        finishObstacle(drawingPoints, roof?.id ?? selectedRoofId ?? "");
      }
      return;
    }

    if (activeTool === "roof") {
      if (drawingPoints.length >= 3) { finishRoof(drawingPoints); return; }
      // Double-click an existing roof to fill with panels
      const target = drawnRoofs.find((r) => isPointInPolygon(pt, r.points));
      if (target) onFillRoofWithPanels(target.id);
      return;
    }

    if (activeTool === "panel-field" && activeSubTool === "draw-panel") {
      // Finish an in-progress panel field
      if (drawingPoints.length >= 3) {
        const targetRoof = drawnRoofs.find((r) => r.id === selectedRoofId)
          ?? drawnRoofs.find((r) => isPointInPolygon(pt, r.points));
        if (targetRoof) finishPanelField(drawingPoints, targetRoof.id);
        return;
      }
      // Otherwise: double-click a roof to auto-fill it with panels
      const target = drawnRoofs.find((r) => isPointInPolygon(pt, r.points));
      if (target) {
        setDrawingPoints([]);
        setMousePos(null);
        onDrawingMeasure(null);
        onFillRoofWithPanels(target.id);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pt = getRelativePoint(e);

    // Active drag (move or vertex reshape), for roofs or panel fields
    if (dragState) {
      const dx = pt.x - dragState.startMouse.x;
      const dy = pt.y - dragState.startMouse.y;
      if (dragState.type === "move") {
        const ids = dragState.moveIds ?? [dragState.roofId];
        const preview = ids.map((id) => ({
          id,
          points: (dragState.startPointsById[id] ?? []).map((p) => ({ x: p.x + dx, y: p.y + dy })),
        }));
        setDragPreview(preview);
      } else {
        const idx = dragState.vertexIndices ?? [];
        const base = dragState.startPointsById[dragState.roofId] ?? [];
        const newPoints = base.map((p, i) => (idx.includes(i) ? { x: p.x + dx, y: p.y + dy } : p));
        setDragPreview([{ id: dragState.roofId, points: newPoints }]);
      }
      return;
    }

    // Pro roof-height tool: hover the dot/arrow → grab cursor (+ ring hint when set)
    if (activeSubTool === "roof-height" && !isDraggingHeight) {
      const sel = drawnRoofs.find((r) => r.id === selectedRoofId);
      const roofData = roofs.find((r) => r.id === selectedRoofId);
      if (sel && sel.points.length >= 3) {
        const hasHeight = (roofData?.inclination ?? 0) > 0;
        const overHandle = hasHeight ? arrowHit(sel.points, roofData?.direction ?? 0, pt) : centerDotHit(sel.points, pt);
        setArrowHovered(hasHeight && overHandle);
        setCursorStyle(overHandle ? "cursor-grab" : "cursor-default");
      } else {
        setArrowHovered(false);
        setCursorStyle("cursor-default");
      }
      return;
    }

    // Cursor feedback while drawing-tool is idle (roof: draw-roof, panel: draw-panel)
    if (activeSubTool === "draw-roof" && drawingPoints.length === 0 && !isDraggingHeight) {
      const sel = drawnRoofs.find((r) => r.id === selectedRoofId);
      // Basic: hover the center dot (unset) or arrow (set) → grab cursor + ring hint
      if (sel && mode === "basic" && sel.points.length >= 3) {
        const roofData = roofs.find((r) => r.id === selectedRoofId);
        const hasHeight = (roofData?.inclination ?? 0) > 0;
        const overHandle = hasHeight ? arrowHit(sel.points, roofData?.direction ?? 0, pt) : centerDotHit(sel.points, pt);
        setArrowHovered(hasHeight && overHandle);
        if (overHandle) { setCursorStyle("cursor-grab"); return; }
      } else if (arrowHovered) {
        setArrowHovered(false);
      }
      if (sel) {
        const nearVertex = sel.points.some((p) => Math.hypot(p.x - pt.x, p.y - pt.y) < VERTEX_HIT_RADIUS);
        if (nearVertex) { setCursorStyle("cursor-crosshair"); return; }
      }
      const anyRoof = drawnRoofs.some((r) => isPointInPolygon(pt, r.points));
      setCursorStyle(anyRoof ? "cursor-move" : "cursor-crosshair");
      return;
    }
    if (activeSubTool === "draw-panel" && drawingPoints.length === 0) {
      const sel = drawnPanelFields.find((p) => p.id === selectedPanelFieldId);
      if (sel) {
        const nearVertex = sel.points.some((p) => Math.hypot(p.x - pt.x, p.y - pt.y) < VERTEX_HIT_RADIUS);
        if (nearVertex) { setCursorStyle("cursor-crosshair"); return; }
      }
      const anyPanel = drawnPanelFields.some((p) => isPointInPolygon(pt, p.points));
      setCursorStyle(anyPanel ? "cursor-move" : "cursor-crosshair");
      return;
    }

    // Height drag: update current mouse and fire inclination/direction callback
    // (roof-height tool in Pro, or dragging the arrow in Basic draw-roof)
    if (isDraggingHeight && heightDragCentroid && selectedRoofId) {
      setHeightDragCurrent(pt);
      const dx = pt.x - heightDragCentroid.x;
      const dy = pt.y - heightDragCentroid.y;
      const sel = drawnRoofs.find((r) => r.id === selectedRoofId);
      const roofData = roofs.find((r) => r.id === selectedRoofId);
      const ringRadius = sel
        ? Math.max(
            Math.max(...sel.points.map((p) => p.x)) - Math.min(...sel.points.map((p) => p.x)),
            Math.max(...sel.points.map((p) => p.y)) - Math.min(...sel.points.map((p) => p.y)),
          ) / 2 + 70
        : 120;
      const dist = Math.hypot(dx, dy);
      const inclination = Math.min(90, Math.round((dist / ringRadius) * 90));
      // Convert canvas angle to compass bearing (0 = north/up)
      const angleRad = Math.atan2(dy, dx);
      const direction = Math.round(((angleRad * 180) / Math.PI + 90 + 360) % 360);
      onUpdateRoofHeightDrag(selectedRoofId, inclination, direction);
      return;
    }

    if (drawingPoints.length > 0) {
      setMousePos(pt);
      const last = drawingPoints[drawingPoints.length - 1];
      const px = Math.hypot(pt.x - last.x, pt.y - last.y);
      onDrawingMeasure(Math.round(pixelToMeters(px) * 1000));
    }
  };

  const handleMouseLeave = () => {
    setMousePos(null);
    onDrawingMeasure(null);
    setArrowHovered(false);
    if (activeSubTool === "draw-roof" || activeSubTool === "draw-panel") setCursorStyle("cursor-crosshair");
  };

  // Esc cancels any in-progress drawing
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDrawingPoints([]);
        setMousePos(null);
        onDrawingMeasure(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onDrawingMeasure]);

  // Clear node selection when the primary selected roof changes
  useEffect(() => { setSelectedNodes([]); }, [selectedRoofId]);

  // Reset height-adjust state when leaving roof-height tool
  useEffect(() => {
    if (activeSubTool !== "roof-height") {
      setIsDraggingHeight(false);
      setHasAdjustedHeight(false);
      setHeightDragCentroid(null);
      setHeightDragCurrent(null);
      onHeightAdjusting(false);
    }
  }, [activeSubTool]);

  // Reset cursor when switching tool
  useEffect(() => {
    if (activeSubTool === "shading-analysis") setCursorStyle(shadingSelectorActive ? "cursor-crosshair" : "cursor-default");
    else setCursorStyle("cursor-crosshair");
    setDragState(null);
    setDragPreview(null);
    setSelectedNodes([]);
  }, [activeSubTool, shadingSelectorActive]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const pt = getRelativePoint(e);
    const shift = e.shiftKey;

    // Draw-roof: select / multi-select / move / reshape (only when not mid-draw)
    if (activeSubTool === "draw-roof" && drawingPoints.length === 0) {
      const primary = drawnRoofs.find((r) => r.id === selectedRoofId);
      // 0) Basic mode: grab the center dot (unset) or direction arrow (set) to adjust angle
      if (mode === "basic" && primary && primary.points.length >= 3) {
        const roofData = roofs.find((r) => r.id === selectedRoofId);
        const hasHeight = (roofData?.inclination ?? 0) > 0;
        const grab = hasHeight ? arrowHit(primary.points, roofData?.direction ?? 0, pt) : centerDotHit(primary.points, pt);
        if (grab) {
          setHeightDragCentroid(polygonCentroid(primary.points));
          setHeightDragCurrent(pt);
          setIsDraggingHeight(true);
          return;
        }
      }
      // 1) Vertex of the primary selected roof → node select / reshape
      if (primary) {
        const vi = primary.points.findIndex((p) => Math.hypot(p.x - pt.x, p.y - pt.y) < VERTEX_HIT_RADIUS);
        if (vi !== -1) {
          if (shift) {
            // Toggle node into selection; no drag
            setSelectedNodes((prev) => prev.includes(vi) ? prev.filter((n) => n !== vi) : [...prev, vi]);
            return;
          }
          const idx = selectedNodes.includes(vi) && selectedNodes.length > 1 ? selectedNodes : [vi];
          setSelectedNodes(idx);
          setDragState({ type: "vertex", kind: "roof", roofId: primary.id, vertexIndices: idx, startMouse: pt, startPointsById: { [primary.id]: primary.points } });
          return;
        }
      }
      // 2) Inside a roof body → select / multi-select / move
      const hitRoof = drawnRoofs.find((r) => isPointInPolygon(pt, r.points));
      if (hitRoof) {
        if (shift) {
          onShiftSelectRoof(hitRoof.id);
          return;
        }
        const currentSet = new Set([selectedRoofId, ...multiRoofIds].filter(Boolean) as string[]);
        if (!currentSet.has(hitRoof.id)) {
          onSelectRoof(hitRoof.id);
          setSelectedNodes([]);
        }
        const moveIds = currentSet.has(hitRoof.id) ? Array.from(currentSet) : [hitRoof.id];
        const startPointsById: Record<string, Point[]> = {};
        moveIds.forEach((id) => {
          const r = drawnRoofs.find((rr) => rr.id === id);
          if (r) startPointsById[id] = r.points;
        });
        setDragState({ type: "move", kind: "roof", roofId: hitRoof.id, moveIds, startMouse: pt, startPointsById });
        return;
      }
      return;
    }

    // Draw-panel: select / move / reshape a panel field (only when not mid-draw)
    if (activeSubTool === "draw-panel" && drawingPoints.length === 0) {
      const sel = drawnPanelFields.find((p) => p.id === selectedPanelFieldId);
      if (sel) {
        const vi = sel.points.findIndex((p) => Math.hypot(p.x - pt.x, p.y - pt.y) < VERTEX_HIT_RADIUS);
        if (vi !== -1) {
          setDragState({ type: "vertex", kind: "panel", roofId: sel.id, vertexIndices: [vi], startMouse: pt, startPointsById: { [sel.id]: sel.points } });
          return;
        }
      }
      const hit = drawnPanelFields.find((p) => isPointInPolygon(pt, p.points));
      if (hit) {
        if (hit.id !== selectedPanelFieldId) onSelectPanelField(hit.id);
        setDragState({ type: "move", kind: "panel", roofId: hit.id, moveIds: [hit.id], startMouse: pt, startPointsById: { [hit.id]: hit.points } });
        return;
      }
      return;
    }

    // Pro roof-height tool: only the center dot / arrow adjust the angle (no move or reshape)
    if (activeSubTool === "roof-height") {
      if (!selectedRoofId) return;
      const sel = drawnRoofs.find((r) => r.id === selectedRoofId);
      const roofData = roofs.find((r) => r.id === selectedRoofId);
      if (sel && sel.points.length >= 3) {
        const hasHeight = (roofData?.inclination ?? 0) > 0;
        const grab = hasHeight ? arrowHit(sel.points, roofData?.direction ?? 0, pt) : centerDotHit(sel.points, pt);
        if (grab) {
          setHeightDragCentroid(polygonCentroid(sel.points));
          setHeightDragCurrent(pt);
          setIsDraggingHeight(true);
          setHasAdjustedHeight(true);
          onHeightAdjusting(true);
        }
      }
    }
  };

  const handleMouseUp = () => {
    if (dragState && dragPreview) {
      dragPreview.forEach((d) => {
        if (dragState.kind === "panel") onUpdatePanelFieldPoints(d.id, d.points);
        else onUpdateRoofPoints(d.id, d.points);
      });
    }
    // Mark that a height-drag just ended so the following click event doesn't
    // accidentally start a new roof drawing.
    if (isDraggingHeight) heightDragJustFinished.current = true;
    setDragState(null);
    setDragPreview(null);
    setIsDraggingHeight(false);
    setHeightDragCurrent(null);
    setHeightDragCentroid(null);
  };


  return (
    <div ref={containerRef} className="absolute inset-0 bg-[#ddd]">
      {/* Map image */}
      <div className="absolute inset-0 overflow-hidden">
        <img alt="aerial map" src={mapImg} className="absolute inset-0 w-full h-full object-cover" />
      </div>

      {/* Attribution */}
      <div className="absolute bottom-0 right-0 bg-white/70 px-1 py-0.5 text-[11px] font-['Helvetica_Neue',sans-serif] text-[#333] flex items-center gap-1 z-10 pointer-events-none">
        <span className="text-[#0078a8]">Leaflet</span>
        <span>| Datenquelle: <span className="text-[#0078a8]">geo.admin.ch</span></span>
      </div>

      {/* 3D preview (top-right) — Pro only */}
      {mode === "pro" && <MiniPreview3D />}

      {/* Map controls (bottom-right) */}
      <div className="absolute right-4 bottom-10 z-30 flex flex-col gap-2 items-center">
        <div className="flex flex-col gap-1.5">
          <CtrlBtn title="Map layers"><Layers size={16} /></CtrlBtn>
          <CtrlBtn title="Center view"><LocateFixed size={16} /></CtrlBtn>
          <CtrlBtn
            title="Reset all geometry"
            danger
            onClick={() => {
              if (window.confirm("Reset all geometry? This removes every roof, panel field and obstacle.")) onResetGeometry();
            }}
          >
            <Trash2 size={16} />
          </CtrlBtn>
        </div>
        <div className="flex flex-col gap-1.5">
          <CtrlBtn title="Zoom in"><Plus size={16} /></CtrlBtn>
          <CtrlBtn title="Zoom out"><Minus size={16} /></CtrlBtn>
        </div>
      </div>

      {/* Drawing canvas */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 z-20 ${cursorStyle}`}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      />


    </div>
  );
}

function CtrlBtn({ title, onClick, danger, children }: {
  title: string; onClick?: () => void; danger?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        aria-label={title}
        className={`w-9 h-9 bg-white rounded-md shadow-md flex items-center justify-center transition-colors ${
          danger ? "text-[#dc4a44] hover:bg-red-50" : "text-[#263238] hover:bg-gray-100"
        }`}
      >
        {children}
      </button>
      {/* Tooltip (left of button) */}
      <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 px-2.5 py-1.5 rounded-md bg-[#0b0f11] border border-white/10 text-white text-[12px] font-['Figtree',sans-serif] whitespace-nowrap shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
        {title}
      </div>
    </div>
  );
}

