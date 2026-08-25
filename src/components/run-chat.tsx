import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listMessages, sendMessage } from "@/lib/ops";

export function RunChat({ runId }: { runId: number }) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const query = useQuery({
    queryKey: ["run-messages", runId],
    queryFn: () => listMessages({ data: { runId } }),
    refetchInterval: 8000,
  });
  const send = useMutation({
    mutationFn: sendMessage,
    onSuccess: async () => {
      setBody("");
      await queryClient.invalidateQueries({ queryKey: ["run-messages", runId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const notes = query.data ?? [];

  return (
    <div className="grid gap-3 rounded-md bg-card p-5 shadow-[var(--shadow-border)]">
      <h2 className="font-display text-xl uppercase">Chat</h2>
      <ul className="grid max-h-64 gap-2 overflow-y-auto">
        {notes.length ? (
          notes.map((note) => (
            <li key={note.id} className={note.mine ? "text-right" : "text-left"}>
              <span className="inline-block max-w-[85%] rounded-md bg-muted px-3 py-2 text-sm leading-relaxed">
                {note.body}
              </span>
            </li>
          ))
        ) : (
          <li className="text-sm text-muted-foreground">No messages yet. Confirm the window, the door, or a delay.</li>
        )}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!body.trim()) return;
          send.mutate({ data: { runId, body: body.trim() } });
        }}
      >
        <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message the other person" maxLength={500} />
        <Button type="submit" disabled={send.isPending}>
          Send
        </Button>
      </form>
    </div>
  );
}
