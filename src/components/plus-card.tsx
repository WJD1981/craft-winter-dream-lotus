import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PayPalPlus } from "@/components/paypal-plus";
import { formatCents, PLUS_PRICE_CENTS, PLUS_TAKE_PERCENT, TABLE_TAKE_PERCENT, splitSale } from "@/lib/fees";
import { getPlusStatus } from "@/lib/runs";
import { useCurrentUser } from "@/lib/auth/use-current-user";

const sample = 2500;
const standard = splitSale(sample, 0.2);
const plus = splitSale(sample, 0.05);

export function PlusCard() {
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const plusQuery = useQuery({
    queryKey: ["plus"],
    queryFn: () => getPlusStatus(),
    enabled: Boolean(user),
  });

  if (!user) {
    return (
      <section className="rounded-md bg-card p-6 shadow-[var(--shadow-border)] sm:p-8">
        <PlusCopy />
        <Link
          to="/login"
          className="mt-6 inline-flex h-11 items-center font-medium text-primary underline-offset-4 hover:underline"
        >
          Sign in to start Plus
        </Link>
      </section>
    );
  }

  if (plusQuery.data?.active) {
    return (
      <section className="rounded-md bg-card p-6 shadow-[var(--shadow-border)] sm:p-8">
        <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">Askfare Plus</p>
        <h2 className="mt-2 font-display text-3xl uppercase tracking-wide">You’re on 5%</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Runs you post are charged a {PLUS_TAKE_PERCENT}% take instead of {TABLE_TAKE_PERCENT}% until{" "}
          {plusQuery.data.until ? new Date(plusQuery.data.until).toLocaleDateString() : "the end of the month"}.
          The runner still gets 80% of the named fare. You keep the 15 points.
        </p>
        <div className="mt-6">
          <PayPalPlus
            onPaid={async () => {
              await queryClient.invalidateQueries({ queryKey: ["plus"] });
              toast.success("Plus extended 30 days.");
            }}
            onError={(text) => toast.error(text)}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-md bg-card p-6 shadow-[var(--shadow-border)] sm:p-8">
      <PlusCopy />
      <div className="mt-6">
        <PayPalPlus
          onPaid={async () => {
            await queryClient.invalidateQueries({ queryKey: ["plus"] });
            toast.success("Plus is on. You pay 5% take on runs you post. Runners still get 80%.");
          }}
          onError={(text) => toast.error(text)}
        />
      </div>
    </section>
  );
}

function PlusCopy() {
  return (
    <>
      <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">Askfare Plus</p>
      <h2 className="mt-2 font-display text-3xl uppercase tracking-wide">
        {formatCents(PLUS_PRICE_CENTS)} a month · {PLUS_TAKE_PERCENT}% take
      </h2>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
        Standard take is {TABLE_TAKE_PERCENT}% of the named fare, on top of the runner’s 80%.
        Plus is {formatCents(PLUS_PRICE_CENTS)} a month and cuts your take to {PLUS_TAKE_PERCENT}%
        — you keep those 15 points. The runner is paid the same 80% either way.
      </p>
      <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-md bg-background p-4">
          <dt className="text-muted-foreground">On a {formatCents(sample)} named fare, standard</dt>
          <dd className="mt-1 font-medium">
            You pay {formatCents(standard.chargeCents)} · take {formatCents(standard.takeCents)} · runner{" "}
            {formatCents(standard.cookCents)}
          </dd>
        </div>
        <div className="rounded-md bg-background p-4">
          <dt className="text-muted-foreground">Same fare with Plus</dt>
          <dd className="mt-1 font-medium">
            You pay {formatCents(plus.chargeCents)} · take {formatCents(plus.takeCents)} · runner{" "}
            {formatCents(plus.cookCents)}
          </dd>
        </div>
      </dl>
    </>
  );
}
