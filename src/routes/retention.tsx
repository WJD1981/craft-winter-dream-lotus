import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { RETENTION_EFFECTIVE, RETENTION_INTRO, RETENTION_SECTIONS, RETENTION_TITLE, RETENTION_VERSION } from "@/lib/retention";

export const Route = createFileRoute("/retention")({ component: RetentionPage });

function RetentionPage() {
  return (
    <AppShell dense>
      <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">Legal</p>
      <h1 className="mt-1 font-display text-4xl uppercase tracking-wide">{RETENTION_TITLE}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Version {RETENTION_VERSION} · Effective {RETENTION_EFFECTIVE}
      </p>
      <p className="mt-4 text-sm leading-relaxed">{RETENTION_INTRO}</p>
      <ol className="mt-8 grid gap-6">
        {RETENTION_SECTIONS.map((section, index) => (
          <li key={section.heading} className="grid gap-2">
            <h2 className="font-display text-xl uppercase">
              {String(index + 1).padStart(2, "0")} · {section.heading}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{section.body}</p>
          </li>
        ))}
      </ol>
      <p className="mt-10 text-sm">
        <Link to="/waiver" className="font-medium text-primary underline-offset-4 hover:underline">
          Back to the release
        </Link>
      </p>
    </AppShell>
  );
}
