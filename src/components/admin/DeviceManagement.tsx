"use client";

import { useState, useEffect } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/client";
import { getAllDevices } from "@/app/employee/actions";
import { useToast } from "@/components/ui/ToastProvider";

export function DeviceManagement() {
  const [devices, setDevices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("ALL");
  const { toast } = useToast();

  const supabase = createClient();

  async function fetchDevices() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAllDevices();
      setDevices(data);
    } catch (e: any) {
      setError(e.message || "Failed to fetch devices");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchDevices();
  }, []);

  async function handleUpdateStatus(deviceId: string, status: "APPROVED" | "REJECTED" | "REVOKED") {
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
        .eq("id", deviceId);

      if (updateError) throw updateError;

      const message = status === "APPROVED"
        ? "Device approved successfully."
        : status === "REJECTED"
          ? "Device rejected successfully."
          : "Device revoked successfully.";

      toast(message, "SUCCESS");
      await fetchDevices();
    } catch (e: any) {
      const errorMsg = e.message || "Failed to update device status";
      setError(errorMsg);
      toast(errorMsg, "ERROR");
    } finally {
      setIsUpdating(false);
    }
  }

  const filteredDevices = devices.filter(d => {
    if (filter === "ALL") return true;
    return d.status === filter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED": return <Badge tone="present">Active</Badge>;
      case "PENDING": return <Badge tone="neutral">Pending</Badge>;
      case "REJECTED": return <Badge tone="late">Rejected</Badge>;
      case "REVOKED": return <Badge tone="late">Revoked</Badge>;
      default: return <Badge tone="neutral">{status}</Badge>;
    }
  };

  if (isLoading) return <div className="p-6 text-center text-sm text-ink-400">Loading devices...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-ink-900">Device Management</h1>
        <div className="flex gap-2">
          {["ALL", "PENDING", "APPROVED", "REVOKED"].map(f => (
            <Button
              key={f}
              variant={filter === f ? "primary" : "secondary"}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      {error && <p className="p-3 rounded-md bg-red-50 text-sm text-status-late">{error}</p>}

      <div className="grid grid-cols-1 gap-4">
        {filteredDevices.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-ink-200 rounded-md">
            <p className="text-sm text-ink-400">No devices found matching the filter.</p>
          </div>
        ) : (
          filteredDevices.map(device => (
            <Card key={device.id}>
              <CardBody className="flex items-center justify-between p-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink-900">
                      {device.employees?.profiles?.full_name || device.employees?.full_name || "Unknown Employee"}
                    </span>
                    {getStatusBadge(device.status)}
                  </div>
                  <p className="text-xs text-ink-400">
                    {device.employees?.employee_code} • {device.device_model || "Android Device"}
                  </p>
                  <p className="text-[10px] text-ink-300">
                    Requested: {new Date(device.registered_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  {device.status === "PENDING" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus(device.id, "APPROVED")}
                        isLoading={isUpdating}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleUpdateStatus(device.id, "REJECTED")}
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
                      onClick={() => handleUpdateStatus(device.id, "REVOKED")}
                      isLoading={isUpdating}
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              </CardBody>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
