# StockIQ Mobile

App **React Native (Expo)** do StockIQ: o mesmo sistema do [frontend web](../frontend), com os **mesmos
endpoints**, as mesmas telas e o mesmo visual (tokens de cor, raios e hierarquia copiados do web, com tema
claro/escuro), pensado para o dia a dia do armazém: conferir estoque, ler código de barras, dar entrada/saída,
transferir de endereço e contar inventário no celular.

| | |
|---|---|
| Stack | Expo SDK 57 · React Native 0.86 · TypeScript · expo-router (rotas por arquivo) |
| API | a mesma do web ([backend](../backend), REST + JWT) — nada novo no servidor |
| Gráficos | `react-native-svg` (linha/área com faixa de incerteza, barras, rosca) — sem lib de gráfico |
| Sessão | JWT no SecureStore (Keychain/Keystore); `localStorage` no navegador |
| Câmera | `expo-camera` (leitor de EAN/UPC/Code128/QR) e `expo-image-picker` |

## Como rodar

```bash
# 1) backend e (opcional) serviço de ML no ar — ver ../backend/README.md e ../machine-learning/README.md
cd backend && npm run prisma:seed && npm run dev

# 2) app
cd mobile
npm install
npx expo start            # abra no Expo Go (QR code), ou: a (Android) / i (iOS) / w (web)
```

**Endereço da API.** O app descobre sozinho: variável `EXPO_PUBLIC_API_URL` (ver `.env.example`) → no Expo Go,
o IP da sua máquina na rede (o celular precisa estar no mesmo Wi‑Fi) → emulador Android `10.0.2.2` → web
`mesmo-host:3001`. Também dá para trocar **na tela de login** (“Servidor da API”) ou em
Configurações → Servidor, sem recompilar. Em *builds* de desenvolvimento o tráfego `http` está liberado
(`usesCleartextTraffic`); em produção use HTTPS.

**Logins de demonstração** (senha `Senha@123`): `admin@stockiq.com`, `supervisor@stockiq.com`,
`operador@stockiq.com`, `visualizador@stockiq.com` — a tela de login tem atalhos para cada um.

## Telas (web → mobile)

Navegação por **abas** (Início · Produtos · Movimentar · Alertas · Mais) + pilha de telas. A aba **Mais** lista
todo o resto, respeitando o perfil (como a sidebar do web).

| Tela do web | Rota no app | O que tem |
|---|---|---|
| Login | `/login` | atalhos de demonstração, servidor da API configurável |
| Dashboard | aba **Início** | KPIs, resumo do dia, gráficos (evolução, curva ABC, categorias), mais movimentados, atividade recente, saúde do estoque, ações rápidas |
| Produtos | aba **Produtos**, `/produtos/[id]`, `/produtos/form` | busca no servidor, filtros (estoque/categoria/status), rolagem infinita, exportar CSV; detalhe com endereços, lotes e histórico; cadastro/edição; excluir |
| Entradas / Saídas / Histórico | `/entradas`, `/saidas`, `/movimentacoes` (+ `/entradas/nova`, `/saidas/nova`, `/movimento`) | resumo do dia, busca, período, CSV; formulário único com as regras do backend (endereço, lote, validade) |
| Lotes | `/lotes` | status por validade, filtros, CSV |
| Endereços | `/enderecos` | mapa por corredor/rua/prateleira, detalhe, reservar/bloquear, criar, remover, transferir |
| Inventário | `/inventario`, `/inventario/novo`, `/inventario/[id]` | criar (completo/parcial/cíclico), iniciar, **contar item a item**, enviar à revisão, concluir |
| Scanner | `/scanner` | câmera ou digitação; mostra estoque/endereços/lotes e atalhos de movimentação |
| Categorias · Marcas · Fornecedores · Clientes | `/categorias` … | CRUD completo |
| IA — Produtos | `/ia` | foto (câmera/galeria); o modelo de visão ainda não existe no backend, e a tela diz isso |
| IA Analítica | `/ia-analitica` | modelo de ML (status e métricas), previsão semanal com faixa de incerteza, matriz ABC×XYZ, sugestões de compra e exportação |
| Relatórios | `/relatorios` | 9 relatórios, período, resumo, prévia e CSV (compartilhar) |
| Alertas | aba **Alertas** | por tipo/categoria, marcar como lido (individual/todos), badge na aba |
| Usuários · Auditoria | `/usuarios`, `/auditoria` | só admin/supervisor; reset de senha, ativar/inativar, antes/depois de cada alteração |
| Configurações | `/configuracoes` | perfil, senha, tema (sistema/claro/escuro), empresa, preferências, servidor/Swagger, perfis de acesso |

### Endpoints usados
Os mesmos do web: `/auth/*`, `/products`, `/categories`, `/brands`, `/suppliers`, `/customers`, `/movements`,
`/lots`, `/warehouse`, `/inventory` (+ `/items/:id/count`), `/alerts`, `/dashboard/*`, `/reports/*`, `/analytics`,
`/settings`, `/users`, `/audit`. Contrato completo no Swagger do backend (`/docs`).

## Estrutura

```
mobile/
├── app/                      # rotas (expo-router)
│   ├── _layout.tsx           #   providers (tema, sessão)
│   ├── login.tsx
│   └── (app)/                #   área logada: guarda de rota + alertas
│       ├── (tabs)/           #     Início, Produtos, Movimentar, Alertas, Mais
│       └── …                 #     demais telas empilhadas
├── src/
│   ├── components/ui/        # Button, Card, Input, Select (bottom sheet), Badge, Sheet, Chips…
│   ├── components/charts/    # LineAreaChart, BarChart, DonutChart (SVG)
│   ├── components/           # MovementForm, ProductPicker, ListScreen, PartnerManager…
│   ├── lib/                  # api, auth, alerts, useFetch/usePaged, reports, permissões, formatação
│   ├── theme/                # tokens (cores do web) + ThemeProvider
│   └── types/                # tipos da API
├── e2e/web-flows.cjs         # fluxos reais contra a API (Playwright no build web)
└── scripts/serve-web.cjs     # servidor estático para o build web
```

## Decisões

* **Regras de negócio ficam na API.** O app só valida o óbvio e mostra a mensagem do servidor. O
  formulário de movimentação segue as regras do backend: produto já endereçado exige endereço de
  origem/destino; produto por lote exige o lote (que acompanha o endereço); lote novo exige fornecedor e datas.
* **Perfis:** botões e menus aparecem conforme `admin / supervisor / operator / viewer`, e telas restritas
  (Usuários, Auditoria) bloqueiam o acesso — a API continua sendo a autoridade (403).
* **Listas grandes** usam paginação no servidor com rolagem infinita; cadastros pequenos carregam tudo (`fetchAll`).
* **CSV:** gerado no aparelho e aberto na folha de compartilhamento (`expo-sharing`); no web baixa o arquivo.
* **Voltar seguro:** se uma tela foi aberta sem histórico (link/recarregar), “voltar” leva à lista correspondente.

## Qualidade

```bash
npm run typecheck     # tsc
npm run lint          # expo lint
npx expo-doctor       # 21/21
npm run export:web    # build web (também valida o bundle)
npm run e2e           # fluxos reais: login, entrada, saída, inventário, CRUD, permissões, logout
```

O bundle nativo foi validado com `expo export --platform android` e `--platform ios`. **Não foi testado em
aparelho/emulador físico** nesta entrega (verificação feita no build web); a câmera e o compartilhamento de
arquivos dependem de dispositivo real.
