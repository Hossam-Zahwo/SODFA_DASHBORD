import { useEffect, useRef, useState } from "react";
import {
  confirmStagingOrder,
  createStagingOrder,
  getStagingLocations,
  getStagingWorkspaceAccess,
  listStagingOrders,
} from "@/lib/company-orders-staging.functions";
import { supabase } from "@/lib/supabase";
import type { Order } from "../../apps/orders-manager/lib/types";

export function OrdersManagerPanel({ url, brand }: { url: string; brand: Order["brand"] }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    const origin = new URL(url, window.location.href).origin;

    function onRequest(event: MessageEvent) {
      if (
        event.origin !== origin ||
        event.source !== frame.current?.contentWindow ||
        event.data?.type !== "sodfa-orders-workspace" ||
        event.ports.length !== 1
      )
        return;

      const port = event.ports[0]!;
      const { operation, body } = event.data;
      void run(operation, body)
        .then((value) => port.postMessage({ ok: true, value }))
        .catch((error: unknown) => {
          const code = error instanceof Error ? error.message : "";
          const messages: Record<string, string> = {
            ACCESS_DENIED: "حسابك ما عندوش صلاحية للعملية دي في قسم الطلبات.",
            UNAUTHORIZED: "جلسة صدفة انتهت. افتح الداشبورد وسجّل دخولك.",
            INVALID_ORDER_LOCATION: "اختار المحافظة والمنطقة الصحيحة.",
            PHONE_INVALID: "راجع رقم موبايل العميل.",
            PREPAID_EXCEEDS_TOTAL: "المبلغ المدفوع مقدمًا أكبر من إجمالي الطلب.",
            ORDER_CONFLICT_OR_ALREADY_CONFIRMED: "حدّث القائمة وراجع حالة الطلب.",
          };
          const message = messages[code] ?? "تعذر تنفيذ العملية. راجع البيانات وحاول مرة تانية.";
          port.postMessage({ ok: false, error: message });
        })
        .finally(() => port.close());
    }

    async function run(operation: unknown, body: unknown) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("UNAUTHORIZED");
      const context = { token, brand };

      switch (operation) {
        case "access":
          return getStagingWorkspaceAccess({ data: context });
        case "orders":
          return listStagingOrders({ data: context });
        case "locations":
          return getStagingLocations({ data: { token } });
        case "create": {
          const order = body as Order;
          return createStagingOrder({
            data: {
              ...order,
              ...context,
              creationRequestId: order.creationRequestId ?? "",
              carrier: order.shippingCompany ?? "",
            },
          });
        }
        case "confirm": {
          const { id, version } = body as Pick<Order, "id" | "version">;
          return confirmStagingOrder({ data: { ...context, id, version } });
        }
        default:
          throw new Error("ACCESS_DENIED");
      }
    }

    window.addEventListener("message", onRequest);
    setListening(true);
    return () => window.removeEventListener("message", onRequest);
  }, [url, brand]);

  if (!listening) return null;

  return (
    <iframe
      key={brand}
      ref={frame}
      src={`${url}?embedded=1&brand=${brand}`}
      referrerPolicy="origin"
      title="إدارة طلبات هومي وصدفة"
      className="h-[calc(100dvh-12rem)] min-h-[32rem] w-full rounded-xl border border-purple-400/40"
    />
  );
}
