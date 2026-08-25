import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { IdentityForm } from "@/components/identity-form";
import { WaiverGate } from "@/components/waiver-gate";

export const Route = createFileRoute("/verify")({ component: VerifyPage });

function VerifyPage() {
  return (
    <WaiverGate>
      <AppShell dense>
        <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">Required</p>
        <h1 className="mt-1 font-display text-4xl uppercase tracking-wide">Verify identity</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Government ID plus a live selfie. Required before you post a run or take one.
          Date of birth must match the age on your profile.
        </p>
        <div className="mt-8">
          <IdentityForm />
        </div>
      </AppShell>
    </WaiverGate>
  );
}
