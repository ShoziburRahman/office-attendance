# Capacitor Android Audit Plan

## Objectives
Audit the Next.js codebase for potential issues when wrapped in a Capacitor Android WebView.

## Audit Steps

### 1. Storage & Cookies
- Search for `localStorage` and `sessionStorage`.
- Search for cookie usage (`document.cookie`, `cookies()` from next/headers).
- Identify potential persistence or domain issues in WebView.

### 2. Browser-specific APIs
- Search for APIs that may require Capacitor native plugins (e.g., Clipboard, Notification, File System).
- Exclude Geolocation and Camera as per user request.

### 3. Hardcoded URLs
- Search for `localhost`, `127.0.0.1`, or other development-specific URLs.

### 4. CSS/Tailwind Layouts
- Search for fixed-width containers (e.g., `w-[1000px]`) that would break on mobile.
- Look for non-responsive table implementations.

### 5. Third-party Library Review
- Analyze `package.json` for libraries not explicitly mentioned (Supabase, date-fns, lucide-react, html5-qrcode) that might have known Android WebView issues.

## Deliverables
- A list of files and line numbers for each finding.
- Recommendations for Capacitor native alternatives where applicable.
