import { Navigate, getRouteApi, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { Landing } from "@/components/landing";
import { Skeleton } from "@/components/ui/skeleton";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getProfileStatus } from "@/lib/profiles";
import { getWaiverStatus } from "@/lib/runs";

const rootRoute = getRouteApi("__root__");

function ShellSkeleton() {
  return (
    <AppShell>
      <div className="grid gap-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="aspect-[4/3] rounded-md" />
          <Skeleton className="aspect-[4/3] rounded-md" />
          <Skeleton className="hidden aspect-[4/3] rounded-md sm:block" />
        </div>
      </div>
    </AppShell>
  );
}

export function WaiverGate({
  children,
  allowLanding = false,
}: {
  children: ReactNode;
  allowLanding?: boolean;
}) {
  const { sessionUser } = rootRoute.useRouteContext();
  const { user, isPending } = useCurrentUserState();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const resolvedUser = user ?? (sessionUser ? { id: sessionUser.id } : null);
  const waiverQuery = useQuery({
    queryKey: ["ask-waiver", resolvedUser?.id],
    queryFn: () => getWaiverStatus(),
    enabled: Boolean(user),
  });
  const profileQuery = useQuery({
    queryKey: ["profile-status", resolvedUser?.id],
    queryFn: () => getProfileStatus(),
    enabled: Boolean(user) && Boolean(waiverQuery.data?.signed),
  });

  if (!resolvedUser) {
    if (isPending && !allowLanding) return <ShellSkeleton />;
    return allowLanding ? (
      <AppShell>
        <Landing />
      </AppShell>
    ) : (
      <RedirectToSignIn />
    );
  }
  if (!user || waiverQuery.isPending) return <ShellSkeleton />;
  if (waiverQuery.data && !waiverQuery.data.signed) {
    return <Navigate to="/waiver" />;
  }
  if (waiverQuery.isError) {
    return (
      <AppShell dense>
        <p className="text-sm text-destructive">Could not check the haul release. Refresh and try again.</p>
      </AppShell>
    );
  }
  if (profileQuery.isPending) return <ShellSkeleton />;
  if (profileQuery.data && !profileQuery.data.complete && pathname !== "/profile") {
    return <Navigate to="/profile" />;
  }
  if (
    profileQuery.data?.complete &&
    !profileQuery.data.verified &&
    pathname !== "/verify" &&
    pathname !== "/profile"
  ) {
    return <Navigate to="/verify" />;
  }
  return <>{children}</>;
}
