import React, { useState } from 'react';
import { Copy, ExternalLink, MessageSquare, Check } from 'lucide-react';
import { toast } from 'sonner';
import useSlugValidation from '@/hooks/useSlugValidation';

interface LinkGeneratorProps {
  catalogUrl: string;
  catalogName: string;
}

const WhatsAppLinkGenerator: React.FC<LinkGeneratorProps> = ({
  catalogUrl,
  catalogName,
}) => {
  const [message, setMessage] = useState(
    `Olá! Tudo bem? 👓\n\nEstou enviando o nosso catálogo atualizado da *${catalogName}*.\n\nConfira as novidades aqui: ${catalogUrl}\n\nQualquer dúvida, estou à disposição!`
  );
  const [copied, setCopied] = useState(false);
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [loadingShort, setLoadingShort] = useState(false);
  const [customCode, setCustomCode] = useState('');
  const [destinationUrl, setDestinationUrl] = useState(catalogUrl || '');
  const availability = useSlugValidation(customCode);

  const waLink = `https://wa.me/?text=${encodeURIComponent(message)}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(waLink);
    setCopied(true);
    toast.success('Link copiado para o WhatsApp!');
    setTimeout(() => setCopied(false), 2000);
  };

  async function ensureShortLink() {
    if (shortUrl) return shortUrl;
    setLoadingShort(true);
    try {
      const res = await fetch('/api/short-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination_url: catalogUrl }),
      });
      const json = await res.json();
      if (json?.short_url) {
        setShortUrl(json.short_url);
        return json.short_url;
      }
    } catch (e) {
      // ignore
    } finally {
      setLoadingShort(false);
    }
    return null;
  }

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mt-8">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <MessageSquare className="text-green-500" size={20} /> Enviar Catálogo
      </h3>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block">
            URL de Destino
          </label>
          <input
            value={destinationUrl}
            onChange={(e) => setDestinationUrl(e.target.value)}
            className="w-full p-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 outline-none"
            placeholder="Cole a URL com filtros aqui (ex: .../catalogo?brand=tommy&tag=bestsellers)"
          />
          <p className="text-[10px] text-slate-400 mt-1 italic">
            Se deixar vazio, será usado o link padrão do catálogo.
          </p>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block">
            Nome do Link Curto (opcional)
          </label>
          <div className="relative">
            <input
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
              className={`w-full p-3 text-sm rounded-lg border transition-colors ${
                availability === 'available'
                  ? 'border-green-500 bg-green-50'
                  : availability === 'taken'
                    ? 'border-red-500 bg-red-50'
                    : 'border-slate-200'
              }`}
              placeholder="EX: PROMO-BOSS"
            />
            <div className="absolute right-3 top-3 text-xs text-slate-400">
              {availability === 'checking' && 'Verificando...'}
              {availability === 'available' && 'Disponível'}
              {availability === 'taken' && 'Em uso'}
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block">
            Mensagem Personalizada
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            className="w-full p-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-green-500 outline-none transition-all"
            placeholder="Digite a mensagem que o cliente receberá..."
          />
          <p className="text-[10px] text-slate-400 mt-1 italic">
            Dica: Use *texto* para negrito e _texto_ para itálico.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={async () => {
              // create short link using destinationUrl and optional customCode
              let s = shortUrl;
              if (!s) {
                setLoadingShort(true);
                try {
                  const res = await fetch('/api/short-links', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      destination_url: destinationUrl || catalogUrl,
                      code: customCode || undefined,
                    }),
                  });
                  const json = await res.json();
                  if (json?.short_url) {
                    s = json.short_url;
                    setShortUrl(s);
                  } else if (json?.error === 'code_taken') {
                    toast.error('Nome já em uso. Escolha outro.');
                    return;
                  }
                } catch (e) {
                  // ignore
                } finally {
                  setLoadingShort(false);
                }
              }

              if (s) {
                const customMsg = message.replace(catalogUrl, s);
                const link = `https://wa.me/?text=${encodeURIComponent(customMsg)}`;
                navigator.clipboard.writeText(link);
                setCopied(true);
                toast.success('Link curto copiado para o WhatsApp!');
                setTimeout(() => setCopied(false), 2000);
                return;
              }

              // fallback
              copyToClipboard();
            }}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-bold transition-all"
          >
            {copied ? (
              <Check size={18} className="text-green-600" />
            ) : (
              <Copy size={18} />
            )}
            {copied ? 'Copiado!' : 'Copiar Link'}
          </button>

          <a
            onClick={async (e) => {
              e.preventDefault();
              // ensure short link created with destinationUrl/customCode
              let s = shortUrl;
              if (!s) {
                setLoadingShort(true);
                try {
                  const res = await fetch('/api/short-links', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      destination_url: destinationUrl || catalogUrl,
                      code: customCode || undefined,
                    }),
                  });
                  const json = await res.json();
                  if (json?.short_url) {
                    s = json.short_url;
                    setShortUrl(s);
                  } else if (json?.error === 'code_taken') {
                    toast.error('Nome já em uso. Escolha outro.');
                    return;
                  }
                } catch (e) {
                  // ignore
                } finally {
                  setLoadingShort(false);
                }
              }
              const usedMsg = s ? message.replace(catalogUrl, s) : message;
              const link = `https://wa.me/?text=${encodeURIComponent(usedMsg)}`;
              window.open(link, '_blank', 'noopener');
            }}
            href="#"
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-all shadow-md shadow-green-200 dark:shadow-none"
          >
            <ExternalLink size={18} /> Abrir no WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppLinkGenerator;
