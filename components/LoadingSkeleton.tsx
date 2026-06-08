function Bar({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-gray-200 dark:bg-gray-700 ${className ?? ""}`} />
  );
}

export default function LoadingSkeleton() {
  return (
    <div className="space-y-5">
      <div>
        <Bar className="mb-3 h-4 w-32" />
        <div className="space-y-2">
          <Bar className="h-3 w-full" />
          <Bar className="h-3 w-5/6" />
          <Bar className="h-3 w-4/5" />
          <Bar className="h-3 w-5/6" />
        </div>
      </div>
      <div>
        <Bar className="mb-3 h-4 w-40" />
        <div className="space-y-2">
          <Bar className="h-3 w-full" />
          <Bar className="h-3 w-11/12" />
          <Bar className="h-3 w-full" />
          <Bar className="h-3 w-4/5" />
          <Bar className="h-3 w-11/12" />
        </div>
      </div>
    </div>
  );
}
