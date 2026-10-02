import { FileList } from '@/components/FileList';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Files | Fabric File Manager',
};

export default function FilesPage() {
  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Files</h1>
        <p className="text-slate-500 text-sm">
          Browse and manage files stored in your Microsoft Fabric Lakehouse.
        </p>
      </div>

      <FileList />
    </div>
  );
}
