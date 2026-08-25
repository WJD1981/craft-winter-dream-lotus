import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import type { PublicProfile } from "@/lib/profiles";

export function ProfileCard({
  profile,
  compact = false,
}: {
  profile: PublicProfile;
  compact?: boolean;
}) {
  const vehicle =
    profile.vehicleYear && profile.vehicleMake
      ? `${profile.vehicleYear} ${profile.vehicleMake} ${profile.vehicleModel}`.trim()
      : "";

  return (
    <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
      <img
        src={profile.photoUrl}
        alt=""
        className={compact ? "size-20 rounded-md object-cover" : "size-28 rounded-md object-cover sm:size-36"}
      />
      <div className="grid gap-1">
        <Link to="/u/$id" params={{ id: profile.userId }} className="font-display text-2xl uppercase tracking-wide hover:underline">
          {profile.displayName}
        </Link>
        {profile.verified ? (
          <Badge variant="secondary" className="w-fit">
            ID verified
          </Badge>
        ) : null}
        <p className="text-sm text-muted-foreground">
          {profile.age} · {profile.city}, {profile.region}
          {profile.ratingAvg != null
            ? ` · ${profile.ratingAvg.toFixed(1)} from ${profile.reviewCount} review${profile.reviewCount === 1 ? "" : "s"}`
            : " · no reviews yet"}
        </p>
        {profile.about ? <p className="text-sm leading-relaxed">{profile.about}</p> : null}
        {vehicle ? (
          <p className="text-sm">
            {vehicle}
            {profile.vehicleColor ? ` · ${profile.vehicleColor}` : ""}
            {profile.plateLast4 ? ` · plate …${profile.plateLast4}` : ""}
          </p>
        ) : null}
        {profile.phone ? <p className="text-sm font-medium">Phone {profile.phone}</p> : null}
      </div>
      {!compact && profile.vehiclePhotoUrl ? (
        <img
          src={profile.vehiclePhotoUrl}
          alt="Vehicle"
          className="aspect-[16/10] w-full rounded-md object-cover sm:col-span-2"
        />
      ) : null}
    </div>
  );
}
