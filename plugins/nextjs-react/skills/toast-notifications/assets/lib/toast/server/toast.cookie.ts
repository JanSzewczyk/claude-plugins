import "server-only";

import { cookies } from "next/headers";

// Relative imports keep this folder portable regardless of your project's path alias.
import { TOAST_COOKIE_MAX_AGE, TOAST_COOKIE_NAME } from "../constants";
import { type ToastMessage, type ToastType } from "../types";

/**
 * Sets a one-shot toast cookie. Call this from a Server Action right before you
 * redirect() or return — the next page render reads and clears it (see ToastHandler).
 */
export async function setToastCookie(message: string, type: ToastType = "success", duration?: number): Promise<void> {
  const cookieStore = await cookies();

  const payload: ToastMessage = { type, message, ...(duration !== undefined && { duration }) };

  cookieStore.set(TOAST_COOKIE_NAME, JSON.stringify(payload), {
    maxAge: TOAST_COOKIE_MAX_AGE, // seconds
    httpOnly: false, // must be readable by client JS so the handler can display it
    path: "/", // available on every route the redirect may land on
    sameSite: "lax", // sent with same-site navigations
    secure: process.env.NODE_ENV === "production" // HTTPS-only in production
  });
}
