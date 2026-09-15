"use client";

import { useState, useEffect } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/client";
import { requestDeviceRegistration, checkDeviceStatus } from "@/app/employee/actions";

export function EmployeeDeviceRegistration() {
  const [device, setDevice] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  async function fetchStatus() {
    setIsLoading(true);
    setError(null);
    try {
      const statusInfo = await checkDeviceStatus();

      // To show full details, we fetch the actual device record for the current user
      const { data, error: fetchError } = await supabase
        .from("employee_devices")
        .select("*");

      if (fetchError) throw fetchError;
      if (!data || data.length === 0) {
        setDevice(null);
        return;
      }

      // Priority: APPROVED > PENDING > REVOKED > REJECTED
      const priority: Record<string, number> = {
        APPROVED: 1,
        PENDING: 2,
        REVOKED: 3,
        REJECTED: 4,
      };

      const bestDevice = (data as any[]).reduce((prev: any, curr: any) => {
        const prevScore = priority[prev.status] || 99;
        const currScore = priority[curr.status] || 99;
        return currScore < prevScore ? curr : prev;
      });

      setDevice(bestDevice);
    } catch (e: any) {
      setError(e.message || "Failed to check device status");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchStatus();
  }, []);

  async function handleRegister() {
    if (!(window as any).AndroidBiometric) {
      setError("Android Biometric bridge not found. Please use the Android app.");
      return;
    }

    setIsRegistering(true);
    setError(null);
    try {
      const publicKeyResult = await (window as any).AndroidBiometric.generateAndExportPublicKey();
      const parsed = JSON.parse(publicKeyResult);

      if (parsed.error) throw new Error(parsed.error);

      // Get device info
      const deviceName = "Android Device"; // Simplified
      const deviceModel = "Unknown Model"; // Simplified
      const appVersion = "1.0.0";

      await requestDeviceRegistration({
        publicKey: parsed.publicKey,
        deviceName,
        deviceModel,
        appVersion
      });

      await fetchStatus();
      alert("Device registration request submitted. Please wait for admin approval.");
    } catch (e: any) {
      setError(e.message || "Registration failed");
    } finally {
      setIsRegistering(false);
    }
  }

  if (isLoading) return <div className="text-sm text-ink-400">Checking device status...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <p className="text-sm font-medium text-ink-900">Device & Security</p>
        </CardHeader>
        <CardBody>
          {!device ? (
            <div className="text-center space-y-4">
              <div className="p-4 rounded-md bg-ink-50 border border-ink-100">
                <p className="text-sm text-ink-600">No device registered</p>
                <p className="text-xs text-ink-400">Register this phone to enable attendance.</p>
              </div>
              <Button
                className="w-full"
                onClick={handleRegister}
                isLoading={isRegistering}
              >
                Request Device Registration
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-ink-400">Status:</span>
                {device.status === "APPROVED" ? (
                  <Badge tone="present">Registered</Badge>
                ) : (
                  <Badge tone="neutral">{device.status}</Badge>
                )}
              </div>
              <div className="text-xs text-ink-600">
                <p>Device: {device.device_model}</p>
                <p>Registered: {new Date(device.registered_at).toLocaleDateString()}</p>
              </div>
              {device.status === "PENDING" && (
                <p className="text-xs text-amber-600 text-center font-medium">
                  Your device registration is pending admin approval.
                </p>
              )}
              {device.status === "REVOKED" && (
                <div className="text-center space-y-3">
                  <p className="text-xs text-status-late">This device has been revoked.</p>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={handleRegister}
                    isLoading={isRegistering}
                  >
                    Register New Device
                  </Button>
                </div>
              )}
            </div>
          )}
          {error && <p className="mt-4 text-xs text-status-late text-center">{error}</p>}
        </CardBody>
      </Card>
    </div>
  );
}
