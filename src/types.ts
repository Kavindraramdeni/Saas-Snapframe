/**
 * TypeScript type definitions for SnapFrame AI
 */

export type CategoryType = 'couple' | 'beach' | 'Goa' | 'vacation' | 'family' | 'birthday' | 'adventure';

export interface FrameTemplate {
  id: string;
  name: string;
  category: CategoryType;
  primaryColor: string;
  borderColor: string;
  badgeText: string;
  description: string;
  widthIn: number;
  heightIn: number;
  isActive: boolean;
  // Vector graphics options to overlay on Canvas
  styleType: 'polaroid' | 'beach_sunset' | 'goa_shack' | 'retro_travel' | 'comic_cartoon' | 'neon_glow' | 'elegant_gold' | 'plain' | 'circle' | 'heart' | 'oval' | 'arch' | 'cloud' | 'strip' | 'scalloped' | 'hexagon' | 'royal';
  defaultText: string;
}

export type OrderStatus = 'pending' | 'paid' | 'printed' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface Order {
  id: string;
  customerName: string;
  phone: string;
  originalImage: string; // base64 or URL
  compressedImage?: string;
  templateId: string;
  finalImageUri: string; // Ready for print image (high-res data URL or URL)
  thumbnailUri?: string; // Lightweight base64 or URL thumbnail for listings
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  amount: number;
  createdAt: string;
  // AI Options applied
  aiOptions: {
    bgRemoved: boolean;
    cartoonFilter: boolean;
    glowFilter: boolean;
    aiTextGenerated: string;
  };
  editorState?: {
    zoom: number;
    rotation: number;
    translateX: number;
    translateY: number;
  };
  waUrl?: string;
  whatsappEnabled?: boolean;
}

export interface RevenueStats {
  totalRevenue: number;
  totalOrders: number;
  pendingCount: number;
  paidCount: number;
  completedCount: number;
  dailyRevenue: { [date: string]: number };
  dailyOrders: { [date: string]: number };
  popularTemplates: { [templateId: string]: number };
}

export interface AdminSettings {
  stallName: string;
  pricePerFrame: number;
  upiId: string;
  whatsappEnabled: boolean;
  autoPrintEnabled: boolean;
  stallPhone?: string;
  printPreset?: string;
  printWidth?: string;
  printHeight?: string;
  printOrientation?: string;
}

export function generateThumbnail(base64Str: string): Promise<string> {
  return new Promise((resolve) => {
    if (!base64Str || !base64Str.startsWith("data:image")) {
      resolve("");
      return;
    }
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const maxDim = 150;
      let w = img.width;
      let h = img.height;
      if (w > h) {
        if (w > maxDim) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        }
      } else {
        if (h > maxDim) {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      canvas.width = w;
      canvas.height = h;
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      } else {
        resolve("");
      }
    };
    img.onerror = () => {
      resolve("");
    };
  });
}

export interface CartItem {
  id: string;
  finalImageUri: string;
  thumbnailUri: string;
  template: FrameTemplate;
  customText: string;
  aiOptions: {
    bgRemoved: boolean;
    cartoonFilter: boolean;
    glowFilter: boolean;
    aiTextGenerated: string;
  };
  editorState?: {
    zoom: number;
    rotation: number;
    translateX: number;
    translateY: number;
  };
}


