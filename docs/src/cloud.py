from lib import Doc, svg, box, arrow, text, sequence
import json
from pathlib import Path

tests = json.loads((Path(__file__).parent / "data" / "tests.json").read_text())
T = {s["file"]: s["tests"] for s in tests["suites"]}

d = Doc("Computação em Nuvem II — Documentação", "StockIQ · Computação em Nuvem II",
        "Nuvem<br>AWS S3 e SQS", "Documentação do que o StockIQ já usa de nuvem: armazenamento de fotos no S3, mensageria com SQS para o inventário, configuração, segurança, evidências e pendências.",
        ["Amazon S3", "Amazon SQS", "IAM", "Node.js · TypeScript", "PostgreSQL"], "StockIQ-Computacao-em-Nuvem.pdf")

# ── 01 ───────────────────────────────────────────────────────────────────────
d.section("01", "Visão geral e situação atual", "O que está pronto, o que falta")
d.p("O StockIQ foi desenhado para rodar na AWS. Este documento descreve a parte de nuvem que **já está implementada no código** — o armazenamento de objetos (S3) e a mensageria assíncrona (SQS) —, sua configuração, segurança e as verificações realizadas.")
d.kpis([("2", "serviços AWS no código"), ("1", "fila + DLQ"), (f"{tests['total']}", "testes passando"), ("22", "suítes de teste")])
d.table(["Componente", "Papel no sistema", "Situação"], [
    ["Amazon S3", "Fotos de produtos (upload pelo front-end, via API)", ("tag", "ok", "Implementado")],
    ["Amazon SQS", "Fila de processamento do ajuste de estoque do inventário", ("tag", "ok", "Implementado · worker e DLQ")],
    ["IAM", "Permissões mínimas para S3 e SQS", ("tag", "ok", "Políticas mínimas definidas")],
    ["EC2 · Application Load Balancer", "Hospedar API e front-end com balanceamento", ("tag", "gray", "Planejado")],
    ["RDS / PostgreSQL em EC2", "Banco de dados em nuvem", ("tag", "gray", "Planejado (hoje: PostgreSQL local)")],
    ["CloudWatch", "Métricas e logs centralizados", ("tag", "gray", "Planejado")],
], ["", "", ""])

# ── 02 ───────────────────────────────────────────────────────────────────────
d.section("02", "Arquitetura", "Visão da nuvem e fluxo geral")
d.p("A API (Node.js/Express) é o único componente que fala com a AWS: o navegador nunca recebe credenciais. Fotos vão do navegador para a API e daí para o S3; o ajuste de estoque do inventário é publicado no SQS e executado por um worker.")
b = []
b.append(box(10, 10, 130, 44, "Navegador", "Next.js · app mobile", "slate"))
b.append(box(200, 10, 150, 44, "API StockIQ", "Express · TypeScript", "blue"))
b.append(box(410, 10, 130, 44, "PostgreSQL", "dados operacionais", "violet"))
b.append(arrow(140, 32, 200, 32, "HTTPS"))
b.append(arrow(350, 32, 410, 32, "Prisma"))
b.append(box(200, 110, 150, 44, "Amazon S3", "fotos de produtos", "green"))
b.append(box(410, 110, 130, 44, "Amazon SQS", "fila de inventário", "amber"))
b.append(box(410, 190, 130, 40, "DLQ", "falhas após N tentativas", "red"))
b.append(box(200, 190, 150, 44, "Worker", "ajusta o estoque", "cyan"))
b.append(arrow(275, 54, 275, 110, "PutObject / URL assinada", dx=62))
b.append(arrow(350, 40, 440, 110, "publica job", dx=44, dy=10))
b.append(arrow(410, 150, 350, 200, "consome"))
b.append(arrow(475, 154, 475, 190, "redrive"))
b.append(arrow(275, 234, 275, 262, "", dashed=True))
b.append(box(200, 262, 150, 26, "PostgreSQL", "", "violet", size=9.5))
b.append(box(10, 110, 150, 44, "EC2 · ALB · RDS", "alvo de implantação", "slate"))
b.append(text(85, 172, "planejado, não provisionado", 8))
d.figure(svg(560, 300, "".join(b)), "Componentes de nuvem do StockIQ (verde/âmbar: implementado no código; cinza: planejado)")

