# Integration Plan: Physical Biometric Device Sync System

## 1. Overview
The goal is to transition from manual app-based attendance to automated physical biometric logging. This plan outlines the architecture for syncing a physical fingerprint/face scanner with the existing Attendance App backend (Supabase).

## 2. Recommended Hardware
For a professional yet cost-effective setup, I recommend **ZKTeco** devices. They are globally standard, have well-documented protocols, and affordable hardware.

### Suggested Models:
- **Entry Level: ZKTeco K40**
    - *Features:* TCP/IP, USB Host, Fingerprint.
    - *Best for:* Small offices (under 50 employees).
- **Mid-Range: ZKTeco iClock 680**
    - *Features:* Fingerprint, RFID Card, TCP/IP, Push Technology.
    - *Best for:* Medium offices with higher traffic.
- **Advanced: ZKTeco uFace 800**
    - *Features:* Face Recognition, Fingerprint, RFID, TCP/IP.
    - *Best for:* High-security needs or touchless attendance.

---

## 3. Technical Architecture
Since most biometric devices operate on a local network (LAN) and cannot communicate directly with a cloud database (Supabase) for security reasons, we will use a **Middleware Bridge**.

### The Workflow:
`Device (Local IP)` $\rightarrow$ `Middleware Script (Office PC)` $\rightarrow$ `Internet` $\rightarrow$ `Supabase API` $\rightarrow$ `Attendance Table`

### Component Breakdown:
1.  **Physical Device:** Captures the biometric scan and stores a log (User ID + Timestamp).
2.  **Middleware (The Bridge):** A lightweight Node.js or Python service installed on a computer in the office.
    - **Connection:** Connects to the device via TCP/IP (Port 4370).
    - **Extraction:** Periodically fetches "un-synced" logs.
    - **Transformation:** Maps the Device User ID (e.g., `101`) to the App Employee ID (e.g., `uuid-123`).
    - **Transmission:** Sends the data to the app via a secure API endpoint.
3.  **App Backend (Supabase):**
    - **API Endpoint:** A secure Edge Function or API route to receive logs.
    - **Processing Logic:** Checks if the log is a "Check-In" or "Check-Out" based on the time of day and previous logs.

---

## 4. Implementation Steps

### Phase 1: Hardware Setup
- Install the device in the office.
- Assign a **Static IP address** to the device (e.g., `192.168.1.201`) so the middleware never loses the connection.
- Enroll employees' fingerprints and assign each a unique `User ID`.

### Phase 2: Middleware Development
- Use a library like `node-zklib` (for Node.js) or `zkpython` (for Python).
- Create a script that:
    1. Connects to the device IP.
    2. Downloads all attendance logs.
    3. Iterates through logs and calls the app's API.
    4. Clears the logs from the device (or marks them as synced) to avoid duplicates.

### Phase 3: Backend Integration
- Create a mapping table in Supabase: `biometric_mappings` (`device_user_id` $\leftrightarrow$ `employee_id`).
- Update the attendance logic to handle "Automated" logs (ignoring manual app check-ins if a biometric log exists for the same time).

---

## 5. Security & Reliability
- **Security:** Use an `API_KEY` in the Middleware headers so only the office PC can push attendance data.
- **Offline Mode:** The device stores logs internally. If the internet goes down, the middleware will simply sync all accumulated logs once the connection is restored.
- **Redundancy:** Keep the App check-in as a "Backup" option for employees whose fingerprints might not scan (e.g., due to injury).

## 6. Estimated Timeline
- **Hardware Purchase & Setup:** 3-5 Days.
- **Middleware Scripting:** 1 Week.
- **API Integration & Testing:** 1 Week.
- **Deployment:** 2 Days.
