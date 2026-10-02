import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  code?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
  code,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center fade-in">
      <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mb-5">
        <AlertTriangle size={28} className="text-red-500" strokeWidth={1.5} />
      </div>

      <h3 className="text-lg font-semibold text-slate-800 mb-2">{title}</h3>
      <p className="text-slate-500 text-sm max-w-sm mb-2 leading-relaxed">{message}</p>

      {code && (
        <p className="text-xs font-mono text-slate-400 mb-6">Error: {code}</p>
      )}

      {onRetry && (
        <button
          onClick={onRetry}
          className="btn btn-secondary mt-4"
          aria-label="Retry"
        >
          <RefreshCw size={15} />
          Try Again
        </button>
      )}
    </div>
  );
}

export function FabricNotConfigured() {
  return (
    <div className="card p-8 text-center fade-in">
      <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto mb-5">
        <AlertTriangle size={26} className="text-amber-500" strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-semibold text-slate-800 mb-2">
        Microsoft Fabric Not Configured
      </h3>
      <p className="text-slate-500 text-sm max-w-md mx-auto mb-5 leading-relaxed">
        The Microsoft Fabric connection is not configured. Please set the required environment
        variables and restart the server.
      </p>
      <div className="bg-slate-900 rounded-xl p-4 text-left text-sm font-mono text-slate-300 max-w-sm mx-auto">
        <p className="text-slate-500 mb-2"># Required variables</p>
        <p className="text-green-400">AZURE_TENANT_ID=...</p>
        <p className="text-green-400">AZURE_CLIENT_ID=...</p>
        <p className="text-green-400">AZURE_CLIENT_SECRET=...</p>
        <p className="text-green-400">FABRIC_WORKSPACE_ID=...</p>
        <p className="text-green-400">FABRIC_LAKEHOUSE_ID=...</p>
      </div>
      <p className="text-slate-400 text-xs mt-4">
        See <code className="bg-slate-100 px-1 rounded">README.md</code> for detailed setup instructions.
      </p>
    </div>
  );
}
