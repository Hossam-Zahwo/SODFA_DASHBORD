import type { Order } from "./types";

export type WorkspaceSource = "manager" | "preview";
export type WorkspaceOrder = Order & { workspaceSource?: WorkspaceSource };

type WorkspaceResponses = {
  access: { create: boolean; confirm: boolean };
  orders: {
    orders: WorkspaceOrder[];
    available: Record<WorkspaceSource, boolean>;
    limited: boolean;
  };
  locations: Record<string, string[]>;
  create: { id: string; version: number; order: WorkspaceOrder };
  edit: { order: WorkspaceOrder };
  confirm: Pick<Order, "id" | "status" | "version">;
};

export function dashboardRequest<Operation extends keyof WorkspaceResponses>(
  operation: Operation,
  body?: unknown,
): Promise<WorkspaceResponses[Operation]> {
  return new Promise((resolve, reject) => {
    if (window.parent === window || !document.referrer) {
      reject(new Error("افتح إدارة الطلبات من صدفة داشبورد."));
      return;
    }

    const parentOrigin = new URL(document.referrer).origin;
    const channel = new MessageChannel();
    const timer = window.setTimeout(() => {
      channel.port1.close();
      reject(new Error("تعذر الاتصال بصدفة داشبورد. حدّث الصفحة وحاول مرة تانية."));
    }, 20000);

    channel.port1.onmessage = ({ data }) => {
      window.clearTimeout(timer);
      channel.port1.close();
      if (data?.ok === true) resolve(data.value);
      else reject(new Error(data?.error || "تعذر تنفيذ العملية."));
    };

    window.parent.postMessage({ type: "sodfa-orders-workspace", operation, body }, parentOrigin, [
      channel.port2,
    ]);
  });
}
