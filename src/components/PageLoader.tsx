import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export default function PageLoader({ className }: { className?: string }) {
  return (
    <div className={cn("flex min-h-[50vh] w-full items-center justify-center", className)}>
      <Spinner className="h-8 w-8 text-muted-foreground" />
    </div>
  );
}
