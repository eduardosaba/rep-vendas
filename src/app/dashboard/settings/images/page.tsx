'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Image as ImageIcon,
  Play,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Zap,
  HardDrive,
  FileImage,
  Loader2,
  Trash2,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

import ImageOptimizationClient from './ImageOptimizationClient';

export default function Page() {
  return <ImageOptimizationClient />;
}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente Interno para os Cards de Status
function StatCard({ title, value, subValue, icon: Icon, color }: any) {
  const colors: any = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    orange: 'text-orange-600 bg-orange-50',
    purple: 'text-purple-600 bg-purple-50',
  };
  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          {title}
        </span>
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon size={16} />
        </div>
      </div>
      <div className="text-2xl font-black">{value}</div>
      <div className="text-[10px] text-gray-500 mt-1">{subValue}</div>
    </div>
  );
}
