import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { HELP_SECTIONS, HELP_TITLE } from "@/lib/help";

export const Route = createFileRoute("/help")({ component: HelpPage });

function HelpPage() {
  return (
    <AppShell dense>
      <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">Guide</p>
      <h1 className="mt-1 font-display text-4xl uppercase tracking-wide">{HELP_TITLE}</h1>
      <ol className="mt-8 grid gap-6">
        {HELP_SECTIONS.map((section, index) => (
          <li key={section.heading}>
            <h2 className="font-display text-xl uppercase">
              {String(index + 1).padStart(2, "0")} · {section.heading}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{section.body}</p>
          </li>
        ))}
      </ol>
      <p className="mt-10 text-sm">
        <Link to="/" className="font-medium text-primary underline-offset-4 hover:underline">
          Back to the board
        </Link>
      </p>
    </AppShell>
  );
}
