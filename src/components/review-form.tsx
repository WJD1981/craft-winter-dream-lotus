import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitReview } from "@/lib/profiles";

function Score({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div id={id} className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={`size-11 rounded-md text-sm font-medium ${value >= n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ReviewForm({
  runId,
  otherName,
}: {
  runId: number;
  otherName: string;
}) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [communication, setCommunication] = useState(5);
  const [punctual, setPunctual] = useState(5);
  const [care, setCare] = useState(5);
  const [note, setNote] = useState("");

  const save = useMutation({
    mutationFn: submitReview,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["due-reviews"] });
      await queryClient.invalidateQueries({ queryKey: ["run"] });
      await queryClient.invalidateQueries({ queryKey: ["reviews"] });
      toast.success("Review posted on their profile.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <form
      className="grid gap-4 rounded-md bg-card p-5 shadow-[var(--shadow-border)]"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate({
          data: { runId, rating, communication, punctual, care, note: note.trim() },
        });
      }}
    >
      <h2 className="font-display text-xl uppercase">Review {otherName}</h2>
      <p className="text-sm text-muted-foreground">Required after every delivered run. This shows on their profile.</p>
      <Score id="overall" label="Overall" value={rating} onChange={setRating} />
      <Score id="talk" label="Communication" value={communication} onChange={setCommunication} />
      <Score id="time" label="On time" value={punctual} onChange={setPunctual} />
      <Score id="care" label="Care of the order / drop-off" value={care} onChange={setCare} />
      <div className="grid gap-2">
        <Label htmlFor="rev-note">What happened</Label>
        <Textarea id="rev-note" value={note} onChange={(e) => setNote(e.target.value)} required minLength={8} />
      </div>
      <Button type="submit" disabled={save.isPending}>
        {save.isPending ? "Posting…" : "Post review"}
      </Button>
    </form>
  );
}
