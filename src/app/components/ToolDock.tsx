type RoofSubTool = "draw-roof" | "move-roof" | "roof-height" | "safety-margins" | "obstacle" | "file-upload" | "import-3d";
type PanelSubTool = "draw-panel" | "move-panels" | "shading-analysis";

interface ToolDockProps {
  activeTool: "roof" | "panel-field";
  activeSubTool: string;
  onSubToolChange: (tool: string) => void;
  hasRoof?: boolean;
  hasPanelField?: boolean;
}

export function ToolDock({ activeTool, activeSubTool, onSubToolChange, hasRoof = false, hasPanelField = false }: ToolDockProps) {
  const tools = activeTool === "roof" ? ROOF_TOOLS : PANEL_TOOLS;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
      <div className="flex items-center gap-1 bg-[rgba(21,27,30,0.96)] rounded-xl px-3 py-2 shadow-2xl pointer-events-auto border border-white/10 backdrop-blur-sm">
        {tools.map((tool) => {
          const isActive = activeSubTool === tool.id;
          const isLocked =
            (activeTool === "roof" && !hasRoof && tool.id !== "draw-roof") ||
            (activeTool === "panel-field" && !hasPanelField && tool.id !== "draw-panel");

          return (
            <button
              key={tool.id}
              onClick={() => !isLocked && onSubToolChange(tool.id)}
              title={tool.label}
              disabled={isLocked}
              className={`flex flex-col items-center gap-2 px-4 py-2.5 rounded-lg transition-all min-w-[64px] ${
                isLocked
                  ? "text-white/20 cursor-not-allowed"
                  : isActive
                  ? "bg-white/15 text-white"
                  : "text-white/50 hover:text-white/80 hover:bg-white/8"
              }`}
            >
              <div className="w-[14px] h-[14px] shrink-0">
                {tool.icon}
              </div>
              <span className="text-[11px] font-['Figtree',sans-serif] whitespace-nowrap leading-none">
                {tool.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── SVG icon helpers ──────────────────────────────────────────────────────────

function S({ children, v = "0 0 14 14" }: { children: React.ReactNode; v?: string }) {
  return (
    <svg className="size-full" fill="none" viewBox={v}>
      {children}
    </svg>
  );
}

const DrawRoofIcon = () => (
  <S>
    <path d="M1 8L7 2L13 8" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M3 7V12H11V7" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <rect x="5.5" y="9" width="3" height="3" rx="0.4" stroke="currentColor" strokeWidth="1" />
  </S>
);

const RoofHeightIcon = () => (
  <S>
    <path d="M2 11L7 3L12 11" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none" />
    <path d="M4.5 11H9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M13 5V11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M11.5 6.3L13 5L14.5 6.3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </S>
);

const SafetyMarginsIcon = () => (
  <S>
    <rect x="1" y="1" width="12" height="12" rx="1" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2.5 1.5" />
    <rect x="3.5" y="3.5" width="7" height="7" rx="0.5" stroke="currentColor" strokeWidth="1" />
  </S>
);

const ObstacleIcon = () => (
  <S>
    <path d="M7 1.5L13 12.5H1L7 1.5Z" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinejoin="round" />
    <path d="M7 5.5V8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <circle cx="7" cy="10.5" r="0.6" fill="currentColor" />
  </S>
);

const FileUploadIcon = () => (
  <S>
    <rect x="2" y="7" width="10" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
    <path d="M7 1.5V7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M4.5 3.8L7 1.5L9.5 3.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </S>
);

const Import3DIcon = () => (
  <S>
    <path d="M7 1.5L12.5 4.5V9.5L7 12.5L1.5 9.5V4.5L7 1.5Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
    <path d="M7 1.5V12.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    <path d="M1.5 4.5L7 7.5L12.5 4.5" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
  </S>
);

const DrawPanelIcon = () => (
  <S>
    <rect x="1" y="1" width="5" height="5.5" rx="0.5" stroke="currentColor" strokeWidth="1.1" />
    <rect x="8" y="1" width="5" height="5.5" rx="0.5" stroke="currentColor" strokeWidth="1.1" />
    <rect x="1" y="7.5" width="5" height="5.5" rx="0.5" stroke="currentColor" strokeWidth="1.1" />
    <rect x="8" y="7.5" width="5" height="5.5" rx="0.5" stroke="currentColor" strokeWidth="1.1" />
  </S>
);

const CursorIcon = () => (
  <S>
    <path d="M2 2L2 10.5L4.8 8.2L6.5 12.5L8 11.8L6.3 7.5L9.5 7.5L2 2Z" fill="currentColor" />
  </S>
);

const ShadingIcon = () => (
  <S>
    <circle cx="7" cy="7" r="2.8" stroke="currentColor" strokeWidth="1.2" />
    <path d="M7 1.5V2.5M7 11.5V12.5M1.5 7H2.5M11.5 7H12.5M3.4 3.4L4.1 4.1M9.9 9.9L10.6 10.6M10.6 3.4L9.9 4.1M4.1 9.9L3.4 10.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </S>
);

// ── Tool definitions ──────────────────────────────────────────────────────────

const ROOF_TOOLS: { id: RoofSubTool; label: string; icon: React.ReactNode }[] = [
  { id: "draw-roof",      label: "Draw roof",       icon: <DrawRoofIcon /> },
  { id: "roof-height",    label: "Roof height",     icon: <RoofHeightIcon /> },
  { id: "safety-margins", label: "Safety margins",  icon: <SafetyMarginsIcon /> },
  { id: "obstacle",       label: "Obstacle",        icon: <ObstacleIcon /> },
];

const PANEL_TOOLS: { id: PanelSubTool; label: string; icon: React.ReactNode }[] = [
  { id: "draw-panel",       label: "Draw panels",      icon: <DrawPanelIcon /> },
  { id: "shading-analysis", label: "Shading analysis", icon: <ShadingIcon /> },
];
