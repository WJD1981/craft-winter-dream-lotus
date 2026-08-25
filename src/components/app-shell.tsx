import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AuthSlot } from "@/components/auth-slot";
import { LiftMark } from "@/components/lift-mark";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Board" },
  { to: "/post", label: "Post a run" },
  { to: "/my-hauls", label: "My runs" },
  { to: "/inbox", label: "Inbox" },
  { to: "/profile", label: "Profile" },
  { to: "/verify", label: "Verify" },
  { to: "/take", label: "The take" },
] as const;

export function AppShell({
  children,
  dense = false,
}: {
  children: ReactNode;
  dense?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/" className="flex min-h-11 items-center gap-2.5 text-foreground">
            <LiftMark className="size-8 text-primary" />
            <span className="font-display text-xl uppercase tracking-wide">Askfare</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => {
              const active =
                item.to === "/" ? pathname === "/" || pathname.startsWith("/job") : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "inline-flex h-11 items-center rounded-md px-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/70 hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <AuthSlot />
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-border/60 px-2 py-1 md:hidden">
          {NAV.map((item) => {
            const active =
              item.to === "/" ? pathname === "/" || pathname.startsWith("/job") : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "inline-flex h-11 shrink-0 items-center rounded-md px-3 text-sm font-medium",
                  active ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className={cn("mx-auto w-full flex-1", dense ? "max-w-3xl px-4 py-8 sm:px-6" : "max-w-6xl px-4 py-8 sm:px-6")}>
        {children}
      </main>
      <footer className="border-t border-border/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>Askfare · name the price · runner always 80% · take 20% or 5% with Plus</p>
          <p>
            <Link to="/retention" className="underline-offset-4 hover:underline">
              Data Retention Policy
            </Link>
            {" · "}
            <Link to="/help" className="underline-offset-4 hover:underline">
              Help
            </Link>
            {" · "}
            Not a courier company. Inspect at both ends. No refund after delivery.
          </p>
        </div>
      </footer>
    </div>
  );
}
