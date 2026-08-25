import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PlusCard } from "@/components/plus-card";
import { formatCents, PLUS_PRICE_CENTS, PLUS_TAKE_PERCENT, splitSale, TABLE_TAKE_PERCENT } from "@/lib/fees";
import { ITEMS } from "@/lib/run-catalog";

const STEPS = [
  {
    n: "01",
    title: "Post the pickup and name a price",
    body: "Retail order, takeout, a bakery box, a parcel from one home to another. No tobacco, alcohol, or controlled substances. People and businesses both post. You say what you will pay — not us.",
  },
  {
    n: "02",
    title: "Independents accept or counter",
    body: "Nobody works for Askfare. A runner takes your number as-is, or sends a counter. You review their verified ID profile — face, age, city, vehicle, and reviews — then approve them before you pay. The job locks only when both sides agree and you approve.",
  },
  {
    n: "03",
    title: "They fetch it. You inspect.",
    body: "PayPal Checkout charges the named fare plus the take into the owner’s PayPal. Standard take is 20%. Plus members pay 5% — they keep the 15 points. The runner is always paid 80% of the named number. After delivery, an optional tip is 100% theirs. Chat and live status stay on the run. $9.99 Plus also hits that same PayPal.",
  },
] as const;

const sample = splitSale(2500);

export function Landing() {
  return (
    <div className="flex flex-col gap-16 pb-8">
      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">You name the fare</p>
          <h1 className="mt-3 font-display text-5xl uppercase leading-[0.95] tracking-wide sm:text-6xl">
            Name a price. Get it moved.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Retail pickups, local shops sending their own items, and home-to-home
            parcels. Post the job, name what you will pay. Independent people
            accept or counter. Askfare’s take is {TABLE_TAKE_PERCENT}% of that
            number, or {PLUS_TAKE_PERCENT}% with Plus at {formatCents(PLUS_PRICE_CENTS)} a month —
            a 15-point break for the poster. The runner is always paid 80%.
            Nobody on this board is an employee.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/login">Post a run</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/login">Take runs</Link>
            </Button>
          </div>
        </div>
        <div className="overflow-hidden rounded-md shadow-[var(--shadow-border)]">
          <img
            src="/runs/hero.jpg"
            alt="A store associate handing online-order bags to a driver at the curb"
            className="aspect-[16/10] w-full object-cover"
          />
        </div>
      </section>

      <section className="grid gap-4 rounded-md bg-card p-6 shadow-[var(--shadow-border)] sm:grid-cols-3 sm:p-8">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">You offer</p>
          <p className="mt-2 font-display text-4xl uppercase">{formatCents(sample.priceCents)}</p>
          <p className="mt-1 text-sm text-muted-foreground">Your number, not ours</p>
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Runner is paid</p>
          <p className="mt-2 font-display text-4xl uppercase">{formatCents(sample.cookCents)}</p>
          <p className="mt-1 text-sm text-muted-foreground">80%, after delivery</p>
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide text-primary uppercase">Askfare take</p>
          <p className="mt-2 font-display text-4xl uppercase text-primary">{formatCents(sample.takeCents)}</p>
          <p className="mt-1 text-sm text-muted-foreground">{TABLE_TAKE_PERCENT}% without Plus</p>
        </div>
      </section>

      <section>
        <h2 className="font-display text-3xl uppercase tracking-wide">How a run works</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {STEPS.map((step) => (
            <li key={step.n} className="rounded-md bg-card p-5 shadow-[var(--shadow-border)]">
              <p className="font-display text-sm text-primary">{step.n}</p>
              <h3 className="mt-2 font-medium">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-md bg-card p-6 shadow-[var(--shadow-border)] sm:p-8">
        <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">Their insurance, your number</p>
        <h2 className="mt-2 font-display text-3xl uppercase tracking-wide">Accept or counter</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          You name what you will pay for the pickup. A runner takes that number or sends a counter.
          The job locks only when you both agree. They must carry courier insurance that covers the
          declared value of the items. Askfare does not sell protection and does not reimburse damage or loss.
        </p>
        <ul className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
          <li className="rounded-md bg-background p-4">
            <p className="font-medium">You name the fare</p>
            <p className="mt-1 text-muted-foreground">Post what you’ll pay. They can take it or bid a different number.</p>
          </li>
          <li className="rounded-md bg-background p-4">
            <p className="font-medium">Courier insurance</p>
            <p className="mt-1 text-muted-foreground">Cargo limit must meet the declared value. No tobacco, alcohol, or controlled substances.</p>
          </li>
          <li className="rounded-md bg-background p-4">
            <p className="font-medium">Inspect at the door</p>
            <p className="mt-1 text-muted-foreground">
              Pickup photo required. Dispute before you confirm. Askfare holds the payout and decides.
            </p>
          </li>
        </ul>
      </section>

      <section>
        <h2 className="font-display text-3xl uppercase tracking-wide">What people post</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((item) => (
            <li key={item.key} className="overflow-hidden rounded-md bg-card shadow-[var(--shadow-border)]">
              <img src={item.src} alt="" className="aspect-[4/3] w-full object-cover" />
              <p className="px-4 py-3 text-sm font-medium">{item.title}</p>
            </li>
          ))}
        </ul>
      </section>

      <PlusCard />
    </div>
  );
}
