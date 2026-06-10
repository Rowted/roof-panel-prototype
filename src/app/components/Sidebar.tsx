import { useState, useRef, useEffect } from "react";
import {
  ChevronDown, ChevronRight, MousePointer2, Grid3X3,
  Pencil, X, Info,
} from "lucide-react";

export interface RoofMargins {
  same: boolean;
  top: number;
  right: number;
  bottom: number;
  left: number;
  ridge: number;
}

export const DEFAULT_MARGINS: RoofMargins = {
  same: true, top: 200, right: 200, bottom: 200, left: 200, ridge: 200,
};

export interface RoofData {
  id: string;
  name: string;
  area: number;
  inclination: number;
  direction: number;
  margins: RoofMargins;
  ridgeHeight: number;
  eaveHeight: number;
}

export interface PanelFieldData {
  id: string;
  roofId: string;
  name: string;
  panelCount: number;
  pvPanel: string;
  mountingSystem: string;
  placement: "vertical" | "horizontal";
  rotation: number;
  inclination: number;
  spacingRow: number;
  spacingCol: number;
  offset: number;
}

interface SidebarProps {
  activeTool: "roof" | "panel-field";
  onToolChange: (tool: "roof" | "panel-field") => void;
  roofs: RoofData[];
  selectedRoofId: string | null;
  onSelectRoof: (id: string) => void;
  onUpdateRoof: (id: string, updates: Partial<RoofData>) => void;
  panelFields: PanelFieldData[];
  selectedPanelFieldId: string | null;
  onSelectPanelField: (id: string) => void;
  onUpdatePanelField: (id: string, updates: Partial<PanelFieldData>) => void;
  onFillRoofWithPanels: (roofId: string) => void;
  onDeleteRoof: (roofId: string) => void;
  onDeletePanelField: (pfId: string) => void;
}

