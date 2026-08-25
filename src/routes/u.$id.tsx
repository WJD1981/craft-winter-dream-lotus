import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { ProfileCard } from "@/components/profile-card";
import { WaiverGate } from "@/components/waiver-gate";
import { Skeleton } from "@/components/ui/skeleton";
import { getPublicProfile, listReviewsFor } from "@/lib/profiles";

export const Route = createFileRoute("/u/$id")({ component: PublicProfilePage });

function PublicProfilePage() {
  const { id } = Route.useParams();
  return (
    <WaiverGate>
      <AppShell dense>
        <PublicProfile id={id} />
      </AppShell>
    </WaiverGate>
  );
}

function PublicProfile({ id }: { id: string }) {
  const profileQuery = useQuery({
    queryKey: ["public-profile", id],
    queryFn: () => getPublicProfile({ data: { userId: id, revealPhone: true } }),
  });
  const reviewsQuery = useQuery({
    queryKey: ["reviews", id],
    queryFn: () => listReviewsFor({ data: { userId: id } }),
  });

  if (profileQuery.isPending) return <Skeleton className="h-64 rounded-md" />;
  if (profileQuery.isError || !profileQuery.data) {
    return <p className="text-sm text-destructive">That profile is not up yet.</p>;
  }

  const reviews = reviewsQuery.data ?? [];

  return (
    <div className="grid gap-8">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Board
      </Link>
      <ProfileCard profile={profileQuery.data} />
      <section className="grid gap-3">
        <h2 className="font-display text-2xl uppercase">Reviews</h2>
        {reviews.length ? (
          <ul className="grid gap-3">
            {reviews.map((review) => (
              <li key={review.id} className="rounded-md bg-card p-4 shadow-[var(--shadow-border)]">
                <p className="font-medium">
                  {review.fromName} · {review.rating}/5
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Talk {review.communication} · time {review.punctual} · care {review.care}
                </p>
                <p className="mt-2 text-sm leading-relaxed">{review.note}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No reviews yet.</p>
        )}
      </section>
    </div>
  );
}
