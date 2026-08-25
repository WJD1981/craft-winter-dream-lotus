import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCents } from "@/lib/fees";
import { listDuePayouts, retryCrewPayout, savePlatformPayPal, getPayPalPublicConfig } from "@/lib/runs";
import { PAYPAL_SDK_INTRO, PAYPAL_SDK_STEPS, PAYPAL_SDK_TITLE } from "@/lib/paypal-guide";

export function PayPalSetup() {
  const queryClient = useQueryClient();
  const configQuery = useQuery({ queryKey: ["paypal-config"], queryFn: () => getPayPalPublicConfig() });
  const dueQuery = useQuery({ queryKey: ["paypal-due"], queryFn: () => listDuePayouts() });
  const [clientId, setClientId] = useState("");
  const [secret, setSecret] = useState("");
  const [mode, setMode] = useState<"sandbox" | "live">("live");

  const saveMutation = useMutation({
    mutationFn: savePlatformPayPal,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["paypal-config"] });
      setSecret("");
      toast.success("PayPal is connected. Checkout and Plus will charge this account.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const payoutMutation = useMutation({
    mutationFn: retryCrewPayout,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["paypal-due"] });
      toast.success("Payout sent to the crew’s PayPal.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const config = configQuery.data;

  return (
    <section className="grid gap-6">
      <div id="paypal-sdk" className="scroll-mt-24 rounded-2xl bg-card p-5 shadow-[var(--shadow-border)] sm:p-8">
        <p className="text-xs font-medium tracking-wide text-primary uppercase">Collect the take</p>
        <h2 className="mt-2 font-display text-2xl font-medium tracking-tight">{PAYPAL_SDK_TITLE}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{PAYPAL_SDK_INTRO}</p>

        <ol className="mt-8 grid gap-5">
          {PAYPAL_SDK_STEPS.map((step) => (
            <li key={step.n} className="grid grid-cols-[auto_1fr] gap-4">
              <span className="font-display text-sm text-primary tabular-nums">{step.n}</span>
              <div>
                <h3 className="font-medium">{step.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                {"href" in step && step.href ? (
                  <a
                    href={step.href}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {step.hrefLabel}
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-2xl bg-card p-5 shadow-[var(--shadow-border)] sm:p-8">
        <h3 className="font-display text-xl font-medium">Paste Client ID and Secret</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          This is the last step. Askfare stores the Secret on the server and never
          shows it again. Checkout, Plus, and the 20% take all land on this PayPal
          Business account. The Client ID is what the PayPal button uses in the browser.
        </p>
        {config?.configured ? (
          <p className="mt-4 text-sm">
            SDK ready · {config.mode} · Client ID {config.clientId.slice(0, 8)}…
          </p>
        ) : (
          <p className="mt-4 text-sm">SDK not installed yet. Sales cannot be paid until you paste keys.</p>
        )}
        <form
          className="mt-6 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            saveMutation.mutate({
              data: { clientId, secret, mode },
            });
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="paypal-client">Client ID</Label>
            <Input
              id="paypal-client"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
              autoComplete="off"
              placeholder="AXxxxxxxxx"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="paypal-secret">Secret</Label>
            <Input
              id="paypal-secret"
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              required
              autoComplete="off"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant={mode === "live" ? "default" : "outline"} onClick={() => setMode("live")}>
              Live SDK
            </Button>
            <Button type="button" variant={mode === "sandbox" ? "default" : "outline"} onClick={() => setMode("sandbox")}>
              Sandbox SDK
            </Button>
          </div>
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Installing…" : config?.configured ? "Update SDK keys" : "Install PayPal SDK"}
          </Button>
        </form>
      </div>

      {dueQuery.data?.length ? (
        <div className="rounded-2xl bg-card p-5 shadow-[var(--shadow-border)]">
          <h3 className="font-display text-xl font-medium">Runner payouts waiting</h3>
          <ul className="mt-4 grid gap-3">
            {dueQuery.data.map((row) => (
              <li key={row.haulId} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{row.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {row.crewEmail || "No PayPal email on the crew"} · crew{" "}
                    {formatCents(row.crewCents)} · table {formatCents(row.takeCents)}
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={!row.crewEmail || payoutMutation.isPending}
                  onClick={() => payoutMutation.mutate({ data: { haulId: row.haulId } })}
                >
                  Send 80% now
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
