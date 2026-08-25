import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { JobsBoard } from "@/components/jobs-board";
import { WaiverGate } from "@/components/waiver-gate";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <WaiverGate allowLanding>
      <AppShell>
        <JobsBoard />
      </AppShell>
    </WaiverGate>
  );
}
