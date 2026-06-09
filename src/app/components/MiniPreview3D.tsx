import { useRef, useState } from "react";
import { Box } from "lucide-react";

// Top-right 3D preview. In the real product this shows a live 3D model of the
// building; here it's a placeholder. Resizable from the bottom-left corner.
export function MiniPreview3D() {
  const [size, setSize] = useState({ w: 300, h: 210 });
  const start = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  const onMove = (e: MouseEvent) => {
    if (!start.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    setSize({
      w: Math.max(180, Math.min(620, start.current.w - dx)),
      h: Math.max(130, Math.min(460, start.current.h + dy)),
    });
  };
  const onUp = () => {
    start.current = null;
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
  };
  const onDown = (e: React.MouseEvent) => {
    e.preventDefault();
    start.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div
      className="absolute top-3 right-3 z-30 rounded-lg overflow-hidden shadow-2xl border border-white/15 select-none"
      style={{ width: size.w, height: size.h }}
    >
      {/* Placeholder backdrop */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#2c333a] to-[#191e23] flex flex-col items-center justify-center gap-2 px-6 text-center">
        <Box size={26} className="text-white/40" strokeWidth={1.4} />
        <p className="text-white/75 text-[13px] font-semibold font-['Figtree',sans-serif]">3D preview</p>
        <p className="text-white/40 text-[11px] font-['Figtree',sans-serif] leading-snug">
          A live 3D model of your building appears here as you draw.
        </p>
      </div>

      {/* Resize handle (bottom-left corner) */}
      <div
        onMouseDown={onDown}
        title="Drag to resize"
        className="absolute bottom-0 left-0 w-5 h-5 cursor-nesw-resize flex items-end justify-start"
      >
        <div className="w-0 h-0 border-l-[11px] border-l-[#0068DE] border-t-[11px] border-t-transparent" />
      </div>
    </div>
  );
}