export function Sidebar({
  activeTool, onToolChange,
  roofs, selectedRoofId, onSelectRoof, onUpdateRoof,
  panelFields, selectedPanelFieldId, onSelectPanelField, onUpdatePanelField,
  onFillRoofWithPanels,
  onDeleteRoof,
  onDeletePanelField,
}: SidebarProps) {
  const [roofPropsOpen, setRoofPropsOpen] = useState(false);

  const selectedRoof = roofs.find((r) => r.id === selectedRoofId) ?? null;
  const selectedPanelField = panelFields.find((p) => p.id === selectedPanelFieldId) ?? null;

  return (
    <div className="w-[250px] shrink-0 bg-[#263238] flex flex-col overflow-y-auto">
      {roofs.length === 0 ? (
        <EmptyState mode="draw-roof" />
      ) : (
        <div className="flex-1">
          {activeTool === "roof" && selectedRoof && (
            <RoofPanel
              roof={selectedRoof}
              onUpdate={(updates) => onUpdateRoof(selectedRoof.id, updates)}
              hasPanelField={panelFields.some((p) => p.roofId === selectedRoof.id)}
              onFillWithPanels={() => onFillRoofWithPanels(selectedRoof.id)}
              propsOpen={roofPropsOpen}
              onToggleProps={() => setRoofPropsOpen((v) => !v)}
            />
          )}
          {activeTool === "roof" && !selectedRoof && (
            <EmptyState mode="select-roof" />
          )}
          {activeTool === "panel-field" && selectedPanelField && (
            <PanelFieldPanel
              field={selectedPanelField}
              onUpdate={(updates) => onUpdatePanelField(selectedPanelField.id, updates)}
            />
          )}
          {activeTool === "panel-field" && !selectedPanelField && (
            <EmptyState mode="draw-panel-field" />
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ mode }: { mode: "draw-roof" | "draw-panel-field" | "select-roof" }) {
  const content = {
    "draw-roof": {
      icon: <MousePointer2 size={24} className="text-white/60" />,
      title: "No roof yet",
      desc: "Draw your first roof on the map — its details will appear here.",
    },
    "select-roof": {
      icon: <MousePointer2 size={24} className="text-white/60" />,
      title: "No roof selected",
      desc: "Select a roof on the map to see and edit its properties here.",
    },
    "draw-panel-field": {
      icon: <MousePointer2 size={24} className="text-white/60" />,
      title: "No panel field selected",
      desc: "Create a panel field on the map to see and edit its settings here.",
    },
  }[mode];

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-10 text-center gap-4">
      <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
        {content.icon}
      </div>
      <p className="text-white font-['Figtree',sans-serif] text-[15px] font-semibold leading-snug">
        {content.title}
      </p>
      <p className="text-white/50 font-['Figtree',sans-serif] text-[13px] leading-relaxed">
        {content.desc}
      </p>
    </div>
  );
}

interface RoofPanelProps {
  roof: RoofData;
  onUpdate: (updates: Partial<RoofData>) => void;
  hasPanelField: boolean;
  onFillWithPanels: () => void;
  propsOpen: boolean;
  onToggleProps: () => void;
}

function RoofPanel({ roof, onUpdate, hasPanelField, onFillWithPanels, propsOpen, onToggleProps }: RoofPanelProps) {
  const [editingName, setEditingName] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingName) inputRef.current?.select();
  }, [editingName]);

  return (
    <div className="flex flex-col">
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2 group">
          {editingName ? (
            <input
              ref={inputRef}
              type="text"
              value={roof.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setEditingName(false); }}
              className="bg-transparent border-b border-white/50 text-white font-['Figtree',sans-serif] text-[16px] font-bold outline-none w-full leading-normal pb-0.5"
              autoFocus
            />
          ) : (
            <>
              <p className="text-white font-['Figtree',sans-serif] text-[16px] font-bold leading-normal">
                {roof.name}
              </p>
              <button
                onClick={() => setEditingName(true)}
                className="opacity-30 group-hover:opacity-100 transition-opacity text-white/50 hover:text-white"
              >
                <Pencil size={13} />
              </button>
            </>
          )}
        </div>
        <p className="text-white/60 font-['Figtree',sans-serif] text-[13px] leading-normal mt-0.5">
          {roof.area.toFixed(1)} m²
        </p>
      </div>

      {!hasPanelField && (
        <div className="px-5 pb-4">
          <button
            onClick={onFillWithPanels}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-white text-[#263238] hover:bg-white/90 shadow-md transition-all font-['Figtree',sans-serif] text-[13px] font-semibold"
          >
            <Grid3X3 size={14} />
            Fill with panels
          </button>
        </div>
      )}

      <div className="px-5 pb-4">
        <label className="text-white font-['Figtree',sans-serif] text-[13px] font-bold block mb-2">Inclination</label>
        <input
          type="number"
          value={roof.inclination}
          onChange={(e) => onUpdate({ inclination: Number(e.target.value) })}
          className="w-full h-[34px] bg-transparent border border-white/30 rounded px-3 text-white font-['Figtree',sans-serif] text-[13px] outline-none focus:border-white/60 transition-colors"
        />
      </div>

      <div className="px-5 pb-4">
        <label className="text-white font-['Figtree',sans-serif] text-[13px] font-bold block mb-1 flex items-center gap-1.5">
          Direction
          <span className="text-white/30 font-normal text-[11px]">(auto-detected)</span>
        </label>
        <input
          type="number"
          value={roof.direction}
          disabled
          className="w-full h-[34px] bg-transparent border border-white/20 rounded px-3 text-white/40 font-['Figtree',sans-serif] text-[13px] outline-none cursor-not-allowed"
        />
      </div>

      <div className="border-t border-white/10">
        <button
          onClick={onToggleProps}
          className="flex items-center justify-between w-full text-left px-5 py-4"
        >
          <span className="text-white font-['Figtree',sans-serif] text-[16px] font-bold">Roof properties</span>
          {propsOpen ? <ChevronDown size={14} className="text-white" /> : <ChevronRight size={14} className="text-white" />}
        </button>
      </div>

      {propsOpen && <RoofProperties roof={roof} onUpdate={onUpdate} />}
    </div>
  );
}

const WALL_COLORS = [
  "#4a4a4a", "#7a7a7a", "#b0b0b0",
  "#f5f0e8", "#8b3a1a", "#d4621a", "#e8b84b",
  "#6b5a3e", "#4a3f2e",
];

