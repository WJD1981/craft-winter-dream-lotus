import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { signAskWaiver } from "@/lib/runs";
import {
  ASK_WAIVER_ACKS,
  ASK_WAIVER_INTRO,
  ASK_WAIVER_SECTIONS,
  ASK_WAIVER_TITLE,
} from "@/lib/ask-waiver";

export const Route = createFileRoute("/waiver")({ component: WaiverPage });

function WaiverPage() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [legalName, setLegalName] = useState("");
  const [acks, setAcks] = useState([false, false, false, false, false, false, false, false, false]);

  const mutation = useMutation({
            mutationFn: signAskWaiver,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ask-waiver"] });
      toast.success("Release signed.");
      void navigate({ to: "/" });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isPending) return null;
  if (!user) return <RedirectToSignIn />;

  return (
    <AppShell dense>
      <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">Required</p>
      <h1 className="mt-1 font-display text-4xl uppercase tracking-wide">{ASK_WAIVER_TITLE}</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{ASK_WAIVER_INTRO}</p>
      <div className="mt-8 grid gap-6">
        {ASK_WAIVER_SECTIONS.map((section) => (
          <section key={section.heading}>
            <h2 className="font-medium">{section.heading}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{section.body}</p>
          </section>
        ))}
      </div>
      <p className="mt-6 text-sm">
        <Link to="/retention" className="font-medium text-primary underline-offset-4 hover:underline">
          Read the Data Retention Policy
        </Link>
      </p>
      <form
        className="mt-8 grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (acks.some((ack) => !ack)) {
            toast.error("Tick every box.");
            return;
          }
          mutation.mutate({
            data: { legalName, acks: [true, true, true, true, true, true, true, true, true] },
          });
        }}
      >
        {ASK_WAIVER_ACKS.map((label, index) => (
          <label key={label} className="flex min-h-11 items-start gap-3">
            <Checkbox
              checked={acks[index]}
              onCheckedChange={(value) => {
                const next = [...acks];
                next[index] = Boolean(value);
                setAcks(next);
              }}
              className="mt-0.5 size-5"
            />
            <span className="text-sm leading-relaxed">{label}</span>
          </label>
        ))}
        <div className="grid gap-2">
          <Label htmlFor="legal">Full legal name</Label>
          <Input id="legal" value={legalName} onChange={(e) => setLegalName(e.target.value)} required minLength={3} />
        </div>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Signing…" : "Sign the release"}
        </Button>
      </form>
    </AppShell>
  );
}
