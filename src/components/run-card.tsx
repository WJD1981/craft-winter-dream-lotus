import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { itemImage, kindLabel } from "@/lib/run-catalog";
import { formatCents } from "@/lib/fees";
import type { Run } from "@/lib/runs";

export function RunCard({ run }: { run: Run }) {
  return (
    <Link
      to="/job/$id"
      params={{ id: String(run.id) }}
      className="group overflow-hidden rounded-md bg-card shadow-[var(--shadow-border)] transition-shadow hover:shadow-[var(--shadow-border-hover)]"
    >
      <img src={itemImage(run.itemKey, run.photoUrl)} alt="" className="aspect-[4/3] w-full object-cover" />
      <div className="grid gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-medium leading-snug">{run.store}</h2>
          <p className="shrink-0 font-display text-lg uppercase tabular-nums">{formatCents(run.offerCents)}</p>
        </div>
        <p className="text-sm text-muted-foreground">
          {run.kind === "home" ? "Home to home" : run.kind === "shop" ? "From the shop" : "Drop-off"} ·{" "}
          {run.isBusiness ? run.businessName : run.customerName}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">{kindLabel(run.kind)}</Badge>
          {run.counterCount ? <Badge>{run.counterCount} counter{run.counterCount === 1 ? "" : "s"}</Badge> : null}
        </div>
        <p className="text-xs text-muted-foreground">
          Runner would keep {formatCents(run.runnerCents)} · cargo need {formatCents(run.declaredCents || 0)} · {run.pickupWindow}
        </p>
      </div>
    </Link>
  );
}
