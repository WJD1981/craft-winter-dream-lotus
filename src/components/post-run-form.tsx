import { useMemo, useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { ITEMS, JOB_TYPES, KINDS, type ItemKey, type JobType, type Kind } from "@/lib/run-catalog";
import { formatCents, PLUS_TAKE_PERCENT, splitSale, TABLE_TAKE_PERCENT, takeRateForPlus } from "@/lib/fees";
import { getPlusStatus, postRun } from "@/lib/runs";
import { listSavedAddresses, saveAddress } from "@/lib/ops";
import { PROHIBITED_COPY } from "@/lib/prohibited";
import { compressListingPhoto } from "@/lib/photo";
import { cn } from "@/lib/utils";

export function PostRunForm() {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const plusQuery = useQuery({ queryKey: ["plus"], queryFn: () => getPlusStatus() });
  const savedQuery = useQuery({ queryKey: ["saved-addresses"], queryFn: () => listSavedAddresses() });
  const [saveDrop, setSaveDrop] = useState(false);
  const [jobType, setJobType] = useState<JobType>("fetch");
  const [itemKey, setItemKey] = useState<ItemKey>("boxes");
  const item = ITEMS.find((i) => i.key === itemKey) ?? ITEMS[0];
  const [kind, setKind] = useState<Kind>(item.kind);
  const [isBusiness, setIsBusiness] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [store, setStore] = useState("");
  const [orderRef, setOrderRef] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [pickupWindow, setPickupWindow] = useState("");
  const [offerInput, setOfferInput] = useState("25");
  const [declaredInput, setDeclaredInput] = useState("80");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [noProhibited, setNoProhibited] = useState(false);

  const offerCents = Math.round(Number(offerInput || 0) * 100);
  const split = useMemo(
    () => splitSale(Math.max(800, offerCents), takeRateForPlus(Boolean(plusQuery.data?.active))),
    [offerCents, plusQuery.data?.active],
  );
  const declaredCents = Math.round(Number(declaredInput || 0) * 100);
  const youPay = split.chargeCents;

  const mutation = useMutation({
    mutationFn: postRun,
    onSuccess: async (run) => {
      await queryClient.invalidateQueries({ queryKey: ["open-runs"] });
      if (saveDrop && dropoffAddress.trim()) {
        try {
          await saveAddress({ data: { label: "Drop-off", address: dropoffAddress.trim() } });
        } catch {
          /* ignore */
        }
      }
      toast.success("Run is on the board. Independents can accept or counter.");
      void navigate({ to: "/job/$id", params: { id: String(run.id) } });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  async function handlePhoto(file: File | undefined) {
    if (!file) return;
    try {
      setPhotoDataUrl(await compressListingPhoto(file));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read that photo.");
    }
  }

  return (
    <form
      className="grid gap-8"
      onSubmit={(event) => {
        event.preventDefault();
        if (!noProhibited) {
          toast.error("Confirm this run has no tobacco, alcohol, or controlled substances.");
          return;
        }
        if ((jobType === "home" || jobType === "shop") && !photoDataUrl) {
          toast.error("Add a photo of the item you want moved.");
          return;
        }
        mutation.mutate({
          data: {
            customerName: (user?.displayName || "Neighbor").slice(0, 60),
            isBusiness,
            businessName: businessName.trim(),
            kind,
            store: store.trim(),
            orderRef: orderRef.trim(),
            pickupAddress: pickupAddress.trim(),
            dropoffAddress: dropoffAddress.trim(),
            neighborhood: "",
            notes: notes.trim(),
            itemKey,
            pickupWindow: pickupWindow.trim(),
            offerCents: split.priceCents,
            declaredCents: Math.max(1000, declaredCents),
            noProhibited: true as const,
            photoDataUrl: photoDataUrl || undefined,
          },
        });
      }}
    >
      <fieldset className="grid gap-3">
        <legend className="text-sm font-medium">Who is posting</legend>
        <div className="flex gap-2">
          <Button type="button" variant={!isBusiness ? "default" : "outline"} onClick={() => setIsBusiness(false)}>
            Person
          </Button>
          <Button type="button" variant={isBusiness ? "default" : "outline"} onClick={() => setIsBusiness(true)}>
            Business
          </Button>
        </div>
        {isBusiness ? (
          <div className="grid gap-2">
            <Label htmlFor="biz">Business name</Label>
            <Input id="biz" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
          </div>
        ) : null}
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="text-sm font-medium">What kind of run</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {JOB_TYPES.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => {
                setJobType(entry.id);
                if (entry.id === "home") {
                  setItemKey("parcel");
                  setKind("home");
                  setIsBusiness(false);
                } else if (entry.id === "shop") {
                  setItemKey("shop");
                  setKind("shop");
                  setIsBusiness(true);
                } else {
                  setItemKey("boxes");
                  setKind("retail");
                }
              }}
              className={cn(
                "rounded-md px-3 py-3 text-left shadow-[var(--shadow-border)]",
                jobType === entry.id ? "ring-2 ring-primary" : "bg-card",
              )}
            >
              <span className="block text-sm font-medium">{entry.label}</span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{entry.body}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="text-sm font-medium">
          {jobType === "home" ? "The parcel" : jobType === "shop" ? "The item" : "What to fetch"}
        </legend>
        <p className="text-sm text-muted-foreground">{PROHIBITED_COPY}</p>
        {jobType === "fetch" ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {ITEMS.filter((entry) => entry.job === "fetch").map((entry) => (
            <button
              key={entry.key}
              type="button"
              onClick={() => {
                setItemKey(entry.key);
                setKind(entry.kind);
              }}
              className={cn(
                "overflow-hidden rounded-md text-left shadow-[var(--shadow-border)]",
                itemKey === entry.key && "ring-2 ring-primary",
              )}
            >
              <img src={entry.src} alt="" className="aspect-[4/3] w-full object-cover" />
              <span className="block px-2 py-2 text-xs font-medium">{entry.title}</span>
            </button>
          ))}
        </div>
        ) : (
          <img
            src={jobType === "home" ? "/runs/parcel.jpg" : "/runs/shop.jpg"}
            alt=""
            className="aspect-[16/9] w-full rounded-md object-cover"
          />
        )}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        {jobType === "fetch" ? (
          <div className="grid gap-2">
            <Label htmlFor="kind">Kind</Label>
            <select
              id="kind"
              className="h-11 rounded-md border border-input bg-background px-3 text-sm"
              value={kind}
              onChange={(e) => setKind(e.target.value as Kind)}
            >
              {KINDS.filter((entry) => entry.job === "fetch").map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="grid gap-2">
          <Label htmlFor="store">
            {jobType === "home" ? "What’s moving" : jobType === "shop" ? "Item / shop" : "Store or restaurant"}
          </Label>
          <Input
            id="store"
            value={store}
            onChange={(e) => setStore(e.target.value)}
            required
            placeholder={
              jobType === "home"
                ? "Keys, a suitcase, leftover chairs…"
                : jobType === "shop"
                  ? "Birthday cake, bouquet, repaired bike…"
                  : "Target, Thai House, CVS…"
            }
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ref">{jobType === "fetch" ? "Order name / number" : "Who it’s for"}</Label>
          <Input
            id="ref"
            value={orderRef}
            onChange={(e) => setOrderRef(e.target.value)}
            placeholder={jobType === "fetch" ? "B-4412 or pickup under Priya" : "Priya at 88 Pine — ring twice"}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="window">Pickup window</Label>
          <Input id="window" value={pickupWindow} onChange={(e) => setPickupWindow(e.target.value)} required placeholder="Today 5–7pm" />
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="pickup">
            {jobType === "home" ? "Pickup — the residence" : jobType === "shop" ? "Pickup — the shop" : "Pickup — where they grab it"}
          </Label>
          <Input
            id="pickup"
            value={pickupAddress}
            onChange={(e) => setPickupAddress(e.target.value)}
            required
            placeholder={
              jobType === "home"
                ? "12 Oak St, porch bin, code 4412"
                : jobType === "shop"
                  ? "Hale Bakery, 220 Market, rear door"
                  : "Target pickup lane, guest services"
            }
          />
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="drop">{jobType === "home" ? "Drop-off — the other residence" : "Drop-off address"}</Label>
          <Input
            id="drop"
            value={dropoffAddress}
            onChange={(e) => setDropoffAddress(e.target.value)}
            required
            placeholder={jobType === "home" ? "88 Pine St, side door" : "418 Willow Ave"}
          />
          {savedQuery.data?.length ? (
            <div className="flex flex-wrap gap-2">
              {savedQuery.data.map((entry) => (
                <Button key={entry.id} type="button" size="sm" variant="outline" onClick={() => setDropoffAddress(entry.address)}>
                  {entry.label}
                </Button>
              ))}
            </div>
          ) : null}
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" className="size-4" checked={saveDrop} onChange={(e) => setSaveDrop(e.target.checked)} />
            Save this drop-off
          </label>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="notes">What the runner needs to know</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          required
          minLength={8}
          placeholder={
            jobType === "home"
              ? "Ring the side door. Bag is on the washer. Do not leave on the stoop."
              : jobType === "shop"
                ? "Cake is boxed and cold. Customer is Priya. Keep upright."
                : "Ready at guest services. Two bags. Do not leave on the stoop."
          }
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="photo">
          {jobType === "fetch" ? "Photo of the order screen or bags (optional)" : "Photo of the item (required)"}
        </Label>
        <Input id="photo" type="file" accept="image/*" onChange={(e) => void handlePhoto(e.target.files?.[0])} />
      </div>

      <div className="grid gap-3 rounded-md bg-card p-5 shadow-[var(--shadow-border)]">
        <div className="grid gap-2">
          <Label htmlFor="offer">Your offer (USD)</Label>
          <Input
            id="offer"
            type="number"
            min={8}
            step="1"
            value={offerInput}
            onChange={(e) => setOfferInput(e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">Minimum $8. Independents can accept this or counter.</p>
        </div>
        <dl className="grid gap-1 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Runner is paid (always 80%)</dt>
            <dd className="tabular-nums">{formatCents(split.cookCents)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">
              Your take fee ({plusQuery.data?.active ? PLUS_TAKE_PERCENT : TABLE_TAKE_PERCENT}%)
              {!plusQuery.data?.active ? (
                <>
                  {" "}
                  ·{" "}
                  <Link to="/my-hauls" className="underline">
                    Plus saves 15 points
                  </Link>
                </>
              ) : (
                " · Plus"
              )}
            </dt>
            <dd className="tabular-nums text-primary">{formatCents(split.takeCents)}</dd>
          </div>
          <div className="flex justify-between gap-4 font-medium">
            <dt>You pay</dt>
            <dd className="tabular-nums">{formatCents(youPay)}</dd>
          </div>
        </dl>
      </div>

      <div className="grid gap-3 rounded-md bg-card p-5 shadow-[var(--shadow-border)]">
        <h2 className="font-display text-xl uppercase">What the items are worth</h2>
        <p className="text-sm text-muted-foreground">
          A runner can only take this job if their courier cargo limit covers this number. Damage or loss is on their policy, not Askfare.
        </p>
        <div className="grid gap-2">
          <Label htmlFor="declared">Declared value (USD)</Label>
          <Input
            id="declared"
            type="number"
            min={10}
            step="1"
            value={declaredInput}
            onChange={(e) => setDeclaredInput(e.target.value)}
            required
          />
        </div>
      </div>

      <label className="flex min-h-11 items-start gap-3 rounded-md bg-card p-4 shadow-[var(--shadow-border)]">
        <input
          type="checkbox"
          className="mt-1 size-4"
          checked={noProhibited}
          onChange={(e) => setNoProhibited(e.target.checked)}
          required
        />
        <span className="text-sm leading-relaxed">
          This pickup does not include tobacco products, alcoholic beverages, or controlled substances. Runners will cancel if they find those items.
        </span>
      </label>

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Posting…" : `Post ${formatCents(split.priceCents)} offer`}
      </Button>
    </form>
  );
}
