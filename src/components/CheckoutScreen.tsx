import React, { useState } from "react";
import { FrameTemplate, CartItem, generateThumbnail } from "../types";
import { ShoppingBag, Loader2, Smartphone, Check, Printer, ArrowRight, Trash2, Plus, Sparkles } from "lucide-react";

interface CheckoutScreenProps {
  cart: CartItem[];
  stallId?: string;
  onAddAnother: () => void;
  onRemoveItem: (id: string) => void;
  onPaymentSuccess: (orderId: string, orderDetails: any) => void;
  onBack: () => void;
}

export default function CheckoutScreen({
  cart,
  stallId = "stall_1",
  onAddAnother,
  onRemoveItem,
  onPaymentSuccess,
  onBack
}: CheckoutScreenProps) {
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [amountPerFrame, setAmountPerFrame] = useState(299);
  const [stallName, setStallName] = useState("Kria Studio");
  const [stallPhone, setStallPhone] = useState("+919876543210");
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [autoOpenWhatsapp, setAutoOpenWhatsapp] = useState(false);

  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`/api/settings?stall_id=${stallId}`);
        const data = await res.json();
        if (data) {
          if (data.pricePerFrame) setAmountPerFrame(data.pricePerFrame);
          if (data.stallName) setStallName(data.stallName);
          if (data.stallPhone) setStallPhone(data.stallPhone);
          if (data.whatsappEnabled !== undefined) setWhatsappEnabled(data.whatsappEnabled);
        }
      } catch (e) {
        console.error("Error fetching settings inside checkout:", e);
      }
    };
    fetchSettings();
  }, [stallId]);

  // Submit all order details in the cart, and instantly trigger print stack load
  const initiateOrderSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (cart.length === 0) {
      setFormError("Your order is empty. Please design at least one frame!");
      return;
    }

    if (!customerName.trim()) {
      setFormError("Please write down your name!");
      return;
    }

    // Phone validation (Optional)
    let phoneNo = "N/A";
    if (phone.trim() !== "") {
      phoneNo = phone.replace(/[^0-9+]/g, "");
      if (phoneNo.length < 10) {
        setFormError("Please provide a valid 10-digit WhatsApp phone number or leave it blank!");
        return;
      }
    }

    setSubmitting(true);

    try {
      const createdOrders = [];

      for (const item of cart) {
        // Create paid & completed order directly on backend bypass UPI modal overlay
        const createOrderRes = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stallId,
            customerName,
            phone: phoneNo,
            originalImage: item.finalImageUri, // raw or designed base
            templateId: item.template.id,
            finalImageUri: item.finalImageUri,
            thumbnailUri: item.thumbnailUri,
            aiOptions: item.aiOptions,
            editorState: item.editorState,
            amount: amountPerFrame,
            orderStatus: "paid", // lands instantly into live stack
            paymentStatus: "completed" // verified cash / pre-arranged stall payment
          })
        });

        const orderData = await createOrderRes.json();
        if (!orderData.success) {
          throw new Error(orderData.error || "Failed to log order on database.");
        }
        createdOrders.push(orderData.order);
      }

      // Generate the consolidated WhatsApp message for the store operator
      const ownerPhoneClean = stallPhone.replace(/[^0-9]/g, "");
      const finalOwnerNumber = ownerPhoneClean.length > 10 ? ownerPhoneClean : "91" + ownerPhoneClean;
      
      const ordersSummary = createdOrders.map((o, idx) => {
        const item = cart[idx];
        const caption = item.customText && item.customText.trim() !== "" ? `Caption: "${item.customText}"` : "No custom text";
        return `• Frame ${idx + 1}: ${item.template.name} (${caption}) [ID: #${o.id}]`;
      }).join("\n");

      const msg = `Hello ${stallName}! I just uploaded my customized magnetic souvenir card design(s).\n\n👤 Customer: ${customerName}\n📦 Total Items: ${cart.length} Frame(s)\n💵 Grand Total: ₹${cart.length * amountPerFrame}\n\nDesigns:\n${ordersSummary}\n\nPlease check my order(s) on your dashboard screen and start the high-res print! 📸✨`;
      
      const waUrl = `https://wa.me/${finalOwnerNumber}?text=${encodeURIComponent(msg)}`;
      
      // ONLY automatically redirect if explicitly selected and WhatsApp integrations are active
      if (whatsappEnabled && autoOpenWhatsapp) {
        try {
          window.open(waUrl, "_blank", "noopener,noreferrer");
        } catch (popupError) {
          console.warn("Auto-redirect was blocked by browser popup settings:", popupError);
        }
      }

      // Success callback passing along the consolidated order details
      onPaymentSuccess(createdOrders[0].id, { 
        id: createdOrders.map(o => o.id).join(", "),
        customerName,
        phone: phoneNo,
        templateId: cart.map(item => item.template.name).join(", "),
        amount: cart.length * amountPerFrame,
        finalImageUri: cart[0].finalImageUri, // fallback preview image to first frame
        thumbnailUri: cart[0].thumbnailUri,
        waUrl,
        whatsappEnabled 
      });
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || "An unexpected transaction error occurred.");
      setSubmitting(false);
    }
  };

  const grandTotal = cart.length * amountPerFrame;

  return (
    <div id="checkout-container" className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-start text-left animate-fadeIn">
      
      {/* LEFT: SOUVENIR CART SUMMARY & MULTI-PREVIEW CARD */}
      <div className="lg:col-span-6 bg-white/60 backdrop-blur-md border border-slate-200 rounded-[2.5rem] p-8 shadow-sm relative flex flex-col gap-6">
        
        <div className="w-full flex justify-between items-center pb-2 border-b border-slate-100">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-sans tracking-[0.2em] font-bold text-slate-400 uppercase">
              YOUR KEEPSAKES
            </span>
            <h3 className="text-2xl font-serif font-medium text-slate-800">
              Selected Frames ({cart.length})
            </h3>
          </div>
          <span className="text-xs font-sans font-bold bg-[#8c2a1a]/10 text-[#8c2a1a] px-3.5 py-1.5 rounded-full">
            Total: ₹{grandTotal}
          </span>
        </div>

        {/* Dynamic List of Frames in Cart */}
        <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
          {cart.map((item, index) => (
            <div 
              key={item.id} 
              className="group bg-white p-4 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all flex items-center justify-between gap-4 shadow-sm"
            >
              <div className="flex items-center gap-4">
                {/* Thumbnail representation */}
                <div className="relative w-20 h-20 bg-slate-50 rounded-xl overflow-hidden shadow-inner shrink-0 flex items-center justify-center">
                  {(item.thumbnailUri || item.finalImageUri) ? (
                    <img src={item.thumbnailUri || item.finalImageUri} alt="Souvenir Preview" className="w-full h-full object-cover" />
                  ) : (
                    <ShoppingBag className="w-6 h-6 text-slate-300" />
                  )}
                  <div className="absolute inset-0 bg-black/5" />
                  <span className="absolute bottom-1 right-1 text-[8px] bg-slate-900/80 text-white font-sans font-bold px-1.5 py-0.5 rounded-md">
                    #{index + 1}
                  </span>
                </div>
                
                {/* Details */}
                <div className="space-y-1 text-left">
                  <h4 className="text-sm font-sans font-black text-slate-800 tracking-tight">
                    {item.template.name}
                  </h4>
                  {item.customText && item.customText.trim() !== "" ? (
                    <p className="text-xs text-slate-500 font-serif italic line-clamp-1 max-w-[180px]">
                      "{item.customText}"
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-400 font-sans tracking-widest uppercase">
                      No custom text
                    </p>
                  )}
                  <span className="text-[10px] font-sans font-bold text-[#8c2a1a] block">
                    ₹{amountPerFrame}
                  </span>
                </div>
              </div>

              {/* Remove item button (only visible if more than 1 item) */}
              {cart.length > 1 && (
                <button 
                  onClick={() => onRemoveItem(item.id)}
                  type="button"
                  className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all shrink-0"
                  title="Remove this frame"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Action button to design another frame! */}
        <button
          onClick={onAddAnother}
          type="button"
          className="w-full py-4 border-2 border-dashed border-slate-200 hover:border-[#8c2a1a]/40 bg-white/40 hover:bg-white text-[10px] font-sans font-black tracking-[0.2em] uppercase rounded-2xl text-slate-500 hover:text-[#8c2a1a] transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
        >
          <Plus className="w-4 h-4" /> Design Another Frame
        </button>

        {/* Quality indicator footer */}
        <div className="flex justify-between items-center text-[8px] font-sans font-black tracking-[0.2em] text-slate-300 uppercase mt-2 pt-2 border-t border-slate-100">
          <span>High Quality Print</span>
          <span>Magnetic Keepsake</span>
        </div>
      </div>

      {/* RIGHT: BILLING DETAILS FORM CARD */}
      <div className="lg:col-span-6 bg-white/60 backdrop-blur-md border border-slate-200 rounded-[2.5rem] p-10 shadow-sm relative">
        <div className="flex flex-col gap-2 mb-8">
          <span className="text-[10px] font-sans tracking-[0.2em] font-bold text-slate-400 uppercase">
            ORDER DETAILS
          </span>
          <h3 className="text-3xl font-serif font-medium text-slate-800">
            Print & Dispatch
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed font-sans font-medium mt-1">
            Enter your details below to place your order for printing.
          </p>
        </div>

        {formError && (
          <div className="mb-6 bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center gap-3 text-xs text-rose-600 font-sans font-bold uppercase tracking-wider">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={initiateOrderSubmission} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-sans font-bold text-slate-400 tracking-widest uppercase ml-1">Name</label>
            <input
              id="customer-name-field"
              type="text"
              required
              placeholder="Your Name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl text-slate-800 outline-none focus:border-[#8c2a1a]/30 text-sm font-sans font-medium transition-all shadow-inner"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-sans font-bold text-slate-400 tracking-widest uppercase ml-1">Phone / WhatsApp</label>
            <input
              id="whatsapp-phone-field"
              type="tel"
              placeholder="Mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl text-slate-800 outline-none focus:border-[#8c2a1a]/30 text-sm font-sans font-medium transition-all shadow-inner"
            />
          </div>

          {whatsappEnabled && (
            <div 
              onClick={() => setAutoOpenWhatsapp(!autoOpenWhatsapp)}
              className="flex items-center gap-4 px-6 py-4 bg-white/40 border border-slate-100 rounded-2xl cursor-pointer hover:bg-white transition-colors"
            >
              <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                autoOpenWhatsapp ? "bg-[#8c2a1a] border-[#8c2a1a]" : "bg-white border-slate-200"
              }`}>
                {autoOpenWhatsapp && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className="text-[10px] font-sans font-bold text-slate-500 tracking-widest uppercase">
                Open WhatsApp on checkout
              </span>
            </div>
          )}

          <div className="bg-[#fcfaf9] border border-slate-100 rounded-[1.5rem] p-6 flex gap-4">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0">
              <Printer className="w-5 h-5 text-[#8c2a1a]" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-sans font-black tracking-widest text-slate-800 uppercase">Print Station</span>
              <p className="text-[10px] text-slate-400 leading-relaxed font-sans font-bold uppercase tracking-[0.05em]">
                Your design will be sent directly to the print queue.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <button
              id="checkout-submit-btn"
              type="submit"
              disabled={submitting}
              className="w-full py-5 bg-[#8c2a1a] hover:bg-[#a63421] text-white text-[10px] font-sans font-black tracking-[0.2em] uppercase rounded-full shadow-lg transition-all duration-300 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-70"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending {cart.length} Design(s) to Studio...
                </>
              ) : (
                <>
                  Confirm & Print {cart.length} Souvenir{cart.length > 1 ? "s" : ""} <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            <button
              id="checkout-back-btn"
              type="button"
              onClick={onBack}
              className="w-full py-4 bg-transparent text-slate-400 hover:text-slate-600 text-[10px] font-sans font-black tracking-[0.2em] uppercase transition-colors"
            >
              Back to Editor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
