'use client';

import { useState, useCallback } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { CloudUpload, X, Upload, FileCheck, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { FileIconBadge } from './FileIcon';
import { getMimeFileType, formatFileSize } from '@/types/file';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES, SUPPORTED_TYPES_DISPLAY } from '@/lib/validation';

interface PendingFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

export function FileUploader() {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((accepted: File[], rejected: FileRejection[]) => {
    // Handle rejected files
    rejected.forEach((rejection) => {
      const errors = rejection.errors.map((e) => e.message).join(', ');
      toast.error(`${rejection.file.name}: ${errors}`);
    });

    // Add accepted files to pending list
    const newFiles: PendingFile[] = accepted.map((file) => ({
      id: Math.random().toString(36).slice(2),
      file,
      status: 'pending',
      progress: 0,
    }));

    setPendingFiles((prev) => {
      // Prevent adding duplicates by name
      const existingNames = new Set(prev.map((f) => f.file.name));
      return [...prev, ...newFiles.filter((f) => !existingNames.has(f.file.name))];
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: Object.fromEntries(ALLOWED_MIME_TYPES.map((type) => [type, []])),
    maxSize: MAX_FILE_SIZE_BYTES,
    multiple: true,
    disabled: isUploading,
  });

  const removeFile = (id: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const uploadFile = async (pending: PendingFile): Promise<void> => {
    // Mark as uploading
    setPendingFiles((prev) =>
      prev.map((f) => (f.id === pending.id ? { ...f, status: 'uploading', progress: 10 } : f))
    );

    const formData = new FormData();
    formData.append('file', pending.file);

    try {
      // Simulate initial progress
      setPendingFiles((prev) =>
        prev.map((f) => (f.id === pending.id ? { ...f, progress: 40 } : f))
      );

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      setPendingFiles((prev) =>
        prev.map((f) => (f.id === pending.id ? { ...f, progress: 85 } : f))
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message ?? 'Upload failed.');
      }

      setPendingFiles((prev) =>
        prev.map((f) =>
          f.id === pending.id ? { ...f, status: 'success', progress: 100 } : f
        )
      );

      toast.success(`"${pending.file.name}" uploaded successfully.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed.';
      setPendingFiles((prev) =>
        prev.map((f) =>
          f.id === pending.id ? { ...f, status: 'error', error: message, progress: 0 } : f
        )
      );
      toast.error(`"${pending.file.name}": ${message}`);
    }
  };

  const handleUploadAll = async () => {
    const toUpload = pendingFiles.filter((f) => f.status === 'pending' || f.status === 'error');
    if (toUpload.length === 0) return;

    setIsUploading(true);

    // Upload files sequentially to avoid overwhelming the server
    for (const file of toUpload) {
      await uploadFile(file);
    }

    setIsUploading(false);
  };

  const clearCompleted = () => {
    setPendingFiles((prev) => prev.filter((f) => f.status === 'pending' || f.status === 'error'));
  };

  const pendingCount = pendingFiles.filter((f) => f.status === 'pending').length;
  const uploadingCount = pendingFiles.filter((f) => f.status === 'uploading').length;
  const successCount = pendingFiles.filter((f) => f.status === 'success').length;

  return (
    <div className="space-y-5">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`dropzone p-10 text-center cursor-pointer transition-all ${
          isDragActive && !isDragReject ? 'dropzone-active' : ''
        } ${isDragReject ? 'dropzone-reject' : ''} ${
          isUploading ? 'opacity-60 cursor-not-allowed' : ''
        }`}
        aria-label="Drop zone for file upload"
      >
        <input {...getInputProps()} aria-label="File input" />

        <div className="flex flex-col items-center gap-4">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
              isDragActive && !isDragReject
                ? 'bg-blue-500 shadow-lg shadow-blue-500/25'
                : isDragReject
                ? 'bg-red-100'
                : 'bg-blue-50 border border-blue-100'
            }`}
          >
            <CloudUpload
              size={32}
              className={
                isDragActive && !isDragReject
                  ? 'text-white'
                  : isDragReject
                  ? 'text-red-500'
                  : 'text-blue-500'
              }
              strokeWidth={1.5}
            />
          </div>

          {isDragReject ? (
            <div>
              <p className="font-semibold text-red-600 text-lg mb-1">File not supported</p>
              <p className="text-red-400 text-sm">This file type or size is not allowed.</p>
            </div>
          ) : isDragActive ? (
            <div>
              <p className="font-semibold text-blue-600 text-lg mb-1">Drop to add files</p>
              <p className="text-blue-400 text-sm">Release to add to queue</p>
            </div>
          ) : (
            <div>
              <p className="font-semibold text-slate-700 text-lg mb-1">
                Upload files to Lakehouse
              </p>
              <p className="text-slate-500 text-sm mb-4">
                Drag &amp; drop files here, or{' '}
                <span className="text-blue-600 font-medium underline underline-offset-2">
                  browse files
                </span>
              </p>
              <p className="text-slate-400 text-xs">
                Supported: {SUPPORTED_TYPES_DISPLAY.join(', ')}
              </p>
              <p className="text-slate-400 text-xs mt-1">
                Max size: {MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB per file
              </p>
            </div>
          )}
        </div>
      </div>

      {/* File queue */}
      {pendingFiles.length > 0 && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-700">
              Files ({pendingFiles.length})
            </span>
            {successCount > 0 && (
              <button
                onClick={clearCompleted}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Clear completed uploads"
              >
                Clear completed
              </button>
            )}
          </div>

          <ul className="divide-y divide-slate-50" aria-label="Upload queue">
            {pendingFiles.map((item) => {
              const fileType = getMimeFileType(item.file.type);
              return (
                <li key={item.id} className="px-5 py-4 flex items-center gap-4">
                  <FileIconBadge fileType={fileType} size="sm" />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{item.file.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400">{formatFileSize(item.file.size)}</span>

                      {item.status === 'pending' && (
                        <span className="text-xs text-slate-400">· Ready to upload</span>
                      )}
                      {item.status === 'uploading' && (
                        <span className="text-xs text-blue-500">· Uploading {item.progress}%</span>
                      )}
                      {item.status === 'success' && (
                        <span className="text-xs text-emerald-600 flex items-center gap-1">
                          <FileCheck size={11} />
                          Uploaded
                        </span>
                      )}
                      {item.status === 'error' && (
                        <span className="text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle size={11} />
                          {item.error ?? 'Failed'}
                        </span>
                      )}
                    </div>

                    {/* Progress bar */}
                    {item.status === 'uploading' && (
                      <div className="progress-bar mt-2">
                        <div
                          className="progress-bar-fill"
                          style={{ width: `${item.progress}%` }}
                          role="progressbar"
                          aria-valuenow={item.progress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`Upload progress: ${item.progress}%`}
                        />
                      </div>
                    )}
                  </div>

                  {/* Status icon / remove button */}
                  <div className="flex-shrink-0">
                    {item.status === 'uploading' ? (
                      <Loader2 size={16} className="text-blue-500 spin" />
                    ) : item.status === 'success' ? (
                      <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                        <FileCheck size={13} className="text-emerald-600" />
                      </div>
                    ) : (
                      <button
                        onClick={() => removeFile(item.id)}
                        className="w-6 h-6 flex items-center justify-center rounded-full text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-colors"
                        aria-label={`Remove ${item.file.name} from queue`}
                        disabled={isUploading}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Upload button */}
          <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4">
            <p className="text-xs text-slate-400">
              {pendingCount > 0 && `${pendingCount} file${pendingCount !== 1 ? 's' : ''} ready`}
              {uploadingCount > 0 && `${uploadingCount} uploading`}
              {successCount > 0 && ` · ${successCount} done`}
            </p>
            <button
              onClick={handleUploadAll}
              disabled={isUploading || pendingCount === 0}
              className="btn btn-primary"
              aria-label="Upload all files in queue"
            >
              {isUploading ? (
                <>
                  <Loader2 size={15} className="spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={15} />
                  Upload {pendingCount > 0 ? `${pendingCount} File${pendingCount !== 1 ? 's' : ''}` : 'Files'}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
