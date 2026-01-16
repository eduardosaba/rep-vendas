'use client';

import React, { useEffect, useState } from 'react';
import {
  Zap,
  Copy,
  RefreshCw,
  PlusCircle,
  UserPlus,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function RecentActivityFeed() {
  const [logs, setLogs] = useState<any[]>([]);
  const supabase = createClient();

  const fetchLogs = async () => {
    try {
      const { data } = await supabase
        .from('activity_logs')
        .select('*, profiles(id, full_name)')
        .order('created_at', { ascending: false })
        .limit(10);
      if (data) setLogs(data as any[]);
    } catch (err) {
      console.error('fetchLogs error', err);
    }
  };

  useEffect(() => {
    fetchLogs();

    const channel = supabase
      .channel('realtime-activity-logs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_logs' },
        (payload) => {
          // prepend new log for instant UI feedback
          const newRow = payload.new;
          setLogs((prev) => [newRow, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        // ignore
      }
    };
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'CLONE':
        return <Copy className="text-blue-500" size={16} />;
      case 'PRICE_UPDATE':
        return <RefreshCw className="text-amber-500" size={16} />;
      case 'NEW_PRODUCT':
        return <PlusCircle className="text-green-500" size={16} />;
      case 'LOGIN':
        return <UserPlus className="text-purple-500" size={16} />;
      default:
        return <Zap className="text-gray-400" size={16} />;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-slate-800 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-black text-xl uppercase tracking-tighter flex items-center gap-2">
          <Clock className="text-indigo-600" size={20} />
          Atividade Recente
        </h3>
        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-full uppercase">
          Live
        </span>
      </div>

      <div className="space-y-6 flex-1 overflow-y-auto pr-2">
        {logs.map((log) => (
          <div key={log.id} className="flex gap-4 group cursor-default">
            <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
              {getIcon(log.action_type)}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate leading-tight">
                {log.description}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-black text-indigo-400 uppercase">
                  {log.profiles?.full_name || 'Sistema'}
                </span>
                <span className="text-[10px] text-gray-300">•</span>
                <span className="text-[10px] text-gray-400 font-medium lowercase">
                  {formatDistanceToNow(new Date(log.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              </div>
            </div>

            <div className="opacity-0 group-hover:opacity-100 transition-opacity self-center">
              <ChevronRight size={16} className="text-gray-300" />
            </div>
          </div>
        ))}
      </div>

      <button className="w-full mt-6 py-3 border-t border-gray-50 dark:border-slate-800 text-[10px] font-black uppercase text-gray-400 hover:text-indigo-600 transition-colors">
        Ver Histórico Completo
      </button>
    </div>
  );
}
