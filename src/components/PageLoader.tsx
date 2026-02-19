import { Spinner } from "@/components/ui/spinner";

export default function PageLoader() {
  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <Spinner className="h-8 w-8 text-muted-foreground" />
    </div>
  );
}
