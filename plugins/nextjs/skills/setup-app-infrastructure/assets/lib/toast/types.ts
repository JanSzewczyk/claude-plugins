export type ToastType = "success" | "error" | "info" | "warning";

export type ToastMessage = {
  type: ToastType;
  message: string;
  duration?: number;
};
