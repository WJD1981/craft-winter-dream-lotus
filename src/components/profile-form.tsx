import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { compressListingPhoto } from "@/lib/photo";
import { getMyProfile, saveMyProfile } from "@/lib/profiles";
import { US_STATES } from "@/lib/us-states";
import { useCurrentUser } from "@/lib/auth/use-current-user";

export function ProfileForm() {
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["my-profile"], queryFn: () => getMyProfile() });
  const [displayName, setDisplayName] = useState("");
  const [age, setAge] = useState("21");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("CA");
  const [phone, setPhone] = useState("");
  const [about, setAbout] = useState("");
  const [photoAck, setPhotoAck] = useState(false);
  const [licenseAck, setLicenseAck] = useState(false);
  const [vehicleYear, setVehicleYear] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  const [plateLast4, setPlateLast4] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [vehiclePhoto, setVehiclePhoto] = useState<string | null>(null);

  useEffect(() => {
    if (!query.data) return;
    setDisplayName(query.data.displayName || user?.displayName || "");
    setAge(query.data.age ? String(query.data.age) : "21");
    setCity(query.data.city);
    setRegion(query.data.region || "CA");
    setPhone(query.data.phone);
    setAbout(query.data.about);
    setPhotoAck(query.data.photoAck);
    setLicenseAck(query.data.licenseAck);
    setVehicleYear(query.data.vehicleYear ? String(query.data.vehicleYear) : "");
    setVehicleMake(query.data.vehicleMake);
    setVehicleModel(query.data.vehicleModel);
    setVehicleColor(query.data.vehicleColor);
    setPlateLast4(query.data.plateLast4);
  }, [query.data, user?.displayName]);

  const save = useMutation({
    mutationFn: saveMyProfile,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      await queryClient.invalidateQueries({ queryKey: ["profile-status"] });
      toast.success("Profile saved.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (query.isPending) return <Skeleton className="h-80 rounded-md" />;

  return (
    <form
      className="grid gap-8"
      onSubmit={(event) => {
        event.preventDefault();
        if (!photoAck) {
          toast.error("You must attest the face photo is you, shoulders up, no hat or sunglasses.");
          return;
        }
        save.mutate({
          data: {
            displayName,
            age: Number(age),
            city,
            region: region as (typeof US_STATES)[number],
            phone,
            about,
            photoAck: true as const,
            licenseAck,
            vehicleYear: Number(vehicleYear) || 0,
            vehicleMake,
            vehicleModel,
            vehicleColor,
            plateLast4,
            photoDataUrl: photo || undefined,
            vehiclePhotoDataUrl: vehiclePhoto || undefined,
          },
        });
      }}
    >
      <section className="grid gap-3 rounded-md bg-card p-5 shadow-[var(--shadow-border)] sm:p-8">
        <h2 className="font-display text-2xl uppercase">You</h2>
        <p className="text-sm text-muted-foreground">
          Required for everyone. Face photo must be a clear shot from the shoulders up. No hat. No sunglasses.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="pname">Name on Askfare</Label>
            <Input id="pname" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="age">Age</Label>
            <Input id="age" type="number" min={18} max={99} value={age} onChange={(e) => setAge(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="Shown after a run is approved" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="st">State</Label>
            <select
              id="st"
              className="h-11 rounded-md border border-input bg-background px-3 text-sm"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            >
              {US_STATES.map((st) => (
                <option key={st}>{st}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="about">About you</Label>
            <Textarea id="about" value={about} onChange={(e) => setAbout(e.target.value)} placeholder="How you fetch, stairs, evenings…" />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="face">Shoulders-up photo</Label>
            <Input
              id="face"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                void compressListingPhoto(file)
                  .then(setPhoto)
                  .catch((err: Error) => toast.error(err.message));
              }}
            />
            {photo || query.data?.photoUrl ? (
              <img src={photo || query.data?.photoUrl} alt="Your face" className="max-h-48 rounded-md object-cover" />
            ) : null}
          </div>
        </div>
        <label className="flex min-h-11 items-start gap-3">
          <input type="checkbox" className="mt-1 size-4" checked={photoAck} onChange={(e) => setPhotoAck(e.target.checked)} required />
          <span className="text-sm leading-relaxed">
            This is a current photo of me from the shoulders up. I am not wearing a hat or sunglasses. I am 18 or older.
          </span>
        </label>
      </section>

      <section className="grid gap-3 rounded-md bg-card p-5 shadow-[var(--shadow-border)] sm:p-8">
        <h2 className="font-display text-2xl uppercase">If you run</h2>
        <p className="text-sm text-muted-foreground">
          Required before you accept or counter. Posters see this before they approve you and pay.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="vyear">Year</Label>
            <Input id="vyear" type="number" min={1990} max={2030} value={vehicleYear} onChange={(e) => setVehicleYear(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="vmake">Make</Label>
            <Input id="vmake" value={vehicleMake} onChange={(e) => setVehicleMake(e.target.value)} placeholder="Honda" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="vmodel">Model</Label>
            <Input id="vmodel" value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} placeholder="Civic" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="vcolor">Color</Label>
            <Input id="vcolor" value={vehicleColor} onChange={(e) => setVehicleColor(e.target.value)} placeholder="Silver" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="plate">Plate last 4</Label>
            <Input id="plate" value={plateLast4} onChange={(e) => setPlateLast4(e.target.value)} maxLength={8} />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="vphoto">Photo of that vehicle</Label>
            <Input
              id="vphoto"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                void compressListingPhoto(file)
                  .then(setVehiclePhoto)
                  .catch((err: Error) => toast.error(err.message));
              }}
            />
            {vehiclePhoto || query.data?.vehiclePhotoUrl ? (
              <img src={vehiclePhoto || query.data?.vehiclePhotoUrl} alt="Vehicle" className="max-h-48 rounded-md object-cover" />
            ) : null}
          </div>
        </div>
        <label className="flex min-h-11 items-start gap-3">
          <input type="checkbox" className="mt-1 size-4" checked={licenseAck} onChange={(e) => setLicenseAck(e.target.checked)} />
          <span className="text-sm leading-relaxed">
            I hold a valid driver’s license for this vehicle. This is the car, van, or bike I will use on Askfare runs.
          </span>
        </label>
      </section>

      <Button type="submit" disabled={save.isPending}>
        {save.isPending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
