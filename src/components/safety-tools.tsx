import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { blockUser, REPORT_REASONS, reportUser } from "@/lib/ops";

export function SafetyTools({
  aboutUserId,
  runId,
  shareToken,
}: {
  aboutUserId: string;
  runId: number;
  shareToken: string;
}) {
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number]["id"]>("other");
  const [note, setNote] = useState("");
  const report = useMutation({
    mutationFn: reportUser,
    onSuccess: () => toast.success("Report sent to Askfare."),
    onError: (err: Error) => toast.error(err.message),
  });
  const block = useMutation({
    mutationFn: blockUser,
    onSuccess: () => toast.success("Blocked. You will not see their posts."),
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="grid gap-3 rounded-md bg-card p-5 shadow-[var(--shadow-border)]">
      <h2 className="font-display text-xl uppercase">Safety</h2>
      {shareToken ? (
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            const url = `${window.location.origin}/track/${shareToken}`;
            await navigator.clipboard.writeText(url);
            toast.success("Trip link copied. Send it to someone at the drop-off.");
          }}
        >
          Copy trip link
        </Button>
      ) : null}
      <div className="grid gap-2">
        <Label htmlFor="why-report">Report this person</Label>
        <select
          id="why-report"
          className="h-11 rounded-md border border-input bg-background px-3 text-sm"
          value={reason}
          onChange={(e) => setReason(e.target.value as (typeof REPORT_REASONS)[number]["id"])}
        >
          {REPORT_REASONS.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
            </option>
          ))}
        </select>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} minLength={8} placeholder="What happened" />
        <Button
          type="button"
          variant="outline"
          disabled={report.isPending}
          onClick={() => report.mutate({ data: { aboutUserId, runId, reason, note: note.trim() } })}
        >
          Send report
        </Button>
      </div>
      <Button type="button" variant="outline" disabled={block.isPending} onClick={() => block.mutate({ data: { blockedId: aboutUserId } })}>
        Block
      </Button>
    </div>
  );
}