function RoofProperties({ roof, onUpdate }: { roof: RoofData; onUpdate: (u: Partial<RoofData>) => void }) {
  const [roofType, setRoofType] = useState("");
  const [roofSealing, setRoofSealing] = useState("");
  const [coatingLayer, setCoatingLayer] = useState("Gravel");
  const [ballasting, setBallasting] = useState("");
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  const sel = "w-full h-[34px] bg-[rgba(38,50,56,0.9)] border border-[#dee2eb]/30 rounded px-3 text-white font-['Figtree',sans-serif] text-[13px] outline-none focus:border-white/50 transition-colors appearance-none cursor-pointer";

  return (
    <div className="px-5 pb-6 flex flex-col gap-4">
      <p className="text-white/40 font-['Figtree',sans-serif] text-[12px] leading-relaxed -mt-1">
        Additional project data — does not influence the simulation.
      </p>
      {[
        { label: "Roof type", value: roofType, set: setRoofType, opts: ["Flat roof", "Pitched roof", "Mansard", "Hip roof"] },
        { label: "Roof sealing", value: roofSealing, set: setRoofSealing, opts: ["Bitumen", "EPDM", "PVC", "TPO"] },
        { label: "Coating layer", value: coatingLayer, set: setCoatingLayer, opts: ["Gravel", "Concrete", "Green roof", "Tiles"] },
        { label: "Ballasting", value: ballasting, set: setBallasting, opts: ["None", "Gravel", "Pavers"] },
      ].map(({ label, value, set, opts }) => (
        <div key={label}>
          <label className="text-white font-['Figtree',sans-serif] text-[13px] font-bold block mb-2">{label}</label>
          <div className="relative">
            <select value={value} onChange={(e) => set(e.target.value)} className={sel}>
              <option value="" disabled />
              {opts.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" />
          </div>
        </div>
      ))}
      <div>
        <label className="text-white font-['Figtree',sans-serif] text-[13px] font-bold block mb-2">Wall colors</label>
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => setSelectedColor(null)}
            className={`w-full aspect-square rounded border-2 flex items-center justify-center transition-colors ${selectedColor === null ? "border-white/60" : "border-white/15 hover:border-white/30"}`}
          >
            <X size={13} className="text-white/40" />
          </button>
          {WALL_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => setSelectedColor(color)}
              style={{ backgroundColor: color }}
              className={`w-full aspect-square rounded border-2 transition-colors ${selectedColor === color ? "border-white" : "border-transparent hover:border-white/40"}`}
            />
          ))}
          <button className="w-full aspect-square rounded border-2 border-dashed border-white/20 flex items-center justify-center text-white/40 hover:border-white/40 hover:text-white/60 transition-colors">
            <span className="text-lg leading-none">+</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function PanelFieldPanel({ field, onUpdate }: { field: PanelFieldData; onUpdate: (u: Partial<PanelFieldData>) => void }) {
  const [editingName, setEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const kwp = (field.panelCount * 0.26).toFixed(1);
  const inputCls = "w-full h-[34px] bg-transparent border border-white/30 rounded px-3 text-white font-['Figtree',sans-serif] text-[13px] outline-none focus:border-white/60 transition-colors";
  const inputDisCls = "w-full h-[34px] bg-transparent border border-white/15 rounded px-3 text-white/40 font-['Figtree',sans-serif] text-[13px] outline-none cursor-not-allowed opacity-40";
  const selCls = "w-full h-[36px] bg-[rgba(38,50,56,0.9)] border border-[#dee2eb]/40 rounded px-3 text-white font-['Figtree',sans-serif] text-[13px] outline-none appearance-none cursor-pointer";

  useEffect(() => {
    if (editingName) nameInputRef.current?.select();
  }, [editingName]);

  return (
    <div className="flex flex-col pb-8">
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2 group">
          {editingName ? (
            <input
              ref={nameInputRef}
              type="text"
              value={field.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setEditingName(false); }}
              className="bg-transparent border-b border-white/50 text-white font-['Figtree',sans-serif] text-[16px] font-bold outline-none w-full leading-normal pb-0.5"
              autoFocus
            />
          ) : (
            <>
              <p className="text-white font-['Figtree',sans-serif] text-[16px] font-bold leading-normal">{field.name}</p>
              <button
                onClick={() => setEditingName(true)}
                className="opacity-30 group-hover:opacity-100 transition-opacity text-white/50 hover:text-white"
              >
                <Pencil size={13} />
              </button>
            </>
          )}
        </div>
        <p className="text-white/60 font-['Figtree',sans-serif] text-[13px] mt-0.5">{field.panelCount} panels / {kwp} kWp</p>
      </div>

      <Section label="PV Panel">
        <div className="relative">
          <select value={field.pvPanel} onChange={(e) => onUpdate({ pvPanel: e.target.value })} className={selCls}>
            <option value="JA Solar JAM6-60-260/SI">JA Solar · JAM6-60-260/SI</option>
            <option value="Canadian Solar CS6K-280MS">Canadian Solar · CS6K-280MS</option>
            <option value="Longi LR4-60HPH-375M">Longi · LR4-60HPH-375M</option>
          </select>
          <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" />
        </div>
      </Section>

      <Section label="Mounting system">
        <div className="relative">
          <select value={field.mountingSystem} onChange={(e) => onUpdate({ mountingSystem: e.target.value })} className={selCls}>
            <option value="Standard pitched roof tile">Standard · Pitched roof tile</option>
            <option value="K2 Systems flat roof">K2 Systems · Flat roof</option>
            <option value="Esdec FlatFix">Esdec · FlatFix</option>
          </select>
          <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" />
        </div>
        <div className="flex items-center gap-2 mt-2 text-white/50">
          <ChevronRight size={12} />
          <span className="text-[12px] font-['Figtree',sans-serif]">Template <span className="font-light lowercase">(optional)</span></span>
        </div>
        <div className="relative mt-1">
          <select className={selCls + " text-white/50"}>
            <option>No template selected</option>
          </select>
          <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" />
        </div>
      </Section>

      <div className="px-5 pt-3 pb-2">
        <p className="text-white font-['Figtree',sans-serif] text-[16px] font-bold">Panel layout</p>
      </div>

      <Section label="Panel placement">
        <div className="flex h-[24px] rounded overflow-hidden border border-white/20 w-full">
          {(["vertical", "horizontal"] as const).map((p) => (
            <button
              key={p}
              onClick={() => onUpdate({ placement: p })}
              className={`flex-1 text-[12px] font-['Figtree',sans-serif] capitalize transition-colors ${field.placement === p ? "bg-white text-[#263238]" : "text-[#555d61] hover:text-white/70"}`}
            >
              {p}
            </button>
          ))}
        </div>
      </Section>

      <Section label="Panel field rotation">
        <input type="number" value={field.rotation} onChange={(e) => onUpdate({ rotation: Number(e.target.value) })} className={inputCls} />
        <p className="text-white/50 font-['Figtree',sans-serif] text-[12px] mt-1">Roof direction: {field.rotation}°</p>
      </Section>

      <Section label={<LabelWithInfo label="Panel inclination" />}>
        <input type="number" value={field.inclination} disabled className={inputDisCls} />
      </Section>

      <Section label="Panel spacing, row">
        <input type="number" value={field.spacingRow} onChange={(e) => onUpdate({ spacingRow: Number(e.target.value) })} className={inputCls} />
      </Section>

      <Section label="Panel spacing, column">
        <input type="number" value={field.spacingCol} onChange={(e) => onUpdate({ spacingCol: Number(e.target.value) })} className={inputCls} />
      </Section>

      <Section label="Offset">
        <div className="relative">
          <select className={selCls}>
            <option>0 %</option><option>25 %</option><option>50 %</option>
          </select>
          <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" />
        </div>
      </Section>

      <div className="px-5 pt-3 pb-2">
        <p className="text-white font-['Figtree',sans-serif] text-[16px] font-bold">Specific yield</p>
      </div>
      <div className="px-5 pb-3 flex items-center gap-3">
        <Toggle value={false} onChange={() => {}} />
        <span className="text-[#818181] font-['Figtree',sans-serif] text-[13px]">Enter manually</span>
      </div>

      <div className="px-5 pt-3 pb-2">
        <div className="flex items-center gap-1.5">
          <p className="text-white font-['Figtree',sans-serif] text-[16px] font-bold">Number of panels</p>
          <Info size={13} className="text-white/40" />
        </div>
      </div>
      <div className="px-5 pb-2 flex items-center gap-3">
        <Toggle value={false} onChange={() => {}} />
        <span className="text-[#818181] font-['Figtree',sans-serif] text-[13px] leading-snug">Overwrite number of panels manually</span>
      </div>
      <div className="px-5 pb-4">
        <input type="text" value={`${field.panelCount} panels`} disabled className={inputDisCls} />
      </div>
    </div>
  );
}

function Section({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="px-5 pb-4">
      <label className="text-white font-['Figtree',sans-serif] text-[13px] font-bold block mb-2">{label}</label>
      {children}
    </div>
  );
}

function LabelWithInfo({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      {label}
      <Info size={12} className="text-white/40" />
    </span>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-[36px] h-[16px] rounded-full border transition-colors shrink-0 ${value ? "bg-[#0068DE] border-[#0068DE]" : "bg-[#b2b9c5] border-[#b2b9c5]"}`}
    >
      <div className={`absolute top-[2px] size-[10px] rounded-full bg-white transition-transform ${value ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
    </button>
  );
}
