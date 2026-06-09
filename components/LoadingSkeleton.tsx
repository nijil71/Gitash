import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2.5">
        <Skeleton className="h-3.5 w-28" />
        <div className="space-y-2 pl-0">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-5/6" />
        </div>
      </div>
      <div className="space-y-2.5">
        <Skeleton className="h-3.5 w-36" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-11/12" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-11/12" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>
      <div className="space-y-2.5">
        <Skeleton className="h-3.5 w-24" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-11/12" />
        </div>
      </div>
    </div>
  );
}
