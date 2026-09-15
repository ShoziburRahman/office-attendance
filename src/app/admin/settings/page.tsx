import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { SettingsForm } from "@/components/admin/SettingsForm";

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
          <SettingsForm initialSettings={settings} />
        </CardBody>
      </Card>
    </div>
  );
}
