import { Spinner } from "@/components/ui/spinner";

export default function PageLoader() {
  return (
    <div className="flex h-full w-full min-h-[50vh] items-center justify-center">
      <Spinner className="h-8 w-8 text-primary" />
    </div>
  );
}
