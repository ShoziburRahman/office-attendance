"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { Badge } from "@/components/ui/Badge";

export type ToastType = "SUCCESS" | "ERROR" | "WARNING" | "INFO";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "INFO") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const getBadgeTone = (type: ToastType) => {
    switch (type) {
      case "SUCCESS": return "present";
      case "ERROR": return "late";
      case "WARNING": return "neutral";
      case "INFO": return "neutral";
      default: return "neutral";
    }
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-3 p-4 rounded-lg shadow-lg border bg-white animate-in fade-in slide-in-from-right-4 duration-300"
          >
            <Badge tone={getBadgeTone(t.type)}>{t.type}</Badge>
            <span className="text-sm font-medium text-ink-900">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
