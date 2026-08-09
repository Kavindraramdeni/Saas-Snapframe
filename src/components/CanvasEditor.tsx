import React, { useState, useEffect, useRef } from "react";
import { FrameTemplate } from "../types";
import { drawTemplateOnCanvas } from "./FrameCanvasCompositor";
import { ZoomIn, ZoomOut, RotateCw, ArrowRight, UploadCloud } from "lucide-react";

// Polyfill CanvasRenderingContext2D.prototype.roundRect for maximum cross-browser robustness
if (typeof CanvasRenderingContext2D !== "undefined" && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (
    this: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    radii: number | number[]
  ) {
    let r = 0;
    if (typeof radii === "number") {
      r = radii;
    } else if (Array.isArray(radii) && radii.length > 0) {
      r = radii[0];
    }
    r = Math.min(r, w / 2, h / 2);
    this.beginPath();
    this.moveTo(x + r, y);
    this.lineTo(x + w - r, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r);
    this.lineTo(x + w, y + h - r);
    this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.lineTo(x + r, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r);
    this.lineTo(x, y + r);
    this.quadraticCurveTo(x, y, x + r, y);
    this.closePath();
    return this;
  };
}

interface CanvasEditorProps {
  imageUri: string;
  uploadedImages?: string[];
  template: FrameTemplate;
  onConfirm: (finalImageUri: string, customText: string, aiOptions: any, editorState: any) => void;
  onBack: () => void;
  initialZoom?: number;
  initialRotation?: number;
  initialTranslateX?: number;
  initialTranslateY?: number;
  initialCustomText?: string;
  initialBgRemoved?: boolean;
  initialCartoonFilter?: boolean;
  initialGlowFilter?: boolean;
  initialShapeMask?: string;
}

