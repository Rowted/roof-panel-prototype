interface FileUploadModalProps {
  onClose: () => void;
}

export function FileUploadModal({ onClose }: FileUploadModalProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative w-[680px] max-w-[90%] bg-white rounded-2xl shadow-2xl px-10 py-9 font-['Figtree',sans-serif]">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-7 right-8 text-red-500 hover:text-red-600 transition-colors"
          aria-label="Close"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M3 3L19 19M19 3L3 19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-7">
          <h2 className="text-[26px] font-bold tracking-wide text-[#2a2a2a]">OVERLAY FILE SELECTION</h2>
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#6d28d9] text-white text-[13px] font-bold italic">i</span>
        </div>

        {/* Subhead */}
        <h3 className="text-[15px] font-semibold tracking-wide text-[#888] mb-4">UPLOAD NEW FILE</h3>

        {/* Info rows */}
        <div className="space-y-2.5 mb-7">
          <InfoRow text="Supported file formats: .jpg, .jpeg, .png, .gif , .glb" />
          <InfoRow text="Maximum size: 70MB" />
        </div>

        {/* Drop zone */}
        <div className="border border-dashed border-gray-300 rounded-lg py-10 flex flex-col items-center justify-center gap-4 mb-8">
          <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
            <path d="M10 4h13l6 6v24a0 0 0 010 0H10a0 0 0 010 0V4z" fill="#9aa3ab" />
            <path d="M23 4l6 6h-6V4z" fill="#c4cbd1" />
            <rect x="14" y="20" width="11" height="2" rx="1" fill="#fff" />
            <rect x="14" y="25" width="11" height="2" rx="1" fill="#fff" />
          </svg>
          <p className="text-[19px] text-[#555] text-center leading-snug">
            Drag &amp; Drop your files here<br />or
          </p>
          <button className="bg-[#1f2a33] text-white text-[16px] px-7 py-2.5 rounded-md hover:bg-[#2b3947] transition-colors">
            Select file
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button
            disabled
            className="bg-[#cfd4da] text-white text-[16px] px-8 py-2.5 rounded-md cursor-not-allowed"
          >
            Upload
          </button>
          <button
            onClick={onClose}
            className="bg-[#dc4a44] text-white text-[16px] px-8 py-2.5 rounded-md hover:bg-[#c43e39] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#b9c0c7] text-white text-[13px] font-bold italic shrink-0">i</span>
      <span className="text-[18px] text-[#555]">{text}</span>
    </div>
  );
}
