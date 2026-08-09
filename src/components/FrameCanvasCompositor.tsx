import { FrameTemplate } from "../types";

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

/**
 * Shared helper to draw vector frame templates directly onto any Canvas context
 * This supports both high-resolution 300 DPI printing and low-res interactive previews!
 */
export function drawTemplateOnCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  template: FrameTemplate,
  customText: string,
  aiGlowEffect: boolean = false,
  aiCartoonEffect: boolean = false,
  imageObj?: HTMLImageElement | null,
  imageState?: {
    zoom: number;
    rotation: number;
    translateX: number;
    translateY: number;
    shapeMask?: "standard" | "circle" | "heart" | "polaroid";
    slotImages?: (HTMLImageElement | null)[];
    slotStates?: Array<{
      zoom: number;
      rotation: number;
      translateX: number;
      translateY: number;
    }>;
    collageLayout?: "single" | "grid-2" | "grid-3" | "grid-4";
  }
) {
  // Fill workspace with clean white background (prevents black background artifacts on print/export)
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // 1. Calculate physical card proportions based on template dimensions
  const padding = 0.1; 
  const maxW = width * (1 - padding * 2);
  const maxH = height * (1 - padding * 2);
  const aspect = template.widthIn / template.heightIn;
  
  let mw, mh;
  if (aspect > 1) { // Landscape
    mw = maxW;
    mh = maxW / aspect;
    if (mh > maxH) {
      mh = maxH;
      mw = maxH * aspect;
    }
  } else { // Portrait or Square
    mh = maxH;
    mw = maxH * aspect;
    if (mw > maxW) {
      mw = maxW;
      mh = maxW / aspect;
    }
  }

  const activeMask = (imageState?.shapeMask && imageState.shapeMask !== "standard") ? imageState.shapeMask : (template.styleType || "standard");

  const mx = (width - mw) / 2;
  const my = (height - mh) / 2;
  const cx = width / 2;
  const cy = height / 2;

  // 2. Draw solid white physical background board (Clean premium gallery souvenir)
  ctx.save();
  ctx.fillStyle = "#ffffff";
  
  // Realism soft shadow
  ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
  ctx.shadowBlur = Math.max(8, Math.floor(width * 0.025));
  ctx.shadowOffsetX = Math.max(2, Math.floor(width * 0.005));
  ctx.shadowOffsetY = Math.max(4, Math.floor(width * 0.01));

  ctx.beginPath();
  if (activeMask === "circle") {
    ctx.arc(cx, cy, mw / 2, 0, Math.PI * 2);
  } else if (activeMask === "heart") {
    drawHeartPath(ctx, cx, cy, mw * 0.44);
  } else if (activeMask === "oval") {
    ctx.ellipse(cx, cy, mw / 2, mh / 2, 0, 0, Math.PI * 2);
  } else if (activeMask === "arch") {
    drawArchPath(ctx, mx, my, mw, mh);
  } else if (activeMask === "hexagon") {
    drawHexagonPath(ctx, cx, cy, mw / 2);
  } else if (activeMask === "cloud") {
    drawCloudPath(ctx, cx, cy, mw, mh);
  } else if (activeMask === "scalloped") {
    drawScallopedPath(ctx, mx, my, mw, mh);
  } else if (activeMask === "royal") {
    drawRoyalCrestPath(ctx, cx, cy, mw, mh);
  } else {
    ctx.rect(mx, my, mw, mh);
  }
  ctx.fill();
  ctx.restore(); // reset shadow

  // Subtle realism edge stroke outline
  ctx.strokeStyle = "rgba(0, 0, 0, 0.12)";
  ctx.lineWidth = Math.max(1, Math.floor(width * 0.002));
  ctx.beginPath();
  if (activeMask === "circle") {
    ctx.arc(cx, cy, mw / 2, 0, Math.PI * 2);
  } else if (activeMask === "heart") {
    drawHeartPath(ctx, cx, cy, mw * 0.44);
  } else if (activeMask === "oval") {
    ctx.ellipse(cx, cy, mw / 2, mh / 2, 0, 0, Math.PI * 2);
  } else if (activeMask === "arch") {
    drawArchPath(ctx, mx, my, mw, mh);
  } else if (activeMask === "hexagon") {
    drawHexagonPath(ctx, cx, cy, mw / 2);
  } else if (activeMask === "cloud") {
    drawCloudPath(ctx, cx, cy, mw, mh);
  } else if (activeMask === "scalloped") {
    drawScallopedPath(ctx, mx, my, mw, mh);
  } else if (activeMask === "royal") {
    drawRoyalCrestPath(ctx, cx, cy, mw, mh);
  } else {
    ctx.rect(mx, my, mw, mh);
  }
  ctx.stroke();

  // 3. Draw Cutout (Photo Slot) & Crop user image
  let cutoutCX = cx;
  let cutoutCY = cy;
  let cutoutW = mw;
  let cutoutH = mh;

  if (activeMask === "strip" || template.styleType === "strip") {
    // --- SPECIAL MULTI-PHOTO STRIP LAYOUT DRAWING (3 STACKED SLOTS as per text request) ---
    const padW = mw * 0.08;
    const padH = mh * 0.04;
    const cw = mw - padW * 2;
    // Total vertical space allocated for photos on the strip
    const availableH = mh - padH * 2 - (mh * 0.08); // space at the bottom for caption text
    const gap = mh * 0.015; // clean gap between photos so they are easy to cut
    const ch = (availableH - 2 * gap) / 3; // height of each slot (holds 3 snapshots)

    // Check if slotImages are provided on the imageState
    const slotImgs = (imageState && "slotImages" in imageState && imageState.slotImages) 
      ? imageState.slotImages 
      : [imageObj, imageObj, imageObj];

    const slotSts = (imageState && "slotStates" in imageState && imageState.slotStates)
      ? imageState.slotStates
      : [
          { zoom: imageState?.zoom || 1, rotation: imageState?.rotation || 0, translateX: imageState?.translateX || 0, translateY: imageState?.translateY || 0 },
          { zoom: imageState?.zoom || 1, rotation: imageState?.rotation || 0, translateX: imageState?.translateX || 0, translateY: imageState?.translateY || 0 },
          { zoom: imageState?.zoom || 1, rotation: imageState?.rotation || 0, translateX: imageState?.translateX || 0, translateY: imageState?.translateY || 0 },
        ];

    for (let i = 0; i < 3; i++) {
      const slotX = mx + padW;
      const slotY = my + padH + i * (ch + gap);

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(slotX, slotY, cw, ch, Math.max(2, Math.floor(width * 0.004)));
      ctx.clip();

      // Background paper color
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(slotX, slotY, cw, ch);

      const slotImgObj = slotImgs[i] || imageObj;
      if (slotImgObj) {
        ctx.save();
        // Translate to slot center
        ctx.translate(slotX + cw / 2, slotY + ch / 2);

        // Apply individual crop states
        const sState = slotSts[i] || { zoom: 1, rotation: 0, translateX: 0, translateY: 0 };
        ctx.translate(sState.translateX, sState.translateY);
        ctx.rotate((sState.rotation * Math.PI) / 180);
        ctx.scale(sState.zoom, sState.zoom);

        // Filters
        if (aiCartoonEffect) {
          ctx.filter = "contrast(1.2) saturate(1.4)";
        } else if (aiGlowEffect) {
          ctx.filter = "brightness(1.1) saturate(1.15) contrast(1.02)";
        } else {
          ctx.filter = "none";
        }

        const aspectImg = slotImgObj.width / slotImgObj.height;
        const aspectSlot = cw / ch;
        let drawW = cw;
        let drawH = ch;

        // Photo must fill the entire slot borderless (cover format)
        if (aspectImg > aspectSlot) {
          drawH = ch;
          drawW = ch * aspectImg;
        } else {
          drawW = cw;
          drawH = cw / aspectImg;
        }

        ctx.drawImage(slotImgObj, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
      } else {
        // Dotted box inner frame outline for aesthetic placeholder
        ctx.strokeStyle = "rgba(0,0,0,0.12)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(slotX + 4, slotY + 4, cw - 8, ch - 8);
        ctx.setLineDash([]);
        
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.font = `600 ${Math.floor(cw * 0.1)}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`PHOTO ${i + 1}`, slotX + cw / 2, slotY + ch / 2);
      }
      ctx.restore();

      // Outer crisp stroke cut line around slot for easy cutting
      ctx.strokeStyle = "rgba(0,0,0,0.15)";
      ctx.lineWidth = Math.max(1, Math.floor(width * 0.0012));
      ctx.beginPath();
      ctx.roundRect(slotX, slotY, cw, ch, Math.max(2, Math.floor(width * 0.004)));
      ctx.stroke();
    }
  } else if (imageObj || (imageState?.collageLayout && imageState.collageLayout !== "single")) {
    ctx.save();
    ctx.beginPath();

    let cw = mw;
    let ch = mh;

    if (activeMask === "circle") {
      ctx.arc(cx, cy, mw / 2, 0, Math.PI * 2);
      ctx.clip();
      cutoutCX = cx;
      cutoutCY = cy;
      cutoutW = mw;
      cutoutH = mw;
    } else if (activeMask === "heart") {
      drawHeartPath(ctx, cx, cy, mw * 0.44);
      ctx.clip();
      cutoutCX = cx;
      cutoutCY = cy;
      cutoutW = mw * 1.15;
      cutoutH = mw * 1.15;
    } else if (activeMask === "polaroid") {
      cw = mw;
      ch = mw; // Perfect square filling the full card width, leaving the remaining bottom margins of the card borderless elsewhere
      ctx.rect(mx, my, cw, ch);
      ctx.clip();
      cutoutCX = mx + cw / 2;
      cutoutCY = my + ch / 2;
      cutoutW = cw;
      cutoutH = ch;
    } else if (activeMask === "oval") {
      ctx.ellipse(cx, cy, mw / 2, mh / 2, 0, 0, Math.PI * 2);
      ctx.clip();
      cutoutCX = cx;
      cutoutCY = cy;
      cutoutW = mw;
      cutoutH = mh;
    } else if (activeMask === "arch") {
      drawArchPath(ctx, mx, my, mw, mh);
      ctx.clip();
      cutoutCX = cx;
      cutoutCY = cy;
      cutoutW = mw;
      cutoutH = mh;
    } else if (activeMask === "hexagon") {
      drawHexagonPath(ctx, cx, cy, mw / 2);
      ctx.clip();
      cutoutCX = cx;
      cutoutCY = cy;
      cutoutW = mw;
      cutoutH = mw;
    } else if (activeMask === "cloud") {
      drawCloudPath(ctx, cx, cy, mw, mh);
      ctx.clip();
      cutoutCX = cx;
      cutoutCY = cy;
      cutoutW = mw;
      cutoutH = mh;
    } else if (activeMask === "scalloped") {
      drawScallopedPath(ctx, mx, my, mw, mh);
      ctx.clip();
      cutoutCX = cx;
      cutoutCY = cy;
      cutoutW = mw;
      cutoutH = mh;
    } else if (activeMask === "royal") {
      drawRoyalCrestPath(ctx, cx, cy, mw, mh);
      ctx.clip();
      cutoutCX = cx;
      cutoutCY = cy;
      cutoutW = mw;
      cutoutH = mh;
    } else {
      ctx.rect(mx, my, cw, ch);
      ctx.clip();
      cutoutCX = mx + cw / 2;
      cutoutCY = my + ch / 2;
      cutoutW = cw;
      cutoutH = ch;
    }

    if (imageState?.collageLayout && imageState.collageLayout !== "single") {
      // --- COLLAGE MULTI-PHOTO GRID DRAWING ---
      const layout = imageState.collageLayout;
      const startX = cutoutCX - cutoutW / 2;
      const startY = cutoutCY - cutoutH / 2;
      const gap = Math.max(3, Math.floor(width * 0.006));

      // Define cells depending on selected collage type
      let cells: Array<{ x: number; y: number; w: number; h: number }> = [];
      if (layout === "grid-2") {
        // Vertical/Horizontal side-by-side split (2 photos)
        cells = [
          { x: startX, y: startY, w: cutoutW / 2 - gap / 2, h: cutoutH },
          { x: startX + cutoutW / 2 + gap / 2, y: startY, w: cutoutW / 2 - gap / 2, h: cutoutH },
        ];
      } else if (layout === "grid-3") {
        // Asymmetric collage: 1 big left column, 2 horizontal rows stacked on right (3 photos)
        cells = [
          { x: startX, y: startY, w: cutoutW / 2 - gap / 2, h: cutoutH },
          { x: startX + cutoutW / 2 + gap / 2, y: startY, w: cutoutW / 2 - gap / 2, h: cutoutH / 2 - gap / 2 },
          { x: startX + cutoutW / 2 + gap / 2, y: startY + cutoutH / 2 + gap / 2, w: cutoutW / 2 - gap / 2, h: cutoutH / 2 - gap / 2 },
        ];
      } else if (layout === "grid-4") {
        // 2x2 grid (4 photos)
        cells = [
          { x: startX, y: startY, w: cutoutW / 2 - gap / 2, h: cutoutH / 2 - gap / 2 },
          { x: startX + cutoutW / 2 + gap / 2, y: startY, w: cutoutW / 2 - gap / 2, h: cutoutH / 2 - gap / 2 },
          { x: startX, y: startY + cutoutH / 2 + gap / 2, w: cutoutW / 2 - gap / 2, h: cutoutH / 2 - gap / 2 },
          { x: startX + cutoutW / 2 + gap / 2, y: startY + cutoutH / 2 + gap / 2, w: cutoutW / 2 - gap / 2, h: cutoutH / 2 - gap / 2 },
        ];
      }

      // Check if slotImages are provided on the imageState
      const slotImgs = (imageState && "slotImages" in imageState && imageState.slotImages) 
        ? imageState.slotImages 
        : [imageObj, imageObj, imageObj, imageObj];

      const slotSts = (imageState && "slotStates" in imageState && imageState.slotStates)
        ? imageState.slotStates
        : [
            { zoom: 1, rotation: 0, translateX: 0, translateY: 0 },
            { zoom: 1, rotation: 0, translateX: 0, translateY: 0 },
            { zoom: 1, rotation: 0, translateX: 0, translateY: 0 },
            { zoom: 1, rotation: 0, translateX: 0, translateY: 0 },
          ];

      cells.forEach((cell, idx) => {
        ctx.save();
        ctx.beginPath();
        ctx.rect(cell.x, cell.y, cell.w, cell.h);
        ctx.clip();

        // Background color of the slot space
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(cell.x, cell.y, cell.w, cell.h);

        const slotImgObj = slotImgs[idx] || imageObj;
        if (slotImgObj) {
          ctx.save();
          // Translate to cell center
          ctx.translate(cell.x + cell.w / 2, cell.y + cell.h / 2);

          // Apply individual transformations
          const sState = slotSts[idx] || { zoom: 1, rotation: 0, translateX: 0, translateY: 0 };
          ctx.translate(sState.translateX, sState.translateY);
          ctx.rotate((sState.rotation * Math.PI) / 180);
          ctx.scale(sState.zoom, sState.zoom);

          // Filters
          if (aiCartoonEffect) {
            ctx.filter = "contrast(1.2) saturate(1.4)";
          } else if (aiGlowEffect) {
            ctx.filter = "brightness(1.1) saturate(1.15) contrast(1.02)";
          } else {
            ctx.filter = "none";
          }

          const aspectImg = slotImgObj.width / slotImgObj.height;
          const aspectCell = cell.w / cell.h;
          let drawW = cell.w;
          let drawH = cell.h;

          // Fill the cell entirely slot format (cover)
          if (aspectImg > aspectCell) {
            drawH = cell.h;
            drawW = cell.h * aspectImg;
          } else {
            drawW = cell.w;
            drawH = cell.w / aspectImg;
          }

          ctx.drawImage(slotImgObj, -drawW / 2, -drawH / 2, drawW, drawH);
          ctx.restore();
        } else {
          // Elegant dotted placeholder
          ctx.strokeStyle = "rgba(0,0,0,0.12)";
          ctx.lineWidth = Math.max(1, Math.floor(width * 0.0012));
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(cell.x + 4, cell.y + 4, cell.w - 8, cell.h - 8);
          ctx.setLineDash([]);

          ctx.fillStyle = "rgba(0,0,0,0.35)";
          // Scale font size according to slot size
          const fontPx = Math.max(9, Math.floor(cell.w * 0.12));
          ctx.font = `600 ${fontPx}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(`+ SLOT ${idx + 1}`, cell.x + cell.w / 2, cell.y + cell.h / 2);
        }

        ctx.restore(); // restore cell clipping

        // Outer margin separator line
        ctx.strokeStyle = "rgba(0,0,0,0.1)";
        ctx.lineWidth = 1;
        ctx.strokeRect(cell.x, cell.y, cell.w, cell.h);
      });

    } else if (imageObj) {
      // 4. Transform and scale user image neatly inside cutout box
      ctx.save();
      ctx.translate(cutoutCX, cutoutCY);
      if (imageState) {
        ctx.translate(imageState.translateX, imageState.translateY);
        ctx.rotate((imageState.rotation * Math.PI) / 180);
        ctx.scale(imageState.zoom, imageState.zoom);
      }

      // Enhance and apply smart tone overrides
      if (aiCartoonEffect) {
        ctx.filter = "contrast(1.2) saturate(1.4)";
      } else if (aiGlowEffect) {
        ctx.filter = "brightness(1.1) saturate(1.15) contrast(1.02)";
      } else {
        ctx.filter = "none";
      }

      // Centered crop calculation (photo must fill the cutout borderless)
      const aspectImg = imageObj.width / imageObj.height;
      const aspectCutout = cutoutW / cutoutH;
      let drawW = cutoutW;
      let drawH = cutoutH;
      
      if (aspectImg > aspectCutout) {
        drawH = cutoutH;
        drawW = cutoutH * aspectImg;
      } else {
        drawW = cutoutW;
        drawH = cutoutW / aspectImg;
      }

      ctx.drawImage(imageObj, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore(); // reset image transformations
    }
    
    ctx.restore(); // reset clipping mask

    // Draw crisp stroke border around the photo slot
    if (activeMask === "polaroid") {
      ctx.strokeStyle = "rgba(0, 0, 0, 0.12)";
      ctx.lineWidth = Math.max(1, Math.floor(width * 0.0012));
      ctx.beginPath();
      ctx.rect(mx, my, mw, mw);
      ctx.stroke();
    }
  } else {
    // If no image is supplied yet (such as inside card thumbnail selection): Draw a subtle elegant photo placeholder card
    ctx.save();
    ctx.fillStyle = "#f1f5f9"; // warm light gray slot
    ctx.strokeStyle = "rgba(0,0,0,0.06)";
    ctx.lineWidth = 1.5;
    
    ctx.beginPath();
    if (activeMask === "circle") {
      ctx.arc(cx, cy, mw / 2, 0, Math.PI * 2);
    } else if (activeMask === "heart") {
      drawHeartPath(ctx, cx, cy, mw * 0.44);
    } else if (activeMask === "oval") {
      ctx.ellipse(cx, cy, mw / 2, mh / 2, 0, 0, Math.PI * 2);
    } else if (activeMask === "arch") {
      drawArchPath(ctx, mx, my, mw, mh);
    } else if (activeMask === "hexagon") {
      drawHexagonPath(ctx, cx, cy, mw / 2);
    } else if (activeMask === "cloud") {
      drawCloudPath(ctx, cx, cy, mw, mh);
    } else if (activeMask === "scalloped") {
      drawScallopedPath(ctx, mx, my, mw, mh);
    } else if (activeMask === "royal") {
      drawRoyalCrestPath(ctx, cx, cy, mw, mh);
    } else if (activeMask === "polaroid") {
      ctx.rect(mx, my, mw, mw);
    } else {
      ctx.rect(mx, my, mw, mh);
    }
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // 5. Engrave Caption typography at bottom bezel/border of the white magnet!
  const footerText = customText !== undefined ? customText : template.defaultText;
  
  if (footerText && footerText.trim() !== "") {
    ctx.save();
    
    // Responsive font calculation
    const isSmallFormat = template.id === "k7-strip-small";
    const isPolaroid = activeMask === "polaroid";
    const fontSize = isSmallFormat ? Math.floor(mw * 0.075) : Math.floor(mw * 0.065);
    
    if (isPolaroid) {
      // Polaroid ink writing pen style inside bottom bezel
      ctx.font = `600 ${Math.floor(mw * 0.055)}px "JetBrains Mono", Courier, monospace`;
      ctx.fillStyle = "#1e293b"; // Classic handwriting carbon black look
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const textY = my + mw + (mh - mw) / 2; // perfectly centered on bottom white bezel!
      ctx.fillText(footerText.toUpperCase(), cx, textY);
    } else {
      ctx.font = `800 ${fontSize}px "Inter", -apple-system, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const textY = my + mh - (mh * 0.065);

      // Stroke outline for superior readability on top of arbitrary user photos
      ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
      ctx.lineWidth = Math.max(2, Math.floor(mw * 0.008));
      ctx.strokeText(footerText.toUpperCase(), cx, textY);

      ctx.fillStyle = "#ffffff"; // elegant white ink
      ctx.fillText(footerText.toUpperCase(), cx, textY);
    }
    ctx.restore();
  }

  ctx.restore(); // restore raw context
}

function drawHeartPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - size * 0.32);
  ctx.bezierCurveTo(cx - size * 0.5, cy - size * 1.0, cx - size * 1.2, cy - size * 0.52, cx - size * 1.2, cy);
  ctx.bezierCurveTo(cx - size * 1.2, cy + size * 0.48, cx - size * 0.5, cy + size * 0.92, cx, cy + size * 1.28);
  ctx.bezierCurveTo(cx + size * 0.5, cy + size * 0.92, cx + size * 1.2, cy + size * 0.48, cx + size * 1.2, cy);
  ctx.bezierCurveTo(cx + size * 1.2, cy - size * 0.52, cx + size * 0.5, cy - size * 1.0, cx, cy - size * 0.32);
  ctx.closePath();
}

function drawHexagonPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawArchPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + w / 2);
  ctx.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
}

function drawCloudPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number) {
  const r = Math.min(w, h) * 0.25;
  ctx.beginPath();
  ctx.arc(cx - r * 1.5, cy, r, Math.PI * 0.5, Math.PI * 1.5);
  ctx.arc(cx - r * 0.7, cy - r, r * 1.2, Math.PI, Math.PI * 1.8);
  ctx.arc(cx + r * 0.7, cy - r, r * 1.2, Math.PI * 1.2, Math.PI * 2);
  ctx.arc(cx + r * 1.5, cy, r, Math.PI * 1.5, Math.PI * 0.5);
  ctx.closePath();
}

function drawScallopedPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const numScallopsX = 8;
  const numScallopsY = 10;
  const sw = w / numScallopsX;
  const sh = h / numScallopsY;
  const r = Math.min(sw, sh) * 0.5;

  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let i = 0; i < numScallopsX; i++) {
    ctx.quadraticCurveTo(x + i * sw + sw / 2, y - r, x + (i + 1) * sw, y);
  }
  for (let i = 0; i < numScallopsY; i++) {
    ctx.quadraticCurveTo(x + w + r, y + i * sh + sh / 2, x + w, y + (i + 1) * sh);
  }
  for (let i = numScallopsX; i > 0; i--) {
    ctx.quadraticCurveTo(x + (i - 1) * sw + sw / 2, y + h + r, x + (i - 1) * sw, y + h);
  }
  for (let i = numScallopsY; i > 0; i--) {
    ctx.quadraticCurveTo(x - r, y + (i - 1) * sh + sh / 2, x, y + (i - 1) * sh);
  }
  ctx.closePath();
}

function drawRoyalCrestPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number) {
  const rw = w / 2;
  const rh = h / 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - rh);
  ctx.bezierCurveTo(cx + rw * 0.5, cy - rh, cx + rw, cy - rh * 0.5, cx + rw, cy);
  ctx.bezierCurveTo(cx + rw, cy + rh * 0.5, cx + rw * 0.5, cy + rh, cx, cy + rh);
  ctx.bezierCurveTo(cx - rw * 0.5, cy + rh, cx - rw, cy + rh * 0.5, cx - rw, cy);
  ctx.bezierCurveTo(cx - rw, cy - rh * 0.5, cx - rw * 0.5, cy - rh, cx, cy - rh);
  ctx.closePath();
}
