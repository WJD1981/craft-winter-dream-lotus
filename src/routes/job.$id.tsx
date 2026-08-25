import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PayPalLock } from "@/components/paypal-lock";
import { PayPalTip } from "@/components/paypal-tip";
import { DisputePanel } from "@/components/dispute-panel";
import { MapsLink } from "@/components/maps-link";
import { ProfileCard } from "@/components/profile-card";
import { ReviewForm } from "@/components/review-form";
import { RunChat } from "@/components/run-chat";
import { RunProgress } from "@/components/run-progress";
import { SafetyTools } from "@/components/safety-tools";
import { WaiverGate } from "@/components/waiver-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { itemImage, kindLabel } from "@/lib/run-catalog";
import { formatCents, splitSale } from "@/lib/fees";
import { mapsDirectionsUrl } from "@/lib/maps";
import { compressListingPhoto } from "@/lib/photo";
import {
  acceptOffer,
  approveRunner,
  cancelRun,
  confirmDelivery,
  decideCounter,
  declineRunner,
  getRun,
  markPickedUp,
  placeCounter,
} from "@/lib/runs";
import { getPublicProfile, listDueReviews } from "@/lib/profiles";

export const Route = createFileRoute("/job/$id")({ component: JobPage });

function JobPage() {
  const { id } = Route.useParams();
  return (
    <WaiverGate>
      <AppShell dense>
        <JobDetail id={Number(id)} />
      </AppShell>
    </WaiverGate>
  );
}

