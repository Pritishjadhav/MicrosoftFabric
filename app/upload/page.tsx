import { FileUploader } from '@/components/FileUploader';
import { isFabricConfigured } from '@/lib/fabric';
import { FabricNotConfigured } from '@/components/ErrorState';
import { SUPPORTED_TYPES_DISPLAY, MAX_FILE_SIZE_BYTES } from '@/lib/validation';
import { Info } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Upload | Fabric File Manager',
};

export default function UploadPage() {
  const configured = isFabricConfigured();
  const maxMb = MAX_FILE_SIZE_BYTES / (1024 * 1024);

  return (
    <div className="space-y-6 fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Upload Files</h1>
        <p className="text-slate-500 text-sm">
          Upload files directly to Microsoft Fabric OneLake Lakehouse storage.
        </p>
      </div>

      {!configured ? (
        <FabricNotConfigured />
      ) : (
        <>
          <FileUploader />

          {/* Info panel */}
          <div className="card p-5">
            <div className="flex items-start gap-3">
              <Info size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Upload Information</p>
                <ul className="text-xs text-slate-500 space-y-1.5">
                  <li>
                    <span className="font-medium text-slate-600">Storage:</span>{' '}
                    Files are stored in{' '}
                    <code className="bg-slate-100 px-1 rounded font-mono text-xs">
                      Lakehouse/Files/uploads/YYYY/MM/
                    </code>
                  </li>
                  <li>
                    <span className="font-medium text-slate-600">Max size:</span>{' '}
                    {maxMb} MB per file
                  </li>
                  <li>
                    <span className="font-medium text-slate-600">Supported types:</span>{' '}
                    {SUPPORTED_TYPES_DISPLAY.join(', ')}
                  </li>
                  <li>
                    <span className="font-medium text-slate-600">Metadata:</span>{' '}
                    File metadata is stored in the{' '}
                    <code className="bg-slate-100 px-1 rounded font-mono text-xs">
                      file_metadata
                    </code>{' '}
                    Delta table
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
