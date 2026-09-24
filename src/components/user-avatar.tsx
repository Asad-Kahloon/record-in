import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

export function UserAvatar({
  name,
  src,
  size = "default",
  className,
}: {
  name: string;
  src?: string | null;
  size?: "default" | "sm" | "lg";
  className?: string;
}) {
  return (
    <Avatar size={size} className={className}>
      {src ? <AvatarImage src={src} alt="" referrerPolicy="no-referrer" /> : null}
      <AvatarFallback className={cn("bg-brand/15 font-medium text-brand")}>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}
