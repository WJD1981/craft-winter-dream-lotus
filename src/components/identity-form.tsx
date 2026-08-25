import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { compressListingPhoto } from "@/lib/photo";
import { getMyIdentity, ID_TYPES, submitIdentity } from "@/lib/identity";

export function IdentityForm() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["my-identity"], queryFn: () => getMyIdentity() });
  const [legalName, setLegalName] = useState("");
  const [dob, setDob] = useState("");
  const [idType, setIdType] = useState<(typeof ID_TYPES)[number]["id"]>("drivers_license");
  const [idIssuer, setIdIssuer] = useState("");
  const [idLast4, setIdLast4] = useState("");
  const [idExpires, setIdExpires] = useState("");
  const [idFront, setIdFront] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [idAck, setIdAck] = useState(false);
  const [selfieAck, setSelfieAck] = useState(false);

  const save = useMutation({
    mutationFn: submitIdentity,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["my-identity"] });
      await queryClient.invalidateQueries({ queryKey: ["profile-status"] });
      toast.success(
        result.status === "verified"
          ? "Identity verified. You can post and take runs."
          : "Submitted. Age did not match your profile — Askfare will review.",
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (query.isPending) return <Skeleton className="h-80 rounded-md" />;
  const record = query.data;

  if (record?.status === "verified") {
    return (
      <div className="rounded-md bg-card p-5 shadow-[var(--shadow-border)] sm:p-8">
        <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">Verified</p>
        <h2 className="mt-2 font-display text-2xl uppercase">{record.legalName}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {ID_TYPES.find((t) => t.id === record.idType)?.label} · {record.idIssuer} · last 4 {record.idLast4} · expires {record.idExpires}
        </p>
        <p className="mt-3 text-sm">Your public profile shows a verified badge. The ID photo stays private.</p>
      </div>
    );
  }

  if (record?.status === "pending") {
    return (
      <div className="rounded-md bg-card p-5 shadow-[var(--shadow-border)] sm:p-8">
        <h2 className="font-display text-2xl uppercase">In review</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {record.rejectReason || "Askfare is checking your ID against your profile. You will be able to post once it is verified."}
        </p>
      </div>
    );
  }

  return (
    <form
      className="grid gap-5 rounded-md bg-card p-5 shadow-[var(--shadow-border)] sm:p-8"
      onSubmit={(event) => {
        event.preventDefault();
        if (!idFront || !selfie) {
          toast.error("Upload the ID front and a selfie.");
          return;
        }
        if (!idAck || !selfieAck) {
          toast.error("Tick both attestations.");
          return;
        }
        save.mutate({
          data: {
            legalName,
            dob,
            idType,
            idIssuer,
            idLast4,
            idExpires,
            idFrontDataUrl: idFront,
            selfieDataUrl: selfie,
            idAck: true as const,
            selfieAck: true as const,
          },
        });
      }}
    >
      {record?.status === "rejected" ? (
        <p className="text-sm text-destructive">{record.rejectReason || "Rejected. Submit again with a clearer ID and selfie."}</p>
      ) : null}
      <p className="text-sm leading-relaxed text-muted-foreground">
        Government photo ID and a live selfie. Shoulders up, no hat, no sunglasses. We keep the last four of the document — not the full number.
        ID images are private and are deleted 12 months after you leave. See the{" "}
        <Link to="/retention" className="font-medium text-primary underline-offset-4 hover:underline">
          Data Retention Policy
        </Link>
        .
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="legal">Full legal name on the ID</Label>
          <Input id="legal" value={legalName} onChange={(e) => setLegalName(e.target.value)} required placeholder="Jordan Hale" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="dob">Date of birth</Label>
          <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="idtype">ID type</Label>
          <select
            id="idtype"
            className="h-11 rounded-md border border-input bg-background px-3 text-sm"
            value={idType}
            onChange={(e) => setIdType(e.target.value as (typeof ID_TYPES)[number]["id"])}
          >
            {ID_TYPES.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="issuer">State or country of issue</Label>
          <Input id="issuer" value={idIssuer} onChange={(e) => setIdIssuer(e.target.value)} required placeholder="CA" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="last4">Last 4 of ID number</Label>
          <Input id="last4" value={idLast4} onChange={(e) => setIdLast4(e.target.value)} required maxLength={4} minLength={4} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="exp">Expiration</Label>
          <Input id="exp" type="date" value={idExpires} onChange={(e) => setIdExpires(e.target.value)} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="idfront">ID front</Label>
          <Input
            id="idfront"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              void compressListingPhoto(file)
                .then(setIdFront)
                .catch((err: Error) => toast.error(err.message));
            }}
          />
          {idFront ? <img src={idFront} alt="ID" className="max-h-40 rounded-md object-contain" /> : null}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="selfie">Live selfie (shoulders up)</Label>
          <Input
            id="selfie"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              void compressListingPhoto(file)
                .then(setSelfie)
                .catch((err: Error) => toast.error(err.message));
            }}
          />
          {selfie ? <img src={selfie} alt="Selfie" className="max-h-40 rounded-md object-cover" /> : null}
        </div>
      </div>
      <label className="flex min-h-11 items-start gap-3">
        <input type="checkbox" className="mt-1 size-4" checked={idAck} onChange={(e) => setIdAck(e.target.checked)} required />
        <span className="text-sm leading-relaxed">This is my unexpired government photo ID. The last four match the document.</span>
      </label>
      <label className="flex min-h-11 items-start gap-3">
        <input type="checkbox" className="mt-1 size-4" checked={selfieAck} onChange={(e) => setSelfieAck(e.target.checked)} required />
        <span className="text-sm leading-relaxed">
          The selfie is me, taken now, from the shoulders up, with no hat and no sunglasses. It matches the ID.
        </span>
      </label>
      <Button type="submit" disabled={save.isPending}>
        {save.isPending ? "Checking…" : "Submit identity"}
      </Button>
    </form>
  );
}
