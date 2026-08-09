import { useState, useRef, ChangeEvent } from "react";
import { Camera, UploadCloud, AlertCircle, Sparkles, ChevronLeft } from "lucide-react";
import { motion } from "motion/react";

interface UploadSectionProps {
  onImageSelected: (base64Image: string, multipleImages?: string[]) => void;
  onBack: () => void;
}

export default function UploadSection({ onImageSelected, onBack }: UploadSectionProps) {
  const [error, setError] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [percent, setPercent] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Smart Browser scale/compression engine (preserving existing logic)
  const processAndCompressFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    const filesArray = Array.from(files).slice(0, 10); // Updated to 10 as per UI hint in image
    setError(null);
    setCompressing(true);
    setPercent(10);
    const compressedResults: string[] = [];

    try {
      for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i];
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) throw new Error(`File "${file.name}" is too massive!`);
        setPercent(Math.floor(10 + (i / filesArray.length) * 80));

        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement("canvas");
              const ctx = canvas.getContext("2d");
              const MAX = 1500;
              let { width, height } = img;
              if (width > height) { if (width > MAX) { height *= MAX / width; width = MAX; } }
              else { if (height > MAX) { width *= MAX / height; height = MAX; } }
              canvas.width = width; canvas.height = height;
              if (ctx) {
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL("image/jpeg", 0.85));
              }
              else resolve(event.target?.result as string);
            };
            img.onerror = () => reject(new Error("Format error"));
            img.src = event.target?.result as string;
          };
          reader.readAsDataURL(file);
        });
        compressedResults.push(base64);
      }
      setPercent(100);
      setTimeout(() => {
        setCompressing(false);
        if (compressedResults.length > 0) onImageSelected(compressedResults[0], compressedResults);
      }, 400);
    } catch (err: any) {
      setCompressing(false);
      setError(err?.message || "Error processing files.");
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) processAndCompressFiles(e.target.files);
  };

  if (compressing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center animate-pulse">
        <Sparkles className="w-12 h-12 text-[#8c2a1a]" />
        <h3 className="font-serif italic text-2xl text-slate-800">Developing your photos...</h3>
        <div className="w-64 h-1 bg-slate-200 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-[#8c2a1a]" 
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto px-6 py-12 flex flex-col items-center gap-10"
    >
      {/* HEADER SECTION AS SEEN IN IMAGE 2 */}
      <div className="flex flex-col items-center gap-6">
        <span className="text-[10px] font-sans tracking-[0.3em] font-medium text-slate-400 uppercase">
          KRIA TECH PHOTO BOOTH
        </span>
        
        <div className="flex flex-col items-center gap-2">
          <span className="text-[11px] font-sans tracking-[0.2em] font-bold text-slate-400 uppercase">
            STEP 1 — CHOOSE
          </span>
          <h2 className="text-4xl sm:text-5xl font-serif font-medium text-slate-800 text-center tracking-tight">
            How would you like to add your photos?
          </h2>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-600 px-4 py-2 rounded-lg text-xs font-sans flex items-center gap-2 border border-rose-100">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* CHOICE CARDS AS SEEN IN IMAGE 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        
        {/* OPTION 1: UPLOAD */}
        <motion.div 
          whileHover={{ y: -5 }}
          onClick={() => fileInputRef.current?.click()}
          className="bg-white/60 backdrop-blur-md border border-slate-200 rounded-[2.5rem] p-10 flex flex-col items-center text-center gap-6 cursor-pointer hover:bg-white/80 transition-colors shadow-sm"
        >
          <div className="w-20 h-20 rounded-full bg-[#f8f5f2] flex items-center justify-center border border-slate-100 shadow-inner">
            <UploadCloud className="w-8 h-8 text-[#8c2a1a] stroke-[1.5]" />
          </div>
          <div className="space-y-3 flex-1">
            <h3 className="text-2xl font-serif font-medium text-slate-800">Upload Photos</h3>
            <p className="text-sm text-slate-500 leading-relaxed max-w-[200px] mx-auto">
              Scan the QR code and send one or more photos from your phone gallery
            </p>
          </div>
          <button className="px-6 py-2.5 rounded-full border border-slate-200 bg-white text-[9px] font-sans font-black tracking-[0.1em] text-slate-400 uppercase shadow-sm">
            UP TO 10 PHOTOS:
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileInputChange} accept="image/*" multiple className="hidden" />
        </motion.div>

        {/* OPTION 2: CAPTURE */}
        <motion.div 
          whileHover={{ y: -5 }}
          onClick={() => cameraInputRef.current?.click()}
          className="bg-white/60 backdrop-blur-md border border-slate-200 rounded-[2.5rem] p-10 flex flex-col items-center text-center gap-6 cursor-pointer hover:bg-white/80 transition-colors shadow-sm"
        >
          <div className="w-20 h-20 rounded-full bg-[#f8f5f2] flex items-center justify-center border border-slate-100 shadow-inner">
            <Camera className="w-8 h-8 text-[#8c2a1a] stroke-[1.5]" />
          </div>
          <div className="space-y-3 flex-1">
            <h3 className="text-2xl font-serif font-medium text-slate-800">Capture Photo</h3>
            <p className="text-sm text-slate-500 leading-relaxed max-w-[200px] mx-auto">
              Use the kiosk camera for an instant portrait or group photo
            </p>
          </div>
          <button className="px-6 py-2.5 rounded-full border border-slate-200 bg-white text-[9px] font-sans font-black tracking-[0.1em] text-slate-400 uppercase shadow-sm">
            LIVE CAMERA
          </button>
          <input type="file" ref={cameraInputRef} onChange={handleFileInputChange} accept="image/*" capture="user" className="hidden" />
        </motion.div>
      </div>

      {/* BACK BUTTON */}
      <button 
        onClick={onBack}
        className="mt-8 flex items-center gap-2 text-[10px] font-sans font-bold tracking-[0.2em] text-slate-400 uppercase hover:text-slate-600 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> BACK TO START
      </button>
    </motion.div>
  );
}
