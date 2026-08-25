import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PlusCard } from "@/components/plus-card";
import { RunCard } from "@/components/run-card";
import { WaiverGate } from "@/components/waiver-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { getRunnerProfile, listMyRuns, saveRunnerProfile } from "@/lib/runs";
import { formatCents } from "@/lib/fees";
import { compressListingPhoto } from "@/lib/photo";
import { VEHICLES } from "@/lib/run-catalog";
import { useCurrentUser } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/my-hauls")({ component: MyRunsPage });

function MyRunsPage() {
  return (
    <WaiverGate>
      <AppShell>
        <MyRuns />
      </AppShell>
    </WaiverGate>
  );
}

function MyRuns() {
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const runsQuery = useQuery({ queryKey: ["my-runs"], queryFn: () => listMyRuns() });
  const profileQuery = useQuery({ queryKey: ["runner-profile"], queryFn: () => getRunnerProfile() });
  const [displayName, setDisplayName] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [vehicle, setVehicle] = useState("car");
  const [insuranceCarrier, setInsuranceCarrier] = useState("");
  const [insurancePolicy, setInsurancePolicy] = useState("");
  const [insuranceExpires, setInsuranceExpires] = useState("");
  const [insuranceCover, setInsuranceCover] = useState("1000");
  const [insuranceAck, setInsuranceAck] = useState(false);
  const [insurancePhoto, setInsurancePhoto] = useState<string | null>(null);

  useEffect(() => {
    if (!profileQuery.data) return;
    setDisplayName(profileQuery.data.displayName || user?.displayName || "");
    setPaypalEmail(profileQuery.data.paypalEmail);
    setVehicle(profileQuery.data.vehicle);
    setInsuranceCarrier(profileQuery.data.insuranceCarrier);
    setInsurancePolicy(profileQuery.data.insurancePolicy);
    setInsuranceExpires(profileQuery.data.insuranceExpires);
    setInsuranceCover(
      profileQuery.data.insuranceCoverCents ? String(Math.round(profileQuery.data.insuranceCoverCents / 100)) : "1000",
    );
    setInsuranceAck(profileQuery.data.insuranceAck);
  }, [profileQuery.data, user?.displayName]);

  const save = useMutation({
    mutationFn: saveRunnerProfile,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["runner-profile"] });
      toast.success("Runner profile saved. You can accept or counter while insurance is current.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="grid gap-10">
      <div>
        <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">You</p>
        <h1 className="mt-1 font-display text-4xl uppercase tracking-wide">My runs</h1>
      </div>

      <PlusCard />
      <form
        className="grid gap-3 rounded-md bg-card p-5 shadow-[var(--shadow-border)] sm:p-8"
        onSubmit={(event) => {
          event.preventDefault();
          if (!insuranceAck) {
            toast.error("You must attest that courier insurance is current.");
            return;
          }
          save.mutate({
            data: {
              displayName,
              paypalEmail,
              vehicle: vehicle as "car" | "suv" | "pickup" | "van" | "bike",
              insuranceCarrier,
              insurancePolicy,
              insuranceExpires,
              insuranceCoverCents: Math.round(Number(insuranceCover || 0) * 100),
              insuranceAck: true as const,
              insurancePhotoDataUrl: insurancePhoto || undefined,
            },
          });
        }}
      >
        <h2 className="font-display text-2xl uppercase tracking-wide">Runner profile</h2>
        <p className="text-sm text-muted-foreground">
          Required before you accept or counter. 80% of a delivered run is paid to this PayPal email.
          You must carry active courier / cargo insurance, and the cargo limit must cover the declared value of each run you take.
          If your city requires a messenger or courier business license, obtaining it is your responsibility.
        </p>
        {profileQuery.data?.insuranceValid ? (
          <p className="text-sm font-medium">
            Courier insurance on file through {profileQuery.data.insuranceExpires}
            {profileQuery.data.insuranceCoverCents
              ? ` · cargo limit ${formatCents(profileQuery.data.insuranceCoverCents)}`
              : ""}
            .
          </p>
        ) : (
          <p className="text-sm font-medium text-primary">Courier insurance required. You cannot take jobs until this is current.</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="runner-name">Name on the board</Label>
            <Input id="runner-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="runner-pay">PayPal email</Label>
            <Input id="runner-pay" type="email" value={paypalEmail} onChange={(e) => setPaypalEmail(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="runner-vehicle">How you fetch</Label>
            <select
              id="runner-vehicle"
              className="h-11 rounded-md border border-input bg-background px-3 text-sm"
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value)}
            >
              {VEHICLES.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ins-carrier">Courier insurer</Label>
            <Input
              id="ins-carrier"
              value={insuranceCarrier}
              onChange={(e) => setInsuranceCarrier(e.target.value)}
              required
              placeholder="Progressive, Next, Hiscox…"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ins-policy">Policy number</Label>
            <Input id="ins-policy" value={insurancePolicy} onChange={(e) => setInsurancePolicy(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ins-exp">Expires</Label>
            <Input id="ins-exp" type="date" value={insuranceExpires} onChange={(e) => setInsuranceExpires(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ins-cover">Cargo limit (USD)</Label>
            <Input
              id="ins-cover"
              type="number"
              min={10}
              step="1"
              value={insuranceCover}
              onChange={(e) => setInsuranceCover(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">Must be at least the declared value of any run you take.</p>
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="ins-photo">Declarations page photo</Label>
            <Input
              id="ins-photo"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                void compressListingPhoto(file)
                  .then(setInsurancePhoto)
                  .catch((err: Error) => toast.error(err.message));
              }}
            />
            {insurancePhoto || profileQuery.data?.insurancePhotoUrl ? (
              <img
                src={insurancePhoto || profileQuery.data?.insurancePhotoUrl}
                alt="Insurance declarations"
                className="max-h-40 rounded-md object-contain"
              />
            ) : null}
          </div>
        </div>
        <label className="flex min-h-11 items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 size-4"
            checked={insuranceAck}
            onChange={(e) => setInsuranceAck(e.target.checked)}
            required
          />
          <span className="text-sm leading-relaxed">
            I carry active courier / cargo insurance for goods in transit and auto liability for this vehicle. The cargo limit covers the declared value of runs I take. I am not an Askfare employee. Coverage is current through the date above. If my city requires a messenger or courier business license, obtaining it is my responsibility.
          </span>
        </label>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save runner profile"}
        </Button>
      </form>

      {runsQuery.isPending ? (
        <Skeleton className="h-40 rounded-md" />
      ) : runsQuery.data?.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {runsQuery.data.map((run) => (
            <li key={run.id}>
              <RunCard run={run} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          No runs yet.{" "}
          <Link to="/post" className="underline">
            Post one
          </Link>{" "}
          or take an offer from the board.
        </p>
      )}
    </div>
  );
}
