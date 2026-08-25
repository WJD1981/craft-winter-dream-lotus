import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PROGRESS, progressLabel, setProgress, type ProgressId } from "@/lib/ops";

export function RunProgress({
  runId,
  progress,
  isRunner,
  live,
}: {
  runId: number;
  progress: string;
  isRunner: boolean;
  live: boolean;
}) {
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: setProgress,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["run", runId] });
      toast.success("Status updated.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="grid gap-3 rounded-md bg-card p-5 shadow-[var(--shadow-border)]">
      <h2 className="font-display text-xl uppercase">Live status</h2>
      <ol className="grid gap-2">
        {PROGRESS.map((step) => (
          <li key={step.id} className={progress === step.id ? "font-medium text-primary" : "text-sm text-muted-foreground"}>
            {step.label}
          </li>
        ))}
      </ol>
      {isRunner && live ? (
        <div className="flex flex-wrap gap-2">
          {PROGRESS.filter((step) => step.id !== "idle").map((step) => (
            <Button
              key={step.id}
              size="sm"
              variant={progress === step.id ? "default" : "outline"}
              disabled={save.isPending}
              onClick={() => save.mutate({ data: { runId, progress: step.id as Exclude<ProgressId, "idle"> } })}
            >
              {step.label}
            </Button>
          ))}
        </div>
      ) : (
        <p className="text-sm">{progressLabel(progress)}</p>
      )}
    </div>
  );
}
