'use client';

import React, { useEffect, useState } from 'react';
import { MessageCircle, Copy, Check, ExternalLink, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface WhatsAppLinkGeneratorProps {
  catalogUrl: string;
  catalogName?: string;
  imageUrl?: string;
}

export default function WhatsAppLinkGenerator({
  catalogUrl,
  catalogName,
  imageUrl,
  message: messageProp,
  onMessageChange,
  onCreated,
}: WhatsAppLinkGeneratorProps & {
  message?: string;
  onMessageChange?: (m: string) => void;
  onCreated?: (shortUrl?: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [destinationUrl, setDestinationUrl] = useState<string>(
    catalogUrl || ''
  );
  const [customCode, setCustomCode] = useState('');
  const [codeAvailable, setCodeAvailable] = useState<boolean | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);
  const [useShortLink, setUseShortLink] = useState(true);
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [loadingShort, setLoadingShort] = useState(false);

  const [localMessage, setLocalMessage] = useState<string>(() =>
    [
      'Olá! Tudo bem? 👋',
      '',
      'Estou enviando o nosso catálogo virtual atualizado com as últimas novidades e tendências! 🚀',
      '',
      `📲 Acesse aqui: ${destinationUrl || catalogUrl}`,
      '',
      '⚠️ *OBS:* Os preços estão bloqueados por segurança. Para visualizar os valores, basta me solicitar a **senha de acesso** por aqui mesmo.',
      '',
      '📦 Qualquer dúvida, estou à disposição!'
    ].join('\n')
  );
  const message = messageProp ?? localMessage;

  const encodedMessage = encodeURIComponent(message);
  const waLink = `https://wa.me/?text=${encodedMessage}`;
  // clean image URL (remove cache-bust query) before sending to short-link
  const cleanImageUrl = imageUrl ? String(imageUrl).split('?')[0] : undefined;

  const handleCopy = async (text?: string) => {
    try {
      await navigator.clipboard.writeText(text || message);
      setCopied(true);
      toast.success('Link e mensagem copiados!');
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('copy error', e);
      toast.error('Não foi possível copiar');
    }
  };

  return (
    <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-6 rounded-[2rem] text-white shadow-lg shadow-emerald-200 dark:shadow-none relative overflow-hidden group">
      <Zap className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 -rotate-12 group-hover:rotate-0 transition-transform duration-500" />

      <div className="relative z-10 space-y-4">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
            <MessageCircle size={24} />
          </div>

          <div className="flex-1">
            <h4 className="font-black uppercase tracking-widest text-sm mb-2">
              Compartilhamento Rápido
            </h4>

            <label className="text-xs font-semibold text-white/80 uppercase">
              Mensagem (editável)
            </label>
            <textarea
              value={message}
              onChange={(e) => {
                const v = e.target.value;
                if (onMessageChange) onMessageChange(v);
                else setLocalMessage(v);
              }}
              rows={8}
              className="w-full mt-2 p-4 rounded-lg text-sm bg-white/10 text-white min-h-[160px]"
            />
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-2xl font-black leading-tight">
            Envie seu catálogo pelo WhatsApp
          </p>
          <p className="text-white/80 text-xs font-medium">
            Use o link direto para converter mais vendas.
          </p>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-semibold text-white/80 uppercase">
            URL de destino (opcional)
          </label>
          <div className="flex flex-col gap-2">
            <input
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              className="w-full p-2 rounded-lg text-sm bg-white/10 placeholder-white/60"
              placeholder={catalogUrl}
            />

            <input
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value)}
              className="w-full p-2 rounded-lg text-sm bg-white/10 placeholder-white/60"
              placeholder="slug personalizado (ex: meu-link)"
            />
              <div className="flex items-center gap-3">
                <div className="text-xs text-white/80">Verificar disponibilidade:</div>
                <div className="text-xs font-mono">{checkingCode ? 'Verificando...' : codeAvailable === null ? '—' : codeAvailable ? 'Disponível' : 'Indisponível'}</div>
              </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-white/90">
                <input type="checkbox" checked={useShortLink} onChange={(e) => setUseShortLink(e.target.checked)} className="w-4 h-4" />
                Usar link curto no compartilhamento
              </label>

              <button
              onClick={async () => {
                setLoadingShort(true);
                try {
                  const final = destinationUrl || catalogUrl;

                  // If there's an image provided, create a marketing entry
                  // using the CLEAN URL (no ?v=) so crawlers pick a stable URL.
                  let marketingImage: string | undefined = cleanImageUrl || undefined;
                  if (cleanImageUrl) {
                    try {
                      const mk = await fetch('/api/marketing-links', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ image_url: cleanImageUrl }),
                      });
                      const mkj = await mk.json();
                      if (mk.ok && mkj?.data?.image_url) {
                        marketingImage = mkj.data.image_url || marketingImage;
                      }
                    } catch (e) {
                      console.warn('Failed to create marketing entry', e);
                    }
                  }

                  const res = await fetch('/api/short-links', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      destination_url: final,
                      code: customCode || undefined,
                      image_url: marketingImage || cleanImageUrl || undefined,
                    }),
                  });
                  const json = await res.json();
                  if (!res.ok) {
                    const errMsg = json?.error || 'Falha ao criar link curto';
                    toast.error(errMsg);
                  } else if (json?.short_url) {
                    setShortUrl(json.short_url);
                    toast.success('Link curto criado!');
                    // when created replace destination in message only if user opted in
                    if (useShortLink) {
                      // Replace the first full URL found in the message with the short URL.
                      // This avoids partial replacements that leave the original slug appended.
                      const urlRegex = /\bhttps?:\/\/[^\x20)]+/i;
                      let updated = message;
                      if (urlRegex.test(message)) {
                        updated = message.replace(urlRegex, json.short_url);
                      } else {
                        // Fallback: try to replace the explicit destination/canonical URL (may omit trailing slug)
                        const original = (destinationUrl || catalogUrl || '').trim();
                        if (original) {
                          const esc = original.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
                          const fuzzy = new RegExp(esc + '(\\/[^\\s]*)?');
                          updated = message.replace(fuzzy, json.short_url);
                        }
                      }
                      if (onMessageChange) onMessageChange(updated);
                      else setLocalMessage(updated);
                    }
                    if (onCreated) onCreated(json.short_url);
                  }
                } catch (err) {
                  console.error('Erro criando short link:', err);
                  toast.error('Erro ao criar link curto.');
                } finally {
                  setLoadingShort(false);
                }
              }}
              className="w-full px-4 py-2 bg-white text-emerald-600 rounded-lg font-bold"
            >
              {loadingShort ? 'Criando...' : 'Criar link curto'}
            </button>
              </div>
          </div>

          {/* availability check (debounced) */}
          <CodeAvailabilityChecker
            code={customCode}
            onChecking={(v: boolean) => setCheckingCode(v)}
            onResult={(avail: boolean | null) => setCodeAvailable(avail)}
          />

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open(waLink, '_blank')}
              className="flex-1 bg-white text-emerald-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-50 transition-all active:scale-95"
            >
              <ExternalLink size={16} /> Abrir Whats
            </button>

            <button
              onClick={() => {
                const text = shortUrl
                  ? message.replace(destinationUrl || catalogUrl, shortUrl)
                  : message;
                handleCopy(text);
              }}
              className="flex-1 bg-emerald-700/30 border border-white/20 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-700/50 transition-all"
            >
              {copied ? (
                <>
                  <Check size={16} /> Copiado
                </>
              ) : (
                <>
                  <Copy size={16} /> Copiar Link
                </>
              )}
            </button>
          </div>

          {shortUrl && (
            <div className="bg-black/10 rounded-xl p-3 border border-white/5">
              <p className="text-[10px] font-mono opacity-70 break-all line-clamp-1">
                {shortUrl}
              </p>
            </div>
          )}
        </div>

        <div className="bg-black/10 rounded-xl p-3 border border-white/5">
          <p className="text-[10px] font-mono opacity-70 break-all line-clamp-1">
            {catalogUrl}
          </p>
        </div>
      </div>
    </div>
  );
}

// Debounced availability checker as a small internal component
function CodeAvailabilityChecker({
  code,
  onChecking,
  onResult,
}: {
  code: string;
  onChecking: (v: boolean) => void;
  onResult: (v: boolean | null) => void;
}) {
  useEffect(() => {
    let mounted = true;
    let t: any = null;
    const check = async (c: string) => {
      if (!mounted) return;
      onChecking(true);
      try {
        if (!c || c.trim() === '') {
          onResult(null);
          return;
        }
        const url = `/api/short-links?code=${encodeURIComponent(
          c.trim()
        )}`;
        const res = await fetch(url);
        const json = await res.json();
        if (!mounted) return;
        onResult(json?.exists ? false : true);
      } catch (e) {
        console.warn('code check failed', e);
        if (mounted) onResult(null);
      } finally {
        if (mounted) onChecking(false);
      }
    };

    // debounce 500ms
    t = setTimeout(() => void check(code), 500);
    return () => {
      mounted = false;
      clearTimeout(t);
    };
  }, [code, onChecking, onResult]);

  return null;
}
