import { NextResponse } from 'next/server';

export function GET() {
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Callback de Autenticação</title>
    <style>body{font-family:Inter,system-ui,Arial,Helvetica,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0b1220;color:#fff}.card{max-width:520px;padding:24px;border-radius:12px;background:linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01));text-align:center}</style>
  </head>
  <body>
    <div class="card">
      <h3>Processando autenticação...</h3>
      <p class="muted">Você será redirecionado em instantes.</p>
    </div>

    <script>
      (function(){
        try {
          var hash = window.location.hash || '';

          // Se foi aberto como popup, envie a informação para a janela pai e feche
          if (window.opener && window.opener !== window) {
            try {
              window.opener.postMessage({ type: 'supabase.auth.callback', hash: hash }, '*');
            } catch (e) {
              // ignore
            }
            window.close();
            return;
          }

          // Se houver hash com tokens, anexe ao root para que o client possa processar
          if (hash && hash.length > 1) {
            // remove o '#' e redireciona preservando a query/hash após o '/'
            var raw = hash.substring(1);
            // Redireciona para a raiz com o mesmo hash (client deve chamar supabase.auth.getSessionFromUrl)
            window.location.replace('/#' + raw);
            return;
          }

          // Fallback: volta para a raiz
          window.location.replace('/');
        } catch (err) {
          try { window.location.replace('/'); } catch(e){}
        }
      })();
    </script>
  </body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
