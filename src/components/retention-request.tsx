import { Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { requestRetention } from "@/lib/retention";

export function RetentionRequest() {
  const ask = useMutation({
    mutationFn: requestRetention,
    onSuccess: () => toast.success("Request sent. Askfare will act within 30 days on what the policy allows."),
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <section className="grid gap-3 rounded-md bg-card p-5 shadow-[var(--shadow-border)] sm:p-8">
      <h2 className="font-display text-2xl uppercase">Your data</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Askfare keeps identity, payment, and run records only as long as the{" "}
        <Link to="/retention" className="font-medium text-primary underline-offset-4 hover:underline">
          Data Retention Policy
        </Link>{" "}
        allows. Request a copy or ask us to start deletion.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={ask.isPending}
          onClick={() => ask.mutate({ data: { kind: "copy" } })}
        >
          Request a copy
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={ask.isPending}
          onClick={() => ask.mutate({ data: { kind: "delete" } })}
        >
          Request deletion
        </Button>
      </div>
    </section>
  );
}
