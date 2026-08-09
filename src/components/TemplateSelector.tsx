import React, { useEffect, useState } from "react";
import { FrameTemplate } from "../types";
import { ArrowRight } from "lucide-react";

interface TemplateSelectorProps {
  templates: FrameTemplate[];
  selectedTemplateId: string | null;
  onSelect: (template: FrameTemplate) => void;
  onNext: () => void;
  onBack: () => void;
  uploadedImage?: string | null;
}

export default function TemplateSelector({
  templates,
  selectedTemplateId,
  onSelect,
  onNext,
  onBack,
  uploadedImage
}: TemplateSelectorProps) {
  
  const [disabledIds, setDisabledIds] = useState<string[]>([]);

  useEffect(() => {
    // Load disabled states from localStorage
    const disabledStored = localStorage.getItem("disabled_magnet_templates");
    if (disabledStored) {
      try {
        const parsed = JSON.parse(disabledStored);
        if (Array.isArray(parsed)) {
          setDisabledIds(parsed);
        }
      } catch (e) {}
    }

    // Sync when localStorage changes (e.g. from Admin console)
    const handleStorageChange = () => {
      const updated = localStorage.getItem("disabled_magnet_templates");
      if (updated) {
        try {
          const parsed = JSON.parse(updated);
          if (Array.isArray(parsed)) setDisabledIds(parsed);
        } catch (e) {}
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Filter out disabled templates (controlled directly by Admin Console ENABLE/ACTIVE toggle)
  const filteredTemplates = templates.filter(t => !disabledIds.includes(t.id));

  useEffect(() => {
    if (!selectedTemplateId && filteredTemplates.length > 0) {
      onSelect(filteredTemplates[0]);
    }
  }, [selectedTemplateId, filteredTemplates, onSelect]);

  return (
    <div id="template-view-container" className="w-full max-w-5xl mx-auto min-w-0">
      
      {/* MAIN CONTAINER */}
      <div className="bg-white/60 backdrop-blur-md border border-slate-200 rounded-[2.5rem] p-6 sm:p-10 shadow-sm relative text-left min-w-0 flex flex-col justify-between animate-fadeIn">
        
        <div>
          {/* HEADER */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
            <div className="space-y-2">
              <span className="text-[10px] font-sans tracking-[0.2em] font-bold text-slate-400 uppercase">
                STEP 2 — SELECT FORMAT
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-medium text-slate-800 tracking-tight">
                Choose your canvas
              </h2>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button 
                id="template-back-btn"
                onClick={onBack} 
                className="text-[10px] font-sans font-bold tracking-[0.15em] text-slate-400 hover:text-slate-600 px-5 py-3 rounded-full border border-slate-200 bg-white transition uppercase shadow-sm cursor-pointer"
              >
                Back
              </button>
              <button 
                id="template-next-btn"
                disabled={!selectedTemplateId}
                onClick={onNext} 
                className={`flex items-center gap-2 text-[10px] px-7 py-3 rounded-full font-sans font-black tracking-[0.15em] transition duration-200 uppercase shadow-sm ${
                  selectedTemplateId 
                    ? "bg-[#8c2a1a] text-white cursor-pointer hover:bg-[#a63421]" 
                    : "bg-slate-100 text-slate-300 cursor-not-allowed"
                }`}
              >
                Continue <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>


          {/* SOUVENIRS DISPLAY GRID */}
          {filteredTemplates.length === 0 ? (
            <div id="no-templates-dummy" className="py-20 text-center text-slate-400 text-sm font-serif italic">
              Searching for our atelier templates...
            </div>
          ) : (
            <div id="templates-grid" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
              {filteredTemplates.map((t) => {
                const isSelected = selectedTemplateId === t.id;
                
                let shapeClass = "rounded-lg";
                let shapeStyles: React.CSSProperties = {};
                
                // Determine CSS shape based on styleType or ID
                if (t.styleType === "circle" || t.id.includes("circle")) {
                  shapeClass = "rounded-full aspect-square";
                } else if (t.styleType === "heart" || t.id.includes("heart")) {
                  shapeStyles = { clipPath: "polygon(50% 15%, 80% 0%, 100% 20%, 100% 50%, 50% 95%, 0% 50%, 0% 20%, 20% 0%)" };
                } else if (t.styleType === "polaroid") {
                  shapeClass = "rounded-sm aspect-square";
                } else if (t.styleType === "oval") {
                  shapeClass = "rounded-[50%]";
                } else if (t.styleType === "arch") {
                  shapeClass = "rounded-t-[50%] rounded-b-lg";
                } else if (t.styleType === "hexagon") {
                  shapeStyles = { clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)" };
                } else if (t.styleType === "cloud") {
                  shapeStyles = { clipPath: "polygon(25% 40%, 40% 10%, 70% 10%, 85% 40%, 100% 60%, 85% 90%, 15% 90%, 0% 60%)" };
                } else if (t.styleType === "scalloped") {
                  shapeClass = "rounded-3xl border-4 border-double border-slate-200";
                } else if (t.styleType === "royal") {
                  shapeStyles = { clipPath: "polygon(50% 0%, 100% 20%, 100% 80%, 50% 100%, 0% 80%, 0% 20%)" };
                } else if (t.styleType === "strip") {
                  shapeClass = "rounded-sm aspect-[1/3]";
                }

                return (
                  <div
                    id={`template-card-${t.id}`}
                    key={t.id}
                    onClick={() => {
                      onSelect(t);
                    }}
                    onDoubleClick={onNext}
                    className={`group relative rounded-[2rem] p-4 border text-center cursor-pointer transition-all duration-300 flex flex-col items-center gap-4 ${
                      isSelected 
                        ? "border-[#8c2a1a]/40 bg-white shadow-lg ring-1 ring-[#8c2a1a]/10" 
                        : "border-slate-100 bg-white/40 hover:bg-white hover:border-slate-200"
                    }`}
                  >
                    {/* Visual frame preset thumbnail */}
                    <div className="w-full flex items-center justify-center pt-2">
                      <div 
                        className={`bg-white p-2.5 shadow-md border border-slate-100 flex flex-col justify-between items-center relative transition-all duration-500 group-hover:scale-105 rounded-xl`}
                        style={{ 
                          aspectRatio: `${t.widthIn}/${t.heightIn}`,
                          width: "100%",
                          maxWidth: t.widthIn > t.heightIn ? "160px" : "120px"
                        }}
                      >
                        <div 
                          className={`w-full flex-1 bg-slate-50 overflow-hidden relative ${shapeClass}`}
                          style={shapeStyles}
                        >
                          {uploadedImage ? (
                            <img 
                              src={uploadedImage} 
                              alt="Uploaded preview" 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-300 font-sans text-[7px] font-black uppercase tracking-widest">
                              PREVIEW
                            </div>
                          )}
                        </div>
                        <div className="w-full text-center text-slate-800 font-sans font-black text-[6px] truncate mt-1.5 px-1 uppercase tracking-[0.1em]">
                          {t.name || "SOUVENIR"}
                        </div>
                      </div>
                    </div>
   
                    <div className="space-y-1">
                      <h3 className="font-serif font-medium text-sm text-slate-800 leading-tight truncate w-full px-2">{t.name}</h3>
                      <div className="text-[8px] text-slate-400 font-sans font-bold tracking-[0.15em] uppercase">
                        {t.widthIn}" × {t.heightIn}"
                      </div>
                    </div>
                    
                    {isSelected && (
                      <div className="absolute top-4 right-4 w-5 h-5 bg-[#8c2a1a] rounded-full flex items-center justify-center text-white shadow-sm">
                        <span className="text-[10px] font-black">✓</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="mt-12 flex items-center justify-center pt-8 border-t border-slate-100">
           <p className="text-[10px] text-slate-400 font-sans tracking-[0.2em] font-bold uppercase">
             ATELIER QUALITY • 300 DPI PRINTING
           </p>
        </div>

      </div>

    </div>
  );
}

