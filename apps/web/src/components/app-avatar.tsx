import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function AppAvatar({
  src,
  name,
  className,
}: {
  src?: string | null;
  name: string;
  className?: string;
}) {
  return (
    <Avatar className={cn("h-10 w-10 ring-2 ring-card", className)}>
      <AvatarImage
        src={src ?? undefined}
        alt={name}
      />
      <AvatarFallback className="bg-sage/15 font-bold text-sage-dark">
        {name.slice(0, 1).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
