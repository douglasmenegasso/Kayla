#  Histórico de Alterações - Kayla App

## 🚀 Versão 5.0.0 (Modularização e Sistema de Assinatura)

### ️ Refatoração de Arquitetura
- **Modularização do Código**: O arquivo monolítico `kayla.html` foi separado em uma estrutura de módulos JavaScript para facilitar a manutenção e evitar quebras durante edições.
- **Nova Estrutura de Pastas**:
  - `index.html`: Contém apenas a estrutura HTML e o CSS.
  - `js/`: Pasta contendo todos os scripts separados por responsabilidade.
    - `config.js`: Variáveis globais, configuração do Supabase e limites.
    - `utils.js`: Funções auxiliares (toast, modal, badges, localStorage).
    - `auth.js`: Autenticação, login, logout e sincronização de dados.
    - `clients.js`: CRUD de clientes.
    - `products.js`: CRUD de produtos (incluindo edição que antes estava "Em breve").
    - `sales.js`: Fluxo de vendas, scanner, carrinho e seleção de produtos.
    - `orders.js`: Gestão de pedidos, devoluções e tela de histórico.
    - `payments.js`: Seleção de planos e ativação de keys PRO.
    - `devices.js`: Geração de ID de dispositivo e gerenciamento (remoção).
    - `pdf.js`: Geração de PDF dos pedidos.
    - `main.js`: Navegação entre abas, tela de configurações e inicialização do app.

###  Correções de Bugs
- **Erro ao Editar Cliente/Produto**: Corrigido o erro `400 Bad Request` causado pelo envio do campo `updated_at` que não existia na tabela.
- **Edição de Produtos**: A função `editarProduto()`, que antes apenas mostrava um toast "Em breve", foi totalmente implementada com modal e salvamento no banco.
- **Escopo de Funções**: A função `abrirLogin()` foi movida para o escopo global correto para evitar o erro `ReferenceError: abrirLogin is not defined`.

### ✨ Novas Funcionalidades
- **Sistema de Assinatura (PRO)**:
  - Integração com Edge Functions do Supabase (`validate-key` e `remove-device`).
  - Controle de dispositivos simultâneos por key.
  - Tela de escolha de planos (Mensal, Trimestral, Semestral, Anual).
  - Badges visuais de status (GRÁTIS/PRO) e conexão (ONLINE/OFFLINE).
- **Gerenciamento de Dispositivos**: Tela nas configurações para visualizar e remover o dispositivo atual, liberando slot para novas ativações.

### 📝 Observações Técnicas
- **CORS**: As Edge Functions foram configuradas com headers `Access-Control-Allow-Origin: *` para permitir requisições do GitHub Pages.
- **JWT**: A verificação JWT legacy foi desativada nas Edge Functions para permitir chamadas públicas de validação de key.
- **Versão**: Atualizada de `v4.4.0` para `v5.0.0`.

---
*Última atualização: Junho de 2026*
# 📋 HISTÓRICO DE VERSIONAMENTO - KAYLA CONSIGNADO

> Registro completo de todas as versões, mudanças e correções do sistema.

---

## 📊 Visão Geral

| Item | Informação |
|------|------------|
| **Nome atual** | Kayla - Venda Consignada |
| **Nome anterior** | MyPulse / Venda Consignada |
| **Versão atual** | v4.4.0 |
| **Data de lançamento** | 2026-06-04 |
| **Plataforma** | PWA (Progressive Web App) |
| **Hospedagem** | GitHub Pages |
| **Backend** | Supabase |
| **Desenvolvedor** | Douglas Menegasso |

---

## 📦 Versões Lançadas

### 🔷 v4.4.0 - 2026-06-04
**Status:** ✅ Atual  
**Build:** 20260604-002

