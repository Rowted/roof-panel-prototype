import { useState } from "react";
import { Upload, Box, Calculator, Ruler, Droplet, Save, Undo2, Redo2, Sun } from "lucide-react";

interface TopNavProps {
  mode: "basic" | "pro";
  onModeChange: (mode: "basic" | "pro") => void;
  onFileUpload: () => void;
  onImport3D: () => void;
  totalPanels: number;
  totalKwp: number;
  sunPathOpen: boolean;
  onToggleSunPath: () => void;
}

export function TopNav({ mode, onModeChange, onFileUpload, onImport3D, totalPanels, totalKwp, sunPathOpen, onToggleSunPath }: TopNavProps) {
  const [showMeasurements, setShowMeasurements] = useState(false);

  return (
    <div className="relative flex items-center h-10 bg-[rgba(21,27,30,0.98)] px-2 shrink-0 z-50">
      {/* Mode toggle */}
      <div className="flex items-center h-6 rounded overflow-hidden border border-white/20 mr-2">
        <button
          onClick={() => onModeChange("basic")}
          className={`px-3 h-full text-[13px] font-['Figtree',sans-serif] transition-colors ${mode === "basic" ? "bg-white text-[#263238]" : "text-[#868d92] hover:text-white/80"}`}
        >
          Basic
        </button>
        <button
          onClick={() => onModeChange("pro")}
          className={`px-3 h-full text-[13px] font-['Figtree',sans-serif] transition-colors ${mode === "pro" ? "bg-white text-[#263238]" : "text-[#868d92] hover:text-white/80"}`}
        >
          Pro
        </button>
      </div>

      {/* Vertical divider */}
      <div className="w-px h-6 bg-white/20 mx-1.5" />

      {/* Import actions (moved off the bottom dock) */}
      <NavBtn label="Upload overlay file" onClick={onFileUpload}>
        <Upload size={15} />
      </NavBtn>
      <NavBtn label="Import 3D model" onClick={onImport3D}>
        <Box size={15} />
      </NavBtn>

      {/* Spacer */}
      <div className="flex-1" />

      {/* View / measurement tools */}
      <NavBtn label="Projected length calculator">
        <Calculator size={15} />
      </NavBtn>
      <NavBtn label="Display measurements" active={showMeasurements} onClick={() => setShowMeasurements((v) => !v)}>
        <Ruler size={15} />
      </NavBtn>
      <NavBtn label="Panel opacity">
        <Droplet size={15} />
      </NavBtn>

      <div className="w-px h-6 bg-white/20 mx-1.5" />

      {/* File / history */}
      <NavBtn label="Save">
        <Save size={15} />
      </NavBtn>
      <NavBtn label="Undo">
        <Undo2 size={15} />
      </NavBtn>
      <NavBtn label="Redo">
        <Redo2 size={15} />
      </NavBtn>

      <div className="w-px h-6 bg-white/20 mx-1.5" />

      {/* Show sun path (replaces the 2D/3D switch) */}
      <button
        onClick={onToggleSunPath}
        className={`group relative flex items-center gap-1.5 h-7 px-3 rounded-md text-[13px] font-['Figtree',sans-serif] font-medium transition-colors ${
          sunPathOpen ? "bg-[#0068DE] text-white" : "bg-white/10 text-white/70 hover:bg-white/15 hover:text-white"
        }`}
      >
        <Sun size={14} />
        Sun path
      </button>

      <div className="w-px h-6 bg-white/20 mx-2" />

      {/* Project totals */}
      <div className="text-white font-['Figtree',sans-serif] text-[13px] font-semibold tabular-nums pr-1 whitespace-nowrap">
        {totalPanels} panels / {totalKwp.toFixed(1)} kWp
      </div>
    </div>
  );
}

function NavBtn({ label, onClick, active, children }: {
  label: string;
  onClick?: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        aria-label={label}
        className={`flex items-center justify-center w-8 h-8 rounded transition-colors ${
          active ? "bg-[#0068DE]/25 text-[#5aabff]" : "text-[#9aa1a6] hover:text-white hover:bg-white/10"
        }`}
      >
        {children}
      </button>
      {/* Tooltip */}
      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 px-2.5 py-1.5 rounded-md bg-[#0b0f11] border border-white/10 text-white text-[12px] font-['Figtree',sans-serif] whitespace-nowrap shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
        {label}
      </div>
    </div>
  );
}
