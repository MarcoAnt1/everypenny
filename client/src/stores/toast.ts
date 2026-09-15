import { defineStore } from "pinia";
import { ref } from "vue";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

export const useToastStore = defineStore("toast", () => {
  const toasts = ref<Toast[]>([]);
  let nextId = 0;

  const remove = (id: number) => {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  };

  const push = (type: ToastType, message: string, duration = 5000) => {
    const id = nextId++;
    toasts.value.push({ id, type, message });
    if (duration > 0) {
      setTimeout(() => remove(id), duration);
    }
    return id;
  };

  const success = (message: string) => push("success", message);
  const error = (message: string) => push("error", message, 7000);
  const info = (message: string) => push("info", message);

  return { toasts, push, remove, success, error, info };
});
