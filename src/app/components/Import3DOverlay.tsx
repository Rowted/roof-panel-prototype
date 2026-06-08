interface Import3DOverlayProps {
  onClose: () => void;
}

export function Import3DOverlay({ onClose }: Import3DOverlayProps) {
  // 8 handles: 4 corners + 4 edge midpoints
  const handles = [
    { top: "0%", left: "0%" },    // top-left
    { top: "0%", left: "50%" },   // top-mid
    { top: "0%", left: "100%" },  // top-right
    { top: "50%", left: "100%" }, // right-mid
    { top: "100%", left: "100%" },// bottom-right
    { top: "100%", left: "50%" }, // bottom-mid
    { top: "100%", left: "0%" },  // bottom-left
    { top: "50%", left: "0%" },   // left-mid
  ];

  return (
    <div className="absolute inset-0 z-40 pointer-events-none font-['Figtree',sans-serif]">
      {/* Selection rectangle */}
      <div
        className="absolute border-2 border-white"
        style={{ top: "10%", left: "18%", width: "64%", height: "68%" }}
      >
        {/* Internal thirds grid lines */}
        <div className="absolute inset-0">
          <div className="absolute top-1/3 left-0 right-0 border-t border-white/30" />
          <div className="absolute top-2/3 left-0 right-0 border-t border-white/30" />
          <div className="absolute left-1/3 top-0 bottom-0 border-l border-white/30" />
          <div className="absolute left-2/3 top-0 bottom-0 border-l border-white/30" />
        </div>

        {/* Handles */}
        {handles.map((h, i) => (
          <div
            key={i}
            className="absolute w-3.5 h-3.5 rounded-full bg-white border border-gray-400 shadow -translate-x-1/2 -translate-y-1/2"
            style={{ top: h.top, left: h.left }}
          />
        ))}
      </div>

      {/* Bottom instruction bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto">
        <div className="flex items-center gap-4 bg-[rgba(31,42,51,0.94)] rounded-xl pl-3 pr-4 py-3 shadow-2xl backdrop-blur-sm max-w-[760px]">
          {/* Icon */}
          <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-white shrink-0">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M11 2L19 6.5V15.5L11 20L3 15.5V6.5L11 2Z" stroke="#0068DE" strokeWidth="1.4" strokeLinejoin="round" />
              <path d="M11 2V20" stroke="#0068DE" strokeWidth="1.4" />
              <path d="M3 6.5L11 11L19 6.5" stroke="#0068DE" strokeWidth="1.4" strokeLinejoin="round" />
            </svg>
          </div>

          {/* Message */}
          <p className="text-white text-[15px] leading-snug max-w-[420px]">
            Adjust the selected area to import only the desired building. Drag with the mouse or adjust it via the points. (Tip: Zoom out if not everything is visible.)
          </p>

          {/* Select */}
          <button
            onClick={onClose}
            className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-[16px] px-7 py-2.5 rounded-lg transition-colors shrink-0"
          >
            Select
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors shrink-0"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 3L17 17M17 3L3 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
