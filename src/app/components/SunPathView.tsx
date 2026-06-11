import { ArrowLeft } from "lucide-react";

interface SunPathViewProps {
  onClose: () => void;
}

// Mockup full-screen sun-path page. Drop the screenshot at public/sun-path.jpg
// to replace the placeholder background.
export function SunPathView({ onClose }: SunPathViewProps) {
  const img = import.meta.env.BASE_URL + "sun-path.jpeg";

  return (
    <div className="fixed inset-0 z-[60] bg-[#151b1e]">
      {/* Mockup image — contained so it always fits fully, whatever the window size */}
      <img
        src={img}
        alt="Sun path 3D preview"
        className="absolute inset-0 w-full h-full object-contain"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />

      {/* Placeholder hint behind the image */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-white/40 font-['Figtree',sans-serif] text-[14px]">Sun path 3D preview</span>
      </div>

      {/* Back button (top-left) */}
      <button
        onClick={onClose}
        className="absolute top-4 left-4 z-10 flex items-center gap-2 h-9 pl-2.5 pr-4 rounded-lg bg-[rgba(21,27,30,0.92)] border border-white/15 text-white text-[13px] font-['Figtree',sans-serif] font-medium shadow-xl backdrop-blur-sm hover:bg-[rgba(21,27,30,1)] transition-colors"
      >
        <ArrowLeft size={16} />
        Back
      </button>
    </div>
  );
}
