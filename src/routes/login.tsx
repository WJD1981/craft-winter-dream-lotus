import { createFileRoute, Link } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { LiftMark } from "@/components/lift-mark";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-6 py-12">
      <Link to="/" className="flex items-center gap-2.5 self-start text-foreground">
        <LiftMark className="size-8 text-primary" />
        <span className="font-display text-lg uppercase tracking-wide">Askfare</span>
      </Link>
      <div>
        <h1 className="font-display text-4xl uppercase tracking-wide">Sign in</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Post a pickup and name your price, or take a run. Independents accept
          or counter. You will sign a release first. Askfare keeps 20% of the
          locked fare. Nobody here is an employee.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {authEnabled ? (
          GROK_PROVIDERS.map((provider) => (
            <Button
              key={provider.providerId}
              type="button"
              variant="outline"
              size="lg"
              className="w-full justify-center"
              onClick={() => signIn(provider.providerId, { callbackURL: "/" })}
            >
              Continue with {provider.label}
            </Button>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">Sign-in is disabled.</p>
        )}
      </div>
    </main>
  );
}
