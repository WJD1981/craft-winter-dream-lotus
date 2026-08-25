import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PostRunForm } from "@/components/post-run-form";
import { WaiverGate } from "@/components/waiver-gate";

export const Route = createFileRoute("/post")({ component: PostPage });

function PostPage() {
  return (
    <WaiverGate>
      <AppShell dense>
        <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">Customer or business</p>
        <h1 className="mt-1 font-display text-4xl uppercase tracking-wide">Post a run</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Name what you will pay. Pick up an order, send an item from a local business, or send a parcel from one home to another.
          Independents accept that number or counter. Askfare keeps 20% of whatever you lock.
        </p>
        <div className="mt-8">
          <PostRunForm />
        </div>
      </AppShell>
    </WaiverGate>
  );
}
