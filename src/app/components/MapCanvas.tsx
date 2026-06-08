import { useRef, useState, useEffect, useCallback } from "react";
import mapImg from "../../imports/SCR-20260603-dz6.jpeg";
import { RoofData, PanelFieldData, RoofMargins, DEFAULT_MARGINS } from "./Sidebar";

interface Point { x: number; y: number; }

export interface DrawnRoof { id: string; points: Point[]; }
export interface DrawnPanelField { id: string; roofId: string; points: Point[]; }
export interface ObstacleData { id: string; roofId: string; points: Point[]; parallel: boolean; height: number; }

interface MapCanvasProps {
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

function drawHeightDragOverlay(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  centroid: Point,
  dragCurrent: Point | null,
  currentInclination: number,
  currentDirection: number,
) {
  // Compute ring radius from bounding box
  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));
  const ringRadius = Math.max(maxX - minX, maxY - minY) / 2 + 70;

  // Compass ring
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
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.stroke();

  // Arrowhead
  const headSize = 8;
  const headAngle = 0.4;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX - headSize * Math.cos(arrowAngle - headAngle), tipY - headSize * Math.sin(arrowAngle - headAngle));
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX - headSize * Math.cos(arrowAngle + headAngle), tipY - headSize * Math.sin(arrowAngle + headAngle));
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

let roofCounter = 0;
let panelFieldCounter = 0;

type DragState = {
  type: "move" | "vertex";
  kind: "roof" | "panel";
  roofId: string;
  vertexIndex?: number;
  startMouse: Point;
  startPoints: Point[];
} | null;

const VERTEX_HIT_RADIUS = 10;