# ── 03 S3 ────────────────────────────────────────────────────────────────────
d.section("03", "Armazenamento de objetos (Amazon S3)", "Upload de fotos de produto", newpage=True)
d.p("O produto tem uma foto opcional. O arquivo é enviado ao endpoint `POST /api/products/:id/image` (campo multipart `image`); a API valida, grava no S3 e guarda apenas a **chave** do objeto no banco (`products.imageKey`). As respostas trazem `imageUrl` como **URL assinada temporária** (1 h por padrão), de modo que o bucket pode permanecer privado.")
d.figure(sequence(["Navegador", "API", "StorageService", "Amazon S3", "PostgreSQL"], [
    (0, 1, "POST /products/:id/image", "call"),
    (1, 1, "JWT · papel · multer (≤ 5 MB)", "self"),
    (1, 2, "setImage(buffer)", "call"),
    (2, 2, "confere o tipo pelos bytes", "self"),
    (2, 3, "PutObject (nova chave UUID)", "call"),
    (2, 4, "UPDATE imageKey", "call"),
    (2, 3, "DeleteObject (foto antiga)", "call"),
    (1, 0, "200 + imageUrl assinada", "ret"),
    (0, 3, "GET URL assinada (<img>)", "call"),
], colors=["slate", "blue", "cyan", "green", "violet"], width=640, step=30), "Fluxo de upload de foto")
d.h3("Decisões de projeto")
d.table(["Tema", "Como é feito", "Por quê"], [
    ["Chave do objeto", "`<prefixo>products/<idProduto>/<uuid>.<ext>`", "UUID por envio: o conteúdo nunca muda (cache seguro) e não há colisão"],
    ["Prefixo", "`STORAGE_KEY_PREFIX` (padrão `stockiq/`)", "Isola o projeto quando o bucket é compartilhado"],
    ["Validação", "JPEG, PNG, WebP ou GIF; tipo conferido pelos primeiros bytes; SVG recusado; limite `STORAGE_MAX_IMAGE_MB` (5)", "O tipo declarado pelo cliente não é confiável; SVG pode conter script"],
    ["Acesso", "URL pré-assinada (`GetObject`), validade `STORAGE_URL_TTL_SECONDS`", "Bucket privado; links expiram"],
    ["Consistência", "Sobe o novo → grava no banco (se falhar, apaga o novo) → só então apaga o antigo", "Nunca fica um produto apontando para objeto inexistente"],
    ["Órfãos", "`npm run storage:cleanup` remove objetos sem produto, após `STORAGE_ORPHAN_GRACE_DAYS` (7)", "Cobre quedas entre o upload e a gravação no banco"],
    ["Auditoria", "URLs assinadas são removidas do log de auditoria", "Um link assinado funciona como senha temporária"],
], ["", "", ""])
d.h3("Configuração")
d.table(["Variável", "Descrição"], [
    ["`STORAGE_DRIVER`", "`s3` (AWS) ou `local` (pasta em disco, só desenvolvimento)"],
    ["`S3_BUCKET` · `S3_REGION`", "Bucket e região do S3"],
    ["`S3_ACCESS_KEY_ID` · `S3_SECRET_ACCESS_KEY`", "Credenciais do usuário IAM (somente no `.env`, nunca versionadas)"],
    ["`S3_SESSION_TOKEN`", "Opcional: credenciais temporárias (ex.: AWS Academy)"],
    ["`S3_ENDPOINT` · `S3_FORCE_PATH_STYLE`", "Opcionais: S3 compatível (MinIO etc.)"],
    ["`STORAGE_SIGNING_SECRET` · `STORAGE_LOCAL_DIR`", "Driver local: segredo que assina as URLs de `/api/files` e pasta das fotos"],
], ["", ""])
d.h3("Política IAM mínima")
d.code('''{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow", "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::SEU-BUCKET/stockiq/*" },
    { "Effect": "Allow", "Action": "s3:ListBucket", "Resource": "arn:aws:s3:::SEU-BUCKET",
      "Condition": { "StringLike": { "s3:prefix": "stockiq/*" } } }
  ]
}''')
d.note("Credenciais", "As chaves de acesso ficam apenas no `.env` do backend (ignorado pelo Git). Use um usuário/role exclusivo do projeto com a política acima e troque a chave se ela for exposta.", "warn")

