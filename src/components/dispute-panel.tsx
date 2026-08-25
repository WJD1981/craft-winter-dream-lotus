import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { compressListingPhoto } from "@/lib/photo";
import { answerDispute, DISPUTE_KINDS, fileClaim, type DisputeKind, type Run } from "@/lib/runs";

const CUSTOMER_KINDS: DisputeKind[] = ["damaged", "missing", "wrong_order", "runner_no_show", "other"];
const RUNNER_KINDS: DisputeKind[] = ["store_refused", "customer_no_show", "unsafe", "other"];

const DECISION_COPY: Record<string, string> = {
  customer_win: "Poster wins — PayPal refunds the charge. Runner is not paid.",
  runner_win: "Runner wins — fare stands. Runner is paid 80%.",
  split: "Split — Askfare waives the take. Runner is still paid 80%.",
  dismissed: "Dismissed — the run continues as-is.",
  open: "Waiting for the other party to answer.",
  answered: "Both sides are in. Askfare will decide on The take.",
};

export function DisputePanel({ run, onDone }: { run: Run; onDone: () => Promise<void> }) {
  const active = run.status === "locked" || run.status === "picked_up" || run.status === "pending_pay";
  const dispute = run.dispute;
  const kinds = run.isCustomer ? CUSTOMER_KINDS : RUNNER_KINDS;
  const [kind, setKind] = useState<DisputeKind>(kinds[0]);
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [answerPhoto, setAnswerPhoto] = useState<string | null>(null);

  const open = useMutation({
    mutationFn: fileClaim,
    onSuccess: async () => {
      await onDone();
      toast.success("Dispute opened. Payout is held until Askfare decides.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const respond = useMutation({
    mutationFn: answerDispute,
    onSuccess: async () => {
      await onDone();
      toast.success("Your side is in. Askfare decides on The take.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!run.isCustomer && !run.isRunner) return null;

  if (dispute) {
    const iOpened = (run.isCustomer && dispute.openedByRole === "customer") || (run.isRunner && dispute.openedByRole === "runner");
    const waitingOnMe = dispute.status === "open" && !iOpened;

    return (
      <section className="grid gap-4 rounded-md bg-card p-5 shadow-[var(--shadow-border)]">
        <h2 className="font-display text-xl uppercase">Dispute</h2>
        <p className="text-sm font-medium">{DECISION_COPY[dispute.status] ?? dispute.status}</p>
        <p className="text-sm">
          {dispute.openedByRole === "customer" ? "Poster" : "Runner"} · {DISPUTE_KINDS[dispute.kind] ?? dispute.kind}
        </p>
        <p className="text-sm leading-relaxed">{dispute.note}</p>
        {dispute.photoUrl ? (
          <img src={dispute.photoUrl} alt="Dispute evidence" className="max-h-56 rounded-md object-cover" />
        ) : null}
        {dispute.responseNote ? (
          <div className="grid gap-2 border-t border-border pt-4">
            <p className="text-sm font-medium">The other side</p>
            <p className="text-sm leading-relaxed">{dispute.responseNote}</p>
            {dispute.responsePhotoUrl ? (
              <img src={dispute.responsePhotoUrl} alt="Response evidence" className="max-h-56 rounded-md object-cover" />
            ) : null}
          </div>
        ) : null}
        {dispute.decisionNote ? <p className="text-sm text-muted-foreground">{dispute.decisionNote}</p> : null}

        {waitingOnMe ? (
          <form
            className="grid gap-3 border-t border-border pt-4"
            onSubmit={(event) => {
              event.preventDefault();
              respond.mutate({
                data: { id: run.id, note: answer.trim(), photoDataUrl: answerPhoto || undefined },
              });
            }}
          >
            <p className="text-sm text-muted-foreground">Answer with your side before Askfare decides.</p>
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              required
              minLength={8}
              placeholder="What you saw. Pickup photo is already on the run."
            />
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                void compressListingPhoto(file)
                  .then(setAnswerPhoto)
                  .catch((err: Error) => toast.error(err.message));
              }}
            />
            <Button type="submit" disabled={respond.isPending}>
              {respond.isPending ? "Sending…" : "Send my side"}
            </Button>
          </form>
        ) : null}
      </section>
    );
  }

  if (!active) return null;

  return (
    <form
      className="grid gap-3 rounded-md bg-card p-5 shadow-[var(--shadow-border)]"
      onSubmit={(event) => {
        event.preventDefault();
        if (!photo) {
          toast.error("Add a photo of what happened.");
          return;
        }
        open.mutate({
          data: { id: run.id, kind, note: note.trim(), photoDataUrl: photo },
        });
      }}
    >
      <h2 className="font-display text-xl uppercase">Open a dispute</h2>
      <p className="text-sm text-muted-foreground">
        Do this before you confirm delivery. Confirming pays the runner and closes the fare.
        Askfare holds the payout, the other party answers, then The take decides: refund, pay the runner, or split.
        Goods damage still goes to the runner’s courier policy.
      </p>
      <select
        className="h-11 rounded-md border border-input bg-background px-3 text-sm"
        value={kind}
        onChange={(e) => setKind(e.target.value as DisputeKind)}
      >
        {kinds.map((entry) => (
          <option key={entry} value={entry}>
            {DISPUTE_KINDS[entry]}
          </option>
        ))}
      </select>
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        required
        minLength={8}
        placeholder="What happened. Be specific."
      />
      <Input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          void compressListingPhoto(file)
            .then(setPhoto)
            .catch((err: Error) => toast.error(err.message));
        }}
      />
      <Button type="submit" variant="outline" disabled={open.isPending}>
        {open.isPending ? "Opening…" : "Open dispute"}
      </Button>
    </form>
  );
}
