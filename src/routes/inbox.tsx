import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { WaiverGate } from "@/components/waiver-gate";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listNotifications, markNotificationsRead } from "@/lib/ops";

export const Route = createFileRoute("/inbox")({ component: InboxPage });

function InboxPage() {
  return (
    <WaiverGate>
      <AppShell dense>
        <InboxList />
      </AppShell>
    </WaiverGate>
  );
}

function InboxList() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["inbox"], queryFn: () => listNotifications(), refetchInterval: 15000 });
  const read = useMutation({
    mutationFn: markNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inbox"] }),
  });
  if (query.isPending) return <Skeleton className="h-40 rounded-md" />;
  const rows = query.data ?? [];
  const unread = rows.filter((row) => !row.read).length;

  return (
    <div className="grid gap-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">Alerts</p>
          <h1 className="mt-1 font-display text-4xl uppercase tracking-wide">Inbox</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Counters, approvals, chat, and live status. {unread ? `${unread} unread.` : "Caught up."}
          </p>
        </div>
        {unread ? (
          <Button variant="outline" disabled={read.isPending} onClick={() => read.mutate(undefined)}>
            Mark read
          </Button>
        ) : null}
      </div>
      {rows.length ? (
        <ul className="grid gap-3">
          {rows.map((row) => (
            <li key={row.id}>
              <a
                href={row.href || "/"}
                className={`block rounded-md p-4 shadow-[var(--shadow-border)] ${row.read ? "bg-card" : "bg-accent"}`}
              >
                <p className="font-medium">{row.title}</p>
                {row.body ? <p className="mt-1 text-sm text-muted-foreground">{row.body}</p> : null}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Nothing yet. Counters and job updates land here.</p>
      )}
    </div>
  );
}
