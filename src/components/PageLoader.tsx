import { Spinner } from "@/components/ui/spinner";

export default function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh] w-full">
      <Spinner className="w-8 h-8 text-primary" />
    </div>
  );
}