# ── 04 SQS ───────────────────────────────────────────────────────────────────
d.section("04", "Mensageria (Amazon SQS)", "Ajuste de estoque do inventário", newpage=True)
d.p("Concluir um inventário exige aplicar ao estoque cada divergência contada — uma operação por item, que pode ser grande. Para que a requisição HTTP não espere por esse trabalho (nem concorra com as demais requisições), a conclusão **grava o estado `pending` e publica uma mensagem na fila**; um **worker** consome a mensagem e faz os ajustes em lotes. A API responde imediatamente e a tela acompanha o progresso.")
f = []
f.append(box(10, 20, 110, 46, "Tela de", "inventário", "slate"))
f.append(box(170, 20, 120, 46, "API", "PATCH status=completed", "blue"))
f.append(box(340, 20, 120, 46, "PostgreSQL", "jobStatus = pending", "violet"))
f.append(arrow(120, 43, 170, 43, "1")); f.append(arrow(290, 43, 340, 43, "2 grava"))
f.append(box(170, 120, 120, 46, "Amazon SQS", "stockiq-inventory", "amber"))
f.append(arrow(230, 66, 230, 120, "3 publica", dx=30))
f.append(box(340, 120, 120, 46, "Worker", "long polling", "cyan"))
f.append(arrow(290, 143, 340, 143, "4 consome"))
f.append(box(340, 215, 120, 46, "PostgreSQL", "movimentações + estoque", "violet"))
f.append(arrow(400, 166, 400, 215, "5 ajusta lote a lote", dx=58))
f.append(box(10, 215, 130, 46, "DLQ", "após 3 falhas", "red"))
f.append(arrow(190, 166, 90, 215, "redrive", dx=-20, dy=-2))
f.append(arrow(340, 200, 300, 200, "", dashed=True, color="#0891b2"))
f.append(text(230, 215, "6 tela consulta o progresso (polling 3 s)", 8.5, "#0891b2", "middle"))
d.figure(svg(480, 275, "".join(f)), "Fluxo assíncrono do inventário")
d.h3("Estados do job")
s = []
s.append(box(10, 40, 90, 34, "pending", "na fila", "slate", 10))
s.append(box(150, 40, 100, 34, "processing", "worker ativo", "blue", 10))
s.append(box(310, 0, 110, 34, "completed", "tudo ajustado", "green", 10))
s.append(box(310, 42, 110, 34, "partial", "itens manuais", "amber", 10))
s.append(box(310, 84, 110, 34, "failed", "erro/tentativas", "red", 10))
s.append(arrow(100, 57, 150, 57)); s.append(arrow(250, 52, 310, 17)); s.append(arrow(250, 57, 310, 59)); s.append(arrow(250, 62, 310, 101))
s.append(f'<path d="M365 118 v16 H55 V74" fill="none" stroke="#64748b" stroke-width="1.3" stroke-dasharray="4 3" marker-end="url(#ar)"/>')
s.append(text(210, 130, "reprocessar (POST /api/inventory/:id/reprocess)", 8.5))
d.figure(svg(440, 140, "".join(s)), "Máquina de estados do processamento do inventário")
d.h3("Garantias e tratamento de falhas")
d.table(["Situação", "O que acontece"], [
    ["Mensagem entregue mais de uma vez (SQS entrega *pelo menos uma vez*)", "O processamento é **idempotente**: cada item só é ajustado se `adjustedAt` for nulo, e essa marca é gravada na mesma transação da movimentação"],
    ["Erro de regra em um item (ex.: produto em vários endereços ou lotes)", "O item vira pendência manual (`adjustmentError`); o job termina como `partial` e não trava os demais"],
    ["Erro inesperado (ex.: banco fora do ar)", "A mensagem **não** é apagada: reaparece após o prazo de visibilidade e é tentada de novo"],
    ["Tentativas esgotadas (`QUEUE_MAX_RECEIVES` = 3)", "O job vira `failed` (visível na tela) e a fila move a mensagem para a **DLQ**"],
    ["Mensagem malformada", "É descartada para não bloquear a fila"],
    ["Fila indisponível ao concluir", "A conclusão fica salva; o job é marcado `failed` e pode ser reprocessado"],
    ["Worker cai no meio do job", "A mensagem volta à fila; itens já ajustados são ignorados"],
], ["", ""])
d.h3("Onde roda o worker")
d.p("Por padrão a própria API consome a fila (`QUEUE_WORKER=embedded`), o que simplifica o desenvolvimento. Em produção, o worker deve rodar em **processo separado** (`npm run worker`), com `QUEUE_WORKER=off` na API — assim o processamento pesado não compete com as requisições e pode ser escalado com vários consumidores concorrentes.")
d.h3("Configuração")
d.table(["Variável", "Descrição"], [
    ["`QUEUE_DRIVER`", "`sqs` ou `local` (fila em memória: só desenvolvimento/testes)"],
    ["`SQS_INVENTORY_QUEUE_URL`", "URL da fila (impressa por `npm run queues:setup`)"],
    ["`SQS_REGION` · `SQS_ACCESS_KEY_ID` · `SQS_SECRET_ACCESS_KEY` · `SQS_SESSION_TOKEN`", "Por padrão reaproveitam as variáveis `S3_*`"],
    ["`QUEUE_VISIBILITY_TIMEOUT_SECONDS` (120) · `QUEUE_MAX_RECEIVES` (3)", "Prazo de visibilidade e tentativas antes da DLQ (igual ao `maxReceiveCount` da fila)"],
    ["`QUEUE_WORKER` · `INVENTORY_BATCH_SIZE` (25)", "Onde roda o worker e itens por lote (o progresso é atualizado a cada lote)"],
    ["`SQS_QUEUE_PREFIX` (stockiq)", "Nome das filas: `<prefixo>-inventory` e `<prefixo>-inventory-dlq`"],
], ["", ""])
d.p("`npm run queues:setup` cria a fila principal (long polling de 10 s, redrive para a DLQ) e a DLQ (retenção de 14 dias), de forma idempotente, e imprime as variáveis a copiar para o `.env`.")
d.h3("Permissões IAM")
d.table(["Quem", "Ações SQS necessárias"], [
    ["Aplicação (API e worker)", "`sqs:SendMessage` · `sqs:ReceiveMessage` · `sqs:DeleteMessage` · `sqs:GetQueueAttributes` na fila de inventário"],
    ["Setup único (`queues:setup`)", "`sqs:CreateQueue` · `sqs:GetQueueUrl` · `sqs:GetQueueAttributes` · `sqs:SetQueueAttributes`"],
], ["", ""])

