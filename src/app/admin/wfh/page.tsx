import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { initials } from "@/lib/utils/format";
import { WfhActionForm } from "./WfhActionForm";

export default async function WfhPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status = params.status || "all";

  const supabase = await createClient();

  const { data: requests, error } = await supabase
    .from("wfh_requests")
    .select(`
      *,
      employee:employees!wfh_requests_employee_id_fkey(
        *,
        profile:profiles!employees_id_fkey(*)
      )
    `)
    .order("created_at", { ascending: false })
    .returns<any[]>();

  if (error) {
    return (
      <div className="p-6">
        <p className="text-status-late">Error loading WFH requests: {error.message}</p>
      </div>
    );
  }

  const filteredRequests = (requests || []).filter(r =>
    status === "all" || r.status === status
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-ink-900">WFH Requests</h1>
          <p className="mt-1 text-sm text-ink-400">Review and manage remote work requests</p>
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2">
        {["all", "PENDING", "APPROVED", "REJECTED", "CANCELLED"].map(s => (
          <a
            key={s}
            href={`/admin/wfh?status=${s}`}
            className={`px-3 py-1 text-xs rounded-full border ${
              status === s
                ? "bg-teal-500 text-white border-teal-500"
                : "bg-white text-ink-600 border-ink-200 hover:bg-ink-50"
            }`}
          >
            {s === "all" ? "All" : s}
          </a>
        ))}
      </div>

      {filteredRequests.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center text-sm text-ink-400">
            No WFH requests found for this filter.
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredRequests.map(req => (
            <Card key={req.id}>
              <CardBody className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-50 text-sm font-medium text-teal-700">
                    {initials(req.employee.profile.full_name)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink-900">{req.employee.profile.full_name}</p>
                    <p className="text-xs text-ink-400">
                      Date: {req.request_date} • Reason: {req.reason || "No reason provided"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge tone={req.status === "APPROVED" ? "present" : req.status === "REJECTED" ? "late" : "neutral"}>
                    {req.status}
                  </Badge>

                  {req.status === "PENDING" && (
                    <div className="flex gap-2">
                      <WfhActionForm requestId={req.id} status="APPROVED" label="Approve" variant="primary" />
                      <WfhActionForm requestId={req.id} status="REJECTED" label="Reject" variant="danger" />
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
