# 🕒 Professional Attendance & Payroll System

A high-integrity attendance tracking and payroll solution designed for modern offices. This system combines a secure Next.js administrative panel with a native Android application to ensure attendance is recorded accurately, honestly, and efficiently, and that salaries are calculated precisely.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-green)
![Capacitor](https://img.shields.io/badge/Capacitor-Native-orange)

---

## 🚀 Core Features

### 👷 For Employees
- **One-Tap Check-in/out**: Intuitive mobile interface for daily attendance.
- **Multi-Factor Security**: 
  - **Biometric Binding**: Device-specific biometric signing using RSA-PSS to prevent account sharing.
  - **Authorized Wi-Fi**: Verification of SSID/BSSID to ensure presence in the office.
  - **GPS Location**: Precise coordinate validation within a defined radius.
- **Attendance History**: Detailed logs including total working hours, overtime, and late arrivals.
- **Profile Management**: View current work schedules and personal employment details.
- **WFH & Extra Session Requests**: Digital request system for working from home or requesting additional sessions.

### 🔑 For Administrators
- **Employee Lifecycle**: Provision, activate, and deactivate employee accounts.
- **Payroll & Salary Calculation**:
  - **Automated Baseline**: Loads monthly attendance, overtime, and leave data.
  - **Calendar-Aware**: Automatically determines salary days based on the actual days in the month (handling leap years).
  - **Manual Overrides**: Full admin control over basic salary, OT rates, and deductions.
  - **Snapshotting**: Saves monthly payroll as a snapshot, ensuring historical records remain unchanged even if attendance is corrected later.
  - **Salary History**: Track and manage payment status (Draft/Paid) for every employee.
- **Advanced Reporting**: Generate detailed Monthly Attendance History reports in **PDF** and **DOCX** formats.
- **Dynamic Office Settings**: Configure GPS radius, Wi-Fi allowlists, and the "Check-out Lock" (minimum duration before allowed checkout).
- **Schedule Management**: Assign specific working hours and weekly off-days per employee.
- **Paid Leave Tracking**: Implement annual paid leave limits with "Extra" tracking for non-blocking administration.

---

## 🛠 Technical Architecture

The system leverages a "Web-to-Native" bridge to provide a seamless, secure experience:

- **Frontend**: [Next.js 14](https://nextjs.org/) (App Router) + [Tailwind CSS](https://tailwindcss.com/) + [TypeScript](https://www.typescriptlang.org/).
- **Native Bridge**: [Capacitor](https://capacitorjs.com/) wraps the web app into an Android APK.
- **Android Native Integration**: Custom Java `JavascriptInterface` providing raw access to **SSID/BSSID** and **Precise Location**.
- **Security Layer**: 
  - **RSA-PSS Signing**: Biometric prompts sign a challenge on the device, verified server-side to ensure the authenticated user is physically present on their registered device.
  - **Supabase RLS**: Row Level Security ensures strict data isolation between employees and admins.
- **Backend**: [Supabase](https://supabase.com/) (PostgreSQL) utilizing RPC functions for atomic check-in/out operations.

---

## 📦 Installation & Setup

### 1. Supabase Backend
1. Create a new Supabase project.
2. Apply the migrations in the `supabase/migrations/` folder in sequential order.
3. Ensure the `pg_cron` extension is enabled for maintenance jobs.

### 2. Environment Configuration
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_API_URL=http://localhost:3000
CAPACITOR_URL=http://your-local-ip:3000
```

### 3. Frontend Setup
```bash
npm install
npm run dev
```

### 4. Android Build
1. Build the web project: `npm run build`.
2. Sync Capacitor: `npx cap sync android`.
3. Open in Android Studio: `npx cap open android`.
4. Grant `ACCESS_FINE_LOCATION` and `ACCESS_WIFI_STATE` permissions.

---

## 📂 Project Structure

```text
├── android/             # Native Android Studio project
├── src/
│   ├── app/             # Next.js App Router (Pages & Server Actions)
│   │   ├── admin/       # Admin Dashboard (Employee, Salary, Reports, Settings)
│   │   └── employee/    # Employee Portal & Attendance
│   ├── components/      # Shared UI Components (Combobox, Dialogs, Toasts)
│   ├── lib/             # Core Utilities (Reports, Leave Calcs, Auth)
│   │   ├── auth/        # Session & Role management
│   │   ├── native/      # Android Bridge wrappers
│   │   └── supabase/    # Client & Server initialization
│   └── types/           # TypeScript Database definitions
├── supabase/             # Database migrations (Schema, RLS, Functions)
└── docs/                # System architecture documents
```

## 📄 License
This project is licensed under the MIT License.
