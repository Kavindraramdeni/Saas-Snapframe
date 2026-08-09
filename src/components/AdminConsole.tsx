import React, { useState, useEffect } from "react";
import { 
  Users, Banknote, ClipboardList, Printer, CheckCircle, Search, 
  Trash2, Sliders, Smartphone, RefreshCw, Layers, ShieldAlert, CheckSquare, XSquare,
  Megaphone, Copy, Check, Plus, RotateCw, Image, Upload, X, ArrowUpRight
} from "lucide-react";
import { Order, AdminSettings, FrameTemplate, generateThumbnail } from "../types";
import CanvasEditor from "./CanvasEditor";

interface AdminConsoleProps {
  userRole?: "super_admin" | "stall_owner";
  initialStallId?: string;
  onBackToLanding: () => void;
}

function AdminConsole({ userRole = "super_admin", initialStallId = "stall_1", onBackToLanding }: AdminConsoleProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<any>({
    totalRevenue: 0,
    totalOrders: 0,
    pendingCount: 0,
    paidCount: 0,
    completedCount: 0,
    dailyRevenue: {},
    popularTemplates: {}
  });
  
  const [settings, setSettings] = useState<AdminSettings>({
    stallName: "KRIA STUDIO • GOA EDITION",
    pricePerFrame: 299,
    upiId: "kria-studio@okaxis",
    whatsappEnabled: true,
    autoPrintEnabled: false
  });

  const [whatsappLogs, setWhatsappLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"queue" | "super_admin" | "print_sizes" | "analytics" | "logs" | "settings">(
    userRole === "super_admin" ? "super_admin" : "queue"
  );
  const [statusFilter, setStatusFilter] = useState<string>("paid");
  const [copiedTextId, setCopiedTextId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshes, setRefreshes] = useState(0);

  // Form states
  const [editPrice, setEditPrice] = useState(299);
  const [editStallName, setEditStallName] = useState("");
  const [editUpiId, setEditUpiId] = useState("");
  const [editWhatsapp, setEditWhatsapp] = useState(true);
  const [editStallPhone, setEditStallPhone] = useState("+919876543210");
  const [editPrintPreset, setEditPrintPreset] = useState("square_magnet");
  
  const [editPrintWidth, setEditPrintWidth] = useState("3in");
  const [editPrintHeight, setEditPrintHeight] = useState("3in");
  const [editPrintOrientation, setEditPrintOrientation] = useState("square");
  const [editAutoPrint, setEditAutoPrint] = useState(false);

  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [templates, setTemplates] = useState<FrameTemplate[]>([]);
  const [disabledTemplateIds, setDisabledTemplateIds] = useState<string[]>([]);

  // New custom template form states
  const [newTmplName, setNewTmplName] = useState("");
  const [newTmplWidth, setNewTmplWidth] = useState("3.0");
  const [newTmplHeight, setNewTmplHeight] = useState("4.0");
  const [newTmplStyleType, setNewTmplStyleType] = useState("plain");
  const [newTmplCategory, setNewTmplCategory] = useState("vacation");
  const [newTmplColor, setNewTmplColor] = useState("slate");
  const [newTmplBorderColor, setNewTmplBorderColor] = useState("#475569");
  const [newTmplDescription, setNewTmplDescription] = useState("");
  
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [adminNotification, setAdminNotification] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  // Compositor States
  const [compositorPaperSize, setCompositorPaperSize] = useState<"A4" | "Letter" | "4x6" | "12x18">("4x6");
  const [compositorItems, setCompositorItems] = useState<any[]>([]);
  const [selectedCompItemId, setSelectedCompItemId] = useState<string | null>(null);
  const [compositorShowCropMarks, setCompositorShowCropMarks] = useState(true);
  const [compositorShowLabelTags, setCompositorShowLabelTags] = useState(true);
  const [isAssemblingSheet, setIsAssemblingSheet] = useState(false);  // Multi-Stall Management State
  const [stalls, setStalls] = useState<any[]>([]);
  const [selectedStallId, setSelectedStallId] = useState<string>(initialStallId);
  const [showAddStallModal, setShowAddStallModal] = useState(false);
  const [newStallNameInput, setNewStallNameInput] = useState("");
  const [newStallLocationInput, setNewStallLocationInput] = useState("");
  const [newStallPriceInput, setNewStallPriceInput] = useState("299");
  const [newStallUpiInput, setNewStallUpiInput] = useState("");
  const [newStallPhoneInput, setNewStallPhoneInput] = useState("+919876543210");

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setAdminNotification({ type, message });
    setTimeout(() => {
      setAdminNotification(null);
    }, 4500);
  };

  const loadTemplates = async () => {
    try {
      const res = await fetch("/api/templates");
      let list = await res.json();
      
      // Load custom templates from localStorage
      const customStored = localStorage.getItem("custom_magnet_templates");
      if (customStored) {
        try {
          const parsed = JSON.parse(customStored);
          if (Array.isArray(parsed)) {
            list = [...list, ...parsed];
          }
        } catch (e) {}
      }
      
      // Filter out disabled templates
      const disabledStored = localStorage.getItem("disabled_magnet_templates");
      if (disabledStored) {
        try {
          const parsed = JSON.parse(disabledStored);
          if (Array.isArray(parsed)) {
            setDisabledTemplateIds(parsed);
          }
        } catch (e) {}
      }

      setTemplates(list);
    } catch (e) {
      console.error("Error loading templates dataset:", e);
    }
  };

  // Fetch templates list on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  // Fetch data
  const fetchAllData = async () => {
    try {
      // Fetch stalls list
      const stallsRes = await fetch("/api/stalls");
      if (stallsRes.ok) {
        const stallsList = await stallsRes.json();
        setStalls(stallsList);
      }

      const queryStall = selectedStallId ? `?stall_id=${selectedStallId}` : "";

      const ordersRes = await fetch(`/api/orders${queryStall}`);
      const ordersList = await ordersRes.json();

      // Detect new incoming paid orders
      if (orders.length > 0) {
        const newPaidOrders = ordersList.filter((o: Order) => 
          o.orderStatus === "paid" && 
          !orders.some(prev => prev.id === o.id)
        );

        if (newPaidOrders.length > 0) {
          newPaidOrders.forEach((newOrder: Order) => {
            if (settings.autoPrintEnabled) {
              handleDirectPrint(newOrder);
              showToast(`🚨 Auto-Print: Compiled layout for Order #${newOrder.id}!`, "success");
            } else {
              showToast(`📸 Received Order #${newOrder.id} successfully!`, "info");
            }
          });
        }
      }

      setOrders(ordersList);

      const statsRes = await fetch(`/api/analytics${queryStall}`);
      const statsObj = await statsRes.json();
      setStats(statsObj);

      const logsRes = await fetch(`/api/whatsapp/logs${queryStall}`);
      const logsList = await logsRes.json();
      setWhatsappLogs(logsList);

      const settingsRes = await fetch(`/api/settings${queryStall}`);
      const settingsObj = await settingsRes.json();
      setSettings(settingsObj);
      setEditPrice(settingsObj.pricePerFrame);
      setEditStallName(settingsObj.stallName);
      setEditUpiId(settingsObj.upiId);
      setEditWhatsapp(settingsObj.whatsappEnabled);
      setEditStallPhone(settingsObj.stallPhone || "+919876543210");
      setEditPrintPreset(settingsObj.printPreset || "square_magnet");
      setEditPrintWidth(settingsObj.printWidth || "3in");
      setEditPrintHeight(settingsObj.printHeight || "3in");
      setEditPrintOrientation(settingsObj.printOrientation || "square");
      setEditAutoPrint(settingsObj.autoPrintEnabled || false);
      setEditOwnerPin(settingsObj.ownerPin || "1111");
      setEditOwnerEmail(settingsObj.ownerEmail || "partner@snapframe.ai");
    } catch (e) {
      console.error("Error loading admin core datasets:", e);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [refreshes, selectedStallId]);

  // Periodic order background scanner running every 4.5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      fetchAllData();
    }, 4500);
    return () => clearInterval(timer);
  }, [orders, settings]);

  const handleUpdateOrderStatus = async (orderId: string, nextStatus: string, nextPaymentStatus?: string) => {
    try {
      const updateData: any = { orderStatus: nextStatus };
      if (nextPaymentStatus) updateData.paymentStatus = nextPaymentStatus;

      const res = await fetch(`/api/orders/${orderId}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData)
      });
      const data = await res.json();
      if (data.success) {
        setRefreshes(prev => prev + 1);
        showToast(`Order status updated to ${nextStatus}`, "success");
      }
    } catch (e) {
      console.error("Failed status update:", e);
    }
  };

  const getFullOrder = async (orderId: string): Promise<Order | null> => {
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.error("Error loading single order details:", e);
    }
    return null;
  };

  const handleDirectPrint = async (order: Order) => {
    let fullOrder = order;
    if (!order.finalImageUri) {
      showToast("Loading high-res layout details...", "info");
      const loaded = await getFullOrder(order.id);
      if (!loaded) {
        showToast("Failed to load high-res layout for printing.", "error");
        return;
      }
      fullOrder = loaded;
    }

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Find the template for dimensions
    const tmpl = templates.find(t => t.id === fullOrder.templateId);
    const itemW = tmpl?.widthIn || 3;
    const itemH = tmpl?.heightIn || 3;

    // Fixed paper size for local booth printer
    const w = "4in";
    const h = "6in";

    const printHtml = `
        <html>
          <head>
            <title>Studio Print - #${fullOrder.id}</title>
            <style>
              @page { size: 4in 6in; margin: 0px; }
              html, body {
                width: 4in; height: 6in;
                margin: 0 !important; padding: 0 !important;
                overflow: hidden !important; background-color: white;
                display: flex; align-items: center; justify-content: center;
              }
              .container {
                width: 4in; height: 6in;
                display: flex; align-items: center; justify-content: center;
                position: relative;
              }
              img {
                display: block;
                width: ${itemW}in;
                height: ${itemH}in;
                object-fit: contain;
                margin: 0; padding: 0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <img src="${fullOrder.finalImageUri}" onload="setTimeout(function(){ window.print(); }, 400);" />
            </div>
          </body>
        </html>
      `;

    if (isMobile) {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        showToast("Popup blocked! Allow popups to print.", "error");
        return;
      }
      printWindow.document.write(printHtml);
      printWindow.document.close();
    } else {
      let iframeObj = document.getElementById("direct-print-iframe") as HTMLIFrameElement | null;
      if (!iframeObj) {
        iframeObj = document.createElement("iframe");
        iframeObj.id = "direct-print-iframe";
        iframeObj.style.position = "fixed";
        iframeObj.style.width = "0px"; iframeObj.style.height = "0px";
        iframeObj.style.border = "0";
        document.body.appendChild(iframeObj);
      }

      const doc = iframeObj.contentWindow?.document || iframeObj.contentDocument;
      if (doc) {
        doc.open();
        doc.write(printHtml);
        doc.close();
        setTimeout(() => {
          iframeObj?.contentWindow?.focus();
          iframeObj?.contentWindow?.print();
        }, 500);
      }
    }

    if (fullOrder.orderStatus === "paid") {
      handleUpdateOrderStatus(fullOrder.id, "printed");
    }
  };

  const handleBatchPrint2Up = async (orderA: Order, orderB: Order) => {
    showToast("Preparing 2-Up 4x6 composite print...", "info");
    let fullA = orderA.finalImageUri ? orderA : await getFullOrder(orderA.id);
    let fullB = orderB.finalImageUri ? orderB : await getFullOrder(orderB.id);

    if (!fullA || !fullB) {
      showToast("Could not fetch full image details for batch printing.", "error");
      return;
    }

    const canvasW = 1200; // 4" @ 300 DPI
    const canvasH = 1800; // 6" @ 300 DPI
    const canvasObj = document.createElement("canvas");
    canvasObj.width = canvasW;
    canvasObj.height = canvasH;
    const ctx = canvasObj.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Draw dashed dividing cut line at middle (y = 900)
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 12]);
    ctx.beginPath();
    ctx.moveTo(0, 900);
    ctx.lineTo(1200, 900);
    ctx.stroke();
    ctx.setLineDash([]);

    const loadImage = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        const isLocal = src.startsWith("data:") || src.startsWith("blob:") || !src.startsWith("http");
        if (!isLocal) img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Failed image load"));
        img.src = src;
      });
    };

    try {
      const [imgA, imgB] = await Promise.all([
        loadImage(fullA.finalImageUri || fullA.originalImage),
        loadImage(fullB.finalImageUri || fullB.originalImage)
      ]);

      // Draw Top Order A (centered in y: 0..900)
      ctx.save();
      const padA = 40;
      const slotWA = canvasW - padA * 2;
      const slotHA = 900 - padA * 2;
      const aspectA = imgA.naturalWidth / imgA.naturalHeight;
      let drawWA = slotWA;
      let drawHA = drawWA / aspectA;
      if (drawHA > slotHA) {
        drawHA = slotHA;
        drawWA = drawHA * aspectA;
      }
      const xA = (canvasW - drawWA) / 2;
      const yA = (900 - drawHA) / 2;
      ctx.drawImage(imgA, xA, yA, drawWA, drawHA);

      // Label text for top order
      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`#${fullA.id} - ${fullA.customerName.toUpperCase()}`, 30, 880);
      ctx.restore();

      // Draw Bottom Order B (centered in y: 900..1800)
      ctx.save();
      const padB = 40;
      const slotWB = canvasW - padB * 2;
      const slotHB = 900 - padB * 2;
      const aspectB = imgB.naturalWidth / imgB.naturalHeight;
      let drawWB = slotWB;
      let drawHB = drawWB / aspectB;
      if (drawHB > slotHB) {
        drawHB = slotHB;
        drawWB = drawHB * aspectB;
      }
      const xB = (canvasW - drawWB) / 2;
      const yB = 900 + (900 - drawHB) / 2;
      ctx.drawImage(imgB, xB, yB, drawWB, drawHB);

      // Label text for bottom order
      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`#${fullB.id} - ${fullB.customerName.toUpperCase()}`, 30, 930);
      ctx.restore();

      const compiledUrl = canvasObj.toDataURL("image/png");
      let iframe = document.getElementById("direct-print-iframe") as HTMLIFrameElement | null;
      if (!iframe) {
        iframe = document.createElement("iframe");
        iframe.id = "direct-print-iframe";
        iframe.style.position = "fixed";
        iframe.style.width = "0px"; iframe.style.height = "0px";
        iframe.style.border = "0";
        document.body.appendChild(iframe);
      }

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(`
          <html>
            <head>
              <title>2-Up 4x6 Composite - #${fullA.id} & #${fullB.id}</title>
              <style>
                @page { size: 4in 6in; margin: 0px; }
                body { margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; background-color: white; }
                img { width: 100vw; height: 100vh; object-fit: contain; }
              </style>
            </head>
            <body>
              <img src="${compiledUrl}" onload="setTimeout(function(){ window.print(); }, 400);" />
            </body>
          </html>
        `);
        doc.close();
        setTimeout(() => {
          iframe?.contentWindow?.focus();
          iframe?.contentWindow?.print();
        }, 600);
      }

      if (fullA.orderStatus === "paid") handleUpdateOrderStatus(fullA.id, "printed");
      if (fullB.orderStatus === "paid") handleUpdateOrderStatus(fullB.id, "printed");

      showToast(`Printed 2-in-1 layout for #${fullA.id} & #${fullB.id} onto 4"x6" paper!`, "success");
    } catch (err) {
      console.error(err);
      showToast("Error generating 2-Up print layout.", "error");
    }
  };

  const handleEditClick = async (order: Order) => {
    let fullOrder = order;
    if (!order.originalImage) {
      showToast("Loading high-res layout details...", "info");
      const loaded = await getFullOrder(order.id);
      if (!loaded) {
        showToast("Failed to load high-res layout for editing.", "error");
        return;
      }
      fullOrder = loaded;
    }
    setEditingOrder(fullOrder);
  };

  const handleDeleteOrder = async (orderId: string, confirmBypass: boolean = false) => {
    if (!confirmBypass) {
      setDeleteConfirmId(orderId);
      return;
    }
    try {
      await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
      showToast(`Order #${orderId} removed.`, "success");
      setRefreshes(prev => prev + 1);
    } catch (e) {
      console.error(e);
      showToast("Delete failed.", "error");
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handleToggleTemplate = (id: string) => {
    let nextDisabled = [...disabledTemplateIds];
    if (nextDisabled.includes(id)) {
      nextDisabled = nextDisabled.filter(item => item !== id);
    } else {
      nextDisabled.push(id);
    }
    setDisabledTemplateIds(nextDisabled);
    localStorage.setItem("disabled_magnet_templates", JSON.stringify(nextDisabled));
    showToast(`Frame visibility updated.`, "success");
    window.dispatchEvent(new Event("storage"));
  };

  const [editOwnerPin, setEditOwnerPin] = useState("1111");
  const [editOwnerEmail, setEditOwnerEmail] = useState("");
  const [newStallPinInput, setNewStallPinInput] = useState("");
  const [newStallEmailInput, setNewStallEmailInput] = useState("");
  const [masterPinInput, setMasterPinInput] = useState("");

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stallId: selectedStallId,
          stallName: editStallName,
          pricePerFrame: editPrice,
          upiId: editUpiId,
          whatsappEnabled: editWhatsapp,
          autoPrintEnabled: editAutoPrint,
          ownerPin: editOwnerPin,
          ownerEmail: editOwnerEmail
        })
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        showToast("Settings and Owner Console PIN updated successfully", "success");
        setRefreshes(prev => prev + 1);
      }
    } catch (e) {
      showToast("Failed to save settings", "error");
    }
  };

  const handleClearWhatsappLogs = async () => {
    try {
      await fetch("/api/whatsapp/clear", { method: "POST" });
      setWhatsappLogs([]);
      showToast("Communication logs cleared", "info");
    } catch (e) {
      showToast("Failed to clear logs", "error");
    }
  };

  const isFits2UpOn4x6 = (templateId: string): boolean => {
    const tmpl = templates.find(t => t.id === templateId);
    if (!tmpl) return true;
    const w = tmpl.widthIn || 3;
    const h = tmpl.heightIn || 3;
    // 4x6 paper is 4.0in x 6.0in.
    // Full size 4x6 (Grande) or 5x7 (Scalloped Stand) cannot fit 2-Up on a single 4x6 sheet.
    if (w >= 4.0 && h >= 5.0) return false;
    if (w >= 4.0 && h >= 6.0) return false;
    if (h > 3.2 && w > 3.5) return false;
    return true;
  };

  const addFrameToCompositor = (templateId: string) => {
    const tmpl = templates.find(t => t.id === templateId) || templates[0];
    const newId = "comp_" + Math.random().toString(36).substring(2, 9);
    
    // Default dimensions based on templates
    let widthMm = 76;
    let heightMm = 76;
    const tId = templateId.toLowerCase();
    if (tId.includes("beach-retro") || tId.includes("k1")) {
      widthMm = 70; heightMm = 70;
    } else if (tId.includes("k4") || tId.includes("polaroid")) {
      widthMm = 89; heightMm = 108;
    } else if (tId.includes("strip-small") || tId.includes("k7")) {
      widthMm = 57; heightMm = 152;
    } else if (tId.includes("jumbo") || tId.includes("k9")) {
      widthMm = 102; heightMm = 152;
    } else if (tId.includes("couple-love") || tId.includes("k10")) {
      widthMm = 102; heightMm = 102;
    }
    
    setCompositorItems(prev => [...prev, {
      id: newId,
      templateId: tmpl.id,
      name: tmpl.name.split(" (")[0],
      widthMm,
      heightMm,
      xPercent: 10,
      yPercent: 10,
      imageUri: null,
      rotation: 0
    }]);
    setSelectedCompItemId(newId);
    showToast(`Added ${tmpl.name.split(" (")[0]} to layout`, "success");
  };

  const handleAssembleBatchPrint = () => {
    if (compositorItems.length === 0) {
      showToast("Place at least one magnet frame onto the print sheet layout first!", "error");
      return;
    }
    
    const sizeMapping = {
      A4: { wMm: 210, hMm: 297 },
      Letter: { wMm: 216, hMm: 279 },
      "4x6": { wMm: 102, hMm: 152 },
      "12x18": { wMm: 305, hMm: 457 }
    };
    
    const currentPaper = sizeMapping[compositorPaperSize];
    const DPI = 300;
    const MM_TO_INCH = 25.4;
    
    const canvasW = Math.round((currentPaper.wMm / MM_TO_INCH) * DPI);
    const canvasH = Math.round((currentPaper.hMm / MM_TO_INCH) * DPI);
    
    const canvasObj = document.createElement("canvas");
    canvasObj.width = canvasW;
    canvasObj.height = canvasH;
    const ctxObj = canvasObj.getContext("2d");
    if (!ctxObj) return;
    
    ctxObj.fillStyle = "#ffffff";
    ctxObj.fillRect(0, 0, canvasW, canvasH);
    
    const activeItems = compositorItems;
    const activeImages = activeItems.filter(item => item.imageUri);
    
    const loadedImagesMap: { [id: string]: HTMLImageElement } = {};

    const fireRender = () => {
      activeItems.forEach(item => {
        const tmpl = templates.find(t => t.id === item.templateId) || templates[0];
        const physX = (item.xPercent / 100) * canvasW;
        const physY = (item.yPercent / 100) * canvasH;
        const physW = (item.widthMm / currentPaper.wMm) * canvasW;
        const physH = (item.heightMm / currentPaper.hMm) * canvasH;
        
        ctxObj.save();
        ctxObj.translate(physX + physW / 2, physY + physH / 2);
        ctxObj.rotate((item.rotation * Math.PI) / 180);
        ctxObj.translate(-physW / 2, -physH / 2);
        
        if (compositorShowCropMarks) {
          ctxObj.strokeStyle = "#bbbbbb";
          ctxObj.lineWidth = 3;
          ctxObj.setLineDash([10, 10]);
          ctxObj.strokeRect(-4, -4, physW + 8, physH + 8);
          ctxObj.setLineDash([]);
        }
        
        if (tmpl.styleType !== "plain") {
          ctxObj.fillStyle = "#ffffff";
          ctxObj.beginPath();
          ctxObj.rect(0, 0, physW, physH);
          ctxObj.fill();
          
          ctxObj.strokeStyle = tmpl.borderColor || "#e2e8f0";
          ctxObj.lineWidth = 2.5;
          ctxObj.stroke();
        }
        
        const cachedImg = loadedImagesMap[item.id] || (document.getElementById(`drag-cache-${item.id}`) as HTMLImageElement | null);
        if (cachedImg) {
          ctxObj.save();
          ctxObj.beginPath();
          ctxObj.rect(0, 0, physW, physH);
          ctxObj.clip();
          
          const naturalW = cachedImg.naturalWidth || 400;
          const naturalH = cachedImg.naturalHeight || 400;
          const naturalAspect = naturalW / naturalH;
          let drawW = physW;
          let drawH = drawW / naturalAspect;
          if (drawH < physH) {
            drawH = physH;
            drawW = drawH * naturalAspect;
          }
          ctxObj.drawImage(cachedImg, (physW - drawW) / 2, (physH - drawH) / 2, drawW, drawH);
          ctxObj.restore();
        }
        
        if (tmpl.defaultText && tmpl.styleType !== "plain") {
          ctxObj.save();
          const fontSize = Math.floor(physW * 0.057);
          ctxObj.font = `bold ${fontSize}px serif`;
          ctxObj.textAlign = "center";
          ctxObj.textBaseline = "middle";
          const textY = physH - Math.floor(physH * 0.082);

          ctxObj.strokeStyle = "rgba(0, 0, 0, 0.8)";
          ctxObj.lineWidth = Math.max(2, Math.floor(physW * 0.008));
          ctxObj.strokeText(tmpl.defaultText.toUpperCase(), physW / 2, textY);

          ctxObj.fillStyle = "#ffffff";
          ctxObj.fillText(tmpl.defaultText.toUpperCase(), physW / 2, textY);
          ctxObj.restore();
        }
        
        ctxObj.restore();

        if (compositorShowLabelTags && item.customerName) {
          ctxObj.save();
          ctxObj.translate(physX + physW / 2, physY + physH + 18);
          ctxObj.fillStyle = "#888888";
          ctxObj.font = "bold 12px sans-serif";
          ctxObj.textAlign = "center";
          ctxObj.fillText(`${item.customerName.toUpperCase()}`, 0, 0);
          ctxObj.restore();
        }
      });
      
      const compiledUrl = canvasObj.toDataURL("image/png");
      let iframe = document.getElementById("direct-print-iframe") as HTMLIFrameElement | null;
      if (!iframe) {
        iframe = document.createElement("iframe");
        iframe.id = "direct-print-iframe";
        iframe.style.position = "fixed";
        iframe.style.width = "0px";
        iframe.style.height = "0px";
        iframe.style.border = "0";
        document.body.appendChild(iframe);
      }
      
      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(`
          <html>
            <head>
              <title>Assembled Composite - ${compositorPaperSize}</title>
              <style>
                @page { size: ${compositorPaperSize === "A4" ? "210mm 297mm" : compositorPaperSize === "Letter" ? "8.5in 11in" : compositorPaperSize === "4x6" ? "4in 6in" : "12in 18in"}; margin: 0px; }
                body { margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; background-color: white; }
                img { width: 100vw; height: 100vh; object-fit: contain; }
              </style>
            </head>
            <body>
              <img src="${compiledUrl}" onload="setTimeout(function(){ window.print(); }, 400);" />
            </body>
          </html>
        `);
        doc.close();
        setTimeout(() => {
          iframe?.contentWindow?.focus();
          iframe?.contentWindow?.print();
        }, 600);
        showToast(`Layout sheet compiled and sent to printer`, "success");
      }
    };
    
    if (activeImages.length === 0) {
      fireRender();
    } else {
      let okCount = 0;
      activeImages.forEach(item => {
        const i = new Image();
        const src = item.imageUri!;
        const isLocal = src.startsWith("data:") || src.startsWith("blob:") || !src.startsWith("http");
        if (!isLocal) i.crossOrigin = "anonymous";
        
        i.onload = () => {
          loadedImagesMap[item.id] = i;
          okCount++;
          if (okCount === activeImages.length) fireRender();
        };
        i.onerror = () => {
          okCount++;
          if (okCount === activeImages.length) fireRender();
        };
        i.src = src;
      });
    }
  };

  const handlePrintBatchSheet = () => {
    // Logic from the dark theme compositor already has a canvas rendering function 
    // but I'll implement a clean version later or use the existing one if I can.
    // For now, I'll just trigger the compositor tab.
    setActiveTab("compositor");
    showToast("Ready to assemble batch sheet", "info");
  };

  const handleResetTemplatesToDefault = () => {
    localStorage.removeItem("custom_magnet_templates");
    localStorage.removeItem("disabled_magnet_templates");
    setDisabledTemplateIds([]);
    loadTemplates();
    fetchAllData();
    showToast("Restored all frames.", "success");
    window.dispatchEvent(new Event("storage"));
  };

  const handleCreateCustomTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTmplName.trim()) {
      showToast("Please enter a frame name", "error");
      return;
    }
    const widthNum = parseFloat(newTmplWidth);
    const heightNum = parseFloat(newTmplHeight);
    if (isNaN(widthNum) || widthNum <= 0 || isNaN(heightNum) || heightNum <= 0) {
      showToast("Please enter valid width and height in inches", "error");
      return;
    }

    const newTmpl = {
      id: "custom-" + Date.now(),
      name: newTmplName,
      widthIn: widthNum,
      heightIn: heightNum,
      isActive: true,
      category: newTmplCategory as any,
      primaryColor: newTmplColor,
      borderColor: newTmplBorderColor,
      badgeText: `${widthNum}" × ${heightNum}"`,
      description: newTmplDescription || `${widthNum}in × ${heightNum}in customized shape style.`,
      styleType: newTmplStyleType as any,
      defaultText: ""
    };

    const customStored = localStorage.getItem("custom_magnet_templates");
    let currentCustom = [];
    if (customStored) {
      try {
        currentCustom = JSON.parse(customStored);
        if (!Array.isArray(currentCustom)) {
          currentCustom = [];
        }
      } catch (e) {}
    }

    currentCustom.push(newTmpl);
    localStorage.setItem("custom_magnet_templates", JSON.stringify(currentCustom));
    loadTemplates();
    showToast(`Added custom frame size: "${newTmplName}"!`, "success");
    window.dispatchEvent(new Event("storage"));

    // Reset Form
    setNewTmplName("");
    setNewTmplWidth("3.0");
    setNewTmplHeight("4.0");
    setNewTmplStyleType("plain");
    setNewTmplCategory("vacation");
    setNewTmplColor("slate");
    setNewTmplBorderColor("#475569");
    setNewTmplDescription("");
  };

  const filteredOrders = orders.filter(o => {
    const sFilter = statusFilter === "all" || o.orderStatus === statusFilter;
    const sSearch = searchQuery === "" || 
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.phone.includes(searchQuery) ||
      o.id.toLowerCase().includes(searchQuery.toLowerCase());
    return sFilter && sSearch;
  });

  return (
    <div id="admin-board" className="min-h-screen bg-[#f8f7f6] text-slate-800 p-4 sm:p-8 lg:p-12 relative selection:bg-[#8c2a1a] selection:text-white">
      
      {/* Premium Toast Notification Overlay */}
      {adminNotification && (
        <div id="admin-ui-toast" className={`fixed top-8 left-1/2 -translate-x-1/2 z-[100] max-w-sm w-full p-4 rounded-full border shadow-2xl flex items-center justify-between gap-4 animate-fadeIn ${
          adminNotification.type === "success" 
            ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
            : adminNotification.type === "error"
            ? "bg-rose-50 border-rose-100 text-rose-800"
            : "bg-white border-slate-100 text-slate-800"
        }`}>
          <div className="flex items-center gap-3 ml-2">
            <div className={`w-2 h-2 rounded-full ${
              adminNotification.type === "success" ? "bg-emerald-500" : adminNotification.type === "error" ? "bg-rose-500" : "bg-amber-500"
            }`} />
            <p className="text-[10px] font-sans font-black uppercase tracking-widest">{adminNotification.message}</p>
          </div>
          <button onClick={() => setAdminNotification(null)} className="p-2 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* HEADER */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 mb-16">
        <div className="text-center md:text-left space-y-1">
          <div className="flex items-center gap-4 justify-center md:justify-start flex-wrap">
            <h1 className="text-3xl font-serif font-medium text-[#8c2a1a]">Studio Admin Console</h1>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 font-sans text-[9px] font-black rounded-full border border-emerald-100 uppercase tracking-widest">
              Live Connection
            </span>
          </div>
          <p className="text-slate-400 font-sans text-[10px] font-bold uppercase tracking-widest">
            {settings.stallName} • Active ID: {selectedStallId}
          </p>
        </div>

        <div className="flex items-center gap-4 flex-wrap justify-center">
          {userRole === "super_admin" ? (
            <div className="flex items-center gap-2 bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm">
              <Users className="w-4 h-4 text-[#8c2a1a]" />
              <select
                value={selectedStallId}
                onChange={(e) => {
                  if (e.target.value === "new_stall") {
                    setShowAddStallModal(true);
                  } else {
                    setSelectedStallId(e.target.value);
                    showToast(`Switched active stall workspace`, "info");
                  }
                }}
                className="bg-transparent border-none text-[10px] font-sans font-black uppercase tracking-widest text-slate-700 outline-none cursor-pointer"
              >
                {stalls.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.location || 'Stall'})
                  </option>
                ))}
                <option value="new_stall">+ Register New Stall Owner</option>
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-[10px] font-sans font-black uppercase tracking-widest text-slate-800">
                📍 {settings.stallName}
              </span>
            </div>
          )}

          <button
            onClick={() => {
              const url = `${window.location.origin}/?stall=${selectedStallId}`;
              if (navigator.clipboard) {
                navigator.clipboard.writeText(url);
              }
              showToast(`Copied Tourist QR Link for ${settings.stallName}`, "success");
            }}
            className="px-6 py-3.5 bg-white border border-slate-100 text-slate-600 hover:text-[#8c2a1a] rounded-2xl shadow-sm transition-all active:scale-95 flex items-center gap-2 text-[10px] font-sans font-black uppercase tracking-widest"
            title="Copy Guest Table QR Link"
          >
            <Copy className="w-4 h-4" /> Guest QR Link
          </button>

          <button
            onClick={() => setRefreshes(prev => prev + 1)}
            className="p-3.5 bg-white border border-slate-100 text-slate-400 hover:text-slate-600 rounded-2xl shadow-sm transition-all active:scale-95"
            title="Refresh feeds"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          
          <button
            onClick={onBackToLanding}
            className="px-8 py-3.5 bg-[#8c2a1a] text-white rounded-full text-[10px] font-sans font-black uppercase tracking-[0.2em] shadow-xl hover:bg-[#a63421] transition-all"
          >
            Exit Console
          </button>
        </div>
      </header>

      {/* STATS MATRIX */}
      <section className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        {(userRole === "super_admin" ? [
          { label: "SaaS Platform Revenue", val: `₹${stats.totalRevenue || 0}`, icon: <Banknote className="w-5 h-5 text-emerald-500" />, color: "text-emerald-600" },
          { label: "Registered Stalls", val: stalls.length || 0, icon: <Users className="w-5 h-5 text-purple-500" />, color: "text-purple-700" },
          { label: "Pending Prints", val: stats.paidCount || 0, icon: <Printer className="w-5 h-5 text-amber-500" />, color: "text-amber-600" },
          { label: "Total Photo Orders", val: stats.totalOrders || 0, icon: <CheckCircle className="w-5 h-5 text-[#8c2a1a]" />, color: "text-[#8c2a1a]" }
        ] : [
          { label: "Stall Income", val: `₹${stats.totalRevenue || 0}`, icon: <Banknote className="w-5 h-5 text-emerald-500" />, color: "text-emerald-600" },
          { label: "Needs Printing", val: stats.paidCount || 0, icon: <Printer className="w-5 h-5 text-amber-500" />, color: "text-amber-600" },
          { label: "Collected", val: stats.completedCount || 0, icon: <CheckCircle className="w-5 h-5 text-[#8c2a1a]" />, color: "text-[#8c2a1a]" },
          { label: "Total Guests", val: stats.totalOrders || 0, icon: <Users className="w-5 h-5 text-slate-400" />, color: "text-slate-600" }
        ]).map((s, idx) => (
          <div key={idx} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-4 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-sans font-black uppercase tracking-widest text-slate-400">{s.label}</span>
              {s.icon}
            </div>
            <div className={`text-4xl font-serif font-medium ${s.color}`}>{s.val}</div>
          </div>
        ))}
      </section>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-12">
        
        {/* SIDE NAV */}
        <aside className="lg:w-64 shrink-0 flex lg:flex-col gap-2 overflow-x-auto pb-4 lg:pb-0 scrollbar-hide">
          {(userRole === "super_admin" ? [
            { id: "super_admin", label: "👑 SaaS Stalls Control", icon: <Users className="w-4 h-4" /> },
            { id: "analytics", label: "Global SaaS Analytics", icon: <ArrowUpRight className="w-4 h-4" /> },
            { id: "queue", label: "Inspect Live Queue", icon: <Printer className="w-4 h-4" /> }
          ] : [
            { id: "queue", label: "Printing Queue", icon: <Printer className="w-4 h-4" /> },
            { id: "print_sizes", label: "Print Sizes Catalog", icon: <Layers className="w-4 h-4" /> },
            { id: "analytics", label: "Stall Analytics", icon: <ArrowUpRight className="w-4 h-4" /> },
            { id: "logs", label: "Dispatch Logs", icon: <Smartphone className="w-4 h-4" /> },
            { id: "settings", label: "Stall Settings", icon: <Sliders className="w-4 h-4" /> }
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-sans font-black uppercase tracking-widest transition-all text-left shrink-0 ${
                activeTab === tab.id
                  ? "bg-white text-[#8c2a1a] shadow-md border border-slate-100"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </aside>

        {/* WORK MODULE */}
        <div className="flex-1 min-w-0">          {/* QUEUE MODULE */}
          {activeTab === "queue" && (
            <div className="space-y-10 animate-fadeIn">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div className="flex flex-wrap gap-2">
                  {["all", "pending", "paid", "printed", "completed"].map((f) => {
                    const labelMap: Record<string, string> = {
                      all: "All Orders",
                      pending: "Awaiting Payment",
                      paid: "Ready to Print",
                      printed: "Printed / Ready",
                      completed: "Collected"
                    };
                    return (
                      <button
                        key={f}
                        onClick={() => setStatusFilter(f)}
                        className={`px-6 py-2 rounded-full text-[10px] font-sans font-black uppercase tracking-widest transition-all ${
                          statusFilter === f 
                            ? "bg-[#8c2a1a] text-white shadow-lg" 
                            : "bg-white text-slate-400 hover:text-slate-600 border border-slate-100"
                        }`}
                      >
                        {labelMap[f] || f}
                      </button>
                    );
                  })}
                </div>
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input
                    type="text"
                    placeholder="Search guest orders..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-14 pr-6 py-4 bg-white rounded-full border border-slate-100 outline-none focus:ring-1 focus:ring-[#8c2a1a]/20 transition-all font-serif italic text-sm"
                  />
                </div>
              </div>

              {(() => {
                const ready2Up = orders.filter(o => o.orderStatus === "paid" && isFits2UpOn4x6(o.templateId));
                if (ready2Up.length < 2) return null;
                return (
                  <div className="bg-amber-50 border border-amber-200/80 rounded-[2rem] p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-fadeIn">
                    <div className="flex items-center gap-4 text-left">
                      <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-sm">
                        <Printer className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-sans font-black text-amber-950 uppercase tracking-wider">
                          ⚡ {ready2Up.length} Compatible Small Frames Ready (4" × 6" Saver)
                        </h4>
                        <p className="text-xs text-amber-800/80 font-medium">
                          Combine #{ready2Up[0].id} & #{ready2Up[1].id} onto 1 sheet of 4" × 6" paper with cut line. Saves 50% paper!
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleBatchPrint2Up(ready2Up[0], ready2Up[1])}
                      className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-sans font-black uppercase tracking-widest rounded-full shadow-md transition-all shrink-0 active:scale-95"
                    >
                      Print 2-in-1 on 4"×6"
                    </button>
                  </div>
                );
              })()}

              {filteredOrders.length === 0 ? (
                <div className="py-32 bg-white rounded-[3rem] border border-slate-50 text-center">
                  <p className="text-[10px] font-sans font-black text-slate-300 uppercase tracking-[0.3em]">The queue is silent</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredOrders.map((ord) => {
                    const fits2Up = isFits2UpOn4x6(ord.templateId);
                    const tmplObj = templates.find(t => t.id === ord.templateId);
                    return (
                      <div key={ord.id} className="group bg-white p-8 rounded-[2.5rem] border border-slate-100 hover:border-slate-200 transition-all flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex items-center gap-8 w-full md:w-auto">
                          <div className="relative w-32 h-32 bg-slate-50 rounded-[2rem] overflow-hidden group-hover:scale-105 transition-transform duration-500 shadow-sm flex items-center justify-center">
                            {(ord.thumbnailUri || ord.finalImageUri) ? (
                              <img src={ord.thumbnailUri || ord.finalImageUri} className="w-full h-full object-cover" />
                            ) : (
                              <Image className="w-8 h-8 text-slate-300" />
                            )}
                            <div className="absolute inset-0 bg-black/5" />
                          </div>
                          <div className="space-y-1.5 text-left">
                            <div className="flex items-center gap-2">
                              <p className="text-[10px] font-sans font-black text-[#8c2a1a] uppercase tracking-widest">#{ord.id}</p>
                              {fits2Up ? (
                                <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[8px] font-sans font-black uppercase tracking-wider">
                                  4×6 2-Up Fit
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 bg-purple-50 text-purple-600 border border-purple-100 rounded-full text-[8px] font-sans font-black uppercase tracking-wider">
                                  Full Page Frame
                                </span>
                              )}
                            </div>
                            <h4 className="text-xl font-serif font-medium text-slate-800">{ord.customerName}</h4>
                            <p className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-widest">
                              {ord.phone} • {tmplObj?.name || ord.templateId} • {new Date(ord.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                        {ord.orderStatus === "pending" && (
                          <button onClick={() => handleUpdateOrderStatus(ord.id, "paid")} className="px-8 py-4 bg-[#8c2a1a] text-white text-[10px] font-sans font-black uppercase tracking-widest rounded-full hover:shadow-xl transition-all active:scale-95">Verify Payment</button>
                        )}
                        {ord.orderStatus === "paid" && (
                          <div className="flex items-center gap-3">
                            <button onClick={() => handleDirectPrint(ord)} className="px-8 py-4 bg-emerald-500 text-white text-[10px] font-sans font-black uppercase tracking-widest rounded-full hover:shadow-xl transition-all flex items-center gap-2">
                              <Printer className="w-4 h-4" /> Print Frame
                            </button>
                            <button onClick={() => handleEditClick(ord)} className="p-4 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full transition-all">
                              <Sliders className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        {ord.orderStatus === "printed" && (
                          <button onClick={() => handleUpdateOrderStatus(ord.id, "completed")} className="px-8 py-4 bg-slate-800 text-white text-[10px] font-sans font-black uppercase tracking-widest rounded-full hover:shadow-xl transition-all">Mark Collected</button>
                        )}
                        {ord.orderStatus === "completed" && (
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-sans font-black text-emerald-500 uppercase tracking-widest px-4">Collected</span>
                            <button onClick={() => handleUpdateOrderStatus(ord.id, "paid")} className="text-[10px] font-sans font-black text-slate-300 uppercase tracking-widest hover:text-[#8c2a1a] transition-colors">Re-open</button>
                          </div>
                        )}
                        
                        <div className="h-8 w-px bg-slate-100 mx-2" />
                        
                        <button onClick={() => handleDeleteOrder(ord.id, true)} className="p-4 text-slate-200 hover:text-rose-400 transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                </div>
              )}
            </div>
          )}

          {/* SUPER ADMIN PLATFORM CONTROL MODULE */}
          {activeTab === "super_admin" && (
            <div className="bg-white rounded-[3rem] border border-slate-100 p-10 space-y-10 animate-fadeIn text-left shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-8">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-serif font-medium text-slate-800">👑 Super Admin Platform Control</h3>
                    <span className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-100 rounded-full text-[9px] font-sans font-black uppercase tracking-widest">
                      Main Platform Owner Mode
                    </span>
                  </div>
                  <p className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Manage magnetic frame stall subscriptions, active/inactive tenant access & QR links
                  </p>
                </div>
                <button
                  onClick={() => setShowAddStallModal(true)}
                  className="px-8 py-4 bg-[#8c2a1a] text-white text-[10px] font-sans font-black uppercase tracking-widest rounded-full shadow-lg hover:bg-[#a63421] transition-all shrink-0 active:scale-95"
                >
                  + Register New Stall Owner
                </button>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {stalls.map((s) => (
                  <div key={s.id} className="bg-slate-50/70 p-8 rounded-[2.5rem] border border-slate-100 hover:border-slate-200 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h4 className="text-xl font-serif font-medium text-slate-800">{s.name}</h4>
                        {s.isActive !== false ? (
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[9px] font-sans font-black uppercase tracking-widest">
                            Active Subscription
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded-full text-[9px] font-sans font-black uppercase tracking-widest">
                            Inactive / Suspended
                          </span>
                        )}
                        <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-full text-[9px] font-sans font-black uppercase tracking-widest">
                          {s.subscriptionPlan || 'Monthly Pro'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">
                        📍 {s.location || 'Tourist Station'} • Price: ₹{s.pricePerFrame}/frame • UPI: <code className="bg-white px-2 py-0.5 rounded border border-slate-200">{s.upiId}</code> • Phone: {s.stallPhone}
                      </p>
                      <p className="text-[10px] font-mono text-slate-400">
                        Tourist QR Link: <a href={`${window.location.origin}/?stall=${s.id}`} target="_blank" className="underline text-[#8c2a1a] font-bold">{`${window.location.origin}/?stall=${s.id}`}</a>
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 flex-wrap">
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/stalls/${s.id}/toggle-status`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ isActive: !s.isActive })
                            });
                            const data = await res.json();
                            if (data.success) {
                              showToast(`Subscription status for ${s.name} updated to ${!s.isActive ? 'Active' : 'Inactive'}`, "success");
                              fetchAllData();
                            }
                          } catch (err) {
                            showToast("Error updating stall subscription status", "error");
                          }
                        }}
                        className={`px-6 py-3.5 text-[10px] font-sans font-black uppercase tracking-widest rounded-full transition-all active:scale-95 shadow-sm ${
                          s.isActive !== false
                            ? "bg-rose-500 hover:bg-rose-600 text-white"
                            : "bg-emerald-500 hover:bg-emerald-600 text-white"
                        }`}
                      >
                        {s.isActive !== false ? "Disable Subscription" : "Activate Subscription"}
                      </button>

                      <button
                        onClick={() => {
                          setSelectedStallId(s.id);
                          setActiveTab("queue");
                          showToast(`Opened workspace for ${s.name}`, "info");
                        }}
                        className="px-6 py-3.5 bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-sans font-black uppercase tracking-widest rounded-full transition-all active:scale-95 shadow-sm"
                      >
                        Inspect Console
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-slate-50 p-6 rounded-3xl">
                <div className="space-y-1">
                  <h4 className="text-sm font-serif font-medium text-slate-800">🔐 Platform Security: Master Super Admin PIN</h4>
                  <p className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-widest">Update your Master Super Admin PIN so no stall owner can guess it</p>
                </div>
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!masterPinInput || masterPinInput.trim().length !== 4) {
                      showToast("Master PIN must be exactly 4 digits", "error");
                      return;
                    }
                    try {
                      const res = await fetch("/api/super-admin/update-pin", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ newPin: masterPinInput.trim() })
                      });
                      const data = await res.json();
                      if (data.success) {
                        showToast(`Master Super Admin PIN updated to: ${data.newPin}`, "success");
                        setMasterPinInput("");
                      } else {
                        showToast("Failed to update Master PIN", "error");
                      }
                    } catch (err) {
                      showToast("Error updating Master PIN", "error");
                    }
                  }}
                  className="flex items-center gap-3 w-full sm:w-auto"
                >
                  <input
                    type="password"
                    maxLength={32}
                    value={masterPinInput}
                    onChange={e => setMasterPinInput(e.target.value)}
                    placeholder="New Master Password"
                    className="px-5 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-mono font-bold text-[#8c2a1a] outline-none w-48 text-center tracking-widest shadow-sm"
                  />
                  <button type="submit" className="px-6 py-3 bg-slate-800 text-white text-[10px] font-sans font-black uppercase tracking-widest rounded-2xl hover:bg-slate-900 transition-all shadow-sm">
                    Update Master Password
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* PRINT SIZES MODULE */}
          {activeTab === "print_sizes" && (
            <div className="bg-white rounded-[3rem] border border-slate-100 p-10 space-y-12 animate-fadeIn text-left">
              <div className="space-y-1">
                <h3 className="text-2xl font-serif font-medium text-slate-800">Architectural Catalog</h3>
                <p className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-widest">Manage available magnet frame dimensions</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map(tmpl => {
                  const isToggledOff = disabledTemplateIds.includes(tmpl.id);
                  return (
                    <div key={tmpl.id} className={`p-8 rounded-[2.5rem] border transition-all flex items-center justify-between group ${
                      isToggledOff ? "bg-slate-50 border-slate-100 opacity-60" : "bg-white border-slate-100 shadow-sm hover:shadow-md"
                    }`}>
                      <div className="flex items-center gap-6">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-serif text-2xl ${
                          isToggledOff ? "bg-slate-100 text-slate-300" : "bg-[#8c2a1a]/5 text-[#8c2a1a]"
                        }`}>
                          {tmpl.name.charAt(0)}
                        </div>
                        <div>
                          <div className={`text-xs font-bold uppercase tracking-widest ${isToggledOff ? "text-slate-400" : "text-slate-800"}`}>{tmpl.name}</div>
                          <div className="text-[10px] text-slate-400 font-sans font-bold uppercase tracking-widest mt-0.5">{tmpl.widthIn}" × {tmpl.heightIn}"</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleTemplate(tmpl.id)}
                        className={`px-6 py-3 rounded-full text-[8px] font-sans font-black uppercase tracking-widest transition-all ${
                          isToggledOff ? "bg-slate-200 text-slate-500" : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                        }`}
                      >
                        {isToggledOff ? "ENABLE" : "ACTIVE"}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Add Custom Frame Size Form */}
              <div className="pt-10 border-t border-slate-100 space-y-6">
                <div className="space-y-1">
                  <h4 className="text-lg font-serif font-medium text-slate-800">Add New Frame Size</h4>
                  <p className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-widest">Create a custom architectural magnet dimension and shape mask</p>
                </div>

                <form onSubmit={handleCreateCustomTemplate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                  <div className="space-y-2">
                    <label className="text-[9px] font-sans font-black text-slate-400 uppercase tracking-widest">Frame Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Sunset Portrait"
                      value={newTmplName}
                      onChange={e => setNewTmplName(e.target.value)}
                      className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-1 focus:ring-[#8c2a1a] font-sans text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-[9px] font-sans font-black text-slate-400 uppercase tracking-widest">Width (Inches)</label>
                      <input
                        type="number"
                        step="0.05"
                        min="1"
                        max="20"
                        value={newTmplWidth}
                        onChange={e => setNewTmplWidth(e.target.value)}
                        className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-1 focus:ring-[#8c2a1a] font-sans text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-sans font-black text-slate-400 uppercase tracking-widest">Height (Inches)</label>
                      <input
                        type="number"
                        step="0.05"
                        min="1"
                        max="20"
                        value={newTmplHeight}
                        onChange={e => setNewTmplHeight(e.target.value)}
                        className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-1 focus:ring-[#8c2a1a] font-sans text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-sans font-black text-slate-400 uppercase tracking-widest">Shape Style / Mask</label>
                    <select
                      value={newTmplStyleType}
                      onChange={e => setNewTmplStyleType(e.target.value)}
                      className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-1 focus:ring-[#8c2a1a] font-sans text-xs"
                    >
                      <option value="plain">Square / Rectangle (Plain)</option>
                      <option value="polaroid">Vintage Polaroid Borders</option>
                      <option value="oval">Timeless Oval</option>
                      <option value="arch">The Arch Frame</option>
                      <option value="cloud">Whimsical Cloud</option>
                      <option value="heart">Sculpted Heart</option>
                      <option value="hexagon">Modern Hexagon</option>
                      <option value="scalloped">Scalloped Edges</option>
                      <option value="royal">Royal Crest</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-[#8c2a1a] text-white text-[10px] font-sans font-black uppercase tracking-widest rounded-2xl shadow-md hover:bg-[#a63421] transition-all"
                  >
                    Create Frame Size
                  </button>
                </form>
              </div>

              <div className="pt-8 border-t border-slate-50 flex justify-end">
                <button onClick={handleResetTemplatesToDefault} className="text-[10px] font-sans font-black text-[#8c2a1a] uppercase tracking-[0.2em] hover:underline transition-all">
                  Reset Catalog to Defaults
                </button>
              </div>
            </div>
          )}

          {/* ANALYTICS MODULE */}
          {activeTab === "analytics" && (
            <div className="space-y-8 animate-fadeIn text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white rounded-[3rem] border border-slate-100 p-10 space-y-8">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-serif font-medium text-slate-800">Daily Revenue</h3>
                    <span className="text-[10px] font-sans font-black text-emerald-500 uppercase tracking-widest">₹{stats.totalRevenue} Total</span>
                  </div>
                  <div className="h-64 flex items-end justify-between gap-2 pt-10 border-b border-slate-50">
                    {Object.entries(stats.dailyRevenue || {}).map(([date, rev]: any, i) => {
                      const max = Math.max(...Object.values(stats.dailyRevenue).map(Number), 1000);
                      const h = (Number(rev) / max) * 100;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-4 group h-full justify-end">
                          <div className="w-full bg-[#8c2a1a]/10 rounded-t-xl group-hover:bg-[#8c2a1a]/20 transition-all relative" style={{ height: `${h}%` }}>
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[8px] font-sans font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-all uppercase whitespace-nowrap">₹{rev}</div>
                          </div>
                          <span className="text-[8px] font-sans font-bold text-slate-300 uppercase tracking-widest rotate-45 origin-left">{date}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white rounded-[3rem] border border-slate-100 p-10 space-y-8">
                  <h3 className="text-xl font-serif font-medium text-slate-800">Top Frames</h3>
                  <div className="space-y-6">
                    {Object.entries(stats.popularTemplates || {}).map(([tId, count]: any, i) => {
                      const max = Math.max(...Object.values(stats.popularTemplates).map(Number), 1);
                      const w = (Number(count) / max) * 100;
                      return (
                        <div key={i} className="space-y-2">
                          <div className="flex justify-between items-center text-[10px] font-sans font-black uppercase tracking-widest">
                            <span className="text-slate-400">{tId}</span>
                            <span className="text-[#8c2a1a]">{count} Sold</span>
                          </div>
                          <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
                            <div className="h-full bg-[#8c2a1a] rounded-full transition-all duration-1000" style={{ width: `${w}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}



          {/* LOGS MODULE */}
          {activeTab === "logs" && (
            <div className="bg-white rounded-[3rem] border border-slate-100 p-10 animate-fadeIn text-left">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-serif font-medium text-slate-800">Dispatch Logs</h3>
                <button onClick={handleClearWhatsappLogs} className="text-[10px] font-sans font-black text-rose-400 uppercase tracking-widest hover:underline">Clear Logs</button>
              </div>
              <div className="space-y-3">
                {whatsappLogs.length === 0 ? (
                  <p className="py-20 text-center text-slate-300 text-[10px] font-sans font-black uppercase tracking-widest">No recent communications</p>
                ) : (
                  whatsappLogs.map((log, i) => (
                    <div key={i} className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400">
                          <Smartphone className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{log.phone}</p>
                          <p className="text-[10px] font-sans text-slate-400 uppercase tracking-widest">{new Date(log.timestamp).toLocaleTimeString()} • {log.status}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* SETTINGS MODULE */}
          {activeTab === "settings" && (
            <div className="bg-white rounded-[3rem] border border-slate-100 p-10 animate-fadeIn text-left">
              <form onSubmit={handleSaveSettings} className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-sans font-black text-slate-400 uppercase tracking-widest px-4">Studio Branding</label>
                    <input type="text" value={editStallName} onChange={e => setEditStallName(e.target.value)} className="w-full px-8 py-5 bg-slate-50 rounded-3xl outline-none focus:bg-white focus:ring-1 focus:ring-slate-100 transition-all font-serif" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-sans font-black text-slate-400 uppercase tracking-widest px-4">Frame Price (₹)</label>
                    <input type="number" value={editPrice} onChange={e => setEditPrice(Number(e.target.value))} className="w-full px-8 py-5 bg-slate-50 rounded-3xl outline-none focus:bg-white focus:ring-1 focus:ring-slate-100 transition-all font-serif" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-sans font-black text-slate-400 uppercase tracking-widest px-4">Payment UPI ID</label>
                    <input type="text" value={editUpiId} onChange={e => setEditUpiId(e.target.value)} className="w-full px-8 py-5 bg-slate-50 rounded-3xl outline-none focus:bg-white focus:ring-1 focus:ring-slate-100 transition-all font-serif" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-sans font-black text-[#8c2a1a] uppercase tracking-widest px-4">🔑 Owner Security PIN (4 Digits)</label>
                    <input 
                      type="text" 
                      maxLength={4}
                      value={editOwnerPin} 
                      onChange={e => setEditOwnerPin(e.target.value)} 
                      placeholder="1111"
                      className="w-full px-8 py-5 bg-slate-50 rounded-3xl outline-none focus:bg-white focus:ring-1 focus:ring-slate-100 transition-all font-mono font-bold tracking-widest text-[#8c2a1a]" 
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-sans font-black text-slate-400 uppercase tracking-widest px-4">Owner Email Address</label>
                  <input 
                    type="email" 
                    value={editOwnerEmail} 
                    onChange={e => setEditOwnerEmail(e.target.value)} 
                    placeholder="owner@snapframe.ai"
                    className="w-full px-8 py-5 bg-slate-50 rounded-3xl outline-none focus:bg-white focus:ring-1 focus:ring-slate-100 transition-all font-serif" 
                  />
                </div>
                <div className="flex items-center justify-between bg-slate-50 p-8 rounded-[2.5rem]">
                  <div className="space-y-1">
                    <h4 className="text-sm font-serif font-medium text-slate-800">Automatic Printing</h4>
                    <p className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-widest">Print immediately on paid checkout</p>
                  </div>
                  <button type="button" onClick={() => setEditAutoPrint(!editAutoPrint)} className={`w-16 h-8 rounded-full transition-all relative ${editAutoPrint ? "bg-emerald-500" : "bg-slate-200"}`}>
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm ${editAutoPrint ? "left-9" : "left-1"}`} />
                  </button>
                </div>
                <div className="flex justify-end pt-4">
                  <button type="submit" className="px-12 py-5 bg-[#8c2a1a] text-white text-[10px] font-sans font-black uppercase tracking-[0.2em] rounded-full shadow-2xl hover:bg-[#a63421] transition-all">Save Changes</button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* Editor Modal for Design Tweaks */}
      {editingOrder && (
        <div className="fixed inset-0 z-[110] bg-white/20 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="w-full max-w-6xl h-[90vh] bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 relative">
            <button onClick={() => setEditingOrder(null)} className="absolute top-8 right-8 z-20 p-4 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full transition-all">
              <X className="w-6 h-6" />
            </button>
            <div className="w-full h-full overflow-y-auto">
              <CanvasEditor 
                imageUri={editingOrder.originalImage}
                template={templates.find(t => t.id === editingOrder.templateId) || templates[0]}
                initialZoom={editingOrder.editorState?.zoom}
                initialRotation={editingOrder.editorState?.rotation}
                initialTranslateX={editingOrder.editorState?.translateX}
                initialTranslateY={editingOrder.editorState?.translateY}
                initialCustomText={editingOrder.aiOptions?.aiTextGenerated}
                initialBgRemoved={editingOrder.aiOptions?.bgRemoved}
                initialCartoonFilter={editingOrder.aiOptions?.cartoonFilter}
                initialGlowFilter={editingOrder.aiOptions?.glowFilter}
                onConfirm={async (finalImageUri, customText, aiOptions, editorState) => {
                  try {
                    const thumbnailUri = await generateThumbnail(finalImageUri);
                    const res = await fetch(`/api/orders/${editingOrder.id}/update`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        finalImageUri,
                        thumbnailUri,
                        aiOptions: {
                          ...editingOrder.aiOptions,
                          aiTextGenerated: customText,
                          bgRemoved: aiOptions.bgRemoved,
                          cartoonFilter: aiOptions.cartoonFilter,
                          glowFilter: aiOptions.glowFilter
                        },
                        editorState
                      })
                    });
                    const data = await res.json();
                    if (data.success) {
                      setRefreshes(prev => prev + 1);
                      setEditingOrder(null);
                      showToast("Design updated successfully.", "success");
                    } else {
                      showToast("Failed to save updated design.", "error");
                    }
                  } catch (err) {
                    console.error("Save edit failed", err);
                    showToast("Error updating design.", "error");
                  }
                }}
                onBack={() => setEditingOrder(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Register New Stall Owner Modal */}
      {showAddStallModal && (
        <div className="fixed inset-0 z-[120] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-[2.5rem] p-8 shadow-2xl space-y-6 text-left animate-fadeIn border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-serif font-medium text-slate-800">Register New Stall Owner</h3>
                <p className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-widest">Create isolated stall workspace & QR code link</p>
              </div>
              <button onClick={() => setShowAddStallModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!newStallNameInput.trim()) {
                showToast("Please enter stall name", "error");
                return;
              }
              try {
                const res = await fetch("/api/stalls", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name: newStallNameInput,
                    location: newStallLocationInput || "Tourist Point",
                    pricePerFrame: Number(newStallPriceInput) || 299,
                    upiId: newStallUpiInput || "stall@okaxis",
                    stallPhone: newStallPhoneInput || "+919876543210",
                    ownerPin: newStallPinInput || undefined,
                    ownerEmail: newStallEmailInput || undefined
                  })
                });
                const data = await res.json();
                if (data.success && data.stall) {
                  showToast(`Registered ${data.stall.name} with PIN: ${data.stall.owner_pin || data.stall.ownerPin || '1111'}`, "success");
                  setShowAddStallModal(false);
                  setNewStallNameInput("");
                  setNewStallLocationInput("");
                  setNewStallPinInput("");
                  setNewStallEmailInput("");
                  setSelectedStallId(data.stall.id);
                  setRefreshes(prev => prev + 1);
                }
              } catch (err) {
                showToast("Error creating stall account", "error");
              }
            }} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-sans font-black text-slate-400 uppercase tracking-widest">Stall Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Goa Beach Stall #4"
                  value={newStallNameInput}
                  onChange={e => setNewStallNameInput(e.target.value)}
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-1 focus:ring-[#8c2a1a]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-sans font-black text-slate-400 uppercase tracking-widest">Stall Location</label>
                <input
                  type="text"
                  placeholder="e.g. Baga Beach, Goa"
                  value={newStallLocationInput}
                  onChange={e => setNewStallLocationInput(e.target.value)}
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-1 focus:ring-[#8c2a1a]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-sans font-black text-slate-400 uppercase tracking-widest">Price / Frame (₹)</label>
                  <input
                    type="number"
                    value={newStallPriceInput}
                    onChange={e => setNewStallPriceInput(e.target.value)}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-1 focus:ring-[#8c2a1a]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-sans font-black text-slate-400 uppercase tracking-widest">Phone</label>
                  <input
                    type="text"
                    value={newStallPhoneInput}
                    onChange={e => setNewStallPhoneInput(e.target.value)}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-1 focus:ring-[#8c2a1a]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-sans font-black text-slate-400 uppercase tracking-widest">UPI ID</label>
                  <input
                    type="text"
                    placeholder="e.g. stallowner@okaxis"
                    value={newStallUpiInput}
                    onChange={e => setNewStallUpiInput(e.target.value)}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-1 focus:ring-[#8c2a1a]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-sans font-black text-[#8c2a1a] uppercase tracking-widest">Assign 4-Digit PIN</label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="e.g. 4444 (or auto)"
                    value={newStallPinInput}
                    onChange={e => setNewStallPinInput(e.target.value)}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-mono font-bold outline-none focus:ring-1 focus:ring-[#8c2a1a]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-sans font-black text-slate-400 uppercase tracking-widest">Owner Email</label>
                <input
                  type="email"
                  placeholder="e.g. partner@snapframe.ai"
                  value={newStallEmailInput}
                  onChange={e => setNewStallEmailInput(e.target.value)}
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-1 focus:ring-[#8c2a1a]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowAddStallModal(false)} className="px-6 py-3 bg-slate-100 text-slate-500 text-[10px] font-sans font-black uppercase tracking-widest rounded-full">Cancel</button>
                <button type="submit" className="px-8 py-3 bg-[#8c2a1a] text-white text-[10px] font-sans font-black uppercase tracking-widest rounded-full shadow-lg hover:bg-[#a63421]">Create Stall Account</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminConsole;
