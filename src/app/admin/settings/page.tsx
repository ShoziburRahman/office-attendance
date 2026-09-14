import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { updateSettings } from "./actions";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: settings, error: fetchError } = await supabase
    .from("office_settings")
    .select("*")
    .single() as any;

  if (fetchError || !settings) {
    return (
      <div className="p-6">
        <p className="text-status-late">{fetchError?.message || "Settings not found."}</p>
      </div>
    );
  }

  const s = settings;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-ink-900">Office Settings</h1>
        <p className="mt-1 text-sm text-ink-400">Configure global attendance and security rules</p>
      </div>

      <Card>
        <CardHeader>
          <p className="text-sm font-medium text-ink-900">General Configuration</p>
        </CardHeader>
        <CardBody>
          <form action={updateSettings} className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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

            <Field label="QR Token TTL (seconds)" htmlFor="qr_token_ttl_seconds" required>
              <Input
                id="qr_token_ttl_seconds"
                name="qr_token_ttl_seconds"
                type="number"
                defaultValue={s.qr_token_ttl_seconds}
                required
              />
            </Field>

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
                <Field label="Fixed Office QR Token" htmlFor="fixed_qr_token" required>
                  <Input
                    id="fixed_qr_token"
                    name="fixed_qr_token"
                    defaultValue={s.fixed_qr_token}
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
              <Button type="submit">Save Settings</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
