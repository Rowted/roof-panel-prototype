import { Sun, Undo2, Redo2, X, Settings, HelpCircle } from "lucide-react";

interface TopNavProps {
  mode: "basic" | "pro";
  onModeChange: (mode: "basic" | "pro") => void;
}

export function TopNav({ mode, onModeChange }: TopNavProps) {
  return (
    <div className="flex items-center h-10 bg-[rgba(21,27,30,0.98)] px-2 shrink-0 z-10">
      {/* Mode toggle */}
      <div className="flex items-center h-6 rounded overflow-hidden border border-white/20 mr-3">
        <button
          onClick={() => onModeChange("basic")}
          className={`px-3 h-full text-[13px] font-['Figtree',sans-serif] transition-colors ${mode === "basic" ? "bg-white text-[#263238]" : "text-[#555d61] hover:text-white/80"}`}
        >
          Basic
        </button>
        <button
          onClick={() => onModeChange("pro")}
          className={`px-3 h-full text-[13px] font-['Figtree',sans-serif] transition-colors ${mode === "pro" ? "bg-white text-[#263238]" : "text-[#555d61] hover:text-white/80"}`}
        >
          Pro
        </button>
      </div>

      {/* Vertical divider */}
      <div className="w-px h-6 bg-white/20 mx-2" />

      {/* App icon */}
      <div className="flex items-center justify-center w-8 h-8 rounded-[6px] bg-white/20 mr-2">
        <Sun size={14} className="text-white" />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-3">
        <button className="text-[#85888D] hover:text-white transition-colors">
          <Undo2 size={14} />
        </button>
        <button className="text-[#85888D] hover:text-white transition-colors">
          <Redo2 size={14} />
        </button>
        <div className="w-px h-6 bg-white/20 mx-1" />
        <button className="flex items-center justify-center w-8 h-8 rounded bg-white/10 hover:bg-white/20 transition-colors">
          <X size={14} className="text-white" />
        </button>
        <div className="w-px h-6 bg-white/20 mx-1" />
        <button className="text-[#85888D] hover:text-white transition-colors">
          <Settings size={14} />
        </button>
        <button className="text-[#85888D] hover:text-white transition-colors">
          <HelpCircle size={14} />
        </button>
      </div>
    </div>
  );
}