export function MapCanvas({
  activeTool, activeSubTool, onRoofDrawn, onPanelFieldDrawn, onFillRoofWithPanels,
  onDeleteRoof, onDuplicateRoof, onDrawingMeasure, onHeightAdjusting, onUpdateRoofPoints, onUpdateRoofHeightDrag,
  drawnRoofs, drawnPanelFields, roofs = [], selectedRoofId, selectedPanelFieldId, onSelectRoof,
  obstacles, selectedObstacleId, onObstacleDrawn, onSelectObstacle,
  onSelectPanelField, onUpdatePanelFieldPoints,
  shadingSelectorActive, onShadingPick,
}: MapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [drawingPoints, setDrawingPoints] = useState<Point[]>([]);
  const [mousePos, setMousePos] = useState<Point | null>(null);
  const [isDraggingHeight, setIsDraggingHeight] = useState(false);
  const [hasAdjustedHeight, setHasAdjustedHeight] = useState(false);
  const [dragState, setDragState] = useState<DragState>(null);
  const [cursorStyle, setCursorStyle] = useState("cursor-crosshair");
  const [dragPreviewPoints, setDragPreviewPoints] = useState<{ id: string; points: Point[] } | null>(null);
  // Height drag: centroid is the fixed origin, current is where the mouse is
  const [heightDragCentroid, setHeightDragCentroid] = useState<Point | null>(null);
  const [heightDragCurrent, setHeightDragCurrent] = useState<Point | null>(null);

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
    drawnRoofs.forEach((roof) => {
      if (roof.points.length < 2) return;
      const isSelected = roof.id === selectedRoofId;
      const pts = (dragPreviewPoints?.id === roof.id) ? dragPreviewPoints.points : roof.points;
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

      // Vertex handles in move-roof mode
      if (activeSubTool === "move-roof" && isSelected) {
        pts.forEach((p) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
          ctx.fillStyle = "white";
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
      const pts = (dragPreviewPoints?.id === pf.id) ? dragPreviewPoints.points : pf.points;
      const isSelected = pf.id === selectedPanelFieldId;
      drawPanelGrid(ctx, pts, "vertical", isSelected);

      // Vertex handles in panel select mode
      if (activeSubTool === "move-panels" && isSelected) {
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
        const centroid = polygonCentroid(sel.points);
        drawHeightDragOverlay(
          ctx, sel.points, centroid, heightDragCurrent,
          roofData?.inclination ?? 0, roofData?.direction ?? 0,
        );
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
  }, [drawnRoofs, drawnPanelFields, drawingPoints, mousePos, selectedRoofId, selectedPanelFieldId, activeTool, activeSubTool, roofs, isDraggingHeight, dragPreviewPoints, heightDragCentroid, heightDragCurrent, obstacles, selectedObstacleId]);

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

    if (activeTool === "roof") {
      // Select mode: click to select, no drawing
      if (activeSubTool === "move-roof") {
        const target = drawnRoofs.find((r) => isPointInPolygon(pt, r.points));
        if (target) onSelectRoof(target.id);
        return;
      }
      // Roof height: click to select
      if (activeSubTool === "roof-height") {
        const target = drawnRoofs.find((r) => isPointInPolygon(pt, r.points));
        if (target) onSelectRoof(target.id);
        return;
      }
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

    if (activeTool === "panel-field") {
      if (drawnRoofs.length === 0) return;

      // Panel select mode: click to select a panel field, no drawing
      if (activeSubTool === "move-panels") {
        const target = drawnPanelFields.find((p) => isPointInPolygon(pt, p.points));
        onSelectPanelField(target?.id ?? null);
        return;
      }

      // Find which roof this click is inside
      const targetRoof = drawingPoints.length > 0
        ? drawnRoofs.find((r) => r.id === selectedRoofId)
        : drawnRoofs.find((r) => isPointInPolygon(pt, r.points));

      if (!targetRoof) return;
      onSelectRoof(targetRoof.id);

      if (drawingPoints.length >= 3) {
        const first = drawingPoints[0];
        if (Math.hypot(pt.x - first.x, pt.y - first.y) < 15) {
          finishPanelField(drawingPoints, targetRoof.id);
          return;
        }
      }
      setDrawingPoints((prev) => [...prev, pt]);
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

    if (activeTool === "panel-field" && drawingPoints.length >= 3) {
      const targetRoof = drawnRoofs.find((r) => r.id === selectedRoofId)
        ?? drawnRoofs.find((r) => isPointInPolygon(pt, r.points));
      if (targetRoof) finishPanelField(drawingPoints, targetRoof.id);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pt = getRelativePoint(e);

    // Handle roof/panel drag (move or reshape)
    if ((activeSubTool === "move-roof" || activeSubTool === "move-panels") && dragState) {
      const dx = pt.x - dragState.startMouse.x;
      const dy = pt.y - dragState.startMouse.y;
      let newPoints: Point[];
      if (dragState.type === "move") {
        newPoints = dragState.startPoints.map((p) => ({ x: p.x + dx, y: p.y + dy }));
      } else {
        newPoints = dragState.startPoints.map((p, i) =>
          i === dragState.vertexIndex ? { x: p.x + dx, y: p.y + dy } : p
        );
      }
      setDragPreviewPoints({ id: dragState.roofId, points: newPoints });
      return;
    }

    // Cursor feedback in panel select mode (no drag active)
    if (activeSubTool === "move-panels") {
      const sel = drawnPanelFields.find((p) => p.id === selectedPanelFieldId);
      if (sel) {
        const nearVertex = sel.points.some((p) => Math.hypot(p.x - pt.x, p.y - pt.y) < VERTEX_HIT_RADIUS);
        if (nearVertex) { setCursorStyle("cursor-crosshair"); return; }
        if (isPointInPolygon(pt, sel.points)) { setCursorStyle("cursor-move"); return; }
      }
      const anyPanel = drawnPanelFields.some((p) => isPointInPolygon(pt, p.points));
      setCursorStyle(anyPanel ? "cursor-pointer" : "cursor-default");
      return;
    }

    // Cursor feedback in move-roof mode (no drag active)
    if (activeSubTool === "move-roof") {
      const sel = drawnRoofs.find((r) => r.id === selectedRoofId);
      if (sel) {
        const nearVertex = sel.points.some((p) => Math.hypot(p.x - pt.x, p.y - pt.y) < VERTEX_HIT_RADIUS);
        if (nearVertex) { setCursorStyle("cursor-crosshair"); return; }
        if (isPointInPolygon(pt, sel.points)) { setCursorStyle("cursor-move"); return; }
      }
      // Check unselected roofs
      const anyRoof = drawnRoofs.some((r) => isPointInPolygon(pt, r.points));
      setCursorStyle(anyRoof ? "cursor-pointer" : "cursor-default");
      return;
    }

    if (activeSubTool === "move-panels") return;

    // Height drag: update current mouse and fire inclination/direction callback
    if (activeSubTool === "roof-height" && isDraggingHeight && heightDragCentroid && selectedRoofId) {
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
    if (activeSubTool === "move-roof" || activeSubTool === "move-panels") setCursorStyle("cursor-default");
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
    if (activeSubTool === "move-roof" || activeSubTool === "move-panels") setCursorStyle("cursor-default");
    else if (activeSubTool === "shading-analysis") setCursorStyle(shadingSelectorActive ? "cursor-crosshair" : "cursor-default");
    else setCursorStyle("cursor-crosshair");
    setDragState(null);
    setDragPreviewPoints(null);
  }, [activeSubTool, shadingSelectorActive]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const pt = getRelativePoint(e);

    if (activeSubTool === "move-roof") {
      // Check vertex first (reshape), then polygon body (move)
      const sel = drawnRoofs.find((r) => r.id === selectedRoofId);
      if (sel) {
        const vi = sel.points.findIndex((p) => Math.hypot(p.x - pt.x, p.y - pt.y) < VERTEX_HIT_RADIUS);
        if (vi !== -1) {
          setDragState({ type: "vertex", kind: "roof", roofId: sel.id, vertexIndex: vi, startMouse: pt, startPoints: sel.points });
          return;
        }
        if (isPointInPolygon(pt, sel.points)) {
          setDragState({ type: "move", kind: "roof", roofId: sel.id, startMouse: pt, startPoints: sel.points });
          return;
        }
      }
      return;
    }

    if (activeSubTool === "move-panels") {
      const sel = drawnPanelFields.find((p) => p.id === selectedPanelFieldId);
      if (sel) {
        const vi = sel.points.findIndex((p) => Math.hypot(p.x - pt.x, p.y - pt.y) < VERTEX_HIT_RADIUS);
        if (vi !== -1) {
          setDragState({ type: "vertex", kind: "panel", roofId: sel.id, vertexIndex: vi, startMouse: pt, startPoints: sel.points });
          return;
        }
        if (isPointInPolygon(pt, sel.points)) {
          setDragState({ type: "move", kind: "panel", roofId: sel.id, startMouse: pt, startPoints: sel.points });
          return;
        }
      }
      return;
    }

    if (activeSubTool !== "roof-height" || !selectedRoofId) return;
    const sel = drawnRoofs.find((r) => r.id === selectedRoofId);
    if (sel && isPointInPolygon(pt, sel.points)) {
      const centroid = polygonCentroid(sel.points);
      setHeightDragCentroid(centroid);
      setHeightDragCurrent(pt);
      setIsDraggingHeight(true);
      setHasAdjustedHeight(true);
      onHeightAdjusting(true);
    }
  };

  const handleMouseUp = () => {
    if (dragState && dragPreviewPoints) {
      if (dragState.kind === "panel") onUpdatePanelFieldPoints(dragPreviewPoints.id, dragPreviewPoints.points);
      else onUpdateRoofPoints(dragPreviewPoints.id, dragPreviewPoints.points);
    }
    setDragState(null);
    setDragPreviewPoints(null);
    setIsDraggingHeight(false);
    setHeightDragCurrent(null);
    setHeightDragCentroid(null);
  };

  // Hint text
  let hint = "";
  if (activeTool === "roof" && activeSubTool === "obstacle") {
    if (drawnRoofs.length === 0) hint = "Draw a roof first, then add obstacles inside it";
    else if (drawingPoints.length === 0) hint = "Click inside a roof surface to start drawing an obstacle";
    else if (drawingPoints.length < 3) hint = `${drawingPoints.length} point${drawingPoints.length > 1 ? "s" : ""} — keep clicking to add corners`;
    else hint = "Double-click or click first point to close the obstacle";
  } else if (activeTool === "roof") {
    if (drawingPoints.length === 0) hint = "Click to start drawing a roof outline · Double-click a roof to fill with panels";
    else if (drawingPoints.length < 3) hint = `${drawingPoints.length} point${drawingPoints.length > 1 ? "s" : ""} — keep clicking to add corners`;
    else hint = "Double-click or click first point to close the shape";
  } else if (activeTool === "panel-field") {
    if (drawnRoofs.length === 0) hint = "";
    else if (drawingPoints.length === 0) hint = "Click inside a roof to start drawing a panel field";
    else if (drawingPoints.length < 3) hint = `${drawingPoints.length} point${drawingPoints.length > 1 ? "s" : ""} — keep clicking`;
    else hint = "Double-click or click first point to close the panel field";
  }

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

      {/* Zoom controls */}
      <div className="absolute right-4 flex flex-col gap-1 z-10" style={{ top: 80 }}>
        <button className="w-8 h-8 bg-white shadow-md rounded flex items-center justify-center text-[#263238] hover:bg-gray-50 text-lg leading-none">+</button>
        <button className="w-8 h-8 bg-white shadow-md rounded flex items-center justify-center text-[#263238] hover:bg-gray-50 text-lg leading-none">−</button>
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

      {/* Hint pill */}
      {hint && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 bg-[rgba(21,27,30,0.88)] text-white text-[12px] font-['Figtree',sans-serif] px-4 py-2 rounded-full shadow-lg pointer-events-none whitespace-nowrap">
          {hint}
        </div>
      )}

    </div>
  );
}

