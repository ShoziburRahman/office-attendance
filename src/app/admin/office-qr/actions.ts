"use server";

import { requireUser } from "@/lib/auth/session";
import { API_URL } from "@/lib/constants";

export async function generateQrToken(): Promise<void> {
  const currentUser = await requireUser();
  if (currentUser.profile.role !== "ADMIN") {
    throw new Error("Only admins can generate QR tokens.");
  }

  try {
    const response = await fetch(`${API_URL}/api/admin/office-qr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generateToken" }),
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error || "Failed to generate QR token.");
    }
  } catch (error: any) {
    throw error;
  }
}

export async function invalidateTokens(): Promise<void> {
  const currentUser = await requireUser();
  if (currentUser.profile.role !== "ADMIN") {
    throw new Error("Only admins can invalidate tokens.");
  }

  try {
    const response = await fetch(`${API_URL}/api/admin/office-qr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "invalidateTokens" }),
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error || "Failed to invalidate tokens.");
    }
  } catch (error: any) {
    throw error;
  }
}
