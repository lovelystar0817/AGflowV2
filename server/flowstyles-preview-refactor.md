# FlowStyles - App Customization Preview Refactor

## 🛠️ Context
Currently, the **live preview** for app customization is embedded inside `customize-app.tsx`.  
This has been causing plugin/runtime errors, rendering issues, and misalignment with the actual stylist app page.  
We need to **separate the preview into its own page** so stylists see exactly what their clients will see, and to reduce runtime issues.

---

## 🎯 Goal
Move the full stylist app preview to a **separate page** (`/app/preview`) while keeping `/app/:slug` for client-facing views.

---

## ✅ Required Changes

### 1. `customize-app.tsx`
- Remove the embedded live preview section.  
- At the bottom of the form, add a **“Preview My App”** button.  
- This button should link to a new route `/app/preview`.  

### 2. New Page: `/app/preview`
- Create `client/src/pages/app-preview.tsx`.  
- Reuse the existing `StylistAppPreview` component (or the layout from `public-app-page.tsx`).  
- Fetch the logged-in stylist’s data from `/api/profile`.  
- Render profile with:  
  - Header (stylist/business name, location, phone if enabled)  
  - Portfolio gallery (up to 6 photos)  
  - Bio card  
  - Services (pill-style buttons with theme)  
  - Calendar preview (from `/api/public/availability/:id`)  
  - Sticky message button  

### 3. Routing
- Register `/app/preview` in the router.  
- Ensure `/app/:slug` remains unchanged for client-facing views.  

---

## ⚠️ Safeguards
- After each step, run:  
  - `npm run check` → ensure **TypeScript passes with 0 errors**.  
  - `npm run dev` → ensure the app compiles and runs.  
- Do **not** modify unrelated files or imports.  
- If plugin/runtime errors appear, **stop and fix immediately** before continuing.  

---

## ✅ Expected Outcome
- Stylists edit their profile in `customize-app.tsx`.  
- They click **Preview My App** → redirected to `/app/preview`.  
- `/app/preview` renders the same profile clients see at `/app/:slug`.  
- No more runtime/plugin crashes inside the customization page.  

---