function JobDetail({ id }: { id: number }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["run", id], queryFn: () => getRun({ data: { id } }) });
  const runnerQuery = useQuery({
    queryKey: ["public-profile", query.data?.runnerId],
    queryFn: () => getPublicProfile({ data: { userId: query.data!.runnerId as string, revealPhone: true } }),
    enabled: Boolean(query.data?.runnerId),
  });
  const dueQuery = useQuery({
    queryKey: ["due-reviews", id],
    queryFn: () => listDueReviews(),
    enabled: query.data?.status === "delivered",
  });
  const [counterInput, setCounterInput] = useState("");
  const [counterMessage, setCounterMessage] = useState("");
  const [cancelReason, setCancelReason] = useState<"not_ready" | "unsafe" | "prohibited">("not_ready");
  const [pickupPhoto, setPickupPhoto] = useState<string | null>(null);
  const [tipInput, setTipInput] = useState("5");

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["run", id] });
    await queryClient.invalidateQueries({ queryKey: ["open-runs"] });
    await queryClient.invalidateQueries({ queryKey: ["my-runs"] });
  };

  const accept = useMutation({
    mutationFn: acceptOffer,
    onSuccess: async () => {
      await refresh();
      toast.success("You took their number. They review your profile, then pay to lock it.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const counter = useMutation({
    mutationFn: placeCounter,
    onSuccess: async () => {
      await refresh();
      toast.success("Counter sent. They can take it or pass.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const decide = useMutation({
    mutationFn: decideCounter,
    onSuccess: async () => {
      await refresh();
      toast.success("Updated. Review their profile and approve before you pay.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const approve = useMutation({
    mutationFn: approveRunner,
    onSuccess: async () => {
      await refresh();
      toast.success("Approved. Pay to lock the fare.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const passRunner = useMutation({
    mutationFn: declineRunner,
    onSuccess: async () => {
      await refresh();
      toast.success("Passed. The run is on the board again.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const picked = useMutation({
    mutationFn: markPickedUp,
    onSuccess: async () => {
      await refresh();
      toast.success("Marked picked up.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const delivered = useMutation({
    mutationFn: confirmDelivery,
    onSuccess: async () => {
      await refresh();
      toast.success("Delivered.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const cancel = useMutation({
    mutationFn: cancelRun,
    onSuccess: async () => {
      await refresh();
      toast.success("Cancelled.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (query.isPending) return <Skeleton className="h-80 rounded-md" />;
  if (query.isError || !query.data) return <p className="text-sm text-destructive">Could not load that run.</p>;
  const run = query.data;
  const open = run.status === "open";
  const pending = run.counters.filter((c) => c.status === "pending");
  const myCounter = pending.find((c) => c.isMine);
  const counterCents = Math.round(Number(counterInput || 0) * 100);
  const counterSplit = splitSale(Math.max(800, counterCents), run.takeRate);

  return (
    <article className="grid gap-8">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Board
      </Link>
      <img
        src={itemImage(run.itemKey, run.photoUrl)}
        alt=""
        className="aspect-[16/10] w-full rounded-md object-cover shadow-[var(--shadow-border)]"
      />
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{kindLabel(run.kind)}</Badge>
          <Badge variant="secondary">{run.status.replace("_", " ")}</Badge>
          {run.isBusiness ? <Badge>{run.businessName}</Badge> : null}
        </div>
        <h1 className="mt-3 font-display text-4xl uppercase tracking-wide">{run.store}</h1>
        <p className="mt-2 text-muted-foreground">
          {run.isBusiness ? run.businessName : run.customerName}
          {run.orderRef ? ` · ${run.orderRef}` : ""}
        </p>
        <p className="mt-4 font-display text-4xl uppercase tabular-nums">{formatCents(run.offerCents)}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Named fare · runner {formatCents(run.runnerCents)} (80%) · take{" "}
          {formatCents(run.takeCents)} ({Math.round(run.takeRate * 100)}%) · poster pays{" "}
          {formatCents(run.chargeCents)} · items declared {formatCents(run.declaredCents)}
        </p>
        {run.lockedCents != null && run.lockedCents !== run.offerCents ? (
          <p className="mt-2 text-sm font-medium">Locked at {formatCents(run.lockedCents)} after a counter.</p>
        ) : null}
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-md bg-card p-4 shadow-[var(--shadow-border)]">
          <dt className="text-muted-foreground">Pickup</dt>
          <dd className="mt-1 font-medium">
            <MapsLink destination={run.pickupAddress}>{run.pickupAddress}</MapsLink>
          </dd>
        </div>
        <div className="rounded-md bg-card p-4 shadow-[var(--shadow-border)]">
          <dt className="text-muted-foreground">Drop-off — tap for directions</dt>
          <dd className="mt-1 font-medium">
            <MapsLink destination={run.dropoffAddress} origin={run.isRunner ? run.pickupAddress : undefined}>
              {run.dropoffAddress}
            </MapsLink>
          </dd>
        </div>
        <div className="rounded-md bg-card p-4 shadow-[var(--shadow-border)] sm:col-span-2">
          <dt className="text-muted-foreground">Window</dt>
          <dd className="mt-1 font-medium">{run.pickupWindow}</dd>
        </div>
      </dl>
      <p className="text-sm leading-relaxed">{run.notes}</p>

      {run.isRunner && run.status !== "open" && run.status !== "cancelled" && run.status !== "delivered" && run.status !== "pending_approval" ? (
        <a
          href={
            run.status === "picked_up"
              ? mapsDirectionsUrl(run.dropoffAddress, run.pickupAddress)
              : mapsDirectionsUrl(run.pickupAddress)
          }
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          {run.status === "picked_up" ? "Directions to drop-off" : "Directions to pickup"}
        </a>
      ) : null}

      {open && !run.isCustomer ? (
        <div className="grid gap-6 rounded-md bg-card p-5 shadow-[var(--shadow-border)]">
          <div>
            <h2 className="font-display text-xl uppercase">Take their number</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Accept {formatCents(run.offerCents)} as-is. You are paid 80% — {formatCents(splitSale(run.offerCents).cookCents)} — whether or not they have Plus. Your courier cargo limit must be at least {formatCents(run.declaredCents)} (the declared item value).
            </p>
            <Button className="mt-3 w-full" disabled={accept.isPending} onClick={() => accept.mutate({ data: { id: run.id } })}>
              {accept.isPending ? "Taking…" : `Accept ${formatCents(run.offerCents)}`}
            </Button>
          </div>
          <form
            className="grid gap-3 border-t border-border pt-5"
            onSubmit={(event) => {
              event.preventDefault();
              counter.mutate({
                data: {
                  id: run.id,
                  amountCents: counterSplit.priceCents,
                  message: counterMessage.trim(),
                },
              });
            }}
          >
            <h2 className="font-display text-xl uppercase">Counter their price</h2>
            <div className="grid gap-2">
              <Label htmlFor="counter">Your number (USD)</Label>
              <Input
                id="counter"
                type="number"
                min={8}
                value={counterInput}
                onChange={(e) => setCounterInput(e.target.value)}
                required
                placeholder={String(Math.round(run.offerCents / 100) + 5)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="why">Note</Label>
              <Textarea
                id="why"
                value={counterMessage}
                onChange={(e) => setCounterMessage(e.target.value)}
                required
                minLength={4}
                placeholder="Stairs, parking, I can do 5:30…"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              If they take it, you are paid {formatCents(counterSplit.cookCents)} (80% of your number). Plus does not change that.
            </p>
            <Button type="submit" variant="outline" disabled={counter.isPending}>
              {counter.isPending ? "Sending…" : myCounter ? "Update counter" : "Send counter"}
            </Button>
          </form>
        </div>
      ) : null}

      {run.isCustomer && open && pending.length ? (
        <div className="grid gap-3">
          <h2 className="font-display text-xl uppercase">Counters</h2>
          <ul className="grid gap-3">
            {pending.map((entry) => (
              <li key={entry.id} className="rounded-md bg-card p-4 shadow-[var(--shadow-border)]">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-medium">
                    <Link to="/u/$id" params={{ id: entry.runnerId }} className="hover:underline">
                      {entry.runnerName}
                    </Link>
                  </p>
                  <p className="font-display text-xl uppercase tabular-nums">{formatCents(entry.amountCents)}</p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{entry.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  They are paid {formatCents(entry.runnerCents)} (80%) · your take {formatCents(entry.takeCents)} · you pay{" "}
                  {formatCents(entry.chargeCents)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={decide.isPending}
                    onClick={() => decide.mutate({ data: { counterId: entry.id, accept: true } })}
                  >
                    Take {formatCents(entry.amountCents)}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={decide.isPending}
                    onClick={() => decide.mutate({ data: { counterId: entry.id, accept: false } })}
                  >
                    Pass
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {run.isCustomer && run.status === "pending_approval" && run.runnerId ? (
        <div className="grid gap-4 rounded-md bg-card p-5 shadow-[var(--shadow-border)]">
          <h2 className="font-display text-xl uppercase">Approve this runner</h2>
          <p className="text-sm text-muted-foreground">
            Review their face, age, city, vehicle, and reviews. You must approve them before you pay. Passing puts the run back on the board.
          </p>
          {runnerQuery.data ? <ProfileCard profile={runnerQuery.data} /> : <Skeleton className="h-32 rounded-md" />}
          <div className="flex flex-wrap gap-2">
            <Button disabled={approve.isPending} onClick={() => approve.mutate({ data: { id: run.id } })}>
              {approve.isPending ? "Approving…" : "Approve and continue to pay"}
            </Button>
            <Button variant="outline" disabled={passRunner.isPending} onClick={() => passRunner.mutate({ data: { id: run.id } })}>
              Pass
            </Button>
            <Button asChild variant="outline">
              <Link to="/u/$id" params={{ id: run.runnerId }}>
                Full profile
              </Link>
            </Button>
          </div>
        </div>
      ) : null}

      {run.isRunner && run.status === "pending_approval" ? (
        <p className="text-sm font-medium">Waiting for the poster to approve you from your profile. Then they pay to lock the fare.</p>
      ) : null}

      {run.isCustomer && run.status === "pending_pay" && run.lockedCents != null ? (
        <div className="rounded-md bg-card p-5 shadow-[var(--shadow-border)]">
          <h2 className="font-display text-xl uppercase">Pay to lock</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {run.runnerName} is in. Pay {formatCents(run.chargeCents)} to lock
            this fare (runner {formatCents(run.runnerCents)} + take {formatCents(run.takeCents)}).
          </p>
          <div className="mt-4">
            <PayPalLock
              runId={run.id}
              amountCents={run.chargeCents}
              onPaid={() => {
                void refresh();
                toast.success("Paid. They can pick it up.");
              }}
              onError={(text) => toast.error(text)}
            />
          </div>
        </div>
      ) : null}

      {run.isRunner && run.status === "locked" ? (
        <div className="grid gap-3 rounded-md bg-card p-5 shadow-[var(--shadow-border)]">
          <h2 className="font-display text-xl uppercase">Pickup photo</h2>
          <p className="text-sm text-muted-foreground">
            Photograph the bags or boxes at the store before you leave. Required on every run.
            If the order includes tobacco, alcohol, or a controlled substance, cancel as prohibited — do not take it.
          </p>
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              void compressListingPhoto(file)
                .then(setPickupPhoto)
                .catch((err: Error) => toast.error(err.message));
            }}
          />
          {pickupPhoto ? <img src={pickupPhoto} alt="" className="max-h-48 rounded-md object-cover" /> : null}
          <Button
            disabled={picked.isPending || !pickupPhoto}
            onClick={() => picked.mutate({ data: { id: run.id, photoDataUrl: pickupPhoto as string } })}
          >
            {picked.isPending ? "Saving…" : "Mark picked up"}
          </Button>
        </div>
      ) : null}

      {run.pickupPhotoUrl ? (
        <div>
          <p className="text-sm font-medium">Pickup photograph</p>
          <img src={run.pickupPhotoUrl} alt="Items at pickup" className="mt-2 max-h-64 rounded-md object-cover" />
        </div>
      ) : null}

      {run.isRunner && run.status === "picked_up" && run.claimStatus !== "open" && run.claimStatus !== "answered" ? (
        <Button
          variant="outline"
          disabled={delivered.isPending}
          onClick={() => delivered.mutate({ data: { id: run.id } })}
        >
          Confirm delivery
        </Button>
      ) : null}

      {run.isCustomer && run.status === "picked_up" && run.claimStatus !== "open" && run.claimStatus !== "answered" ? (
        <Button disabled={delivered.isPending} onClick={() => delivered.mutate({ data: { id: run.id } })}>
          Looks right — confirm delivery
        </Button>
      ) : null}

      {(run.isCustomer || run.isRunner) &&
      run.status !== "open" &&
      run.status !== "cancelled" ? (
        <>
          <RunProgress
            runId={run.id}
            progress={run.progress}
            isRunner={run.isRunner}
            live={run.status === "locked" || run.status === "picked_up"}
          />
          <RunChat runId={run.id} />
        </>
      ) : null}

      {(run.isCustomer || run.isRunner) && run.runnerId && run.status !== "open" ? (
        <SafetyTools
          aboutUserId={run.isCustomer ? run.runnerId : run.customerId}
          runId={run.id}
          shareToken={run.shareToken}
        />
      ) : null}

      <DisputePanel run={run} onDone={refresh} />

      {run.status === "delivered" && (run.isCustomer || run.isRunner) ? (
        dueQuery.data?.some((row) => row.runId === run.id) ? (
          <ReviewForm
            runId={run.id}
            otherName={run.isCustomer ? run.runnerName || "the runner" : run.customerName}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Review is on file for this run.</p>
        )
      ) : null}

      {run.isCustomer && run.status === "delivered" ? (
        <div className="grid gap-3 rounded-md bg-card p-5 shadow-[var(--shadow-border)]">
          <h2 className="font-display text-xl uppercase">Tip the runner</h2>
          {run.tipStatus === "paid" ? (
            <p className="text-sm">You tipped {formatCents(run.tipCents)}. 100% went to the runner.</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Optional. Askfare takes nothing from a tip.</p>
              <div className="flex flex-wrap gap-2">
                {[3, 5, 8, 10].map((n) => (
                  <Button key={n} type="button" size="sm" variant={tipInput === String(n) ? "default" : "outline"} onClick={() => setTipInput(String(n))}>
                    ${n}
                  </Button>
                ))}
              </div>
              <PayPalTip
                runId={run.id}
                amountCents={Math.round(Number(tipInput || 0) * 100)}
                onPaid={() => {
                  void refresh();
                  toast.success("Tip sent. 100% to the runner.");
                }}
                onError={(text) => toast.error(text)}
              />
            </>
          )}
        </div>
      ) : null}

      {(run.isCustomer && open) ||
      (run.isRunner &&
        (run.status === "locked" || run.status === "pending_pay" || run.status === "pending_approval" || run.status === "picked_up")) ||
      (run.isCustomer &&
        (run.status === "locked" || run.status === "pending_pay" || run.status === "pending_approval" || run.status === "picked_up")) ? (
        <div className="grid gap-3 rounded-md bg-card p-4 shadow-[var(--shadow-border)]">
          <p className="text-sm font-medium">Cancel</p>
          {run.status !== "open" ? (
            <select
              className="h-11 rounded-md border border-input bg-background px-3 text-sm"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value as "not_ready" | "unsafe" | "prohibited")}
            >
              <option value="not_ready">Order is not there</option>
              <option value="unsafe">Unsafe to carry</option>
              <option value="prohibited">Tobacco, alcohol, or controlled substance</option>
            </select>
          ) : null}
          <Button
            variant="outline"
            disabled={cancel.isPending}
            onClick={() =>
              cancel.mutate({
                data: { id: run.id, reason: run.status === "open" ? "customer_cancel" : cancelReason },
              })
            }
          >
            Cancel this run
          </Button>
        </div>
      ) : null}
    </article>
  );
}
