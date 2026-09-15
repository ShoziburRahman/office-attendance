"use client";

import React, { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/ToastProvider";

interface ReportDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
}

export function ReportDownloadModal({ isOpen, onClose, employeeId, employeeName }: ReportDownloadModalProps) {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [format, setFormat] = useState<"pdf" | "docx">("pdf");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    setIsLoading(true);
    try {
      const url = `/api/admin/reports/download?employeeId=${employeeId}&month=${month}&year=${year}&format=${format}`;

      // We use window.location.assign to trigger the browser download
      window.location.assign(url);

      toast(`Generating ${format.toUpperCase()} report for ${employeeName}...`, "INFO");
      // Since window.location.assign doesn't provide a callback for completion,
      // we assume success if the request was initiated.
    } catch (e: any) {
      toast(e.message || "Failed to generate report", "ERROR");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Download History: ${employeeName}`}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Year" htmlFor="reportYear" required>
            <Input
              id="reportYear"
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              required
            />
          </Field>
          <Field label="Month" htmlFor="reportMonth" required>
            <select
              id="reportMonth"
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="flex h-10 w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
              required
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(2000, i, 1))}
                </option>
              )).map(opt => opt)}
            </select>
          </Field>
        </div>

        <Field label="File Format" htmlFor="reportFormat" required>
          <select
            id="reportFormat"
            value={format}
            onChange={(e) => setFormat(e.target.value as "pdf" | "docx")}
            className="flex h-10 w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
            required
          >
            <option value="pdf">PDF Document (.pdf)</option>
            <option value="docx">Word Document (.docx)</option>
          </select>
        </Field>

        <div className="flex gap-3 pt-4">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleDownload}
            isLoading={isLoading}
          >
            Download Report
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
