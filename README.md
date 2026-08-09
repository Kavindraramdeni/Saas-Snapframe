# SnapFrame AI ⚡ - Souvenir Photo Magnetic Frame SaaS

A comprehensive, production-grade full-stack SaaS web application specifically optimized for local tourist photo magnet frame stalls. SnapFrame AI enables tourists to scan a QR code table-card, upload their selfies directly, choose beautifully stylized souvenir overlays, pay instantly via UPI/Razorpay, and seamlessly queues 300 DPI high-res print files to the stall owner's live dashboard.

---

## 🚀 Key Functional Modules

### 1. Public Souvenir Portal
- **High-contrast Visual Identity**: High-contrast, Instagram-worthy sand/ocean design themed on premium tourist adventures.
- **Hero Slider with Memories**: Staggered entering sliders illustrating actual polaroid vacation layouts.
- **QR Capture Instructions**: In-stall guide details ("Scan QR at Stall -> Custom Style -> Instant UPI -> Print and pick up").

### 2. Customer Upload & Customizer
- **Smart Image Compression**: Automatically downscales heavy camera files in the browser. Reduces a 10MB master portrait to under 300KB in milliseconds to ensure seamless uploads on crowded, slow beach-stall cell signals while preserving high output quality.
- **Horizontal category tabs**: Scrollable filter tabs (Goa, Beach, Couples, Family, Adventure, Birthday).
- **Interactive Masked Canvas**: Supports rotation, panning, scaling, and custom texts overlay on client HTML5 canvas context.
- **AI Captions over Gemini 3.5 Flash**: Calls server-side Gemini Vision/Text API to recommend dynamic beach text stamps (e.g. "GOA MEMORIES 2026", "SUNSET DRIP AT COLLVA").

### 3. Integrated UPI/Razorpay Gateway
- **Mock Sandbox Modal overlay**: Generates real transaction receipts and overlays a simulated active UPI scanning QR box, enabling seamless, bulletproof checkout tests directly inside AI Studio previews!
- **State callback signatures**: Re-evaluates payment states and automatically updates the admin printing queue instantly.

### 4. Admin Live Printing Control Panel
- **Incoming Orders Feed**: Automatic live feeds fetching pending frames.
- **One-click high-res compositing**: Generates and downloads pixel-perfect, true-to-scale 300 DPI high-resolution PNG copies directly onto the beach-stall's printer.
- **Simulated WhatsApp Logs Cabin**: Review precise simulated alerts delivered to customer phone numbers ("Payment success!", "Frame ready to collect at Stall #3!").

---

## 📂 Web App Architecture

```text
/
├── server.ts                       # Express backend server (integrates Gemini, Razorpay, WhatsApp simulator)
├── README.md                       # Comprehensive deployment documentation
├── .env.example                     # Environment variables credentials template
├── package.json                     # Dependency manifests & bundler build parameters
├── src/
│   ├── App.tsx                      # Primary Navigation State Router
│   ├── types.ts                     # Strict TypeScript interfaces
│   ├── index.css                    # Tailwind CSS global styles
│   ├── main.tsx                     # React rendering bootstrapper
│   └── components/
│       ├── LandingPage.tsx          # Premium landing page and features grid
│       ├── UploadSection.tsx        # Device camera selector and scaling compressor
│       ├── TemplateSelector.tsx     # Categories tabs and selection grids
│       ├── CanvasEditor.tsx         # Graphic transformations, AI captionings
│       ├── CheckoutScreen.tsx       # Billing tables, Razorpay UPI sandbox popup
│       ├── AdminConsole.tsx         # Stats bars, live print list, settings forms
│       └── FrameCanvasCompositor.tsx# Dynamic SVG-vector frame compositor engine
```

---

## ⚡ Supabase PostgreSQL Database Schema

To configure production-side storage tables, execute the following SQL statement in your Supabase SQL Editor:

```sql
-- 1. Create Profiles/Users Table
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Frame Templates Table
CREATE TABLE public.templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    primary_color TEXT,
    border_color TEXT,
    badge_text TEXT,
    description TEXT,
    style_type TEXT NOT NULL,
    default_text TEXT
);

-- 3. Create Orders Table with Cascade Relationships
CREATE TABLE public.orders (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    original_image TEXT NOT NULL,
    template_id TEXT REFERENCES public.templates(id),
    final_image_url TEXT,
    payment_status TEXT DEFAULT 'pending'::text,
    order_status TEXT DEFAULT 'pending'::text,
    amount NUMERIC DEFAULT 299 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    bg_removed BOOLEAN DEFAULT false,
    cartoon_filter BOOLEAN DEFAULT false,
    glow_filter BOOLEAN DEFAULT false,
    ai_text_generated TEXT
);

-- 4. Create Active Payments Log Table
CREATE TABLE public.payments (
    id TEXT PRIMARY KEY,
    order_id TEXT REFERENCES public.orders(id) ON DELETE CASCADE,
    razorpay_payment_id TEXT UNIQUE,
    razorpay_order_id TEXT,
    amount NUMERIC NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create Settings Table for Stall configurations
CREATE TABLE public.settings (
    id SERIAL PRIMARY KEY,
    stall_name TEXT DEFAULT 'SnapFrame Stall #3' NOT NULL,
    price_per_frame NUMERIC DEFAULT 299 NOT NULL,
    upi_id TEXT DEFAULT 'snapframe@okaxis' NOT NULL,
    whatsapp_enabled BOOLEAN DEFAULT true NOT NULL,
    auto_print_enabled BOOLEAN DEFAULT false NOT NULL
);
```

---

## ⚙️ Environment Configuration

Set the values in your **Settings > Secrets** panel in AI Studio or write a local `.env` file:

```env
# Google GenAI API Secret (Automated injection)
GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE"

# Razorpay Sandbox payment keys (Optional)
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="..."

# Supabase database Credentials (Optional)
SUPABASE_URL="https://your-supabase-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role"
```

---

## 📦 Production Bundling Instructions

To launch compiling parameters and start standalone executions:

```bash
# 1. Install workspace dependencies
npm install

# 2. Start Live Development server (TSX direct-transpile)
npm run dev

# 3. Compile Production Bundle (compiles static React files and targets node-bundled server.cjs)
npm run build

# 4. Start Compiled Node server in production container
npm run start
```
