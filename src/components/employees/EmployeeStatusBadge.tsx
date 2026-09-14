import { Badge } from "@/components/ui/Badge";

export function EmployeeStatusBadge({ isActive }: { isActive: boolean }) {
  return isActive ? <Badge tone="present">Active</Badge> : <Badge tone="neutral">Inactive</Badge>;
}
