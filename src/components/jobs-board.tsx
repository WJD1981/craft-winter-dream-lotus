import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RunCard } from "@/components/run-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { KINDS } from "@/lib/run-catalog";
import { listOpenRuns } from "@/lib/runs";

export function JobsBoard() {
  const query = useQuery({ queryKey: ["open-runs"], queryFn: () => listOpenRuns() });
  const [kind, setKind] = useState("all");
  const [search, setSearch] = useState("");
  const [minFare, setMinFare] = useState("");

  const jobs = useMemo(() => {
    const rows = query.data ?? [];
    const min = Math.round(Number(minFare || 0) * 100);
    const q = search.trim().toLowerCase();
    return rows.filter((run) => {
      if (kind !== "all" && run.kind !== kind) return false;
      if (min && run.offerCents < min) return false;
      if (q && !`${run.store} ${run.notes} ${run.pickupWindow}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query.data, kind, search, minFare]);

  if (query.isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="aspect-[4/3] rounded-md" />
        <Skeleton className="aspect-[4/3] rounded-md" />
        <Skeleton className="hidden aspect-[4/3] rounded-md sm:block" />
      </div>
    );
  }
  if (query.isError) {
    return <p className="text-sm text-destructive">Could not load the board. Refresh and try again.</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">Open offers</p>
          <h1 className="mt-1 font-display text-4xl uppercase tracking-wide">The board</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Named prices for pickups. Accept the number or send a counter. Nobody here works for Askfare.
          </p>
        </div>
        <Button asChild>
          <Link to="/post">Post a run</Link>
        </Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <select
          className="h-11 rounded-md border border-input bg-background px-3 text-sm"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          <option value="all">All kinds</option>
          {KINDS.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
            </option>
          ))}
        </select>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Store or notes" />
        <Input type="number" min={0} value={minFare} onChange={(e) => setMinFare(e.target.value)} placeholder="Min fare $" />
      </div>
      {jobs.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((run) => (
            <li key={run.id}>
              <RunCard run={run} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-md bg-card px-6 py-14 text-center shadow-[var(--shadow-border)]">
          <p className="font-display text-2xl uppercase">No open runs</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Name a price for a pickup, or loosen the filters.
          </p>
        </div>
      )}
    </div>
  );
}
