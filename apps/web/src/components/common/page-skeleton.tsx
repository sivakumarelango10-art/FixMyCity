import { Skeleton } from '@/components/ui/primitives';

/** Route-level placeholder shaped like a workspace page: header, a strip, then two columns. */
export function PageSkeleton() {
  return (
    <div className="grid gap-6" role="status" aria-label="Loading page">
      <div className="grid gap-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-4 w-[28rem] max-w-full" />
      </div>
      <Skeleton className="h-24 rounded-panel" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Skeleton className="h-80 rounded-panel" />
        <Skeleton className="h-80 rounded-panel" />
      </div>
    </div>
  );
}