export default function CanvasEditor({
  imageUri,
  uploadedImages,
  template,
  onConfirm,
  onBack,
  initialZoom,
  initialRotation,
  initialTranslateX,
  initialTranslateY,
  initialCustomText,
  initialBgRemoved,
  initialCartoonFilter,
  initialGlowFilter,
  initialShapeMask
}: CanvasEditorProps) {
  // Editor transformations state
  const [zoom, setZoom] = useState(initialZoom !== undefined ? initialZoom : 1);
  const [rotation, setRotation] = useState(initialRotation !== undefined ? initialRotation : 0); // in degrees
  const [translateX, setTranslateX] = useState(initialTranslateX !== undefined ? initialTranslateX : 0);
  const [translateY, setTranslateY] = useState(initialTranslateY !== undefined ? initialTranslateY : 0);
  
  // Photo-strip slots state (initialized with uploadedImages if present, otherwise fallback to copies of imageUri)
  const [slotImages, setSlotImages] = useState<string[]>(() => {
    if (uploadedImages && uploadedImages.length > 0) {
      const arr = [...uploadedImages];
      while (arr.length < 4) {
        arr.push(uploadedImages[0] || imageUri);
      }
      return arr.slice(0, 4);
    }
    return [imageUri, imageUri, imageUri, imageUri];
  });
  const [slotStates, setSlotStates] = useState<Array<{zoom: number, rotation: number, translateX: number, translateY: number}>>([
    { zoom: 1, rotation: 0, translateX: 0, translateY: 0 },
    { zoom: 1, rotation: 0, translateX: 0, translateY: 0 },
    { zoom: 1, rotation: 0, translateX: 0, translateY: 0 },
    { zoom: 1, rotation: 0, translateX: 0, translateY: 0 },
  ]);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number>(0);
  const [collageLayout, setCollageLayout] = useState<"single" | "grid-2" | "grid-3" | "grid-4">("single");

  // Custom wrappers to seamlessly pipe UI changes to either the active slot (if in strip or collage mode) or standard model
  const adjustZoom = (updater: number | ((prev: number) => number)) => {
    if (template.styleType === "strip" || collageLayout !== "single") {
      setSlotStates((prev) => {
        const next = [...prev];
        const prevVal = next[activeSlotIndex]?.zoom ?? 1;
        const newVal = typeof updater === "function" ? updater(prevVal) : updater;
        next[activeSlotIndex] = { ...next[activeSlotIndex], zoom: newVal };
        return next;
      });
    } else {
      setZoom(updater);
    }
  };

  const adjustRotation = (updater: number | ((prev: number) => number)) => {
    if (template.styleType === "strip" || collageLayout !== "single") {
      setSlotStates((prev) => {
        const next = [...prev];
        const prevVal = next[activeSlotIndex]?.rotation ?? 0;
        const newVal = typeof updater === "function" ? updater(prevVal) : updater;
        next[activeSlotIndex] = { ...next[activeSlotIndex], rotation: newVal };
        return next;
      });
    } else {
      setRotation(updater);
    }
  };

  const adjustTranslateX = (updater: number | ((prev: number) => number)) => {
    if (template.styleType === "strip" || collageLayout !== "single") {
      setSlotStates((prev) => {
        const next = [...prev];
        const prevVal = next[activeSlotIndex]?.translateX ?? 0;
        const newVal = typeof updater === "function" ? updater(prevVal) : updater;
        next[activeSlotIndex] = { ...next[activeSlotIndex], translateX: newVal };
        return next;
      });
    } else {
      setTranslateX(updater);
    }
  };

  const adjustTranslateY = (updater: number | ((prev: number) => number)) => {
    if (template.styleType === "strip" || collageLayout !== "single") {
      setSlotStates((prev) => {
        const next = [...prev];
        const prevVal = next[activeSlotIndex]?.translateY ?? 0;
        const newVal = typeof updater === "function" ? updater(prevVal) : updater;
        next[activeSlotIndex] = { ...next[activeSlotIndex], translateY: newVal };
        return next;
      });
    } else {
      setTranslateY(updater);
    }
  };

  // Custom overlay settings
  const [customText, setCustomText] = useState(initialCustomText !== undefined ? initialCustomText : template.defaultText);
  const [aiTextSuggestions, setAiTextSuggestions] = useState<string[]>([]);
  const [loadingAiText, setLoadingAiText] = useState(false);
  const [locationName, setLocationName] = useState("Goa");

  // Subtle haptic vibration tick feedback
  const triggerHapticFeedback = () => {
    if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
      try {
        window.navigator.vibrate(12);
      } catch (err) {
        // Safe catch for sandbox/iframe policy restrictions
      }
    }
  };

  // AI filters activation state
  const [bgRemoved, setBgRemoved] = useState(initialBgRemoved !== undefined ? initialBgRemoved : false);
  const [cartoonFilter, setCartoonFilter] = useState(initialCartoonFilter !== undefined ? initialCartoonFilter : false);
  const [glowFilter, setGlowFilter] = useState(initialGlowFilter !== undefined ? initialGlowFilter : false);
  const [shapeMask, setShapeMask] = useState<string>(
    initialShapeMask !== undefined ? initialShapeMask : (template.styleType || "standard")
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const lastTouchDistanceRef = useRef<number | null>(null);
  const lastTouchAngleRef = useRef<number | null>(null);

  const [activeImage, setActiveImage] = useState<string>(imageUri);
  const [isDragOverFile, setIsDragOverFile] = useState(false);
  const [loadedImg, setLoadedImg] = useState<HTMLImageElement | null>(null);
  const [loadedSlotImgs, setLoadedSlotImgs] = useState<(HTMLImageElement | null)[]>([null, null, null, null]);
  const slotImgRefs = useRef<(HTMLImageElement | null)[]>([null, null, null, null]);

  // 1. Preload the primary photo image object safely avoiding mobile CORS bugs
  useEffect(() => {
    const img = new Image();
    const isLocal = activeImage.startsWith("data:") || activeImage.startsWith("blob:") || !activeImage.startsWith("http");
    if (!isLocal) {
      img.crossOrigin = "anonymous";
    }
    
    img.onload = () => {
      imageRef.current = img;
      setLoadedImg(img);
    };

    img.onerror = (err) => {
      console.warn("CORS/Load warning. Trying fallback without anonymous mode...", err);
      const fallbackImg = new Image();
      fallbackImg.onload = () => {
        imageRef.current = fallbackImg;
        setLoadedImg(fallbackImg);
      };
      fallbackImg.src = activeImage;
    };

    img.src = activeImage;
  }, [activeImage]);

  // Preload all 4 slot images concurrently with CORS robustness
  useEffect(() => {
    slotImages.forEach((src, idx) => {
      if (!src) {
        slotImgRefs.current[idx] = null;
        setLoadedSlotImgs([...slotImgRefs.current]);
        return;
      }
      const img = new Image();
      const isLocal = src.startsWith("data:") || src.startsWith("blob:") || !src.startsWith("http");
      if (!isLocal) {
        img.crossOrigin = "anonymous";
      }
      img.onload = () => {
        slotImgRefs.current[idx] = img;
        setLoadedSlotImgs([...slotImgRefs.current]);
      };
      img.onerror = () => {
        const fallback = new Image();
        fallback.onload = () => {
          slotImgRefs.current[idx] = fallback;
          setLoadedSlotImgs([...slotImgRefs.current]);
        };
        fallback.src = src;
      };
      img.src = src;
    });
  }, [slotImages]);

  // Keep activeSlotIndex safely bounded within the limits of the currently selected collage/strip layout
  useEffect(() => {
    const activeSlotsCount = template.styleType === "strip" ? 3 : (collageLayout === "grid-2" ? 2 : (collageLayout === "grid-3" ? 3 : 4));
    if (activeSlotIndex >= activeSlotsCount) {
      setActiveSlotIndex(0);
    }
  }, [collageLayout, template, activeSlotIndex]);

  // 2. Clear & Draw Compositor
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear frame
    ctx.clearRect(0, 0, width, height);

    // Draw both frame backdrop, user image (with masking & transformations) and souvenirs in a single high-fidelity pass
    drawTemplateOnCanvas(
      ctx,
      width,
      height,
      template,
      customText,
      glowFilter,
      cartoonFilter,
      imageRef.current,
      {
        zoom: (template.styleType === "strip" || collageLayout !== "single") ? (slotStates[activeSlotIndex]?.zoom ?? 1) : zoom,
        rotation: (template.styleType === "strip" || collageLayout !== "single") ? (slotStates[activeSlotIndex]?.rotation ?? 0) : rotation,
        translateX: (template.styleType === "strip" || collageLayout !== "single") ? (slotStates[activeSlotIndex]?.translateX ?? 0) : translateX,
        translateY: (template.styleType === "strip" || collageLayout !== "single") ? (slotStates[activeSlotIndex]?.translateY ?? 0) : translateY,
        shapeMask,
        slotImages: loadedSlotImgs,
        slotStates: slotStates,
        collageLayout: collageLayout
      }
    );
  };

  // Re-draw automatically on state properties changes
  useEffect(() => {
    drawCanvas();
  }, [
    loadedImg,
    zoom,
    rotation,
    translateX,
    translateY,
    customText,
    bgRemoved,
    cartoonFilter,
    glowFilter,
    shapeMask,
    template,
    slotImages,
    slotStates,
    loadedSlotImgs,
    activeSlotIndex,
    collageLayout
  ]);

  // Helper to convert client coordinates to 500x500 canvas coordinate space
  const getCanvasCoordinates = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  };

  // Helper to detect which photo slot is located under the given canvas coordinates
  const findSlotIndexAtPoint = (ptX: number, ptY: number): number | null => {
    if (template.styleType === "strip") {
      const mw = 500 * 0.36;
      const mh = 500 * 0.92;
      const mx = (500 - mw) / 2;
      const my = (500 - mh) / 2;
      const padW = mw * 0.08;
      const padH = mh * 0.04;
      const cw = mw - padW * 2;
      const availableH = mh - padH * 2 - (mh * 0.08);
      const gap = mh * 0.015;
      const ch = (availableH - 2 * gap) / 3;

      // Vertical strip has 3 stacked slots. Check if x is within area of the strip with touch tolerance padding
      const slotXMin = mx + padW - 25;
      const slotXMax = mx + padW + cw + 25;
      
      if (ptX >= slotXMin && ptX <= slotXMax) {
        for (let i = 0; i < 3; i++) {
          const slotY = my + padH + i * (ch + gap);
          const yMin = slotY - gap / 2;
          const yMax = slotY + ch + gap / 2;
          if (ptY >= yMin && ptY <= yMax) {
            return i;
          }
        }
        // Fallback to the closest slot based on Y
        const relativeY = ptY - (my + padH);
        const idx = Math.floor(relativeY / (ch + gap));
        return Math.max(0, Math.min(2, idx));
      }
    } else if (collageLayout !== "single") {
      const padding = 0.1;
      const maxW = 500 * (1 - padding * 2);
      const maxH = 500 * (1 - padding * 2);
      const aspect = template.widthIn / template.heightIn;
      
      let mw, mh;
      if (aspect > 1) {
        mw = maxW;
        mh = maxW / aspect;
        if (mh > maxH) {
          mh = maxH;
          mw = maxH * aspect;
        }
      } else {
        mh = maxH;
        mw = maxH * aspect;
        if (mw > maxW) {
          mw = maxW;
          mh = maxW / aspect;
        }
      }

      const mx = (500 - mw) / 2;
      const my = (500 - mh) / 2;
      const cxCenter = 500 / 2;
      const cyCenter = 500 / 2;

      let cutoutCX = cxCenter;
      let cutoutCY = cyCenter;
      let cutoutW = mw;
      let cutoutH = mh;

      const activeMask = template.styleType || "standard";

      if (activeMask === "circle" || activeMask === "hexagon") {
        cutoutW = mw;
        cutoutH = mw;
      } else if (activeMask === "heart") {
        cutoutW = mw * 1.15;
        cutoutH = mw * 1.15;
      } else if (activeMask === "polaroid") {
        cutoutW = mw;
        cutoutH = mw;
        cutoutCX = mx + mw / 2;
        cutoutCY = my + mw / 2;
      }

      const startX = cutoutCX - cutoutW / 2;
      const startY = cutoutCY - cutoutH / 2;

      // Allow soft touch boundary padding tolerance
      if (ptX >= startX - 30 && ptX <= startX + cutoutW + 30 &&
          ptY >= startY - 30 && ptY <= startY + cutoutH + 30) {
        if (collageLayout === "grid-2") {
          return ptX < startX + cutoutW / 2 ? 0 : 1;
        } else if (collageLayout === "grid-3") {
          if (ptX < startX + cutoutW / 2) {
            return 0;
          } else {
            return ptY < startY + cutoutH / 2 ? 1 : 2;
          }
        } else if (collageLayout === "grid-4") {
          const col = ptX < startX + cutoutW / 2 ? 0 : 1;
          const row = ptY < startY + cutoutH / 2 ? 0 : 2;
          return col + row;
        }
      }
    }
    return null;
  };

  // Handle Drag events directly on canvas
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    if (coords) {
      const slotIndex = findSlotIndexAtPoint(coords.x, coords.y);
      if (slotIndex !== null) {
        setActiveSlotIndex(slotIndex);
      }
    }
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleFactor = rect.width > 0 ? (canvas.width / rect.width) : 1;
    const dx = (e.clientX - dragStartRef.current.x) * scaleFactor;
    const dy = (e.clientY - dragStartRef.current.y) * scaleFactor;
    
    adjustTranslateX((prev) => prev + dx);
    adjustTranslateY((prev) => prev + dy);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
  };

  // Touch Support for mobile phone dragging & zoom pinch
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      const coords = getCanvasCoordinates(e.touches[0].clientX, e.touches[0].clientY);
      if (coords) {
        const slotIndex = findSlotIndexAtPoint(coords.x, coords.y);
        if (slotIndex !== null) {
          setActiveSlotIndex(slotIndex);
        }
      }
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      lastTouchDistanceRef.current = null;
      lastTouchAngleRef.current = null;
    } else if (e.touches.length === 2) {
      isDraggingRef.current = false;
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      const coords = getCanvasCoordinates(midX, midY);
      if (coords) {
        const slotIndex = findSlotIndexAtPoint(coords.x, coords.y);
        if (slotIndex !== null) {
          setActiveSlotIndex(slotIndex);
        }
      }

      lastTouchDistanceRef.current = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      lastTouchAngleRef.current = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1 && isDraggingRef.current) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleFactor = rect.width > 0 ? (canvas.width / rect.width) : 1;
      const dx = (e.touches[0].clientX - dragStartRef.current.x) * scaleFactor;
      const dy = (e.touches[0].clientY - dragStartRef.current.y) * scaleFactor;
      
      adjustTranslateX((prev) => prev + dx);
      adjustTranslateY((prev) => prev + dy);
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const distance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const angle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX);
      
      if (lastTouchDistanceRef.current !== null) {
        const delta = distance - lastTouchDistanceRef.current;
        // Adjust zoom based on pinch scale
        adjustZoom((prev) => {
          const factor = 1 + (delta * 0.007);
          const nextZoom = Math.max(0.2, Math.min(6, prev * factor));
          return nextZoom;
        });
      }

      if (lastTouchAngleRef.current !== null) {
        let deltaAngle = angle - lastTouchAngleRef.current;
        // Keep within [-PI, PI] range
        while (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;
        while (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
        
        const deg = deltaAngle * (180 / Math.PI);
        if (Math.abs(deg) > 0.2) { // filter out minor noise
          adjustRotation((prev) => {
            let nextRot = Math.round(prev + deg);
            if (nextRot < -180) nextRot += 360;
            if (nextRot > 180) nextRot -= 360;
            return nextRot;
          });
        }
      }
      
      lastTouchDistanceRef.current = distance;
      lastTouchAngleRef.current = angle;
    }
  };

  // Wheel zoom support for desktop
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    if (coords) {
      const slotIndex = findSlotIndexAtPoint(coords.x, coords.y);
      if (slotIndex !== null) {
        setActiveSlotIndex(slotIndex);
      }
    }
    adjustZoom((prev) => {
      const delta = -e.deltaY * 0.0015;
      const factor = 1 + delta;
      return Math.max(0.2, Math.min(6, prev * factor));
    });
  };

  // Fetch AI creative slogans utilizing server-side Gemini 3.5 Flash Model
  const fetchCreativeSLOGANS = async () => {
    setLoadingAiText(true);
    setAiTextSuggestions([]);
    
    try {
      const response = await fetch("/api/gemini/generate-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: template.category,
          locationName,
          stylePrompt: template.description
        }),
      });

      const data = await response.json();
      if (data.suggestions && Array.isArray(data.suggestions)) {
        setAiTextSuggestions(data.suggestions);
      }
    } catch (e) {
      console.error("Failed to generate captions over Gemini API:", e);
    } finally {
      setLoadingAiText(false);
    }
  };

  // Auto-fit image to center
  const resetFraming = () => {
    if (template.styleType === "strip") {
      setSlotStates([
        { zoom: 1, rotation: 0, translateX: 0, translateY: 0 },
        { zoom: 1, rotation: 0, translateX: 0, translateY: 0 },
        { zoom: 1, rotation: 0, translateX: 0, translateY: 0 },
        { zoom: 1, rotation: 0, translateX: 0, translateY: 0 },
      ]);
    } else {
      setZoom(1);
      setRotation(0);
      setTranslateX(0);
      setTranslateY(0);
    }
  };

  // Re-map current active states for easy UI bindings
  const currentZoom = template.styleType === "strip" ? slotStates[activeSlotIndex].zoom : zoom;
  const currentRotation = template.styleType === "strip" ? slotStates[activeSlotIndex].rotation : rotation;
  const currentTranslateX = template.styleType === "strip" ? slotStates[activeSlotIndex].translateX : translateX;
  const currentTranslateY = template.styleType === "strip" ? slotStates[activeSlotIndex].translateY : translateY;

  // Save composite layout output and transit
  const handleConfirmOutput = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // High resolution canvas generation
    const printCanvas = document.createElement("canvas");
    printCanvas.width = 2400; // print-ready size (300 DPI)
    printCanvas.height = 2400;
    const printCtx = printCanvas.getContext("2d");

    if (printCtx) {
      // Re-compose exactly at 2400px!
      const scaleFactor = 2400 / canvas.width;
      printCtx.save();
      printCtx.clearRect(0, 0, 2400, 2400);

      // Call unified, bulletproof compositor to overlay white templates, correct shapes, and cropped image
      const scaledSlotStates = slotStates.map(st => ({
        zoom: st.zoom,
        rotation: st.rotation,
        translateX: st.translateX * scaleFactor,
        translateY: st.translateY * scaleFactor,
      }));

      drawTemplateOnCanvas(
        printCtx,
        2400,
        2400,
        template,
        customText,
        glowFilter,
        cartoonFilter,
        imageRef.current,
        {
          zoom: currentZoom,
          rotation: currentRotation,
          translateX: currentTranslateX * scaleFactor,
          translateY: currentTranslateY * scaleFactor,
          shapeMask: shapeMask,
          slotImages: loadedSlotImgs,
          slotStates: scaledSlotStates,
          collageLayout: collageLayout
        }
      );

      printCtx.restore();
      
      const highResDataUrl = printCanvas.toDataURL("image/png");
      onConfirm(
        highResDataUrl,
        customText,
        { bgRemoved, cartoonFilter, glowFilter, shapeMask },
        (template.styleType === "strip" || collageLayout !== "single")
          ? { zoom: slotStates[0].zoom, rotation: slotStates[0].rotation, translateX: slotStates[0].translateX, translateY: slotStates[0].translateY, slotStates, slotImages, collageLayout }
          : { zoom, rotation, translateX, translateY }
      );
    } else {
      // Fallback
      onConfirm(
        canvas.toDataURL("image/png"),
        customText,
        { bgRemoved, cartoonFilter, glowFilter, shapeMask },
        (template.styleType === "strip" || collageLayout !== "single")
          ? { zoom: slotStates[0].zoom, rotation: slotStates[0].rotation, translateX: slotStates[0].translateX, translateY: slotStates[0].translateY, slotStates, slotImages, collageLayout }
          : { zoom, rotation, translateX, translateY }
      );
    }
  };

  return (
    <div id="canvas-editor-panel" className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-start min-w-0">
      
      {/* LEFT COLUMN: INTERACTIVE CANVAS CONTAINER */}
      <div className="lg:col-span-7 bg-white/60 backdrop-blur-md border border-slate-200 rounded-[2.5rem] p-4 sm:p-6 shadow-sm relative">
        
        <div className="flex justify-between items-center mb-6">
          <div className="text-left space-y-1">
            <h2 className="text-lg font-serif font-medium text-slate-800 tracking-tight flex items-center gap-2">
              Studio Designer
            </h2>
            <p className="text-[10px] text-slate-400 font-sans font-bold uppercase tracking-[0.1em]">Pinch to zoom, drag to pan within the layout slots</p>
          </div>
        </div>

        {/* COMPOSITE CANVAS BLOCK */}
        <div 
          className="flex justify-center bg-[#f8f5f2] border border-slate-100 rounded-2xl relative overflow-hidden aspect-square select-none max-w-full shadow-inner"
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOverFile(true);
          }}
          onDragLeave={() => {
            setIsDragOverFile(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOverFile(false);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              const file = e.dataTransfer.files[0];
              const reader = new FileReader();
              reader.onload = (evt) => {
                const result = evt.target?.result as string;
                if (result) {
                  setActiveImage(result);
                }
              };
              reader.readAsDataURL(file);
            }
          }}
        >
          <canvas
            id="souvenir-canvas"
            ref={canvasRef}
            width={500}
            height={500}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUpOrLeave}
            onWheel={handleWheel}
            className="w-full h-full object-contain cursor-move touch-none"
          />
          
          {isDragOverFile && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col justify-center items-center p-4 text-center border-4 border-dashed border-[#8c2a1a]/30 m-2 rounded-xl animate-fadeIn z-10 text-slate-800">
              <UploadCloud className="w-12 h-12 text-[#8c2a1a] animate-bounce mb-2" />
              <div className="font-serif italic text-lg">Drop into Frame Slot</div>
              <div className="text-[10px] font-sans font-bold uppercase tracking-widest text-slate-400 mt-2">Release to replace active souvenir picture</div>
            </div>
          )}
        </div>

        {/* ACTION BUTTONS DIRECTLY BELOW PREVIEW */}
        <div className="flex flex-wrap justify-between items-center mt-6 px-1 gap-4">
          <span className="text-[10px] text-slate-400 font-sans font-bold uppercase tracking-widest">
            👆 Drag: pan • 2 fingers: pinch-zoom
          </span>
          <div className="flex items-center gap-3">
            <button 
              id="editor-rotate-90-btn"
              type="button"
              onClick={() => {
                triggerHapticFeedback();
                adjustRotation(prev => {
                  let nextRot = (prev + 90) % 360;
                  if (nextRot > 180) nextRot -= 360;
                  if (nextRot < -180) nextRot += 360;
                  return nextRot;
                });
              }} 
              className="text-[9px] font-sans font-black tracking-[0.1em] text-slate-500 uppercase border border-slate-200 bg-white hover:bg-slate-50 px-5 py-2.5 rounded-full transition shadow-sm active:scale-95 flex items-center gap-2"
            >
              <RotateCw className="w-3.5 h-3.5 text-[#8c2a1a]" />
              Rotate 90°
            </button>
            <button 
              id="editor-reset-btn"
              type="button"
              onClick={() => {
                triggerHapticFeedback();
                resetFraming();
              }} 
              className="text-[9px] font-sans font-black tracking-[0.1em] text-slate-500 uppercase border border-slate-200 bg-white hover:bg-slate-50 px-5 py-2.5 rounded-full transition shadow-sm active:scale-95 flex items-center gap-2"
            >
              🔄 Reset Layout
            </button>
          </div>
        </div>
        
        {/* SCALE INDICATOR */}
        <div className="mt-6 flex items-center justify-between bg-white/40 border border-slate-100 px-5 py-3 rounded-2xl">
          <span className="text-[10px] font-sans font-bold tracking-widest text-slate-400 uppercase">Current Scale</span>
          <span className="text-[10px] font-sans font-black tracking-widest text-[#8c2a1a] uppercase">
            {currentZoom.toFixed(2)}x
          </span>
        </div>

        {/* PHOTO STRIP MULTI-UPLOAD PORT SLOT SELECTOR */}
        {(template.styleType === "strip" || collageLayout !== "single") && (() => {
          const activeSlotsCount = template.styleType === "strip" ? 3 : (collageLayout === "grid-2" ? 2 : (collageLayout === "grid-3" ? 3 : 4));
          const safeSlotIdx = activeSlotIndex >= activeSlotsCount ? 0 : activeSlotIndex;
          
          return (
            <div className="mt-8 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-sans tracking-[0.2em] font-bold text-slate-400 uppercase">
                  {template.styleType === "strip" ? "Strip Slots" : "Grid Slots"}
                </span>
                <span className="text-[10px] font-sans font-bold text-slate-300 uppercase">
                  TAP TO ACTIVATE
                </span>
              </div>

              <div className={`grid gap-3 ${activeSlotsCount === 2 ? 'grid-cols-2' : (activeSlotsCount === 3 ? 'grid-cols-3' : 'grid-cols-4')}`}>
                {slotImages.slice(0, activeSlotsCount).map((src, idx) => {
                  const isActive = idx === safeSlotIdx;
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setActiveSlotIndex(idx);
                      }}
                      className={`relative rounded-xl border cursor-pointer overflow-hidden aspect-[3/4] transition-all duration-300 ${
                        isActive 
                          ? "border-[#8c2a1a] ring-4 ring-[#8c2a1a]/5 scale-[1.02] shadow-md" 
                          : "border-slate-100 bg-white/40 hover:border-slate-200"
                      }`}
                    >
                      {src ? (
                        <img
                          src={src}
                          alt={`Slot ${idx + 1}`}
                          className="w-full h-full object-cover pointer-events-none"
                        />
                      ) : (
                        <div className="text-slate-300 text-[10px] font-black tracking-tighter flex items-center justify-center h-full pointer-events-none">
                          #{idx + 1}
                        </div>
                      )}

                      <div className={`absolute top-2 left-2 w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black ${
                        isActive ? "bg-[#8c2a1a] text-white" : "bg-white text-slate-400 border border-slate-100"
                      }`}>
                        {idx + 1}
                      </div>
                      
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveSlotIndex(idx);
                          document.getElementById(`slot-raw-input-${idx}`)?.click();
                        }}
                        className="absolute inset-x-0 bottom-0 bg-white/90 backdrop-blur-sm py-2 text-center text-[7px] text-slate-500 font-black tracking-widest uppercase hover:text-[#8c2a1a] transition-colors"
                      >
                        REPLACE
                      </div>
                      
                      <input
                        type="file"
                        id={`slot-raw-input-${idx}`}
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const reader = new FileReader();
                            reader.onload = (evt) => {
                              const dataUrl = evt.target?.result as string;
                              if (dataUrl) {
                                setSlotImages((prev) => {
                                  const next = [...prev];
                                  next[idx] = dataUrl;
                                  return next;
                                });
                              }
                            };
                            reader.readAsDataURL(e.target.files[0]);
                          }
                        }}
                        className="hidden"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

      </div>

      {/* RIGHT COLUMN: AI FEATURES & TEXT ENGRAVER */}
      <div className="lg:col-span-5 flex flex-col gap-6 text-left animate-fadeIn">
        {/* COLLAGE LAYOUT SELECTOR CARD */}
        {template.styleType !== "strip" && (
          <div className="bg-white/60 backdrop-blur-md border border-slate-200 rounded-[2.5rem] p-8 shadow-sm relative animate-fadeIn">
            <div className="flex flex-col gap-2 mb-6">
              <span className="text-[10px] font-sans tracking-[0.2em] font-bold text-slate-400 uppercase">
                LAYOUT STYLE
              </span>
              <h3 className="text-2xl font-serif font-medium text-slate-800">
                Multi-photo grid
              </h3>
            </div>
            
            <div className="grid grid-cols-4 gap-3">
              {[
                { id: "single", label: "Single", icon: <div className="w-4 h-4 bg-slate-300 rounded-sm" /> },
                { id: "grid-2", label: "2 Grid", icon: <div className="flex gap-0.5"><div className="w-2 h-4 bg-slate-300 rounded-sm" /><div className="w-2 h-4 bg-slate-300 rounded-sm" /></div> },
                { id: "grid-3", label: "3 Grid", icon: <div className="flex gap-0.5"><div className="w-2 h-4 bg-slate-300 rounded-sm" /><div className="flex flex-col gap-0.5"><div className="w-2 h-2 bg-slate-300 rounded-sm" /><div className="w-2 h-2 bg-slate-300 rounded-sm" /></div></div> },
                { id: "grid-4", label: "4 Grid", icon: <div className="grid grid-cols-2 gap-0.5"><div className="w-2 h-2 bg-slate-300 rounded-sm" /><div className="w-2 h-2 bg-slate-300 rounded-sm" /><div className="w-2 h-2 bg-slate-300 rounded-sm" /><div className="w-2 h-2 bg-slate-300 rounded-sm" /></div> }
              ].map((layout) => (
                <button
                  key={layout.id}
                  type="button"
                  onClick={() => {
                    triggerHapticFeedback();
                    setCollageLayout(layout.id as any);
                  }}
                  className={`flex flex-col items-center justify-between p-3 rounded-2xl border transition-all duration-300 active:scale-95 transform cursor-pointer ${
                    collageLayout === layout.id
                      ? "bg-white border-[#8c2a1a] shadow-md ring-4 ring-[#8c2a1a]/5"
                      : "bg-white/40 border-slate-100 text-slate-400 hover:border-slate-200"
                  }`}
                >
                  <div className="w-full aspect-square flex items-center justify-center mb-2">
                    {layout.icon}
                  </div>
                  <span className={`text-[8px] font-black tracking-widest uppercase text-center w-full ${
                    collageLayout === layout.id ? "text-[#8c2a1a]" : "text-slate-400"
                  }`}>{layout.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TEXT ENGRAVING CARD */}
        <div className="bg-white/60 backdrop-blur-md border border-slate-200 rounded-[2.5rem] p-8 shadow-sm relative animate-fadeIn">
          <div className="flex flex-col gap-2 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-sans tracking-[0.2em] font-bold text-slate-400 uppercase">
                PERSONALIZATION
              </span>
              {customText && (
                <span className="text-[8px] font-black tracking-widest text-[#8c2a1a] uppercase">
                  ENGRAVED
                </span>
              )}
            </div>
            <h3 className="text-2xl font-serif font-medium text-slate-800">
              Footer caption
            </h3>
          </div>
          
          <div className="space-y-4">
            <div className="relative">
              <input
                id="frame-overlay-input"
                type="text"
                placeholder="E.g. Goa Memories 2026..."
                maxLength={40}
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-slate-800 outline-none focus:border-[#8c2a1a]/30 text-sm font-sans font-medium transition-all shadow-inner"
              />
              {customText && (
                <button 
                  onClick={() => setCustomText("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                >
                  <span className="text-[10px] font-black">CLEAR</span>
                </button>
              )}
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-sans font-black tracking-widest text-slate-300 uppercase">AI Suggestions</span>
                <button 
                  onClick={fetchCreativeSLOGANS}
                  disabled={loadingAiText}
                  className="text-[9px] font-sans font-black tracking-widest text-[#8c2a1a] uppercase hover:underline disabled:opacity-50"
                >
                  {loadingAiText ? "Generating..." : "Get Ideas"}
                </button>
              </div>

              {aiTextSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-2 animate-fadeIn">
                  {aiTextSuggestions.slice(0, 3).map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setCustomText(s)}
                      className="px-3 py-1.5 bg-white border border-slate-100 rounded-full text-[9px] font-sans font-bold text-slate-500 hover:border-[#8c2a1a]/30 hover:text-[#8c2a1a] transition-all shadow-sm"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* NAVIGATION ACTIONS */}
        <div className="flex flex-col gap-3 mt-4">
          <button
            id="editor-confirm-btn"
            onClick={handleConfirmOutput}
            className="w-full py-5 bg-[#8c2a1a] hover:bg-[#a63421] text-white text-[10px] font-sans font-black tracking-[0.2em] uppercase rounded-full shadow-lg transition-all duration-300 flex items-center justify-center gap-3 active:scale-95"
          >
            Review Souvenir <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onBack}
            className="w-full py-4 bg-transparent text-slate-400 hover:text-slate-600 text-[10px] font-sans font-black tracking-[0.2em] uppercase transition-colors"
          >
            Change Template
          </button>
        </div>

      </div>
    </div>
  );

}
