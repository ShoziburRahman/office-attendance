"use client";

import React, { useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/ToastProvider";
import { updateSettings } from "@/app/admin/settings/actions";

interface SettingsFormProps {
  initialSettings: any;
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    try {
      // We call the server action manually to handle the result in the client
      const result = await updateSettings(formData);

      if (result?.error) {
        toast(`Failed to save settings: ${result.error}`, "ERROR");
      } else {
        toast("Settings saved successfully.", "SUCCESS");
      }
    } catch (e: any) {
      toast(e.message || "An unexpected error occurred while saving settings.", "ERROR");
    } finally {
      setIsLoading(false);
    }
  }

  const s = initialSettings;

  return (
    <form action={handleSubmit} className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <Field label="Office Timezone" htmlFor="office_timezone" required>
        <Input
          id="office_timezone"
          name="office_timezone"
          defaultValue={s.office_timezone}
          required
        />
      </Field>

      <Field label="Default Required Minutes" htmlFor="default_required_minutes" required>
        <Input
          id="default_required_minutes"
          name="default_required_minutes"
          type="number"
          defaultValue={s.default_required_minutes}
          required
        />
      </Field>

      <Field label="Default Break Minutes" htmlFor="default_break_minutes" required>
        <Input
          id="default_break_minutes"
          name="default_break_minutes"
          type="number"
          defaultValue={s.default_break_minutes}
          required
        />
      </Field>

      <Field label="Min Minutes Before Checkout" htmlFor="min_minutes_before_checkout" required>
        <Input
          id="min_minutes_before_checkout"
          name="min_minutes_before_checkout"
          type="number"
          defaultValue={s.min_minutes_before_checkout}
          required
        />
      </Field>

      <Field label="Max Session Minutes" htmlFor="max_session_minutes" required>
        <Input
          id="max_session_minutes"
          name="max_session_minutes"
          type="number"
          defaultValue={s.max_session_minutes}
          required
        />
      </Field>

      <div className="sm:col-span-2 border-t border-ink-100 pt-6 mt-2">
        <h4 className="text-sm font-medium text-ink-900 mb-4">Employee Leave Settings</h4>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Field label="Annual Paid Leave Limit" htmlFor="annual_paid_leave_limit" required>
            <Input
              id="annual_paid_leave_limit"
              name="annual_paid_leave_limit"
              type="number"
              defaultValue={s.annual_paid_leave_limit}
              required
            />
          </Field>
        </div>
      </div>

      <div className="sm:col-span-2 border-t border-ink-100 pt-6 mt-2">
        <h4 className="text-sm font-medium text-ink-900 mb-4">Office Verification Settings</h4>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Field label="Office Latitude" htmlFor="office_latitude" required>
            <Input
              id="office_latitude"
              name="office_latitude"
              type="number"
              step="any"
              defaultValue={s.office_latitude}
              required
            />
          </Field>
          <Field label="Office Longitude" htmlFor="office_longitude" required>
            <Input
              id="office_longitude"
              name="office_longitude"
              type="number"
              step="any"
              defaultValue={s.office_longitude}
              required
            />
          </Field>
          <Field label="Allowed Radius (meters)" htmlFor="allowed_radius" required>
            <Input
              id="allowed_radius"
              name="allowed_radius"
              type="number"
              defaultValue={s.allowed_radius}
              required
            />
          </Field>
          <Field label="Accuracy Threshold (meters)" htmlFor="location_accuracy_threshold" required>
            <Input
              id="location_accuracy_threshold"
              name="location_accuracy_threshold"
              type="number"
              defaultValue={s.location_accuracy_threshold}
              required
            />
          </Field>
        </div>
      </div>

      <div className="sm:col-span-2 border-t border-ink-100 pt-6 mt-2">
        <h4 className="text-sm font-medium text-ink-900 mb-4">Wi-Fi Security</h4>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Field label="Allowlisted SSIDs" htmlFor="office_wifi_ssids" hint="Comma separated list">
            <Input
              id="office_wifi_ssids"
              name="office_wifi_ssids"
              defaultValue={s.office_wifi_ssids?.join(", ")}
            />
          </Field>
          <Field label="Allowlisted BSSIDs" htmlFor="office_wifi_bssids" hint="Comma separated list">
            <Input
              id="office_wifi_bssids"
              name="office_wifi_bssids"
              defaultValue={s.office_wifi_bssids?.join(", ")}
            />
          </Field>
        </div>
      </div>

      <div className="sm:col-span-2 flex justify-end mt-4">
        <Button type="submit" isLoading={isLoading}>
          {isLoading ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </form>
  );
}
