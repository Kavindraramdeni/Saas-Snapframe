import { useState, useEffect } from "react";
import LandingPage from "./components/LandingPage";
import UploadSection from "./components/UploadSection";
import TemplateSelector from "./components/TemplateSelector";
import CanvasEditor from "./components/CanvasEditor";
import CheckoutScreen from "./components/CheckoutScreen";
import AdminConsole from "./components/AdminConsole";
import { FrameTemplate, Order, CartItem, generateThumbnail } from "./types";
import { CheckCircle2, ShoppingBag, ArrowRight, Printer, Sparkles, AlertCircle } from "lucide-react";
import confetti from "canvas-confetti";

export default function App() {
  // Multi-Admin Stall Context: read ?stall=stall_1 or stall_2 or stall_3 from URL
  const [activeStallId, setActiveStallId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("stall") || params.get("stall_id") || "stall_1";
  });

  // Simple navigation screen state router
  const [activeScreen, setActiveScreen] = useState<"landing" | "upload" | "template" | "editor" | "checkout" | "success" | "admin">("landing");
  
  // Customizer workflow state
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [finalImageUri, setFinalImageUri] = useState<string | null>(null);
  const [templates, setTemplates] = useState<FrameTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<FrameTemplate | null>(null);
  
  // Custom text overlays
  const [customText, setCustomText] = useState("");
  const [aiOptions, setAiOptions] = useState({
    bgRemoved: false,
    cartoonFilter: false,
    glowFilter: false
  });
  const [editorState, setEditorState] = useState<any>(null);

  // Successfully paid reference
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  // Shopping Cart state for multi-frame support
  const [cart, setCart] = useState<CartItem[]>([]);

  // Trigger premium celebratory double side-cannon confetti on order success screen entry
  useEffect(() => {
    if (activeScreen === "success" && completedOrder) {
      // Fire bursts of confetti over 2 seconds for a highly satisfying visual reward
      const duration = 2 * 1000;
      const end = Date.now() + duration;

      const frame = () => {
        // Left side cannon
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.8 },
          colors: ["#f59e0b", "#fb923c", "#10b981", "#38bdf8", "#ec4899"]
        });
        // Right side cannon
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.8 },
          colors: ["#f59e0b", "#fb923c", "#10b981", "#38bdf8", "#ec4899"]
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      // Also fire an initial explosive center burst for immediate high prestige feedback
      confetti({
        particleCount: 85,
        spread: 100,
        origin: { y: 0.6 },
        colors: ["#f59e0b", "#fb923c", "#fcd34d", "#ffffff"]
      });

      frame();
    }
  }, [activeScreen, completedOrder]);

  // Load preconfigured templates from our backend Express server on boot
  const loadTemplates = async () => {
    try {
      const res = await fetch("/api/templates");
      let list = await res.json();
      
      // Apply custom added templates from localStorage
      const customStored = localStorage.getItem("custom_magnet_templates");
      if (customStored) {
        try {
          const parsed = JSON.parse(customStored);
          if (Array.isArray(parsed)) {
            list = [...list, ...parsed];
          }
        } catch (e) {}
      }

      // Apply enabled/disabled template filters
      const disabledStored = localStorage.getItem("disabled_magnet_templates");
      if (disabledStored) {
        try {
          const disabledIds = JSON.parse(disabledStored);
          if (Array.isArray(disabledIds)) {
            list = list.filter((t: any) => !disabledIds.includes(t.id));
          }
        } catch (e) {}
      }
      
      setTemplates(list);
    } catch (err) {
      console.error("Error connecting with backend templates API:", err);
    }
  };

  useEffect(() => {
    loadTemplates();
    window.addEventListener("storage", loadTemplates);
    return () => {
      window.removeEventListener("storage", loadTemplates);
    };
  }, []);

  useEffect(() => {
    if (activeScreen === "template") {
      loadTemplates();
    }
  }, [activeScreen]);

  // Back actions
  const handleResetWorkflow = () => {
    setUploadedImage(null);
    setUploadedImages([]);
    setSelectedTemplate(null);
    setCustomText("");
    setCompletedOrder(null);
    setEditorState(null);
    setCart([]); // Clear the shopping cart completely for the new session!
    setActiveScreen("landing");
  };

  const handleAddAnother = () => {
    // Clear current customizer state to allow a fresh start
    setUploadedImage(null);
    setUploadedImages([]);
    setSelectedTemplate(null);
    setFinalImageUri(null);
    setCustomText("");
    setEditorState(null);
    setActiveScreen("upload");
  };

  const handleRemoveItem = (id: string) => {
    setCart(prev => {
      const updated = prev.filter(item => item.id !== id);
      if (updated.length === 0) {
        setUploadedImage(null);
        setUploadedImages([]);
        setSelectedTemplate(null);
        setFinalImageUri(null);
        setCustomText("");
        setEditorState(null);
        setActiveScreen("landing");
      } else {
        // Fallback the active customizer state to the first item left in the cart
        const first = updated[0];
        setUploadedImage(first.finalImageUri);
        setFinalImageUri(first.finalImageUri);
        setSelectedTemplate(first.template);
        setCustomText(first.customText);
        setEditorState(first.editorState);
      }
      return updated;
    });
  };

  const [adminRole, setAdminRole] = useState<"super_admin" | "stall_owner">("super_admin");
  const [adminStallId, setAdminStallId] = useState<string>("stall_1");

  return (
    <div className="min-h-screen bg-[#f2f0ef] font-sans text-slate-900 antialiased overflow-x-hidden selection:bg-amber-100 selection:text-slate-900">
      
      {/* 1. SEAMLESS NAVIGATION ROUTES */}

      {activeScreen === "landing" && (
        <LandingPage
          stallId={activeStallId}
          onStartOrder={() => setActiveScreen("upload")}
          onGoToAdmin={(role, sId) => {
            setAdminRole(role);
            setAdminStallId(sId);
            setActiveScreen("admin");
          }}
        />
      )}

      {/* RENDER IN-APP CUSTOMIZATION WRAPPERS */}
      {["upload", "template", "editor", "checkout"].includes(activeScreen) && (
        <div className="min-h-screen bg-[#f2f0ef] flex flex-col justify-between relative py-8 sm:py-14 px-4 overflow-hidden">
          
          {/* Subtle background circles for architectural depth */}
          <div className="absolute top-[20%] left-[70%] w-[500px] h-[500px] border border-slate-200/60 rounded-full pointer-events-none" />
          <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] border border-slate-200/40 rounded-full pointer-events-none" />

          {/* Core progress tracker header */}
          <div className="max-w-xl mx-auto w-full mb-10 sm:mb-14 relative z-20">
            <div className="text-center space-y-3 mb-8">
              <span className="text-[10px] font-sans tracking-[0.3em] font-medium text-slate-400 uppercase block">
                KRIA TECH ATELIER
              </span>
              <h1 className="text-3xl sm:text-4xl font-serif font-medium text-slate-800 tracking-tight">
                Perfect your souvenir
              </h1>
            </div>

            {/* Premium Minimalist Stepper HUD */}
            <div className="relative bg-white/40 border border-slate-200 rounded-[2rem] p-5 backdrop-blur-md shadow-sm">
              <div className="grid grid-cols-4 gap-1 text-center text-[10px] font-sans tracking-widest relative z-10">
                {[
                  { label: "UPLOAD", active: activeScreen === "upload", done: ["template", "editor", "checkout"].includes(activeScreen) },
                  { label: "TEMPLATE", active: activeScreen === "template", done: ["editor", "checkout"].includes(activeScreen) },
                  { label: "EDITOR", active: activeScreen === "editor", done: ["checkout"].includes(activeScreen) },
                  { label: "CHECKOUT", active: activeScreen === "checkout", done: false }
                ].map((s, idx) => (
                  <div key={idx} className="flex flex-col items-center relative group">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-sans border text-[10px] mb-2 transition-all duration-300 ${
                      s.active 
                        ? "bg-[#8c2a1a] text-white border-[#8c2a1a] font-black shadow-md scale-110" 
                        : s.done 
                          ? "bg-white text-[#8c2a1a] border-[#8c2a1a] font-bold" 
                          : "bg-white/50 text-slate-300 border-slate-200"
                    }`}>
                      {s.done ? "✓" : idx + 1}
                    </div>
                    <span className={`text-[9px] font-black tracking-widest uppercase ${
                      s.active 
                        ? "text-slate-900" 
                        : s.done 
                          ? "text-slate-500" 
                          : "text-slate-300"
                    }`}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* MAIN FORM MODULE SLOTS */}
          <div className="flex-1 flex items-center justify-center z-10 w-full max-w-full min-w-0">
            {activeScreen === "upload" && (
              <UploadSection
                onImageSelected={(base64, multipleImages) => {
                  setUploadedImage(base64);
                  setUploadedImages(multipleImages || [base64]);
                  setActiveScreen("template");
                }}
                onBack={handleResetWorkflow}
              />
            )}

            {activeScreen === "template" && templates.length > 0 && (
              <TemplateSelector
                templates={templates}
                selectedTemplateId={selectedTemplate?.id || null}
                onSelect={(tmpl) => {
                  setSelectedTemplate(tmpl);
                  setCustomText(tmpl.defaultText);
                }}
                onNext={() => setActiveScreen("editor")}
                onBack={() => setActiveScreen("upload")}
                uploadedImage={uploadedImage}
              />
            )}

             {activeScreen === "editor" && uploadedImage && selectedTemplate && (
              <CanvasEditor
                imageUri={uploadedImage}
                uploadedImages={uploadedImages}
                template={selectedTemplate}
                initialShapeMask={selectedTemplate.styleType || "standard"}
                onConfirm={async (finalUri, textStr, opt, state) => {
                  setFinalImageUri(finalUri); // Save the high-res layered photo output format separately!
                  setCustomText(textStr);
                  setAppliedAiOptions(opt);
                  setEditorState(state);

                  // Generate lightweight thumbnail
                  const thumb = await generateThumbnail(finalUri);
                  const newItem: CartItem = {
                    id: "item-" + Date.now(),
                    finalImageUri: finalUri,
                    thumbnailUri: thumb,
                    template: selectedTemplate,
                    customText: textStr,
                    aiOptions: {
                      bgRemoved: opt.bgRemoved || false,
                      cartoonFilter: opt.cartoonFilter || false,
                      glowFilter: opt.glowFilter || false,
                      aiTextGenerated: textStr
                    },
                    editorState: state
                  };

                  // Add item to cart
                  setCart(prev => {
                    const exists = prev.some(item => item.finalImageUri === finalUri);
                    if (exists) return prev;
                    return [...prev, newItem];
                  });

                  setActiveScreen("checkout");
                }}
                onBack={() => setActiveScreen("template")}
              />
            )}

            {activeScreen === "checkout" && cart.length > 0 && (
              <CheckoutScreen
                cart={cart}
                stallId={activeStallId}
                onAddAnother={handleAddAnother}
                onRemoveItem={handleRemoveItem}
                onBack={() => setActiveScreen("editor")}
                onPaymentSuccess={(orderId, orderDetails) => {
                  setCompletedOrder(orderDetails);
                  setActiveScreen("success");
                }}
              />
            )}
          </div>

          {/* Mini Footnote */}
          <div className="max-w-md mx-auto w-full text-center text-slate-600 text-[10px] mt-8 z-10">
            Secure browser encryption. Powered by Kria Studio 300 DPI engine.
          </div>
        </div>
      )}

      {/* 2. SUCCESS POSTCARD RECEIPT SCREEN */}
      {activeScreen === "success" && completedOrder && (
        <div id="success-screen" className="min-h-screen bg-[#f2f0ef] flex flex-col justify-center items-center py-12 px-4 text-center">
          
          <div className="relative max-w-lg w-full bg-white/60 backdrop-blur-md border border-slate-200 rounded-[3rem] p-10 sm:p-14 shadow-sm space-y-10">
            
            {/* Success Badge */}
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-500 shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-3">
              <span className="text-[10px] font-sans tracking-[0.2em] font-bold text-slate-400 uppercase">
                CONFIRMED
              </span>
              <h2 className="text-4xl font-serif font-medium text-slate-800 tracking-tight">Print Sent to Studio</h2>
              <p className="text-xs text-slate-400 leading-relaxed font-sans font-medium px-4">
                Your custom memory has been received. We are now preparing your high-resolution souvenir for production.
              </p>
            </div>

            {/* Simple pickup notification */}
            <div className="bg-[#fcfaf9] border border-slate-100 rounded-[2rem] p-8 flex gap-6 items-center text-left">
              <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-[#8c2a1a] shrink-0">
                <Printer className="w-6 h-6" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-sans font-black tracking-widest text-slate-800 uppercase">Live Queue Active</span>
                <p className="text-[10px] text-slate-400 leading-relaxed font-sans font-bold uppercase tracking-[0.05em]">
                  We use premium high-gloss acrylic casing for your keepsakes.
                </p>
              </div>
            </div>

            {/* Manual WhatsApp Connection if enabled */}
            {completedOrder.whatsappEnabled && completedOrder.waUrl && (
              <div className="space-y-4">
                <div className="px-6">
                   <p className="text-[10px] text-slate-400 leading-relaxed font-sans font-bold uppercase tracking-[0.05em]">
                    Coordinate with our studio via WhatsApp for instant confirmation and collection updates.
                  </p>
                </div>
                <a
                  href={completedOrder.waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-3 py-5 bg-[#25D366] hover:bg-[#20ba59] active:scale-95 text-white text-[10px] font-sans font-black tracking-[0.2em] uppercase rounded-full shadow-lg transition-all duration-300"
                >
                  <svg className="w-4 h-4 fill-white shrink-0" viewBox="0 0 24 24">
                    <path d="M12.031 2c-5.514 0-9.99 4.478-9.99 9.99 0 1.761.459 3.475 1.33 4.99l-1.415 5.176 5.3-.1.4.2c1.474.881 3.1 1.34 5.3 1.34 5.51 0 9.99-4.478 9.99-9.99a9.96 9.96 0 0 0-3-7.07 9.88 9.88 0 0 0-7.01-2.82zm0 18.254a8.21 8.21 0 0 1-4.2-1.15l-.3-.2-3.123.5.5-3.04-.2-.3a8.23 8.23 0 0 1-1.1-4.13c0-4.512 3.67-8.18 8.18-8.18a8.13 8.13 0 0 1 5.8 2.4 8.08 8.08 0 0 1 2.38 5.78c0 4.54-3.66 8.21-8.18 8.21zm4.51-6.19c-.25-.12-1.47-.72-1.69-.8-.22-.09-.38-.13-.54.12-.16.25-.63.8-.77.96-.14.16-.29.18-.54.06a6.8 6.8 0 0 1-2.01-1.24c-.72-.64-1.21-1.44-1.35-1.69-.14-.25-.01-.39.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.09-.16.04-.31-.02-.43-.06-.12-.54-1.3-.74-1.78-.2-.48-.39-.41-.54-.42-.14 0-.3 0-.46.0a.88.88 0 0 0-.64.3c-.22.25-.85.83-.85 2c0 1.19.86 2.33 1 2.49.12.16 1.7 2.6 4.12 3.64.57.25 1.02.4 1.37.5.58.18 1.1.16 1.52.1.47-.07 1.47-.6 1.67-1.18.2-.58.2-1.08.14-1.18-.06-.1-.22-.16-.47-.28z"/>
                  </svg>
                  Connect on WhatsApp
                </a>
              </div>
            )}

            {/* Receipt invoice card */}
            <div className="bg-white border border-slate-100 rounded-[2rem] p-8 space-y-3 shadow-sm">
              <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                <span className="text-[9px] font-sans font-bold text-slate-300 tracking-[0.2em] uppercase">Invoice</span>
                <span className="text-[10px] font-sans font-black text-slate-800 uppercase">#{completedOrder.id.slice(-6)}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-sans font-bold text-slate-500 uppercase tracking-widest">
                <span>Customer</span>
                <span className="text-slate-800">{completedOrder.customerName}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-sans font-bold text-slate-500 uppercase tracking-widest">
                <span>Style</span>
                <span className="text-slate-800">{completedOrder.templateId}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                <span className="text-[10px] font-sans font-black text-[#8c2a1a] tracking-[0.2em] uppercase">Total Amount</span>
                <span className="text-lg font-serif font-medium text-slate-800">₹{completedOrder.amount}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-4">
              <button
                id="receipt-restart-btn"
                onClick={handleResetWorkflow}
                className="w-full py-5 bg-[#8c2a1a] hover:bg-[#a63421] text-white text-[10px] font-sans font-black tracking-[0.2em] uppercase rounded-full shadow-lg transition-all duration-300 flex items-center justify-center gap-3 active:scale-95"
              >
                Create Another Keepsake <ArrowRight className="w-4 h-4" />
              </button>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    const link = document.createElement("a");
                    link.download = `Studio-Souvenir-${completedOrder.id.slice(-6)}.jpg`;
                    link.href = completedOrder.finalImageUri;
                    link.click();
                  }}
                  className="py-4 bg-white border border-slate-200 text-slate-600 text-[10px] font-sans font-black tracking-[0.2em] uppercase rounded-full transition-colors hover:bg-slate-50 flex items-center justify-center gap-2"
                >
                  Download JPG
                </button>
                <button
                  onClick={() => setActiveScreen("admin")}
                  className="py-4 bg-transparent text-slate-400 hover:text-slate-600 text-[10px] font-sans font-black tracking-[0.2em] uppercase transition-colors"
                >
                  Admin Console
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. BUSINESS OWNER ADMIN MODULE ROUTE */}
      {activeScreen === "admin" && (
        <AdminConsole
          userRole={adminRole}
          initialStallId={adminStallId}
          onBackToLanding={handleResetWorkflow}
        />
      )}

    </div>
  );

  function setAppliedAiOptions(opt: any) {
    setAiOptions(opt);
  }
}
