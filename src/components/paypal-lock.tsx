import { useEffect, useRef, useState } from "react";
import { captureLockCheckout, getPayPalPublicConfig, startLockCheckout } from "@/lib/runs";
import { formatCents } from "@/lib/fees";

type PaypalNs = {
  Buttons: (opts: {
    style?: { layout?: string; shape?: string; label?: string };
    createOrder: () => Promise<string>;
    onApprove: (data: { orderID: string }) => Promise<void>;
    onError?: (err: unknown) => void;
  }) => { render: (el: HTMLElement) => Promise<void> };
};

declare global {
  interface Window {
    paypal?: PaypalNs;
  }
}

export function PayPalLock({
  runId,
  amountCents,
  onPaid,
  onError,
}: {
  runId: number;
  amountCents: number;
  onPaid: () => void;
  onError: (message: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [missing, setMissing] = useState(false);
  const ids = useRef({ runId });
  ids.current = { runId };

  useEffect(() => {
    let cancelled = false;
    void getPayPalPublicConfig().then((config) => {
      if (cancelled) return;
      if (!config.configured) {
        setMissing(true);
        return;
      }
      const src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(config.clientId)}&currency=USD&intent=capture&components=buttons`;
      const boot = () => {
        if (cancelled || !host.current || !window.paypal) return;
        host.current.innerHTML = "";
        void window.paypal
          .Buttons({
            style: { layout: "vertical", shape: "rect", label: "paypal" },
            createOrder: async () => {
              const result = await startLockCheckout({ data: { id: ids.current.runId } });
              return result.orderId;
            },
            onApprove: async (data) => {
              await captureLockCheckout({ data: { orderId: data.orderID } });
              onPaid();
            },
            onError: (err) => onError(err instanceof Error ? err.message : "PayPal could not finish."),
          })
          .render(host.current);
      };
      if (window.paypal) {
        boot();
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = boot;
      script.onerror = () => onError("Could not load PayPal.");
      document.head.appendChild(script);
    });
    return () => {
      cancelled = true;
    };
  }, [onError, onPaid, runId]);

  if (missing) {
    return <p className="text-sm text-muted-foreground">PayPal is not connected. The take is where you install the SDK.</p>;
  }

  return (
    <div className="grid gap-2">
      <p className="text-sm text-muted-foreground">Pay the locked fare {formatCents(amountCents)} to confirm this runner.</p>
      <div ref={host} />
    </div>
  );
}
