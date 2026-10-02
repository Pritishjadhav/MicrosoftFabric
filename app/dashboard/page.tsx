import { getServerSession } from 'next-auth';
import { authOptions, isFabricConfigured } from '@/lib/auth';
import Link from 'next/link';
import {
  Files,
  Upload,
  HardDrive,
  CalendarCheck,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard | Fabric File Manager',
};

// Dashboard stat cards
async function getStats() {
  // In a real deployment these would query the metadata Delta table
  // Here we return placeholder-aware data
  return {
    configured: isFabricConfigured(),
  };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const { configured } = await getStats();

  const firstName = session?.user?.name?.split(' ')[0] ?? 'there';

  return (
    <div className="space-y-8 fade-in">
      {/* Welcome header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            Welcome back, {firstName} 👋
          </h1>
          <p className="text-slate-500 text-sm">
            Manage your files in Microsoft Fabric Lakehouse
          </p>
        </div>
        <Link href="/dashboard/upload" className="btn btn-primary">
          <Upload size={16} />
          Upload Files
        </Link>
      </div>

      {/* Fabric status banner */}
      {!configured && (
        <div className="flex items-start gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 mb-1">
              Microsoft Fabric Not Configured
            </p>
            <p className="text-xs text-amber-700 leading-relaxed">
              Set the required environment variables to connect to Microsoft Fabric OneLake.
              See{' '}
              <code className="bg-amber-100 px-1 rounded font-mono">README.md</code> for setup
              instructions.
            </p>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          title="Total Files"
          value={configured ? '—' : 'N/A'}
          subtitle="Connect Fabric to see"
          icon={<Files size={20} className="text-blue-500" />}
          iconBg="bg-blue-50"
          href="/dashboard/files"
        />
        <StatCard
          title="Storage Used"
          value={configured ? '—' : 'N/A'}
          subtitle="In OneLake Lakehouse"
          icon={<HardDrive size={20} className="text-purple-500" />}
          iconBg="bg-purple-50"
        />
        <StatCard
          title="Uploaded Today"
          value={configured ? '—' : 'N/A'}
          subtitle="Files this session"
          icon={<CalendarCheck size={20} className="text-emerald-500" />}
          iconBg="bg-emerald-50"
        />
        <StatCard
          title="Connection"
          value={configured ? 'Active' : 'Not set up'}
          subtitle="Microsoft Fabric"
          icon={
            configured ? (
              <CheckCircle2 size={20} className="text-emerald-500" />
            ) : (
              <AlertTriangle size={20} className="text-amber-500" />
            )
          }
          iconBg={configured ? 'bg-emerald-50' : 'bg-amber-50'}
          highlight={configured}
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent files */}
        <div className="xl:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-slate-800">Recent Files</h2>
            <Link
              href="/dashboard/files"
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>

          {configured ? (
            <div className="text-center py-10">
              <p className="text-slate-400 text-sm">
                Recent files will appear here once Fabric is connected and files are uploaded.
              </p>
              <Link href="/dashboard/upload" className="btn btn-secondary btn-sm mt-4">
                <Upload size={14} />
                Upload your first file
              </Link>
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-slate-400 text-sm">
                Configure Microsoft Fabric to start managing files.
              </p>
            </div>
          )}
        </div>

        {/* Quick upload */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-5">Quick Upload</h2>
          <div className="space-y-3">
            <Link
              href="/dashboard/upload"
              className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-blue-200 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-300 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0 group-hover:shadow-lg group-hover:shadow-blue-500/20 transition-shadow">
                <Upload size={18} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Upload Files</p>
                <p className="text-xs text-slate-500">Drop files into OneLake</p>
              </div>
              <ArrowRight size={16} className="ml-auto text-slate-300 group-hover:text-blue-400 transition-colors" />
            </Link>

            <Link
              href="/dashboard/files"
              className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                <Files size={18} className="text-slate-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Browse Files</p>
                <p className="text-xs text-slate-500">View all Lakehouse files</p>
              </div>
              <ArrowRight size={16} className="ml-auto text-slate-300 group-hover:text-slate-500 transition-colors" />
            </Link>
          </div>

          {/* Fabric info */}
          <div className="mt-6 p-4 bg-slate-900 rounded-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Storage Location
            </p>
            <p className="text-xs font-mono text-emerald-400 break-all">
              onelake.dfs.fabric.microsoft.com
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {configured ? '✓ Connection configured' : '⚠ Not yet configured'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
  href?: string;
  highlight?: boolean;
}

function StatCard({ title, value, subtitle, icon, iconBg, href, highlight }: StatCardProps) {
  const content = (
    <div className={`card stat-card p-5 ${highlight ? 'ring-1 ring-emerald-200' : ''}`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
          {icon}
        </div>
        {href && <ArrowRight size={16} className="text-slate-300" />}
      </div>
      <p className="text-2xl font-bold text-slate-800 mb-0.5">{value}</p>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</p>
      <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
