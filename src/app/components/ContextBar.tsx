import { useState, useEffect, useRef } from "react";
import { RoofMargins } from "./Sidebar";
import { ObstacleData } from "./MapCanvas";

interface RoofHeightData {
  ridgeHeight: number;
  eaveHeight: number;
}

interface ContextBarProps {
  mode: "basic" | "pro";
  activeSubTool: string;
  drawingMeasure: number | null;
  customLength: number | null;
  onSetCustomLength: (v: number | null) => void;
  isAdjustingHeight: boolean;
  selectedRoofId: string | null;
  margins: RoofMargins | null;
  onUpdateMargins: (m: Partial<RoofMargins>) => void;
  roofHeight: RoofHeightData | null;
  onUpdateRoofHeight: (h: Partial<RoofHeightData>) => void;
  onDuplicateRoof: () => void;
  onDeleteRoof: () => void;
  selectedObstacle: ObstacleData | null;
  onUpdateObstacle: (u: Partial<ObstacleData>) => void;
  onDeleteObstacle: () => void;
  hasSelectedPanelField: boolean;
  onDuplicatePanelField: () => void;
  onDeletePanelField: () => void;
  shadingDisplay: boolean;
  onToggleShadingDisplay: () => void;
  shadingSelectorActive: boolean;
  onToggleShadingSelector: () => void;
  shadingValue: number | null;
  selectedRoofCount: number;
}

const CONTEXT_TOOLS = ["draw-roof", "draw-panel", "safety-margins", "roof-height", "obstacle", "shading-analysis"];

export function ContextBar({ mode, activeSubTool, drawingMeasure, customLength, onSetCustomLength, isAdjustingHeight, selectedRoofId, margins, onUpdateMargins, roofHeight, onUpdateRoofHeight, onDuplicateRoof, onDeleteRoof, selectedObstacle, onUpdateObstacle, onDeleteObstacle, hasSelectedPanelField, onDuplicatePanelField, onDeletePanelField, shadingDisplay, onToggleShadingDisplay, shadingSelectorActive, onToggleShadingSelector, shadingValue, selectedRoofCount }: ContextBarProps) {
  const isDrawing = (activeSubTool === "draw-roof" || activeSubTool === "draw-panel" || activeSubTool === "obstacle") && drawingMeasure !== null;
  if (!CONTEXT_TOOLS.includes(activeSubTool) && !isDrawing) return null;

  const hasSelection = !!selectedRoofId;

  return (
    <div className="absolute bottom-[94px] left-1/2 -translate-x-1/2 z-30 pointer-events-none">
      <div
        key={activeSubTool + (hasSelection ? "-active" : "-idle") + (isAdjustingHeight ? "-adj" : "")}
        className="pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-150"
      >
        {isDrawing && <MeasureDisplay mm={drawingMeasure!} customLength={customLength} onSetCustomLength={onSetCustomLength} />}
        {!isDrawing && activeSubTool === "draw-roof" && (
          selectedRoofCount > 0
            ? (mode === "basic"
                ? <BasicRoofActions margins={margins} onUpdateMargins={onUpdateMargins} onDuplicate={onDuplicateRoof} onDelete={onDeleteRoof} />
                : <RoofEditActions count={selectedRoofCount} onDuplicate={onDuplicateRoof} onDelete={onDeleteRoof} />)
            : <Prompt text="Click on the map to start drawing a roof" />
        )}
        {!isDrawing && activeSubTool === "safety-margins" && (
          hasSelection && margins
            ? <MarginsControls margins={margins} onUpdate={onUpdateMargins} />
            : <Prompt text="Click a roof surface to adjust its safety margins" />
        )}
        {!isDrawing && activeSubTool === "roof-height" && !hasSelection && (
          <Prompt text="Click a roof surface to adjust its height" />
        )}
        {!isDrawing && activeSubTool === "roof-height" && hasSelection && !isAdjustingHeight && (
          <HeightIdleActions count={selectedRoofCount} onDelete={onDeleteRoof} />
        )}
        {!isDrawing && activeSubTool === "roof-height" && hasSelection && isAdjustingHeight && roofHeight && (
          <HeightAdjustingControls height={roofHeight} onUpdate={onUpdateRoofHeight} />
        )}
        {!isDrawing && activeSubTool === "obstacle" && (
          selectedObstacle
            ? <ObstacleControls obstacle={selectedObstacle} onUpdate={onUpdateObstacle} onDelete={onDeleteObstacle} />
            : <Prompt text="Click inside a roof surface to draw an obstacle" />
        )}
        {!isDrawing && activeSubTool === "draw-panel" && (
          hasSelectedPanelField
            ? <PanelSelectActions onDuplicate={onDuplicatePanelField} onDelete={onDeletePanelField} />
            : <Prompt text="Double-click a roof to fill it with panels, or draw a panel field inside it" />
        )}
        {!isDrawing && activeSubTool === "shading-analysis" && (
          <ShadingControls
            display={shadingDisplay}
            onToggleDisplay={onToggleShadingDisplay}
            selectorActive={shadingSelectorActive}
            onToggleSelector={onToggleShadingSelector}
            value={shadingValue}
          />
        )}
      </div>
    </div>
  );
}