# ── 05 Segurança ─────────────────────────────────────────────────────────────
d.section("05", "Segurança", "Credenciais, acesso e dados")
d.table(["Ponto", "Prática adotada"], [
    ["Credenciais", "Somente no `.env` (no `.gitignore`); o código lê variáveis de ambiente e nunca as imprime. Em produção, prefira *role* da instância (EC2) em vez de chaves"],
    ["Menor privilégio", "Políticas por prefixo (`stockiq/*`) e por fila; separar o usuário do setup do usuário da aplicação"],
    ["Credenciais temporárias", "Suporte a `*_SESSION_TOKEN` (AWS Academy / STS)"],
    ["Acesso às fotos", "Bucket privado + URL assinada com validade curta; nenhuma URL assinada é gravada na auditoria"],
    ["Upload", "Autenticação JWT, papel admin/supervisor, limite de tamanho, tipo conferido pelo conteúdo, SVG recusado"],
    ["Mensagens", "Corpo validado por schema (Zod); mensagens inválidas são descartadas; o usuário solicitante vem na mensagem para a trilha de movimentação"],
], ["", ""])

# ── 06 Operação ──────────────────────────────────────────────────────────────
d.section("06", "Operação e execução", "Como rodar e como implantar", newpage=True)
d.h3("Desenvolvimento local (sem depender da AWS)")
d.code('''# banco descartável e fila SQS compatível
docker run -d --rm -p 127.0.0.1:55432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=stockiq_test postgres:16
docker run -d --rm -p 127.0.0.1:9324:9324 softwaremill/elasticmq-native

cd backend
npx prisma migrate deploy                 # aplica as 5 migrations
QUEUE_DRIVER=local npm run dev            # API + worker embutido (fila em memória)''')
d.h3("Com a fila na AWS")
d.code('''npm run queues:setup                      # cria fila + DLQ e imprime as variáveis
# copie QUEUE_DRIVER=sqs e SQS_INVENTORY_QUEUE_URL para o .env
npm run worker                            # processo dedicado ao consumo (QUEUE_WORKER=off na API)''')
d.h3("Implantação-alvo")
d.ul(["API e worker em instâncias EC2 (processos separados, ambos com a *role* IAM do projeto);",
      "front-end Next.js em instância própria atrás do Application Load Balancer (HTTPS via ACM);",
      "PostgreSQL em RDS ou EC2 em subnet privada; apenas o ALB é público;",
      "CloudWatch para métricas da fila (mensagens visíveis, idade da mais antiga, DLQ) e logs do worker."], ordered=True)

