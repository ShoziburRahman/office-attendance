"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ChevronDown, ChevronUp } from "lucide-react";

interface GroupedEmployeeData<T> {
  employeeId: string;
  employeeName: string;
  records: T[];
  activeRecord: T | null;
}

interface EmployeeGroupedListProps<T> {
  groupedData: Record<string, GroupedEmployeeData<T>>;
  renderHeaderSummary: (activeRecord: T | null) => React.ReactNode;
  renderTableHeaders: () => React.ReactNode;
  renderTableRow: (record: T, index: number) => React.ReactNode;
}

export function EmployeeGroupedList<T extends { id: string }>({
  groupedData,
  renderHeaderSummary,
  renderTableHeaders,
  renderTableRow,
}: EmployeeGroupedListProps<T>) {
  const [expandedEmployees, setExpandedEmployees] = useState<Record<string, boolean>>({});

  const toggleEmployee = (id: string) => {
    setExpandedEmployees(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const employeeIds = Object.keys(groupedData);

  if (employeeIds.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-ink-400">
        No records found.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {employeeIds.map(id => {
        const group = groupedData[id];
        if (!group) return null;
        const isOpen = !!expandedEmployees[id];

        return (
          <Card key={id} className="overflow-hidden transition-all">
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-ink-50 transition-colors"
              onClick={() => toggleEmployee(id)}
            >
              <div className="flex items-center gap-6 overflow-hidden">
                <span className="font-semibold text-ink-900 truncate min-w-[150px]">
                  {group.employeeName}
                </span>
                <div className="text-sm text-ink-600 truncate">
                  {renderHeaderSummary(group.activeRecord)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-ink-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-ink-400" />
                )}
              </div>
            </div>

            {isOpen && (
              <div className="border-t border-ink-100 bg-ink-50/30">
                <div className="p-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-3">
                    Full History
                  </h4>
                  <div className="overflow-x-auto rounded-md border border-ink-100 bg-white">
                    <table className="w-full text-left text-sm">
                      <thead className="text-xs text-ink-400 uppercase bg-ink-50">
                        <tr>
                          {renderTableHeaders()}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-100">
                        {group.records.map((record, idx) => (
                          <tr key={record.id} className="hover:bg-ink-50 transition-colors">
                            {renderTableRow(record, idx)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