// Lighter container that matches the active tool's tint so contextual
// actions read as "belonging" to the selected tool.
const TOOLBAR = "flex items-center gap-2 bg-[rgba(56,62,66,0.97)] border border-white/20 rounded-xl px-4 py-2.5 shadow-xl backdrop-blur-sm";

function HeightIdleActions({ count, onDelete }: { count: number; onDelete: () => void }) {
  return (
    <div className={TOOLBAR}>
      <span className="text-white/75 text-[12px] font-['Figtree',sans-serif] pr-1">
        {count} roof{count > 1 ? "s" : ""} selected
      </span>
      <div className="w-px h-5 bg-white/25" />
      <BarBtn title="Flatten everything" light>
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path d="M1 6.5H12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M3 4L6.5 1L10 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3 9L6.5 12L10 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Flatten everything
      </BarBtn>
      <div className="w-px h-5 bg-white/25" />
      <DeleteButton onClick={onDelete} light />
      <div className="w-px h-5 bg-white/25" />
      <ShiftHint light />
    </div>
  );
}

function HeightAdjustingControls({ height, onUpdate }: {
  height: RoofHeightData;
  onUpdate: (h: Partial<RoofHeightData>) => void;
}) {
  return (
    <div className={TOOLBAR}>
      {/* Ridge height */}
      <HeightAdjInput label="Ridge" value={height.ridgeHeight} color="#ef4444" arrowUp onChange={(v) => onUpdate({ ridgeHeight: v })} />
      <div className="w-px h-5 bg-white/25" />
      {/* Eave height */}
      <HeightAdjInput label="Eave" value={height.eaveHeight} color="#f59e0b" arrowUp={false} onChange={(v) => onUpdate({ eaveHeight: v })} />
      <div className="w-px h-5 bg-white/25" />
      {/* Split selected edges */}
      <BarBtn title="Split selected edges" light>
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path d="M1 6.5H5M8 6.5H12M6.5 1V5M6.5 8V12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        Split edges
      </BarBtn>
      <div className="w-px h-5 bg-white/25" />
      {/* Equalize */}
      <BarBtn title="Equalize all heights" light>
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path d="M1 4.5H12M1 8.5H12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M4 1.5L6.5 4.5L9 1.5M4 11.5L6.5 8.5L9 11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Equalize all heights
      </BarBtn>
    </div>
  );
}

