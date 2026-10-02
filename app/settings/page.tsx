import { isFabricConfigured } from '@/lib/fabric';
import { CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings | Fabric File Manager',
};

interface ConfigItemProps {
  label: string;
  configured: boolean;
  description: string;
}

function ConfigItem({ label, configured, description }: ConfigItemProps) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="flex-shrink-0 mt-0.5">
        {configured ? (
          <CheckCircle2 size={16} className="text-emerald-500" />
        ) : (
          <XCircle size={16} className="text-red-400" />
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <div className="ml-auto">
        <span
          className={`badge text-xs ${configured ? 'badge-success' : 'badge-error'}`}
        >
          {configured ? 'Configured' : 'Missing'}
        </span>
      </div>
    </div>
  );
}

export default async function SettingsPage() {
  const configStatus = {
    auth: !!(process.env.AZURE_TENANT_ID && process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET),
    fabric: isFabricConfigured(),
  };

  return (
    <div className="space-y-6 fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Settings</h1>
        <p className="text-slate-500 text-sm">
          Application configuration and connection status.
        </p>
      </div>

      {/* Configuration status */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
          Configuration Status
        </h2>

        <ConfigItem
          label="Azure Service Principal"
          configured={configStatus.auth}
          description="AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET"
        />
        <ConfigItem
          label="Microsoft Fabric Workspace"
          configured={configStatus.fabric}
          description="FABRIC_WORKSPACE_ID and FABRIC_LAKEHOUSE_ID"
        />
        <ConfigItem
          label="OneLake Connection"
          configured={configStatus.fabric}
          description="Used for file upload, download, and delete operations"
        />
      </div>

      {/* Helpful links */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
          Helpful Resources
        </h2>
        <div className="space-y-3">
          {[
            {
              title: 'Microsoft Fabric REST API',
              url: 'https://learn.microsoft.com/en-us/rest/api/fabric/',
              desc: 'Official Fabric API reference documentation',
            },
            {
              title: 'OneLake File API',
              url: 'https://learn.microsoft.com/en-us/fabric/onelake/onelake-api',
              desc: 'ADLS Gen2-compatible DFS REST API for OneLake',
            },
          ].map(({ title, url, desc }) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
            >
              <ExternalLink size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors">
                  {title}
                </p>
                <p className="text-xs text-slate-400">{desc}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Version info */}
      <div className="text-xs text-slate-400 text-center py-2">
        Fabric File Manager · Built with Next.js and Microsoft Fabric
      </div>
    </div>
  );
}
