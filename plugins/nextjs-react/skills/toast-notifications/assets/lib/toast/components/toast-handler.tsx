"use client";

import * as React from "react";

import { usePathname } from "next/navigation";

// ⚠️ STEP 1 — wire up YOUR toast library here. The handler only needs a function
// to call per toast type. Recommended:
//     import { toast } from "@szum-tech/design-system"; // ← recommended; exposes .success/.error/.warning/.info
// Other common choices:
//     import { toast } from "sonner";
//     import { toast } from "react-hot-toast";   // note: only .success / .error exist
//     import { toast } from "@/components/ui/toast"; // shadcn/ui or your own wrapper
// Replace the line below with your library's import:
import { toast } from "REPLACE_WITH_YOUR_TOAST_LIBRARY";

// Relative imports keep this folder portable regardless of your project's path alias.
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

    // STEP 2 — map each type to your library's API. If it lacks .warning / .info,
    // fall back to the base toast(message, options) call.
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