function HeightAdjInput({ label, value, color, arrowUp, onChange }: {
  label: string; value: number; color: string; arrowUp: boolean; onChange: (v: number) => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="flex items-center gap-1.5">
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
        {arrowUp
          ? <path d="M6.5 11V2M6.5 2L3 5.5M6.5 2L10 5.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          : <path d="M6.5 2V11M6.5 11L3 7.5M6.5 11L10 7.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        }
      </svg>
      <input
        type="number"
        value={value ?? 0}
        onChange={(e) => onChange(Number(e.target.value))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-16 h-7 bg-transparent border rounded px-2 text-white text-[12px] font-['Figtree',sans-serif] outline-none text-center transition-colors"
        style={{ borderColor: focused ? color : "rgba(255,255,255,0.2)" }}
      />
      <span className="text-white/40 text-[11px] font-['Figtree',sans-serif]">mm</span>
    </div>
  );
}

function BackspaceIcon() {
  return (
    <svg width="15" height="13" viewBox="0 0 16 14" fill="none">
      <path d="M5.5 1.5H14a1 1 0 011 1v9a1 1 0 01-1 1H5.5L1 7L5.5 1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M8 5L11.5 9M11.5 5L8 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function useBackspaceHeld() {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    const isDel = (k: string) => k === "Backspace" || k === "Delete";
    const onDown = (e: KeyboardEvent) => { if (isDel(e.key)) setHeld(true); };
    const onUp = (e: KeyboardEvent) => { if (isDel(e.key)) setHeld(false); };
    const onBlur = () => setHeld(false);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);
  return held;
}

function DeleteButton({ onClick, label = "Delete", light }: { onClick: () => void; label?: string | null; light?: boolean }) {
  const held = useBackspaceHeld();
  return (
    <button
      onClick={onClick}
      title="Delete (Backspace)"
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-['Figtree',sans-serif] text-[12px] font-medium ${
        held ? "bg-red-400/15 text-red-400" : `${light ? "text-white/70" : "text-white/40"} hover:text-red-400 hover:bg-red-400/10`
      }`}
    >
      <BackspaceIcon />
      {label && <span>{label}</span>}
    </button>
  );
}

function BarBtn({ title, onClick, danger, light, children }: {
  title: string; onClick?: () => void; danger?: boolean; light?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors font-['Figtree',sans-serif] text-[12px] font-medium ${
        danger
          ? "text-white/40 hover:text-red-400 hover:bg-red-400/10"
          : `${light ? "text-white/80" : "text-white/50"} hover:text-white hover:bg-white/10`
      }`}
    >
      {children}
    </button>
  );
}

function RoofEditActions({ count, onDuplicate, onDelete }: { count: number; onDuplicate: () => void; onDelete: () => void }) {
  return (
    <div className={TOOLBAR}>
      <span className="text-white/75 text-[12px] font-['Figtree',sans-serif] pr-1">
        {count} roof{count > 1 ? "s" : ""} selected
      </span>
      <div className="w-px h-5 bg-white/25" />
      <button
        onClick={onDuplicate}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/15 border border-white/20 text-white/80 hover:text-white hover:bg-white/25 transition-all font-['Figtree',sans-serif] text-[12px] font-medium"
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <rect x="1" y="4" width="8" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
          <path d="M4 3.5V2.5a1 1 0 011-1H10.5a1 1 0 011 1V8a1 1 0 01-1 1H10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        Duplicate
      </button>
      <div className="w-px h-5 bg-white/25" />
      <DeleteButton onClick={onDelete} light />
      <div className="w-px h-5 bg-white/25" />
      <ShiftHint light />
    </div>
  );
}

