import { Link, getRouteApi } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

const rootRoute = getRouteApi("__root__");

export function AuthSlot() {
  const { sessionUser } = rootRoute.useRouteContext();
  const { user, isPending } = useCurrentUserState();
  if (user) {
    return (
      <div className="[&_button]:h-11 [&_button]:rounded-md [&_button]:px-3 [&_button]:text-sm [&_img]:size-8 [&_span.grid]:size-8">
        <UserButton />
      </div>
    );
  }
  if (isPending && sessionUser) {
    return <div className="size-11 animate-pulse rounded-full bg-secondary" aria-hidden />;
  }
  return (
    <Link
      to="/login"
      className="inline-flex h-11 min-h-11 items-center rounded-md px-3 text-sm font-medium text-foreground hover:bg-accent"
    >
      Sign in
    </Link>
  );
}
