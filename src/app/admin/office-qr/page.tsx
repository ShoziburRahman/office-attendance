import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { generateQrToken, invalidateTokens } from "./actions";
import { format } from "date-fns";

export default async function OfficeQrPage() {
  const supabase = await createClient();

  const { data: latestToken, error: fetchError } = await supabase
    .from("office_qr_tokens")
    .select("*")
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
    .returns<any>();

  if (fetchError) {
    return (
      <div className="p-6">
        <p className="text-status-late">Error loading QR token: {fetchError.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-ink-900">Office QR Code</h1>
          <p className="mt-1 text-sm text-ink-400">Generate tokens for office check-in/out</p>
        </div>
      </div>

      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <p className="text-sm font-medium text-ink-900">Active Check-in Token</p>
        </CardHeader>
        <CardBody className="flex flex-col items-center gap-6 py-8">
          {latestToken ? (
            <>
              <div className="p-4 bg-white border-4 border-ink-100 rounded-xl">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${latestToken.token}`}
                  alt="Office Check-in QR Code"
                  className="w-48 h-48"
                />
              </div>
              <div className="text-center">
                <p className="text-xs text-ink-400 uppercase font-semibold tracking-wider mb-1">Token Value</p>
                <p className="font-mono text-lg font-bold text-ink-900">{latestToken.token}</p>
                <p className="mt-2 text-xs text-ink-400">
                  Expires at: {format(new Date(latestToken.expires_at), "p")}
                </p>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-sm text-ink-400">
              No active token available.
            </div>
          )}

          <div className="flex gap-3 w-full">
            <form action={generateQrToken} className="flex-1">
              <Button type="submit" className="w-full">
                Generate New Token
              </Button>
            </form>
            <form action={invalidateTokens}>
              <Button type="submit" variant="danger" size="sm">
                Invalidate All
              </Button>
            </form>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
