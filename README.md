# 🕒 StampKini — Professional Attendance System

StampKini is a high-integrity attendance tracking solution designed for modern offices. It combines the agility of a web-based interface with the security of native Android capabilities to ensure that attendance is recorded accurately, honestly, and efficiently.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-green)
![Capacitor](https://img.shields.io/badge/Capacitor-Native-orange)

---

## 🚀 Core Features

### 👷 For Employees
- **One-Tap Check-in/out**: Simple, intuitive interface for daily attendance.
- **Three-Factor Verification**: High-security verification requiring **Office QR Code**, **Authorized Wi-Fi**, and **GPS Location** to prevent "buddy punching".
- **Attendance History**: Detailed personal logs including total working hours, overtime, and late arrivals.
- **Profile Management**: View current work schedules and personal employment details.
- **WFH & Extra Session Requests**: Digital request system for working from home or requesting additional sessions for late-night work.

### 🔑 For Administrators
- **Employee Lifecycle Management**: Provision, activate, and deactivate employee accounts.
- **Dynamic Office Settings**: Configure the "Check-out Lock" (minimum minutes before allowed checkout), GPS radius, and authorized Wi-Fi networks.
- **QR Token Lifecycle**: Generate secure, time-limited QR tokens for office check-ins.
- **Schedule Management**: Assign working hours and weekly off-days per employee.
- **Comprehensive Reporting**: Audit attendance records and track employee productivity.

---

## 🛠 Technical Architecture

StampKini leverages a modern "Web-to-Native" bridge to provide a seamless experience:

- **Frontend**: [Next.js 14](https://nextjs.org/) (App Router) + [Tailwind CSS](https://tailwindcss.com/) + [TypeScript](https://www.typescriptlang.org/).
- **Native Bridge**: [Capacitor](https://capacitorjs.com/) used to wrap the web app into an Android APK.
- **Android Native Integration**: A custom `JavascriptInterface` in Java provides the web layer with raw access to **SSID/BSSID** data and **Precise Location**, bypassing standard browser limitations.
- **Backend**: [Supabase](https://supabase.com/) (PostgreSQL) utilizing:
    - **RLS (Row Level Security)**: Ensures users can only access their own data.
    - **Postgres RPC**: Business logic (check-in/out validation) is executed server-side for maximum security.
    - **pg_cron**: Automated jobs for flagging expired sessions and closing out daily logs.

---

## 📦 Installation & Setup

### 1. Supabase Backend
1. Create a new Supabase project.
2. Apply the migrations in the following order:
   - `supabase/migrations/0001_schema.sql` (Tables & Enums)
   - `supabase/migrations/0002_functions.sql` (Server-side Logic/RPC)
   - `supabase/migrations/0003_rls_policies.sql` (Security Policies)
3. Enable the `pg_cron` extension in the Supabase Dashboard and schedule the maintenance jobs provided in the migration files.

### 2. Environment Configuration
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_API_URL=http://localhost:3000 # Use production URL for deployment
CAPACITOR_URL=http://your-local-ip:3000
```

### 3. Frontend Setup
```bash
npm install
npm run dev
```

### 4. Android Build (Native)
1. Ensure **Android Studio** is installed.
2. Build the web project: `npm run build`.
3. Sync Capacitor: `npx cap sync android`.
4. Open the project in Android Studio: `npx cap open android`.
5. Ensure `ACCESS_FINE_LOCATION` and `ACCESS_WIFI_STATE` permissions are granted in `AndroidManifest.xml`.
6. Run the app on a physical Android device.

---

## 📂 Project Structure

```text
├── android/             # Native Android Studio project
├── src/
│   ├── app/             # Next.js App Router (Pages & Server Actions)
│   │   ├── admin/       # Admin Dashboard & Management
│   │   └── employee/    # Employee Portal & Attendance
│   ├── components/      # Shared UI Components
│   ├── lib/             # Core Utilities
│   │   ├── auth/        # Session & Role management
│   │   ├── native/      # Android Bridge wrappers (Wi-Fi/Location)
│   │   └── supabase/    # Client & Server Supabase initialization
│   └── types/           # TypeScript Database definitions
├── supabase/             # Database migrations and seed data
└── docs/                # System architecture and design documents
```

## 📄 License
This project is licensed under the MIT License.
