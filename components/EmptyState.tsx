import Link from 'next/link';
import { CloudUpload, FolderOpen } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  showUploadButton?: boolean;
  icon?: 'upload' | 'folder';
}

export function EmptyState({
  title = 'No files yet',
  description = 'Upload your first file to get started.',
  showUploadButton = true,
  icon = 'upload',
}: EmptyStateProps) {
  const Icon = icon === 'folder' ? FolderOpen : CloudUpload;

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center fade-in">
      {/* Illustration */}
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-100 flex items-center justify-center">
          <Icon size={40} className="text-blue-400" strokeWidth={1.5} />
        </div>
        {/* Decorative dots */}
        <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-purple-200 opacity-70" />
        <div className="absolute -bottom-1 -left-2 w-3 h-3 rounded-full bg-blue-200 opacity-70" />
      </div>

      <h2 className="text-xl font-semibold text-slate-800 mb-2">{title}</h2>
      <p className="text-slate-500 text-sm max-w-xs mb-8 leading-relaxed">{description}</p>

      {showUploadButton && (
        <Link
          href="/dashboard/upload"
          className="btn btn-primary"
          aria-label="Upload a file"
        >
          <CloudUpload size={16} />
          Upload File
        </Link>
      )}
    </div>
  );
}
