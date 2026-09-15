"use client";

import React from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { SalaryCalculationRow } from "@/types/database";

interface SalaryHistoryTableProps {
  history: SalaryCalculationRow[];
  onSelect: (record: SalaryCalculationRow) => void;
  selectedId?: string;
}

export function SalaryHistoryTable({ history, onSelect, selectedId }: SalaryHistoryTableProps) {
  if (history.length === 0) {
    return (
      <Card>
        <CardBody className="p-4 text-sm text-ink-400 italic">
          No salary history found for this employee.
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <p className="text-sm font-semibold uppercase tracking-wider text-ink-400">Salary History</p>
      </CardHeader>
      <CardBody className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-ink-400 uppercase bg-ink-50">
            <tr>
              <th className="px-3 py-2 font-medium">Month/Year</th>
              <th className="px-3 py-2 font-medium">Basic</th>
              <th className="px-3 py-2 font-medium">OT</th>
              <th className="px-3 py-2 font-medium">Deduction</th>
              <th className="px-3 py-2 font-medium">Net Salary</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {history.map((rec) => (
              <tr
                key={rec.id}
                className={`hover:bg-ink-50 transition-colors ${selectedId === rec.id ? 'bg-teal-50' : ''}`}
              >
                <td className="px-3 py-2 font-medium">
                  {new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(2000, rec.month - 1))} {rec.year}
                </td>
                <td className="px-3 py-2">৳{rec.basic_salary.toLocaleString()}</td>
                <td className="px-3 py-2">৳{rec.overtime_amount.toLocaleString()}</td>
                <td className="px-3 py-2">৳{rec.total_deductions.toLocaleString()}</td>
                <td className="px-3 py-2 font-bold">৳{rec.net_salary.toLocaleString()}</td>
                <td className="px-3 py-2">
                  <Badge tone={rec.status === 'Paid' ? 'present' : 'neutral'}>
                    {rec.status}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => onSelect(rec)}
                    className="text-xs text-teal-600 hover:underline font-medium"
                  >
                    Load
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardBody>
    </Card>
  );
}
