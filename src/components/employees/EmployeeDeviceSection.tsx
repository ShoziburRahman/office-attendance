"use client";

import { useState, useEffect } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Dialog } from "@/components/ui/Dialog";
import { createClient } from "@/lib/supabase/client";

interface EmployeeDeviceSectionProps {
  employeeId: string;
}

export function EmployeeDeviceSection({ employeeId }: EmployeeDeviceSectionProps) {
  const [device, setDevice] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState<{ type: "REVOKE" | "REPLACE"; id: string } | null>(null);

  const supabase = createClient();

  async function fetchDevice() {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("employee_devices")
        .select("*")
        .eq("employee_id", employeeId);

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
      setError(e.message || "Failed to fetch device information");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchDevice();
  }, [employeeId]);

  async function handleUpdateStatus(status: "APPROVED" | "REJECTED" | "REVOKED") {
    if (!device) return;
    setIsUpdating(true);
    setError(null);
    try {
      const { error: updateError } = await (supabase as any)
        .from("employee_devices")
        .update({
          status,
          approved_at: status === "APPROVED" ? new Date().toISOString() : null,
          revoked_at: status === "REVOKED" ? new Date().toISOString() : null
        })
        .eq("id", device.id);

      if (updateError) throw updateError;
      await fetchDevice();
    } catch (e: any) {
      setError(e.message || "Failed to update device status");
    } finally {
      setIsUpdating(false);
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED": return <Badge tone="present">Active</Badge>;
      case "PENDING": return <Badge tone="neutral">Pending Approval</Badge>;
      case "REJECTED": return <Badge tone="late">Rejected</Badge>;
      case "REVOKED": return <Badge tone="late">Revoked</Badge>;
      default: return <Badge tone="neutral">{status}</Badge>;
    }
  };

  if (isLoading) return <div className="text-sm text-ink-400">Loading device status...</div>;

  if (!device) {
    return (
      <div className="p-4 rounded-md bg-ink-50 border border-ink-100 text-center">
        <p className="text-sm text-ink-600 mb-3">No device registered for this employee.</p>
        <p className="text-xs text-ink-400">The employee must request registration from their Android device.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <p className="text-sm font-medium text-ink-900">Device & Security</p>
        </CardHeader>
        <CardBody>
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-ink-400">Registration Status</span>
              {getStatusBadge(device.status)}
            </div>
            <div className="text-right">
              <span className="text-xs text-ink-400">Device Model</span>
              <p className="text-sm font-medium text-ink-900">{device.device_model || "Unknown"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs mb-6">
            <div>
              <span className="text-ink-400">Registered:</span>
              <p className="text-ink-900">{new Date(device.registered_at).toLocaleDateString()}</p>
            </div>
            <div>
              <span className="text-ink-400">Platform:</span>
              <p className="text-ink-900">{device.platform}</p>
            </div>
          </div>

          <div className="flex gap-2">
            {device.status === "PENDING" && (
              <>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => handleUpdateStatus("APPROVED")}
                  isLoading={isUpdating}
                >
                  Approve Device
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleUpdateStatus("REJECTED")}
                  isLoading={isUpdating}
                >
                  Reject
                </Button>
              </>
            )}
            {device.status === "APPROVED" && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowConfirm({ type: "REVOKE", id: device.id })}
              >
                Revoke Device
              </Button>
            )}
            {device.status === "REVOKED" && (
              <p className="text-xs text-status-late text-center w-full">
                This device has been revoked. The employee must register a new device.
              </p>
            )}
          </div>
          {error && <p className="mt-2 text-xs text-status-late">{error}</p>}
        </CardBody>
      </Card>

      <Dialog
        isOpen={!!showConfirm}
        onClose={() => setShowConfirm(null)}
        title="Confirm Action"
      >
        <div className="text-center space-y-4">
          <p className="text-sm text-ink-600">
            {showConfirm?.type === "REVOKE"
              ? "Are you sure you want to revoke this device? The employee will no longer be able to check in."
              : "Are you sure you want to proceed?"}
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setShowConfirm(null)}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={async () => {
                if (showConfirm?.type === "REVOKE") {
                  await handleUpdateStatus("REVOKED");
                }
                setShowConfirm(null);
              }}
            >
              Confirm
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
