import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmployeeForm } from "@/components/employees/EmployeeForm";
import { createEmployee } from "@/app/admin/employees/actions";
import { initialEmployeeActionState } from "@/app/admin/employees/state";

export default async function NewEmployeePage() {
  return (
    <div className="max-w-2xl">
      <Link href="/admin/employees" className="text-sm text-ink-400 hover:text-ink-800">
        ← Employees
      </Link>
      <h1 className="mt-2 text-lg font-semibold text-ink-900">Add employee</h1>
      <p className="mt-1 text-sm text-ink-400">
        This creates their login account and employment record. Work schedule and weekly off are set
        up separately once the employee exists.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <p className="text-sm font-medium text-ink-900">Employee details</p>
        </CardHeader>
        <CardBody>
          <EmployeeForm
            action={createEmployee}
            initialState={initialEmployeeActionState}
            submitLabel="Create employee"
          />
        </CardBody>
      </Card>
    </div>
  );
}
