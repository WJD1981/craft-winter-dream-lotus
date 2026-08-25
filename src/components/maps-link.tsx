import { mapsDirectionsUrl } from "@/lib/maps";
import { cn } from "@/lib/utils";

export function MapsLink({
  destination,
  origin,
  children,
  className,
}: {
  destination: string;
  origin?: string;
  children: React.ReactNode;
  className?: string;
}) {
  if (!destination.trim()) return <span className={className}>{children}</span>;
  return (
    <a
      href={mapsDirectionsUrl(destination, origin)}
      target="_blank"
      rel="noreferrer"
      className={cn("text-primary underline-offset-4 hover:underline", className)}
    >
      {children}
    </a>
  );
}
