import { Skeleton } from '@/components/ui/skeleton';

interface ChatLoadingSkeletonProps {
  accentClassName?: string;
}

/** Placeholder chat bubbles shown while message history loads. */
export function ChatLoadingSkeleton({ accentClassName }: ChatLoadingSkeletonProps) {
  return (
    <div className="space-y-4 p-1">
      <div className="flex justify-start">
        <Skeleton className={`h-12 w-3/5 rounded-[22px] rounded-bl-sm ${accentClassName ?? ''}`} />
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-9 w-2/5 rounded-[22px] rounded-br-sm" />
      </div>
      <div className="flex justify-start">
        <Skeleton className={`h-16 w-3/4 rounded-[22px] rounded-bl-sm ${accentClassName ?? ''}`} />
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-9 w-1/2 rounded-[22px] rounded-br-sm" />
      </div>
    </div>
  );
}
