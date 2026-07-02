'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ExportButton({ symbol, days }: { symbol: string; days?: number }) {
  const handleExport = () => {
    const d = days || 200;
    window.open(`/api/export/csv?symbol=${symbol}&days=${d}&type=both`, '_blank');
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-slate-500 hover:text-slate-300 text-xs h-7 px-2"
      onClick={handleExport}
      title="Export CSV"
    >
      <Download className="w-3 h-3 mr-1" />
      CSV
    </Button>
  );
}
