import { Spinner } from "@/components/ui/spinner";

export default function PageLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Spinner className="size-10" />
    </div>
  );
}
