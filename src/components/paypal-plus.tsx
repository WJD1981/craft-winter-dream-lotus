import { useEffect, useRef, useState } from "react";
import { capturePlusCheckout, getPayPalPublicConfig, previewActivatePlus, startPlusCheckout } from "@/lib/runs";
import { formatCents, PLUS_PRICE_CENTS } from "@/lib/fees";
import { Button } from "@/components/ui/button";

export function PayPalPlus({
  onPaid,
  onError,
}: {
  onPaid: () => void;
  onError: (message: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);

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
              const result = await startPlusCheckout();
              return result.orderId;
            },
            onApprove: async (data) => {
              await capturePlusCheckout({ data: { orderId: data.orderID } });
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
      const existing = document.querySelector<HTMLScriptElement>(`script[src^="https://www.paypal.com/sdk/js"]`);
      if (existing) {
        existing.addEventListener("load", boot);
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
  }, [onError, onPaid]);

  if (missing) {
    return (
      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await previewActivatePlus();
            onPaid();
          } catch (err) {
            onError(err instanceof Error ? err.message : "Could not start Plus.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Starting…" : `Start Plus for ${formatCents(PLUS_PRICE_CENTS)} / month (preview)`}
      </Button>
    );
  }

  return (
    <div className="grid gap-2">
      <p className="text-sm text-muted-foreground">Pay {formatCents(PLUS_PRICE_CENTS)} for 30 days of Plus.</p>
      <div ref={host} />
    </div>
  );
}
