import {
  FileText,
  Table,
  Image,
  Archive,
  File,
  FileJson,
  FileCode,
  FileSpreadsheet,
} from 'lucide-react';
import type { FileType } from '@/types/file';

interface FileIconProps {
  fileType: FileType;
  size?: number;
  className?: string;
}

export function FileIcon({ fileType, size = 18, className }: FileIconProps) {
  const iconMap: Record<FileType, { Icon: React.ElementType; colorClass: string }> = {
    pdf: { Icon: FileText, colorClass: 'icon-pdf' },
    csv: { Icon: Table, colorClass: 'icon-csv' },
    excel: { Icon: FileSpreadsheet, colorClass: 'icon-excel' },
    json: { Icon: FileJson, colorClass: 'icon-json' },
    text: { Icon: FileCode, colorClass: 'icon-text' },
    image: { Icon: Image, colorClass: 'icon-image' },
    zip: { Icon: Archive, colorClass: 'icon-zip' },
    generic: { Icon: File, colorClass: 'icon-generic' },
  };

  const { Icon, colorClass } = iconMap[fileType] ?? iconMap.generic;

  return (
    <Icon
      size={size}
      className={`${colorClass} ${className ?? ''}`.trim()}
      aria-hidden="true"
    />
  );
}

interface FileIconBadgeProps {
  fileType: FileType;
  size?: 'sm' | 'md' | 'lg';
}

const bgMap: Record<FileType, string> = {
  pdf: 'bg-red-50 border-red-100',
  csv: 'bg-emerald-50 border-emerald-100',
  excel: 'bg-green-50 border-green-100',
  json: 'bg-amber-50 border-amber-100',
  text: 'bg-indigo-50 border-indigo-100',
  image: 'bg-purple-50 border-purple-100',
  zip: 'bg-orange-50 border-orange-100',
  generic: 'bg-slate-50 border-slate-100',
};

const sizeMap = {
  sm: { container: 'w-8 h-8 rounded-lg', icon: 14 },
  md: { container: 'w-10 h-10 rounded-xl', icon: 18 },
  lg: { container: 'w-12 h-12 rounded-xl', icon: 22 },
};

export function FileIconBadge({ fileType, size = 'md' }: FileIconBadgeProps) {
  const { container, icon } = sizeMap[size];
  const bg = bgMap[fileType] ?? bgMap.generic;

  return (
    <div
      className={`${container} ${bg} border flex items-center justify-center flex-shrink-0`}
      aria-hidden="true"
    >
      <FileIcon fileType={fileType} size={icon} />
    </div>
  );
}