# ── 07 Evidências ────────────────────────────────────────────────────────────
d.section("07", "Testes e evidências", "O que foi executado e com qual resultado")
d.p(f"Verificação feita em 19/10/2026 contra um PostgreSQL 16 descartável em Docker (separado do banco de desenvolvimento) e um servidor SQS compatível (ElasticMQ). Resultado da suíte completa: **{tests['passed']} de {tests['total']} testes passando em {len(T)} suítes**.")
d.table(["Verificação", "Como foi feita", "Resultado"], [
    ["Migrations do zero", "`prisma migrate deploy` em banco vazio (5 migrations)", ("tag", "ok", "Aplicadas")],
    ["Driver S3", f"Comandos `PutObject`/`DeleteObject`/listagem simulados; URL pré-assinada gerada localmente ({T['storage-service.test.ts']} testes)", ("tag", "ok", "Passou")],
    ["Fluxo de upload de foto", f"Ordem upload → banco → remoção da antiga, falha de banco, limites e tipos ({T['product-image-service.test.ts']} testes)", ("tag", "ok", "Passou")],
    ["Driver SQS", f"Contra ElasticMQ: envio, long polling, reentrega por visibilidade e DLQ ({T['queue-sqs-integration.test.ts']} testes)", ("tag", "ok", "Passou")],
    ["Fila local", f"Visibilidade, reentrega e DLQ simuladas ({T['queue-service.test.ts']} testes)", ("tag", "ok", "Passou")],
    ["Processamento e worker", f"Idempotência, lotes, pendência manual, retry ({T['inventory-processing.test.ts'] + T['inventory-worker.test.ts'] + T['inventory-queue-flow.test.ts']} testes)", ("tag", "ok", "Passou")],
    ["Inventário ponta a ponta", f"Concluir → fila → worker → estoque, com banco real; reprocessamento ({T['inventory-async-e2e.test.ts']} testes)", ("tag", "ok", "Passou")],
    ["Front-end", "`tsc`, ESLint e `next build`", ("tag", "ok", "Passou")],
], ["", "", ""])
# ── 08 Próximos passos ───────────────────────────────────────────────────────
d.section("08", "Próximos passos", "Evolução da arquitetura de nuvem")
d.table(["Etapa", "Ação", "Resultado esperado"], [
    ["1", "Bucket e usuário/role exclusivos do StockIQ, com as políticas mínimas deste documento", "Isolamento e menor privilégio"],
    ["2", "API e worker em EC2 (processos separados) e banco em RDS", "Ambiente de nuvem completo"],
    ["3", "Application Load Balancer, ACM e CloudWatch (métricas da fila e DLQ)", "Disponibilidade e observabilidade"],
    ["4", "Eventos de movimentação para S3 (data lake) alimentando a mineração de dados", "Análise desacoplada do banco transacional"],
], ["c", "", ""])

if __name__ == "__main__":
    print(d.build())
