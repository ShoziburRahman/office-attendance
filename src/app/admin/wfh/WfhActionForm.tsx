"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { updateWfhRequest } from "./actions";
import type { WfhStatus } from "@/types/database";

export function WfhActionForm({ requestId, status, label, variant }: { requestId: string, status: WfhStatus, label: string, variant: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const notes = formData.get("notes") as string;

    try {
      await updateWfhRequest(requestId, status, notes);
      router.refresh();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        name="notes"
        placeholder="Notes (opt)"
        className="h-8 px-2 text-xs rounded border border-ink-200 focus:ring-1 focus:ring-teal-500 outline-none"
      />
      <Button type="submit" variant={variant as any} size="sm" isLoading={isLoading}>
        {label}
      </Button>
    </form>
  );
}
