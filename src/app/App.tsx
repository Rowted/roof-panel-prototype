import { useState, useRef, useEffect } from "react";
import { TopNav } from "./components/TopNav";
import { Sidebar, RoofData, PanelFieldData, DEFAULT_MARGINS } from "./components/Sidebar";
import { MapCanvas, DrawnRoof, DrawnPanelField, ObstacleData } from "./components/MapCanvas";
import { ToolDock } from "./components/ToolDock";
import { ContextBar } from "./components/ContextBar";
import { FileUploadModal } from "./components/FileUploadModal";
import { Import3DOverlay } from "./components/Import3DOverlay";
import { SunPathView } from "./components/SunPathView";

export default function App() {
  const [mode, setMode] = useState<"basic" | "pro">("pro");
  const [activeTool, setActiveTool] = useState<"roof" | "panel-field">("roof");
  const [activeSubTool, setActiveSubTool] = useState("draw-roof");

  const [roofs, setRoofs] = useState<RoofData[]>([]);
  const [drawnRoofs, setDrawnRoofs] = useState<DrawnRoof[]>([]);
  const [selectedRoofId, setSelectedRoofId] = useState<string | null>(null);
  // Additional roofs selected via Shift (beyond the primary selectedRoofId)
  const [multiRoofIds, setMultiRoofIds] = useState<string[]>([]);

  const allSelectedRoofIds = Array.from(new Set([selectedRoofId, ...multiRoofIds].filter(Boolean) as string[]));

  // Plain select: set primary, clear the multi-selection
  const handleSelectRoof = (id: string) => {
    setSelectedRoofId(id || null);
    setMultiRoofIds([]);
    if (activeTool === "panel-field") {
      const pf = panelFields.find((p) => p.roofId === id);
      setSelectedPanelFieldId(pf?.id ?? null);
    }
  };

  // Shift select: toggle a roof in/out of the selection
  const handleShiftSelectRoof = (id: string) => {
    if (!selectedRoofId) { setSelectedRoofId(id); return; }
    if (id === selectedRoofId) return;
    setMultiRoofIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleDuplicateSelectedRoofs = () => {
    allSelectedRoofIds.forEach((id) => handleDuplicateRoof(id));
  };

  const handleDeleteSelectedRoofs = () => {
    allSelectedRoofIds.forEach((id) => handleDeleteRoof(id));
    setMultiRoofIds([]);
  };

  const [panelFields, setPanelFields] = useState<PanelFieldData[]>([]);
  const panelFieldCounterRef = useRef(0);
  const [drawnPanelFields, setDrawnPanelFields] = useState<DrawnPanelField[]>([]);
  const [selectedPanelFieldId, setSelectedPanelFieldId] = useState<string | null>(null);
  const [drawingMeasure, setDrawingMeasure] = useState<number | null>(null);
  const [isAdjustingHeight, setIsAdjustingHeight] = useState(false);

  const [obstacles, setObstacles] = useState<ObstacleData[]>([]);
  const [selectedObstacleId, setSelectedObstacleId] = useState<string | null>(null);

  const [sunPathOpen, setSunPathOpen] = useState(false);

  const [shadingDisplay, setShadingDisplay] = useState(true);
  const [shadingSelectorActive, setShadingSelectorActive] = useState(false);
  const [shadingValue, setShadingValue] = useState<number | null>(null);

  // Reset the shading selector when leaving the shading tool
  useEffect(() => {
    if (activeSubTool !== "shading-analysis") {
      setShadingSelectorActive(false);
      setShadingValue(null);
    }
  }, [activeSubTool]);

  const handleRoofDrawn = (roofData: RoofData, points: { x: number; y: number }[]) => {
    setRoofs((prev) => [...prev, roofData]);
    setDrawnRoofs((prev) => [...prev, { id: roofData.id, points }]);
    setSelectedRoofId(roofData.id);
  };

  const handleUpdateRoof = (id: string, updates: Partial<RoofData>) => {
    setRoofs((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const handlePanelFieldDrawn = (pf: PanelFieldData, points: { x: number; y: number }[]) => {
    panelFieldCounterRef.current += 1;
    const named = { ...pf, name: `Panel ${String.fromCharCode(64 + panelFieldCounterRef.current)}` };
    setPanelFields((prev) => [...prev, named]);
    setDrawnPanelFields((prev) => [...prev, { id: pf.id, roofId: pf.roofId, points }]);
    setSelectedPanelFieldId(pf.id);
    setSelectedRoofId(pf.roofId);
    setActiveTool("panel-field");
    setActiveSubTool("draw-panel");
  };

  const handleFillRoofWithPanels = (roofId: string) => {
    const drawnRoof = drawnRoofs.find((r) => r.id === roofId);
    if (!drawnRoof) return;

    // Check if panel field already exists for this roof
    if (panelFields.some((pf) => pf.roofId === roofId)) return;

    const points = drawnRoof.points;
    const panelCount = countPanels(points);
    panelFieldCounterRef.current += 1;
    const pf: PanelFieldData = {
      id: `pf-${Date.now()}`,
      roofId,
      name: `Panel ${String.fromCharCode(64 + panelFieldCounterRef.current)}`,
      panelCount,
      pvPanel: "JA Solar JAM6-60-260/SI",
      mountingSystem: "Standard pitched roof tile",
      placement: "vertical",
      rotation: 83,
      inclination: 40,
      spacingRow: 20,
      spacingCol: 20,
      offset: 0,
    };
    setPanelFields((prev) => [...prev, pf]);
    setDrawnPanelFields((prev) => [...prev, { id: pf.id, roofId, points }]);
    setSelectedPanelFieldId(pf.id);
    setSelectedRoofId(roofId);
    setActiveTool("panel-field");
    setActiveSubTool("draw-panel");
  };

  const handleUpdatePanelField = (id: string, updates: Partial<PanelFieldData>) => {
    setPanelFields((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const handleUpdateRoofPoints = (id: string, points: { x: number; y: number }[]) => {
    setDrawnRoofs((prev) => prev.map((r) => (r.id === id ? { ...r, points } : r)));
  };

  const handleObstacleDrawn = (obstacle: ObstacleData) => {
    setObstacles((prev) => [...prev, obstacle]);
    setSelectedObstacleId(obstacle.id);
  };

  const handleUpdateObstacle = (id: string, updates: Partial<ObstacleData>) => {
    setObstacles((prev) => prev.map((o) => (o.id === id ? { ...o, ...updates } : o)));
  };

  const handleDeleteObstacle = (id: string) => {
    setObstacles((prev) => prev.filter((o) => o.id !== id));
    if (selectedObstacleId === id) setSelectedObstacleId(null);
  };

  const handleUpdateRoofHeightDrag = (id: string, inclination: number, direction: number) => {
    setRoofs((prev) => prev.map((r) => (r.id === id ? { ...r, inclination, direction } : r)));
  };

  const handleDuplicateRoof = (roofId: string) => {
    const roof = roofs.find((r) => r.id === roofId);
    const drawn = drawnRoofs.find((r) => r.id === roofId);
    if (!roof || !drawn) return;
    const newId = `roof-${Date.now()}`;
    const offset = 20;
    const newPoints = drawn.points.map((p) => ({ x: p.x + offset, y: p.y + offset }));
    setRoofs((prev) => [...prev, { ...roof, id: newId, name: `${roof.name} copy` }]);
    setDrawnRoofs((prev) => [...prev, { id: newId, points: newPoints }]);
    setSelectedRoofId(newId);
  };

  const handleDeleteRoof = (roofId: string) => {
    setRoofs((prev) => prev.filter((r) => r.id !== roofId));
    setDrawnRoofs((prev) => prev.filter((r) => r.id !== roofId));
    // Also delete associated panel fields
    const pfIds = panelFields.filter((p) => p.roofId === roofId).map((p) => p.id);
    setPanelFields((prev) => prev.filter((p) => p.roofId !== roofId));
    setDrawnPanelFields((prev) => prev.filter((p) => p.roofId !== roofId));
    if (selectedRoofId === roofId) setSelectedRoofId(null);
    if (pfIds.includes(selectedPanelFieldId ?? "")) setSelectedPanelFieldId(null);
  };

  const handleDeletePanelField = (pfId: string) => {
    setPanelFields((prev) => prev.filter((p) => p.id !== pfId));
    setDrawnPanelFields((prev) => prev.filter((p) => p.id !== pfId));
    if (selectedPanelFieldId === pfId) setSelectedPanelFieldId(null);
  };

  const handleUpdatePanelFieldPoints = (id: string, points: { x: number; y: number }[]) => {
    setDrawnPanelFields((prev) => prev.map((p) => (p.id === id ? { ...p, points } : p)));
  };

  const handleDuplicatePanelField = (pfId: string) => {
    const pf = panelFields.find((p) => p.id === pfId);
    const drawn = drawnPanelFields.find((p) => p.id === pfId);
    if (!pf || !drawn) return;
    panelFieldCounterRef.current += 1;
    const newId = `pf-${Date.now()}`;
    const offset = 20;
    const newPoints = drawn.points.map((p) => ({ x: p.x + offset, y: p.y + offset }));
    setPanelFields((prev) => [...prev, { ...pf, id: newId, name: `Panel ${String.fromCharCode(64 + panelFieldCounterRef.current)}` }]);
    setDrawnPanelFields((prev) => [...prev, { id: newId, roofId: pf.roofId, points: newPoints }]);
    setSelectedPanelFieldId(newId);
  };

  const handleResetGeometry = () => {
    setRoofs([]);
    setDrawnRoofs([]);
    setPanelFields([]);
    setDrawnPanelFields([]);
    setObstacles([]);
    setSelectedRoofId(null);
    setMultiRoofIds([]);
    setSelectedPanelFieldId(null);
    setSelectedObstacleId(null);
  };

  const totalPanels = panelFields.reduce((sum, p) => sum + p.panelCount, 0);
  const totalKwp = totalPanels * 0.26;

  return (
    <div className="flex flex-col size-full overflow-hidden">
      <TopNav
        mode={mode}
        onModeChange={setMode}
        onFileUpload={() => setActiveSubTool("file-upload")}
        onImport3D={() => setActiveSubTool("import-3d")}
        totalPanels={totalPanels}
        totalKwp={totalKwp}
        sunPathOpen={sunPathOpen}
        onToggleSunPath={() => setSunPathOpen((v) => !v)}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeTool={activeTool}
          onToolChange={(t) => { setActiveTool(t); setActiveSubTool(t === "roof" ? "draw-roof" : "draw-panel"); }}
          roofs={roofs}
          selectedRoofId={selectedRoofId}
          onSelectRoof={setSelectedRoofId}
          onUpdateRoof={handleUpdateRoof}
          panelFields={panelFields}
          selectedPanelFieldId={selectedPanelFieldId}
          onSelectPanelField={setSelectedPanelFieldId}
          onUpdatePanelField={handleUpdatePanelField}
          onFillRoofWithPanels={handleFillRoofWithPanels}
          onDeleteRoof={handleDeleteRoof}
          onDeletePanelField={handleDeletePanelField}
        />
        <div className="relative flex-1 overflow-hidden">
          <MapCanvas
            activeTool={activeTool}
            activeSubTool={activeSubTool}
            drawnRoofs={drawnRoofs}
            roofs={roofs}
            drawnPanelFields={drawnPanelFields}
            selectedRoofId={selectedRoofId}
            selectedPanelFieldId={selectedPanelFieldId}
            onSelectRoof={handleSelectRoof}
            multiRoofIds={multiRoofIds}
            onShiftSelectRoof={handleShiftSelectRoof}
            onRoofDrawn={handleRoofDrawn}
            onPanelFieldDrawn={handlePanelFieldDrawn}
            onFillRoofWithPanels={handleFillRoofWithPanels}
            onDeleteRoof={handleDeleteRoof}
            onDuplicateRoof={handleDuplicateRoof}
            onUpdateRoofPoints={handleUpdateRoofPoints}
            obstacles={obstacles}
            selectedObstacleId={selectedObstacleId}
            onObstacleDrawn={handleObstacleDrawn}
            onSelectObstacle={setSelectedObstacleId}
            onSelectPanelField={setSelectedPanelFieldId}
            onUpdatePanelFieldPoints={handleUpdatePanelFieldPoints}
            shadingSelectorActive={shadingSelectorActive}
            onShadingPick={setShadingValue}
            onResetGeometry={handleResetGeometry}
            onUpdateRoofHeightDrag={handleUpdateRoofHeightDrag}
            onDrawingMeasure={setDrawingMeasure}
            onHeightAdjusting={setIsAdjustingHeight}
          />
          <ContextBar
            activeSubTool={activeSubTool}
            drawingMeasure={drawingMeasure}
            isAdjustingHeight={isAdjustingHeight}
            selectedRoofId={selectedRoofId}
            margins={roofs.find((r) => r.id === selectedRoofId)?.margins ?? null}
            onUpdateMargins={(m) => {
              if (!selectedRoofId) return;
              const cur = roofs.find((r) => r.id === selectedRoofId)?.margins;
              if (cur) handleUpdateRoof(selectedRoofId, { margins: { ...cur, ...m } });
            }}
            roofHeight={(() => {
              const r = roofs.find((r) => r.id === selectedRoofId);
              return r ? { ridgeHeight: r.ridgeHeight, eaveHeight: r.eaveHeight } : null;
            })()}
            onUpdateRoofHeight={(h) => {
              if (selectedRoofId) handleUpdateRoof(selectedRoofId, h);
            }}
            onDuplicateRoof={handleDuplicateSelectedRoofs}
            onDeleteRoof={handleDeleteSelectedRoofs}
            selectedRoofCount={allSelectedRoofIds.length}
            selectedObstacle={obstacles.find((o) => o.id === selectedObstacleId) ?? null}
            onUpdateObstacle={(u) => selectedObstacleId && handleUpdateObstacle(selectedObstacleId, u)}
            onDeleteObstacle={() => selectedObstacleId && handleDeleteObstacle(selectedObstacleId)}
            hasSelectedPanelField={!!selectedPanelFieldId}
            onDuplicatePanelField={() => selectedPanelFieldId && handleDuplicatePanelField(selectedPanelFieldId)}
            onDeletePanelField={() => selectedPanelFieldId && handleDeletePanelField(selectedPanelFieldId)}
            shadingDisplay={shadingDisplay}
            onToggleShadingDisplay={() => setShadingDisplay((v) => !v)}
            shadingSelectorActive={shadingSelectorActive}
            onToggleShadingSelector={() => setShadingSelectorActive((v) => !v)}
            shadingValue={shadingValue}
          />
          <ToolDock
            activeTool={activeTool}
            activeSubTool={activeSubTool}
            onSubToolChange={setActiveSubTool}
            onToolChange={(t) => { setActiveTool(t); setActiveSubTool(t === "roof" ? "draw-roof" : "draw-panel"); }}
            hasRoof={roofs.length > 0}
            hasPanelField={panelFields.length > 0}
          />
          {activeSubTool === "file-upload" && (
            <FileUploadModal onClose={() => setActiveSubTool(activeTool === "roof" ? "draw-roof" : "draw-panel")} />
          )}
          {activeSubTool === "import-3d" && (
            <Import3DOverlay onClose={() => setActiveSubTool(activeTool === "roof" ? "draw-roof" : "draw-panel")} />
          )}
        </div>
      </div>
      {sunPathOpen && <SunPathView onClose={() => setSunPathOpen(false)} />}
    </div>
  );
}

// Mirror of countPanelsInPolygon from MapCanvas (kept in sync)
function countPanels(points: { x: number; y: number }[]): number {
  const pw = 24, ph = 38, gap = 3;
  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));
  let count = 0;
  for (let y = minY; y + ph <= maxY; y += ph + gap) {
    for (let x = minX; x + pw <= maxX; x += pw + gap) {
      const cx = x + pw / 2, cy = y + ph / 2;
      let inside = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const xi = points[i].x, yi = points[i].y;
        const xj = points[j].x, yj = points[j].y;
        if (((yi > cy) !== (yj > cy)) && (cx < (xj - xi) * (cy - yi) / (yj - yi) + xi)) inside = !inside;
      }
      if (inside) count++;
    }
  }
  return count;
}
