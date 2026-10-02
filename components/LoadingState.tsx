import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  fullPage?: boolean;
}

export function LoadingState({ message = 'Loading...', fullPage = false }: LoadingStateProps) {
  if (fullPage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Loader2 size={28} className="text-white spin" />
          </div>
        </div>
        <p className="text-slate-500 text-sm font-medium">{message}</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-3 py-16">
      <Loader2 size={20} className="text-blue-500 spin" />
      <span className="text-slate-500 text-sm">{message}</span>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-label="Loading files" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-lg border border-slate-100">
          <div className="skeleton w-9 h-9 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 rounded w-1/3" />
            <div className="skeleton h-3 rounded w-1/5" />
          </div>
          <div className="hidden sm:block skeleton h-4 rounded w-16" />
          <div className="hidden md:block skeleton h-4 rounded w-24" />
          <div className="skeleton h-8 rounded-lg w-20" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="card p-5 space-y-3">
      <div className="skeleton h-5 rounded w-1/3" />
      <div className="skeleton h-8 rounded w-1/2" />
      <div className="skeleton h-4 rounded w-2/3" />
    </div>
  );
}
