import { useEffect, useRef, useState } from "react";
import { getPayPalPublicConfig } from "@/lib/runs";
import { captureTipCheckout, startTipCheckout } from "@/lib/ops";
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

export function PayPalTip({
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
  const ids = useRef({ runId, amountCents });
  ids.current = { runId, amountCents };

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
              const result = await startTipCheckout({
                data: { runId: ids.current.runId, amountCents: ids.current.amountCents },
              });
              return result.orderId;
            },
            onApprove: async (data) => {
              await captureTipCheckout({ data: { orderId: data.orderID } });
              onPaid();
            },
            onError: (err) => onError(err instanceof Error ? err.message : "PayPal could not finish."),
          })
          .render(host.current);
      };
      const existing = document.querySelector(`script[src^="https://www.paypal.com/sdk/js"]`);
      if (window.paypal) boot();
      else if (existing) existing.addEventListener("load", boot);
      else {
        const script = document.createElement("script");
        script.src = src;
        script.onload = boot;
        document.head.appendChild(script);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [amountCents, runId]);

  if (missing) return <p className="text-sm text-muted-foreground">Connect PayPal on The take to collect tips.</p>;
  return (
    <div>
      <p className="mb-2 text-sm text-muted-foreground">Tip {formatCents(amountCents)} — 100% to the runner.</p>
      <div ref={host} />
    </div>
  );
}
