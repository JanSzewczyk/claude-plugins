"use client";

import * as React from "react";

import { usePathname } from "next/navigation";

import { toast } from "sonner";

// Siblings in this folder are imported relatively.
import { TOAST_COOKIE_NAME } from "../constants";
import { type ToastMessage } from "../types";

/** Reads the toast cookie, clears it immediately (so it fires exactly once), and parses it. */
function readAndClearToastCookie(): ToastMessage | null {
  const match = document.cookie.split("; ").find((row) => row.startsWith(`${TOAST_COOKIE_NAME}=`));
  if (!match) return null;

  document.cookie = `${TOAST_COOKIE_NAME}=; Max-Age=0; path=/`;

  try {
    const value = decodeURIComponent(match.split("=").slice(1).join("="));
    return JSON.parse(value) as ToastMessage;
  } catch {
    return null;
  }
}

/**
 * Mount once near the root of the app (inside your providers / root layout).
 * It checks for a toast cookie on every route change and displays it.
 */
export function ToastHandler() {
  const pathname = usePathname();

  React.useEffect(() => {
    const toastMessage = readAndClearToastCookie();
    if (!toastMessage) return;

    const { type, message, duration } = toastMessage;
    const options = duration !== undefined ? { duration } : undefined;

    switch (type) {
      case "success":
        toast.success(message, options);
        break;
      case "error":
        toast.error(message, options);
        break;
      case "warning":
        toast.warning(message, options);
        break;
      case "info":
        toast.info(message, options);
        break;
    }
  }, [pathname]);

  return null;
}
