# Atualização do Sistema de Status de Pedidos

## Como executar:

1. Abra o painel do Supabase do seu projeto
2. Vá para "SQL Editor" no menu lateral esquerdo
3. Clique em "New Query"
4. Copie e cole o conteúdo do arquivo `direct_supabase_update.sql`
5. Clique em "Run" para executar o script

## O que o script faz:

- **Verifica status atuais**: Mostra quais status existem na tabela antes da atualização
- **Adiciona novos campos**: tracking_code, estimated_delivery, actual_delivery, notes, notification_sent
- **Atualiza constraint de status**: Permite os status: Pendente, Confirmado, Em Preparação, Enviado, Entregue, Cancelado
- **Atualiza pedidos antigos**: Muda pedidos "Pendente" antigos para "Confirmado" ou "Em Preparação"
- **Verifica resultado**: Mostra a contagem de pedidos por status após a atualização

## Status disponíveis após atualização:

- **Pendente**: Pedido recém-criado
- **Confirmado**: Pedido confirmado e pago
- **Em Preparação**: Pedido sendo preparado
- **Enviado**: Pedido enviado para entrega
- **Entregue**: Pedido entregue ao cliente
- **Cancelado**: Pedido cancelado

## Próximos passos após execução:

1. Testar a criação de pedidos para verificar se os novos campos funcionam
2. Implementar a interface de atualização de status no dashboard
3. Integrar notificações quando o status mudar
