"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { ChevronDown } from "lucide-react";

interface Employee {
  id: string;
  full_name: string;
  employee_code: string;
}

interface EmployeeComboboxProps {
  value: string;
  onChange: (id: string) => void;
  employees: Employee[];
  label?: string;
  placeholder?: string;
}

export function EmployeeCombobox({
  value,
  onChange,
  employees,
  label = "Employee",
  placeholder = "Search employee ID or name"
}: EmployeeComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedEmployee = employees.find(e => e.id === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredEmployees = employees.filter(e =>
    e.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.employee_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Field label={label} htmlFor="employee-combobox">
      <div ref={containerRef} className="relative">
        <div className="relative">
          <Input
            id="employee-combobox"
            readOnly
            value={selectedEmployee ? `${selectedEmployee.full_name} — ${selectedEmployee.employee_code}` : ""}
            placeholder={placeholder}
            onClick={() => setIsOpen(true)}
            className="cursor-pointer pr-10"
          />
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-ink-400 hover:text-ink-900"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        {isOpen && (
          <div className="absolute z-50 mt-1 w-full rounded-md border border-ink-200 bg-white shadow-lg overflow-hidden">
            <div className="p-2 border-b border-ink-100 bg-ink-50">
              <Input
                autoFocus
                placeholder="Filter employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="max-h-60 overflow-y-auto">
              {filteredEmployees.length === 0 ? (
                <div className="p-3 text-xs text-ink-400 italic text-center">
                  No employees found
                </div>
              ) : (
                filteredEmployees.map((emp) => (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => {
                      onChange(emp.id);
                      setIsOpen(false);
                      setSearchTerm("");
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-teal-50 transition-colors border-b border-ink-50 last:border-b-0 ${
                      value === emp.id ? "bg-teal-100 text-teal-900" : "text-sm text-ink-700"
                    }`}
                  >
                    <div className="font-medium text-ink-900">{emp.full_name}</div>
                    <div className="text-[10px] text-ink-400 uppercase">Employee ID: {emp.employee_code}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </Field>
  );
}
