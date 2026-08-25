import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ProfileForm } from "@/components/profile-form";
import { RetentionRequest } from "@/components/retention-request";
import { WaiverGate } from "@/components/waiver-gate";

export const Route = createFileRoute("/profile")({ component: ProfilePage });

function ProfilePage() {
  return (
    <WaiverGate>
      <AppShell dense>
        <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">Required</p>
        <h1 className="mt-1 font-display text-4xl uppercase tracking-wide">Your profile</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Everyone on Askfare has a face on file. After this, verify identity with a government ID.
          Posters approve a runner from this profile before they pay. Reviews from completed runs show here.
        </p>
        <p className="mt-3">
          <Link to="/verify" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            Go to identity verification
          </Link>
        </p>
        <div className="mt-8">
          <ProfileForm />
        </div>
        <div className="mt-10">
          <RetentionRequest />
        </div>
      </AppShell>
    </WaiverGate>
  );
}