#### Correções:
- [x] Modal "Já na Lista" com botões +/- funcionando corretamente
- [x] Correção erro DB: fallback para pedidos sem campo itens_json
- [x] Dados da empresa movidos para tela separada (modal)
- [x] Campo e-mail para notificações adicionado
- [x] Banner de atualização funcional (verifica version.json)
- [x] Botão suporte WhatsApp Free e Pro com mensagens diferentes
- [x] Prevenção de busca Google ao tocar em títulos (user-select: none)
- [x] Back button Android com duplo toque para sair
- [x] Nome do app atualizado para "Kayla - Venda Consignada"

#### Melhorias:
- [x] Gerador de Keys separado (pasta gerador-keys/)
- [x] Sistema de validação de keys independente
- [x] Exportação/importação de keys
- [x] Envio de key por e-mail automático
- [x] Interface de gerenciamento de keys

#### Arquivos Criados:
- [x] `gerador-keys/index.html` - Sistema de gerador de keys
- [x] `gerador-keys/README.md` - Documentação do gerador

---

### 🔷 v4.3.1 - 2026-06-04
**Status:** ✅ Estável

#### Correções:
- [x] Modal duplicado com +/- para quantidade
- [x] Nome alterado para "Kayla - Venda Consignada"
- [x] Correção erro ao finalizar pedido (campo itens_json)
- [x] CRUD completo de clientes (editar/excluir)
- [x] Back button Android com duplo toque

---

### 🔷 v4.3.0 - 2026-06-04
**Status:** ✅ Estável

#### Implementações:
- [x] Interface de venda estilo modal com busca
- [x] Sistema de devolução de produtos
- [x] Histórico completo com devolvidos
- [x] Backup local (exportar/importar)
- [x] Logo armazenada localmente
- [x] Funcionamento offline
- [x] Sincronização ao reconectar (Pro)
- [x] Botão WhatsApp suporte (41996427444)
- [x] Badge ONLINE/OFFLINE

---

### 🔷 v4.2.0 - 2026-06-04
**Status:** ✅ Estável

#### Implementações:
- [x] PDF personalizado com logo da empresa
- [x] Configurações da empresa (nome, CNPJ, telefone, endereço)
- [x] Upload de logo (PNG/JPG até 2MB)
- [x] Histórico de compras do cliente
- [x] Aviso quando cliente já comprou produto
- [x] Lista de produtos para seleção manual

---

### 🔷 v4.1.5 - 2026-06-04
**Status:** ✅ Estável

#### Correções:
- [x] Fluxo de venda: selecionar cliente primeiro
- [x] Campo código manual + botão Buscar
- [x] Scanner pausa/retoma corretamente
- [x] Produto duplicado avisa e pergunta quantidade
- [x] Lista do pedido com quantidade, preço e total
- [x] Botão Finalizar cria pedido no Supabase

---

### 🔷 v4.1.4 - 2026-06-04
**Status:** ✅ Estável

#### Implementações:
- [x] Login com e-mail/senha (Supabase)
- [x] Perfis Admin e Usuário
- [x] Limites Freemium (3 clientes, 20 produtos)
- [x] Paywall com comparativo Grátis vs Pro
- [x] Ativação por chave PRO-XXXX-XXXX-XXXX
- [x] Badge GRÁTIS/PRO no cabeçalho

---

## 🗺️ Roadmap - Próximas Versões

### 🔮 v4.5.0 - Sistema de Pagamentos
- [ ] Integração com Asaas ou Kiwify
- [ ] Webhook de liberação automática de key
- [ ] Verificação de status de assinatura
- [ ] Planos mensais e anuais

### 🔮 v4.6.0 - APK Mobile
- [ ] Conversão para APK usando PWA Builder
- [ ] Publicação na Google Play Store
- [ ] Notificações push

###  v4.7.0 - Multi-tenant
- [ ] Suporte a múltiplas lojas
- [ ] Dashboard administrativo
- [ ] Relatórios avançados

---

## 📝 Estrutura de Arquivos
