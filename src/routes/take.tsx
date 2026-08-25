import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PayPalSetup } from "@/components/paypal-setup";
import { WaiverGate } from "@/components/waiver-gate";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCents, TABLE_TAKE_PERCENT } from "@/lib/fees";
import { decideClaim, DISPUTE_KINDS, getTableLedger, listOpenClaims } from "@/lib/runs";
import { decideIdentity, ID_TYPES, listIdentityQueue } from "@/lib/identity";
import { listRetentionRequests } from "@/lib/retention";
import { listOpenReports, REPORT_REASONS } from "@/lib/ops";

export const Route = createFileRoute("/take")({ component: TakePage });

function TakePage() {
  return (
    <WaiverGate>
      <AppShell>
        <TakeLedger />
      </AppShell>
    </WaiverGate>
  );
}

function TakeLedger() {
  const ledgerQuery = useQuery({ queryKey: ["table-take"], queryFn: () => getTableLedger() });

  if (ledgerQuery.isPending) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 rounded-md" />
      </div>
    );
  }
  if (ledgerQuery.isError || !ledgerQuery.data) {
    return <p className="text-sm text-destructive">Could not load the take. Refresh and try again.</p>;
  }

  const ledger = ledgerQuery.data;

  return (
    <div className="flex flex-col gap-10">
      <div>
        <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">House books</p>
        <h1 className="mt-1 font-display text-4xl uppercase tracking-wide">The take</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          PayPal Checkout is how posters pay. The charge — runner share plus your{" "}
          {TABLE_TAKE_PERCENT}% take (or 5% with Plus) — hits your PayPal Business
          account. Plus is a separate $9.99 PayPal payment to the same account.
          After delivery the app pays the runner 80%. What stays is yours: the take
          and Plus. Transfer that balance to your bank.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Yours (take + Plus)" value={formatCents(ledger.keepCents)} featured />
        <Stat label="Fare take" value={formatCents(ledger.takeCents)} />
        <Stat label={`Plus (${ledger.plusCount})`} value={formatCents(ledger.plusCents)} />
        <Stat label="Paid to runners" value={formatCents(ledger.crewCents)} />
      </div>

      {ledger.rows.length ? (
        <ol className="grid gap-3">
          {ledger.rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-2 rounded-md bg-card p-5 shadow-[var(--shadow-border)] sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{row.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {row.customerName} → {row.crewName} · {new Date(row.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="text-sm sm:text-right">
                <p className="tabular-nums">
                  Paid {formatCents(row.priceCents)} · crew {formatCents(row.crewCents)}
                </p>
                <p className="mt-1 font-medium tabular-nums text-primary">Take {formatCents(row.takeCents)}</p>
                <Button asChild variant="outline" size="sm" className="mt-2">
                  <Link to="/job/$id" params={{ id: String(row.haulId) }}>
                    View job
                  </Link>
                </Button>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="rounded-md bg-card px-6 py-12 text-center shadow-[var(--shadow-border)]">
          <p className="font-display text-xl uppercase">No locked fares yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            When a run locks and is paid, 20% of that agreed number lands here.
          </p>
        </div>
      )}

      <IdentityBoard />

      <RetentionBoard />

      <ReportsBoard />

      <ClaimsBoard />

      <PayPalSetup />
    </div>
  );
}

function Stat({
  label,
  value,
  featured = false,
}: {
  label: string;
  value: string;
  featured?: boolean;
}) {
  return (
    <div
      className={
        featured
          ? "rounded-md bg-primary px-5 py-6 text-primary-foreground"
          : "rounded-md bg-card px-5 py-6 shadow-[var(--shadow-border)]"
      }
    >
      <p className={`text-xs font-medium tracking-wide uppercase ${featured ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
        {label}
      </p>
      <p className="mt-2 font-display text-3xl uppercase tracking-wide tabular-nums">{value}</p>
    </div>
  );
}

function ClaimsBoard() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["claims"], queryFn: () => listOpenClaims() });
  const decide = useMutation({
    mutationFn: decideClaim,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["claims"] });
      await queryClient.invalidateQueries({ queryKey: ["table-take"] });
      toast.success("Dispute decided.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (query.isPending) return <Skeleton className="h-32 rounded-md" />;
  const claims = query.data ?? [];

  return (
    <section className="grid gap-4">
      <div>
        <h2 className="font-display text-2xl uppercase tracking-wide">Disputes</h2>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Poster and runner each put in a photo and a note. Payout stays held. You decide:
          refund the poster, pay the runner, split (you waive the take), or dismiss.
          Goods damage still belongs on the runner’s courier policy.
        </p>
      </div>
      {claims.length ? (
        <ul className="grid gap-3">
          {claims.map((claim) => (
            <li key={claim.id} className="grid gap-3 rounded-md bg-card p-5 shadow-[var(--shadow-border)]">
              <p className="font-medium">
                {claim.store} · {DISPUTE_KINDS[claim.kind as keyof typeof DISPUTE_KINDS] ?? claim.kind} · opened by{" "}
                {claim.openedByRole}
              </p>
              <p className="text-sm text-muted-foreground">{claim.status === "answered" ? "Both sides in" : "Waiting on an answer"}</p>
              <p className="text-sm leading-relaxed">{claim.note}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {claim.pickupPhotoUrl ? <img src={claim.pickupPhotoUrl} alt="Pickup" className="max-h-40 rounded-md object-cover" /> : null}
                {claim.photoUrl ? <img src={claim.photoUrl} alt="Dispute" className="max-h-40 rounded-md object-cover" /> : null}
                {claim.responsePhotoUrl ? (
                  <img src={claim.responsePhotoUrl} alt="Answer" className="max-h-40 rounded-md object-cover" />
                ) : null}
              </div>
              {claim.responseNote ? (
                <p className="text-sm leading-relaxed">
                  <span className="font-medium">Answer · </span>
                  {claim.responseNote}
                </p>
              ) : null}
              <p className="text-sm text-muted-foreground">
                Charge {formatCents(claim.chargeCents)} · runner {formatCents(claim.runnerCents)} · take{" "}
                {formatCents(claim.takeCents)} · declared {formatCents(claim.declaredCents)}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={decide.isPending}
                  onClick={() => decide.mutate({ data: { claimId: claim.id, decision: "customer_win" } })}
                >
                  Refund poster
                </Button>
                <Button
                  size="sm"
                  disabled={decide.isPending}
                  onClick={() => decide.mutate({ data: { claimId: claim.id, decision: "runner_win" } })}
                >
                  Pay runner
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={decide.isPending}
                  onClick={() => decide.mutate({ data: { claimId: claim.id, decision: "split" } })}
                >
                  Split (waive take)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={decide.isPending}
                  onClick={() => decide.mutate({ data: { claimId: claim.id, decision: "dismissed" } })}
                >
                  Dismiss
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to="/job/$id" params={{ id: String(claim.runId) }}>
                    View run
                  </Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No open disputes.</p>
      )}
    </section>
  );
}

function IdentityBoard() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["identity-queue"], queryFn: () => listIdentityQueue() });
  const decide = useMutation({
    mutationFn: decideIdentity,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["identity-queue"] });
      toast.success("Identity updated.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (query.isPending) return <Skeleton className="h-32 rounded-md" />;
  const rows = query.data ?? [];

  return (
    <section className="grid gap-4">
      <div>
        <h2 className="font-display text-2xl uppercase tracking-wide">Identity</h2>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Compare the selfie to the ID and the profile photo. Pending files need a yes or no. You can also revoke a verified badge.
        </p>
      </div>
      {rows.length ? (
        <ul className="grid gap-4">
          {rows.map((row) => (
            <li key={row.userId} className="grid gap-3 rounded-md bg-card p-5 shadow-[var(--shadow-border)]">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">
                  {row.displayName || row.legalName} · {row.status}
                </p>
                <p className="text-sm text-muted-foreground">
                  Profile age {row.age} · DOB {row.dob}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                {ID_TYPES.find((t) => t.id === row.idType)?.label} · {row.idIssuer} · last 4 {row.idLast4} · expires {row.idExpires}
              </p>
              {row.rejectReason ? <p className="text-sm">{row.rejectReason}</p> : null}
              <div className="grid gap-2 sm:grid-cols-3">
                {row.photoUrl ? <img src={row.photoUrl} alt="Profile" className="aspect-square rounded-md object-cover" /> : null}
                {row.selfieUrl ? <img src={row.selfieUrl} alt="Selfie" className="aspect-square rounded-md object-cover" /> : null}
                {row.idFrontUrl ? <img src={row.idFrontUrl} alt="ID" className="aspect-[3/2] rounded-md object-contain bg-muted" /> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {row.status !== "verified" ? (
                  <Button size="sm" disabled={decide.isPending} onClick={() => decide.mutate({ data: { userId: row.userId, accept: true } })}>
                    Verify
                  </Button>
                ) : null}
                {row.status !== "rejected" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={decide.isPending}
                    onClick={() =>
                      decide.mutate({
                        data: { userId: row.userId, accept: false, reason: "ID or selfie did not match the profile." },
                      })
                    }
                  >
                    Reject / revoke
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No identity files yet.</p>
      )}
    </section>
  );
}

function RetentionBoard() {
  const query = useQuery({ queryKey: ["retention-requests"], queryFn: () => listRetentionRequests() });
  if (query.isPending) return <Skeleton className="h-24 rounded-md" />;
  const rows = query.data ?? [];
  return (
    <section className="grid gap-4">
      <div>
        <h2 className="font-display text-2xl uppercase tracking-wide">Data requests</h2>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Copy or deletion asks from the Data Retention Policy. Act within 30 days. Payment and waiver records may still be kept for 7 years.
        </p>
      </div>
      {rows.length ? (
        <ul className="grid gap-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-md bg-card p-4 shadow-[var(--shadow-border)]">
              <p className="font-medium">
                {row.kind === "delete" ? "Deletion" : "Copy"} · {row.userId}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{new Date(row.createdAt).toLocaleString()}</p>
              {row.note ? <p className="mt-2 text-sm">{row.note}</p> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No open data requests.</p>
      )}
    </section>
  );
}

function ReportsBoard() {
  const query = useQuery({ queryKey: ["reports"], queryFn: () => listOpenReports() });
  if (query.isPending) return <Skeleton className="h-24 rounded-md" />;
  const rows = query.data ?? [];
  return (
    <section className="grid gap-4">
      <div>
        <h2 className="font-display text-2xl uppercase tracking-wide">Reports</h2>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">Safety reports from posters and runners.</p>
      </div>
      {rows.length ? (
        <ul className="grid gap-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-md bg-card p-4 shadow-[var(--shadow-border)]">
              <p className="font-medium">
                {REPORT_REASONS.find((r) => r.id === row.reason)?.label ?? row.reason}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                From {row.fromUserId} about {row.aboutUserId}
                {row.runId ? ` · run ${row.runId}` : ""}
              </p>
              <p className="mt-2 text-sm">{row.note}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No reports.</p>
      )}
    </section>
  );
}



