import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

const fieldBase =
  "h-10 w-full rounded-md border border-ink-100 bg-white px-3 text-sm text-ink-900 " +
  "placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-teal-500 " +
  "disabled:bg-ink-50 disabled:text-ink-400";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(fieldBase, error && "border-status-late", className)}
      aria-invalid={Boolean(error)}
      {...props}
    />
  ),
);
Input.displayName = "Input";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(fieldBase, "appearance-none bg-white", error && "border-status-late", className)}
      aria-invalid={Boolean(error)}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  required?: boolean;
  className?: string;
}

/** Wraps a single labeled form control with consistent spacing and error text. */
export function Field({ label, htmlFor, error, hint, children, required, className }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink-800">
        {label}
        {required && <span className="text-status-late"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-ink-400">{hint}</p>}
      {error && <p className="text-xs text-status-late">{error}</p>}
    </div>
  );
}
