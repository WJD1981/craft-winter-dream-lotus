import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { getPublicTrack, progressLabel } from "@/lib/ops";

export const Route = createFileRoute("/track/$token")({ component: TrackPage });

function TrackPage() {
  const { token } = Route.useParams();
  const query = useQuery({
    queryKey: ["track", token],
    queryFn: () => getPublicTrack({ data: { token } }),
    refetchInterval: 10000,
  });

  return (
    <AppShell dense>
      <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">Shared trip</p>
      <h1 className="mt-1 font-display text-4xl uppercase tracking-wide">On the way</h1>
      {query.isPending ? (
        <Skeleton className="mt-8 h-40 rounded-md" />
      ) : query.isError || !query.data ? (
        <p className="mt-8 text-sm text-destructive">That trip link is not active.</p>
      ) : (
        <div className="mt-8 grid gap-4 rounded-md bg-card p-5 shadow-[var(--shadow-border)]">
          <p className="font-display text-2xl uppercase">{query.data.store}</p>
          <p className="text-sm">{progressLabel(query.data.progress)}</p>
          <p className="text-sm text-muted-foreground">
            {query.data.runnerFirst} · {query.data.status.replace("_", " ")} · {query.data.pickupWindow}
          </p>
          <p className="text-sm">Drop-off {query.data.dropoffAddress}</p>
        </div>
      )}
    </AppShell>
  );
}