function BasicRoofActions({ margins, onUpdateMargins, onDuplicate, onDelete }: {
  margins: RoofMargins | null;
  onUpdateMargins: (m: Partial<RoofMargins>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const value = margins?.top ?? 0;
  return (
    <div className={TOOLBAR}>
      {/* Single uniform margin */}
      <div className="flex items-center gap-2">
        <span className="text-white/75 text-[12px] font-['Figtree',sans-serif]">Margin</span>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={value}
            onChange={(e) => {
              const v = Number(e.target.value);
              onUpdateMargins({ same: true, top: v, right: v, bottom: v, left: v, ridge: v });
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="w-16 h-7 bg-transparent border rounded px-2 text-white text-[12px] font-['Figtree',sans-serif] outline-none text-center transition-colors"
            style={{ borderColor: focused ? "#0068DE" : "rgba(255,255,255,0.3)" }}
          />
          <span className="text-white/50 text-[11px] font-['Figtree',sans-serif]">mm</span>
        </div>
      </div>

      <div className="w-px h-5 bg-white/25" />

      <button
        onClick={onDuplicate}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/15 border border-white/20 text-white/80 hover:text-white hover:bg-white/25 transition-all font-['Figtree',sans-serif] text-[12px] font-medium"
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <rect x="1" y="4" width="8" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
          <path d="M4 3.5V2.5a1 1 0 011-1H10.5a1 1 0 011 1V8a1 1 0 01-1 1H10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        Duplicate
      </button>

      <div className="w-px h-5 bg-white/25" />

      <DeleteButton onClick={onDelete} light />

      <div className="w-px h-5 bg-white/25" />

      <ShiftHint light />
    </div>
  );
}

function ShiftHint({ light }: { light?: boolean }) {
  const [down, setDown] = useState(false);
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => { if (e.key === "Shift") setDown(true); };
    const onUp = (e: KeyboardEvent) => { if (e.key === "Shift") setDown(false); };
    const onBlur = () => setDown(false);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);
  return (
    <span className={`flex items-center gap-1.5 text-[11px] font-['Figtree',sans-serif] transition-colors ${down ? "text-white/80" : (light ? "text-white/55" : "text-white/35")}`}>
      <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-medium border transition-colors ${
        down
          ? "bg-[#0068DE] border-[#0068DE] text-white"
          : (light ? "bg-white/15 border-white/25 text-white/70" : "bg-white/10 border-white/15 text-white/60")
      }`}>⇧ Shift</kbd>
      multi-select
    </span>
  );
}

function ShiftHintPrompt({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 bg-[rgba(21,27,30,0.92)] border border-white/10 rounded-full pl-5 pr-3 py-2 shadow-xl backdrop-blur-sm">
      <span className="text-white/70 text-[12px] font-['Figtree',sans-serif] whitespace-nowrap">{text}</span>
      <span className="w-px h-4 bg-white/15" />
      <ShiftHint />
    </div>
  );
}

function PanelSelectActions({ onDuplicate, onDelete }: { onDuplicate: () => void; onDelete: () => void }) {
  return (
    <div className={TOOLBAR}>
      {/* Trim selected panel fields */}
      <BarBtn title="Trim selected panel fields" light>
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <circle cx="3" cy="3.5" r="1.8" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="3" cy="9.5" r="1.8" stroke="currentColor" strokeWidth="1.2" />
          <path d="M4.5 4.5L11.5 10.5M4.5 8.5L11.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        Trim
      </BarBtn>
      <div className="w-px h-5 bg-white/25" />
      {/* Duplicate */}
      <BarBtn title="Duplicate selected panel field" onClick={onDuplicate} light>
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <rect x="1" y="4" width="8" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
          <path d="M4 3.5V2.5a1 1 0 011-1H10.5a1 1 0 011 1V8a1 1 0 01-1 1H10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        Duplicate
      </BarBtn>
      <div className="w-px h-5 bg-white/25" />
      <DeleteButton onClick={onDelete} light />
      <div className="w-px h-5 bg-white/25" />
      <ShiftHint light />
    </div>
  );
}

function MeasureDisplay({ mm, customLength, onSetCustomLength }: {
  mm: number;
  customLength: number | null;
  onSetCustomLength: (v: number | null) => void;
}) {
  // draft !== null while the user is typing in the field
  const [draft, setDraft] = useState<string | null>(null);
  const cancelRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const active = customLength !== null;
  const shown = draft !== null ? draft : (active ? customLength : mm).toLocaleString("de-CH");

  const commit = () => {
    if (cancelRef.current) {
      cancelRef.current = false;
      setDraft(null);
      return;
    }
    const v = Number((draft ?? "").replace(/\D/g, ""));
    onSetCustomLength(v > 0 ? v : null);
    setDraft(null);
  };

  return (
    <div className={TOOLBAR}>
      <span className="text-white/75 text-[12px] font-['Figtree',sans-serif] whitespace-nowrap">
        {active ? "Custom length" : "Length"}
      </span>
      {/* One grouped field: icon prefix + value + mm suffix (+ clear when locked) */}
      <div
        onClick={() => inputRef.current?.focus()}
        title="Type a custom length"
        className={`flex items-center gap-1 h-8 pl-2 pr-1.5 rounded-lg border cursor-text transition-colors ${
          active
            ? "border-[#22d3ee]"
            : "border-white/30 hover:border-white/60 focus-within:border-[#22d3ee]"
        }`}
      >
        {/* m↔ prefix icon */}
        <div className={`flex flex-col items-center justify-center leading-none shrink-0 pr-1 ${
          active ? "text-[#22d3ee]" : "text-white/50"
        }`}>
          <span className="text-[8px] font-semibold font-['Figtree',sans-serif]">m</span>
          <span className="text-[8px] -mt-px tracking-tighter">|↔|</span>
        </div>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={shown}
          onFocus={(e) => {
            setDraft(active ? String(customLength) : "");
            requestAnimationFrame(() => e.target.select());
          }}
          onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              e.stopPropagation();
              cancelRef.current = true;
              e.currentTarget.blur();
            }
          }}
          className={`w-16 bg-transparent text-[13px] font-['Figtree',sans-serif] font-semibold text-center tabular-nums outline-none border-none cursor-text ${
            active ? "text-[#22d3ee]" : "text-white"
          }`}
        />
        <span className={`text-[12px] font-['Figtree',sans-serif] ${active ? "text-[#22d3ee]/70" : "text-white/50"}`}>mm</span>
        {active && (
          <button
            onClick={(e) => { e.stopPropagation(); onSetCustomLength(null); }}
            title="Clear custom length"
            className="flex items-center justify-center w-5 h-5 ml-0.5 rounded text-[#22d3ee]/70 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
              <path d="M1 1L8 8M8 1L1 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
      <span className="w-px h-5 bg-white/25" />
      <span className="flex items-center gap-1.5 text-white/55 text-[11px] font-['Figtree',sans-serif] whitespace-nowrap">
        <kbd className="px-1.5 py-0.5 rounded bg-white/15 border border-white/25 text-white/70 text-[10px] font-medium">Esc</kbd>
        to cancel
      </span>
    </div>
  );
}

function ObstacleControls({ obstacle, onUpdate, onDelete }: {
  obstacle: ObstacleData;
  onUpdate: (u: Partial<ObstacleData>) => void;
  onDelete: () => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className={TOOLBAR}>
      {/* Top of the obstacle: parallel to the roof slope vs level like a chimney */}
      <div className="flex items-center gap-1 bg-black/30 rounded-lg p-1 shrink-0">
        <button
          onClick={() => onUpdate({ parallel: true })}
          title="Top follows the roof slope — e.g. a roof window box"
          className={`flex items-center justify-center gap-1.5 h-7 w-[108px] rounded-md text-[12px] font-medium font-['Figtree',sans-serif] transition-colors ${
            obstacle.parallel ? "bg-[#0068DE] text-white shadow-sm" : "text-white/60 hover:text-white hover:bg-white/8"
          }`}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M1 11.5L12 5.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
            <path d="M4.5 9.6V4.9L8.5 2.7V7.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Sloped top
        </button>
        <button
          onClick={() => onUpdate({ parallel: false })}
          title="Top is level — e.g. a chimney"
          className={`flex items-center justify-center gap-1.5 h-7 w-[108px] rounded-md text-[12px] font-medium font-['Figtree',sans-serif] transition-colors ${
            !obstacle.parallel ? "bg-[#0068DE] text-white shadow-sm" : "text-white/60 hover:text-white hover:bg-white/8"
          }`}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M1 11.5L12 5.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
            <path d="M4.5 9.6V3.5H8.5V7.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Flat top
        </button>
      </div>

      <div className="w-px h-5 bg-white/25 shrink-0" />

      {/* Height input */}
      <div className="flex items-center gap-1.5">
        <svg width="14" height="14" viewBox="0 0 13 13" fill="none">
          <path d="M6.5 11V2M6.5 2L3 5.5M6.5 2L10 5.5" stroke="#ef4444" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <input
          type="number"
          value={obstacle.height ?? 0}
          onChange={(e) => onUpdate({ height: Number(e.target.value) })}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-16 h-7 bg-transparent border rounded px-2 text-white text-[12px] font-['Figtree',sans-serif] outline-none text-center transition-colors"
          style={{ borderColor: focused ? "#ef4444" : "rgba(255,255,255,0.3)" }}
        />
        <span className="text-white/50 text-[11px] font-['Figtree',sans-serif]">mm</span>
      </div>

      <div className="w-px h-5 bg-white/25 shrink-0" />

      <DeleteButton onClick={onDelete} label={null} light />
    </div>
  );
}

function ShadingControls({ display, onToggleDisplay, selectorActive, onToggleSelector, value }: {
  display: boolean;
  onToggleDisplay: () => void;
  selectorActive: boolean;
  onToggleSelector: () => void;
  value: number | null;
}) {
  return (
    <div className="w-[300px] bg-[rgba(21,27,30,0.97)] border border-white/10 rounded-xl px-3.5 py-3 shadow-2xl backdrop-blur-sm font-['Figtree',sans-serif]">
      {/* Header + display toggle on one row */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="2.8" stroke="#facc15" strokeWidth="1.2" />
            <path d="M7 1.5V2.5M7 11.5V12.5M1.5 7H2.5M11.5 7H12.5M3.4 3.4L4.1 4.1M9.9 9.9L10.6 10.6M10.6 3.4L9.9 4.1M4.1 9.9L3.4 10.6" stroke="#facc15" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <span className="text-white text-[13px] font-semibold">Shading analysis</span>
        </div>
        <button onClick={onToggleDisplay} className="flex items-center gap-1.5" title="Display shading factor in % (2D view)">
          <div className={`flex items-center justify-center w-4 h-4 rounded border transition-colors shrink-0 ${display ? "bg-[#84cc16] border-[#84cc16]" : "bg-transparent border-white/30"}`}>
            {display && (
              <svg width="10" height="10" viewBox="0 0 11 11" fill="none">
                <path d="M2 5.5L4.5 8L9 3" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <span className="text-white/55 text-[11px]">Show %</span>
        </button>
      </div>

      {/* CTA */}
      <button
        onClick={onToggleSelector}
        className={`flex items-center justify-center gap-2 w-full py-2 rounded-lg text-[13px] font-semibold transition-colors ${
          selectorActive ? "bg-[#7c3aed] text-white" : "bg-[#0068DE] text-white hover:bg-[#0a76f0]"
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9.5 1.5L12.5 4.5L5 12H2V9L9.5 1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M8 3L11 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        {selectorActive ? "Click the roof to read…" : "Pick a shading value"}
      </button>

      {/* Legend + selected value on one row */}
      <div className="flex items-center gap-3 mt-3">
        <div className="flex-1">
          <div
            className="h-2 rounded-full"
            style={{ background: "linear-gradient(90deg, #facc15 0%, #fb923c 35%, #ec4899 65%, #7c3aed 100%)" }}
          />
          <div className="flex justify-between text-white/45 text-[10px] mt-0.5">
            <span>0%</span>
            <span>20%</span>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-[#facc15] text-[#1a1a1a] text-[12px] font-bold tabular-nums shrink-0">
          {value === null ? "—" : `${value}%`}
        </span>
      </div>
    </div>
  );
}

function Prompt({ text }: { text: string }) {
  return (
    <div className="bg-[rgba(21,27,30,0.92)] border border-white/10 rounded-full px-5 py-2.5 shadow-xl backdrop-blur-sm">
      <span className="text-white/70 text-[12px] font-['Figtree',sans-serif] whitespace-nowrap">{text}</span>
    </div>
  );
}

const EDGES = [
  { key: "top",    label: "Top",    color: "#ef4444", bg: "rgba(239,68,68,0.15)",   border: "rgba(239,68,68,0.5)" },
  { key: "right",  label: "Right",  color: "#f59e0b", bg: "rgba(245,158,11,0.15)",  border: "rgba(245,158,11,0.5)" },
  { key: "bottom", label: "Bottom", color: "#22c55e", bg: "rgba(34,197,94,0.15)",   border: "rgba(34,197,94,0.5)" },
  { key: "left",   label: "Left",   color: "#3b82f6", bg: "rgba(59,130,246,0.15)",  border: "rgba(59,130,246,0.5)" },
  { key: "ridge",  label: "Ridge",  color: "#a855f7", bg: "rgba(168,85,247,0.15)",  border: "rgba(168,85,247,0.5)" },
] as const;

function MarginsControls({ margins, onUpdate }: { margins: RoofMargins; onUpdate: (m: Partial<RoofMargins>) => void }) {
  const handleEdgeChange = (key: keyof RoofMargins, val: number) => {
    if (margins.same) {
      onUpdate({ top: val, right: val, bottom: val, left: val, ridge: val });
    } else {
      onUpdate({ [key]: val });
    }
  };

  const handleToggleSame = () => {
    const next = !margins.same;
    if (next) onUpdate({ same: true, top: margins.top, right: margins.top, bottom: margins.top, left: margins.top, ridge: margins.top });
    else onUpdate({ same: false });
  };

  return (
    <div className={TOOLBAR}>
      {/* Same toggle */}
      <button
        onClick={handleToggleSame}
        className="flex items-center gap-2 shrink-0"
      >
        <span className="text-white/75 text-[12px] font-['Figtree',sans-serif]">Same</span>
        <div className={`relative w-8 h-4 rounded-full border transition-colors ${margins.same ? "bg-[#0068DE] border-[#0068DE]" : "bg-white/15 border-white/30"}`}>
          <div className={`absolute top-[2px] size-[10px] rounded-full bg-white transition-transform ${margins.same ? "translate-x-[16px]" : "translate-x-[2px]"}`} />
        </div>
      </button>

      <div className="w-px h-5 bg-white/25 shrink-0" />

      {margins.same ? (
        /* Single combined input when all edges share one value */
        <EdgeInput
          edgeKey="all"
          label="All edges"
          color="#0068DE"
          bg="rgba(0,104,222,0.15)"
          border="rgba(0,104,222,0.5)"
          value={margins.top}
          onChange={(v) => handleEdgeChange("top", v)}
          disabled={false}
        />
      ) : (
        /* Per-edge inputs */
        EDGES.map(({ key, label, color, bg, border }) => (
          <EdgeInput
            key={key}
            edgeKey={key}
            label={label}
            color={color}
            bg={bg}
            border={border}
            value={(margins as any)[key]}
            onChange={(v) => handleEdgeChange(key as keyof RoofMargins, v)}
            disabled={false}
          />
        ))
      )}
    </div>
  );
}


function EdgeInput({
  edgeKey, label, color, bg, border, value, onChange, disabled,
}: {
  edgeKey: string; label: string; color: string; bg: string; border: string;
  value: number; onChange: (v: number) => void; disabled: boolean;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="flex items-center gap-1.5">
      {/* Colored edge icon */}
      <div
        className="w-4 h-4 rounded-sm shrink-0 flex items-center justify-center border"
        style={{ background: bg, borderColor: border }}
      >
        <div className="w-2 h-2 rounded-[2px] border" style={{ borderColor: color }} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value ?? 0}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-14 h-7 bg-transparent border rounded px-2 text-white text-[12px] font-['Figtree',sans-serif] outline-none text-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ borderColor: focused ? color : "rgba(255,255,255,0.2)" }}
        />
        <span className="text-white/40 text-[11px] font-['Figtree',sans-serif]">mm</span>
      </div>
    </div>
  );
}
