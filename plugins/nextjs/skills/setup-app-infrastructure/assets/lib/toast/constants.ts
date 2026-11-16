export const TOAST_COOKIE_NAME = "toast_notification";

// Cookie max-age is in SECONDS (not milliseconds). Keep it short so a toast that was
// never consumed (e.g. the user closed the tab) cannot reappear on a later visit.
export const TOAST_COOKIE_MAX_AGE = 60; // seconds
