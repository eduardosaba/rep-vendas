import { Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <Skeleton className="h-10 w-[400px]" />
      </div>
      <Skeleton className="h-4 w-[600px]" />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-8">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
      <div className="mt-8">
        <Skeleton className="h-[400px] w-full" />
      </div>
    </div>
  );
}
