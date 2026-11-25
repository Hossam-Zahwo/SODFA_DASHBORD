export function OrdersManagerPanel({ url }: { url: string }) {
  return (
    <iframe
      src={url}
      title="إدارة طلبات هومي وصدفة"
      className="h-[calc(100dvh-12rem)] min-h-[32rem] w-full rounded-xl border border-purple-400/40"
    />
  );
}
