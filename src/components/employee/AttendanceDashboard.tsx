"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { Dialog } from "@/components/ui/Dialog";
import Link from "next/link";
import { getCurrentLocation } from "@/lib/native/location";
import { getWifiInfo, verifyWifi } from "@/lib/native/wifi";
import { checkIn, checkOut, requestAdditionalSession, requestWfh } from "@/app/employee/actions";
import { QRScanner } from "./QRScanner";
import type { AttendanceRow as Attendance } from "@/types/database";
import { format, addMinutes } from "date-fns";
import { createClient } from "@/lib/supabase/client";

type AppState = "IDLE" | "VERIFYING" | "CHECKING_IN" | "ACTIVE" | "CHECKING_OUT" | "ADDITIONAL_REQUIRED" | "WFH_APPROVAL_REQUIRED" | "ERROR";
type AttendanceType = "OFFICE" | "WORK_FROM_HOME";

interface AttendanceDashboardProps {
  initialSessions: Attendance[];
}

export function AttendanceDashboard({ initialSessions }: AttendanceDashboardProps) {
  const [sessions, setSessions] = useState<Attendance[]>(initialSessions);
  const [state, setState] = useState<AppState>(
    sessions.some(s => s.attendance_state === "CHECKED_IN") ? "ACTIVE" : "IDLE"
  );
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<AttendanceType | null>(null);
  const [qrToken, setQrToken] = useState("");
  const [outQrToken, setOutQrToken] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [additionalReason, setAdditionalReason] = useState("");
  const [wfhReason, setWfhReason] = useState("");

  const [showConfirm, setShowConfirm] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lockError, setLockError] = useState<{ message: string; time: string } | null>(null);
  const [minMinutes, setMinMinutes] = useState<number>(240); // Default 4 hours
  const [verification, setVerification] = useState({
    wifi: false,
    qr: false,
    location: false,
    accuracy: 0,
    distance: 0,
  });

  useEffect(() => {
    async function fetchSettings() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("office_settings")
          .select("min_minutes_before_checkout")
          .single() as any;
        if (data?.min_minutes_before_checkout !== undefined) {
          setMinMinutes(data.min_minutes_before_checkout);
        }
      } catch (e) {
        console.error("Failed to fetch settings:", e);
      }
    }
    fetchSettings();
  }, []);

  useEffect(() => {
    const activeSession = sessions.find(s => s.attendance_state === "CHECKED_IN");
    if (!activeSession) return;

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, [sessions]);

  const resetError = () => setError(null);

  async function startVerification() {
    if (!selectedType) return;
    if (selectedType === "OFFICE" && !qrToken) return;

    setState("VERIFYING");
    setError(null);

    try {
      const wifiInfo = await getWifiInfo();
      const loc = await getCurrentLocation();

      setVerification({
        wifi: !!wifiInfo.ssid,
        qr: selectedType === "OFFICE" ? !!qrToken : true,
        location: true,
        accuracy: loc.accuracy,
        distance: 0,
      });

      if (selectedType === "OFFICE" && !qrToken) {
        setError("Please scan the office QR code.");
        setState("IDLE");
        return;
      }

      setShowConfirm(true);
      setState("IDLE");
    } catch (e: any) {
      setError(e.message || "Verification failed");
      setState("IDLE");
    }
  }

  async function handleCheckIn() {
    if (!selectedType) return;

    setState("CHECKING_IN");
    setError(null);

    let loc;
    try {
      loc = await getCurrentLocation();
      const wifiInfo = await getWifiInfo();

      const result = await checkIn({
        type: selectedType,
        wifiSsid: wifiInfo.ssid,
        wifiBssid: wifiInfo.bssid,
        qrToken: selectedType === "OFFICE" ? qrToken : undefined,
        latitude: loc.lat,
        longitude: loc.lon,
        locationAccuracy: loc.accuracy,
      });

      setSessions(prev => [...prev, result]);
      setState("ACTIVE");
      setShowConfirm(false);
    } catch (e: any) {
      console.error("Check-in error caught:", e);

      const errorMsg = e?.message || (typeof e === "string" ? e : JSON.stringify(e)) || "An unexpected error occurred.";
      const lowerMsg = errorMsg.toLowerCase();

      if (lowerMsg.includes("additional_attendance_approval_required")) {
        setState("ADDITIONAL_REQUIRED");
        setError(null);
      } else if (lowerMsg.includes("work-from-home attendance requires admin permission")) {
        setState("WFH_APPROVAL_REQUIRED");
        setError(null);
      } else if (lowerMsg.includes("gps_accuracy_too_low")) {
        const threshold = errorMsg.includes(":") ? errorMsg.split(":")[1] : "the required";
        const currentAccuracy = loc?.accuracy ? `${loc.accuracy.toFixed(1)}m` : "unknown";
        setError(`GPS accuracy is too low. Please enable precise location and try again.\\n\\nCurrent accuracy: ${currentAccuracy}. Required: ≤${threshold}m.`);
        setState("IDLE");
      } else {
        setError(errorMsg);
        setState("IDLE");
      }
      setShowConfirm(false);
    }
  }

  async function handleCheckOut() {
    const activeSession = sessions.find(s => s.attendance_state === "CHECKED_IN");
    if (!activeSession) return;

    setState("CHECKING_OUT");
    setError(null);
    setLockError(null);

    try {
      const loc = await getCurrentLocation();
      const wifiInfo = await getWifiInfo();

      const result = await checkOut({
        attendanceId: activeSession.id,
        wifiSsid: wifiInfo.ssid,
        wifiBssid: wifiInfo.bssid,
        qrToken: activeSession.attendance_type === "OFFICE" ? outQrToken : undefined,
        latitude: loc.lat,
        longitude: loc.lon,
        locationAccuracy: loc.accuracy,
      });

      setSessions(prev => prev.map(s => s.id === result.id ? result : s));
      setState(sessions.some(s => s.id !== result.id && s.attendance_state === "CHECKED_IN") ? "ACTIVE" : "IDLE");
      setOutQrToken("");
    } catch (e: any) {
      const rawError = e?.message || (typeof e === "string" ? e : JSON.stringify(e)) || "";
      const lowerError = rawError.toLowerCase();

      if (lowerError.includes("lock") || lowerError.includes("minutes before check-out")) {
        let minMinutes = 240;
        const match = rawError.match(/\\d+/);
        if (match) {
          minMinutes = parseInt(match[0]);
        }

        const allowedTime = addMinutes(new Date(activeSession.check_in_at), minMinutes);
        const formattedTime = format(allowedTime, "p");

        setLockError({
          message: `Can't check out before ${formattedTime}. Please talk to your admin.`,
          time: formattedTime
        });
        setState("ACTIVE");
      } else {
        setError(rawError);
        setState("ACTIVE");
      }
    }
  }

  async function handleRequestAdditional() {
    if (!additionalReason.trim()) return;

    setState("CHECKING_IN");
    try {
      await requestAdditionalSession(additionalReason);
      alert("Request submitted for admin approval.");
      setState("IDLE");
      setAdditionalReason("");
    } catch (e: any) {
      setError(e.message || "Request failed.");
      setState("ADDITIONAL_REQUIRED");
    }
  }

  async function handleRequestWfh() {
    if (!wfhReason.trim()) return;

    setState("CHECKING_IN");
    try {
      await requestWfh(wfhReason);
      alert("WFH request submitted for admin approval.");
      setState("IDLE");
      setWfhReason("");
    } catch (e: any) {
      setError(e.message || "Request failed.");
      setState("WFH_APPROVAL_REQUIRED");
    }
  }

  const formatMinutes = (totalMin: number) => {
    if (totalMin <= 0) return "0h 0m";
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${h}h ${m}m`;
  };

  const completedSessions = sessions.filter(s => s.attendance_state === "CHECKED_OUT");
  const activeSession = sessions.find(s => s.attendance_state === "CHECKED_IN");

  const completedMinutes = completedSessions.reduce((acc, s) => acc + (s.working_minutes || 0), 0);
  const activeMinutes = activeSession
    ? Math.max(0, Math.floor((currentTime.getTime() - new Date(activeSession.check_in_at).getTime()) / 60000))
    : 0;

  const totalWorkingMinutes = completedMinutes + activeMinutes;

  // Lock logic for the button
  const isLocked = (() => {
    if (!activeSession) return false;
    const unlockTime = addMinutes(new Date(activeSession.check_in_at), minMinutes);
    return currentTime < unlockTime;
  })();

  const unlockTimeFormatted = activeSession
    ? format(addMinutes(new Date(activeSession.check_in_at), minMinutes), "p")
    : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-ink-900">Attendance</h1>
        <Link href="/employee/profile">
          <Button variant="secondary" size="sm">My Profile</Button>
        </Link>
      </div>
      <Card className="mt-6">
        <CardHeader>
          <p className="text-sm font-medium text-ink-900">Attendance</p>
        </CardHeader>
        <CardBody>
          {error && (
            <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-status-late">
              {error}
            </p>
          )}

          {(state === "IDLE" || state === "CHECKING_IN" || state === "VERIFYING") && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <p className="text-sm text-ink-600">Select attendance type to check in:</p>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={selectedType === "OFFICE" ? "primary" : "secondary"}
                    onClick={() => { setSelectedType("OFFICE"); resetError(); }}
                  >
                    Office
                  </Button>
                  <Button
                    variant={selectedType === "WORK_FROM_HOME" ? "primary" : "secondary"}
                    onClick={() => { setSelectedType("WORK_FROM_HOME"); resetError(); }}
                  >
                    WFH
                  </Button>
                </div>
              </div>

              {selectedType === "OFFICE" && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200 space-y-4">
                  <div className="flex gap-2">
                    <Field label="Office QR Token" htmlFor="qrToken" required className="flex-1">
                      <Input
                        id="qrToken"
                        name="qrToken"
                        placeholder="Scan or enter token"
                        value={qrToken}
                        onChange={(e) => setQrToken(e.target.value)}
                        required
                      />
                    </Field>
                    <Button
                      variant="secondary"
                      onClick={() => setShowScanner(true)}
                      className="h-10"
                    >
                      Scan QR
                    </Button>
                  </div>
                </div>
              )}

              <Button
                disabled={!selectedType || (selectedType === "OFFICE" && !qrToken)}
                onClick={startVerification}
                isLoading={state === "VERIFYING"}
              >
                Check In
              </Button>
              <QRScanner
                isOpen={showScanner}
                onClose={() => setShowScanner(false)}
                onScanSuccess={(token) => {
                  setQrToken(token);
                  setShowScanner(false);
                }}
              />
            </div>
          )}

          {(state === "ACTIVE" || state === "CHECKING_OUT") && (
            <div className="space-y-6">
              {activeSession && (
                <div className="flex flex-col items-center gap-6 text-center">
                  <div className="flex flex-col gap-1">
                    <Badge tone="present" className="mx-auto">Checked In</Badge>
                    <p className="text-sm text-ink-400">
                      Since {format(new Date(activeSession.check_in_at), "p, MMM d")}
                    </p>
                  </div>

                  <div className="w-full border-t border-ink-100 pt-6">
                    {activeSession.attendance_type === "OFFICE" && (
                      <Field label="Office QR Token" htmlFor="outQrToken" required className="mb-4">
                        <Input
                          id="outQrToken"
                          name="outQrToken"
                          placeholder="Scan or enter token to check out"
                          value={outQrToken}
                          onChange={(e) => setOutQrToken(e.target.value)}
                          required
                        />
                      </Field>
                    )}
                    <div className="flex flex-col items-center gap-2">
                      <Button
                        className="w-full"
                        isLoading={state === "CHECKING_OUT"}
                        onClick={handleCheckOut}
                        disabled={isLocked}
                      >
                        Check Out
                      </Button>
                      {isLocked && (
                        <p className="text-[10px] text-status-late font-medium">
                          Locked until {unlockTimeFormatted}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {sessions.length > 0 && (
                <div className="border-t border-ink-100 pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-ink-900">Today's Activity</h3>
                    <Badge tone="neutral" className="text-[10px]">
                      Total Working: {formatMinutes(totalWorkingMinutes)}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {sessions.map((s, idx) => (
                      <div key={s.id} className="flex items-center justify-between p-2 rounded-md bg-ink-50 border border-ink-100 text-xs">
                        <div className="flex flex-col">
                          <span className="font-medium text-ink-900">Session {s.session_number} ({s.attendance_type})</span>
                          <span className="text-ink-400">
                            {format(new Date(s.check_in_at), "p")} {s.check_out_at ? ` → ${format(new Date(s.check_out_at), "p")}` : " → Active"}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-ink-600 font-medium">
                            {s.working_minutes !== null ? `${s.working_minutes}m` : "—"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Dialog
                isOpen={!!lockError}
                onClose={() => setLockError(null)}
                title="Check-out Locked"
              >
                <div className="text-center space-y-4">
                  <p className="text-sm text-ink-600">
                    {lockError?.message}
                  </p>
                  <Button className="w-full" onClick={() => setLockError(null)}>
                    OK
                  </Button>
                </div>
              </Dialog>
            </div>
          )}

          {(state === "ADDITIONAL_REQUIRED" || (state === "CHECKING_IN" && !selectedType)) && (
            <div className="flex flex-col gap-4">
              <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                You have already completed a session today. Additional attendance requires admin approval.
              </div>
              <Field label="Reason for additional session" htmlFor="reason" required>
                <Input
                  id="reason"
                  name="reason"
                  placeholder="e.g. Worked late for project X"
                  value={additionalReason}
                  onChange={(e) => setAdditionalReason(e.target.value)}
                  required
                />
              </Field>
              <Button
                isLoading={state === "CHECKING_IN"}
                onClick={handleRequestAdditional}
              >
                Request Approval
              </Button>
              <Button variant="secondary" onClick={() => setState("IDLE")}>
                Cancel
              </Button>
            </div>
          )}

          {(state === "WFH_APPROVAL_REQUIRED" || (state === "CHECKING_IN" && selectedType === "WORK_FROM_HOME")) && (
            <div className="flex flex-col gap-4">
              <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                Work-from-home attendance requires admin approval. Please submit a request.
              </div>
              <Field label="Reason for WFH" htmlFor="wfhReason" required>
                <Input
                  id="wfhReason"
                  name="wfhReason"
                  placeholder="e.g. Home internet issue / Personal emergency"
                  value={wfhReason}
                  onChange={(e) => setWfhReason(e.target.value)}
                  required
                />
              </Field>
              <Button
                isLoading={state === "CHECKING_IN"}
                onClick={handleRequestWfh}
              >
                Request WFH Approval
              </Button>
              <Button variant="secondary" onClick={() => setState("IDLE")}>
                Cancel
              </Button>
            </div>
          )}

          <Dialog
            isOpen={showConfirm}
            onClose={() => setShowConfirm(false)}
            title="Confirm Check-In"
          >
            <div className="text-center space-y-4">
              <p className="text-sm text-ink-600">Are you sure you want to check in?</p>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setShowConfirm(false)}
                  disabled={state === "CHECKING_IN"}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleCheckIn}
                  isLoading={state === "CHECKING_IN"}
                >
                  Confirm
                </Button>
              </div>
            </div>
          </Dialog>
        </CardBody>
      </Card>
    </div>
  );
}
