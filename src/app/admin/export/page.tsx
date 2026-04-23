import ExportControl from '@/components/admin/ExportControl';

export const dynamic = 'force-dynamic';

export default function AdminExportPage() {
  return (
    <div className="p-6">
      <ExportControl />
    </div>
  );
}
