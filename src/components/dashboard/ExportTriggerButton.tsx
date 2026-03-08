'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet } from 'lucide-react';

interface Props {
  userId?: string | null;
}

export default function ExportTriggerButton({ userId }: Props) {
  const handleClick = () => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('repvendas:triggerExport', { detail: { userId } })
    );
  };

  return (
    <Button
      onClick={handleClick}
      variant="outline"
      size="sm"
      className="w-full sm:w-auto justify-center"
      leftIcon={<FileSpreadsheet size={16} />}
    >
      Exportar Excel
    </Button>
  );
}
