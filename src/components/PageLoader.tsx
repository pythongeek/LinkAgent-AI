import { Spinner } from '@/components/ui/spinner';

export default function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <Spinner className="size-8 text-primary" />
    </div>
  );
}
