"""Gera o relatório acadêmico (ABNT) Relatorio_Previsao_Vendas.pdf.

Uso (a partir de machine-learning/):
    python3 relatorio/gerar_relatorio.py figuras Relatorio_Previsao_Vendas.pdf

Requer: pip install reportlab pillow. As figuras são as gravadas pelo notebook
ML-Gabriel-Livia.ipynb em figuras/ (fig1_familias.png e wms_*.png).
"""
import os
import sys

from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, Frame, Image, KeepTogether, PageBreak, PageTemplate,
                                Paragraph, Spacer, Table, TableStyle)
from reportlab.platypus.tableofcontents import TableOfContents

FIGURAS = sys.argv[1] if len(sys.argv) > 1 else 'figuras'
SAIDA = sys.argv[2] if len(sys.argv) > 2 else 'Relatorio_Previsao_Vendas.pdf'

# ---------------------------------------------------------------- fontes (Times New Roman equivalente)
FONTES = '/usr/share/fonts/truetype/liberation/'
for nome, arq in (('Serif', 'LiberationSerif-Regular'), ('Serif-B', 'LiberationSerif-Bold'),
                  ('Serif-I', 'LiberationSerif-Italic'), ('Serif-BI', 'LiberationSerif-BoldItalic')):
    pdfmetrics.registerFont(TTFont(nome, FONTES + arq + '.ttf'))
pdfmetrics.registerFontFamily('Serif', normal='Serif', bold='Serif-B', italic='Serif-I', boldItalic='Serif-BI')

# ---------------------------------------------------------------- estilos
corpo = ParagraphStyle('corpo', fontName='Serif', fontSize=12, leading=18, alignment=TA_JUSTIFY,
                       firstLineIndent=1.25 * cm)
sem_recuo = ParagraphStyle('sem_recuo', parent=corpo, firstLineIndent=0)
h1 = ParagraphStyle('h1', fontName='Serif-B', fontSize=12, leading=18, spaceBefore=12, spaceAfter=12,
                    alignment=TA_LEFT, keepWithNext=1)
h2 = ParagraphStyle('h2', parent=h1, spaceBefore=6, spaceAfter=6)
legenda = ParagraphStyle('legenda', fontName='Serif', fontSize=10, leading=12, alignment=TA_CENTER,
                         spaceBefore=6, spaceAfter=3, keepWithNext=1)
fonte = ParagraphStyle('fonte', parent=legenda, spaceBefore=3, spaceAfter=10, keepWithNext=0)
cel = ParagraphStyle('cel', fontName='Serif', fontSize=10, leading=12, alignment=TA_LEFT)
cel_c = ParagraphStyle('cel_c', parent=cel, alignment=TA_CENTER)
cel_b = ParagraphStyle('cel_b', parent=cel, fontName='Serif-B')
capa = ParagraphStyle('capa', fontName='Serif', fontSize=12, leading=18, alignment=TA_CENTER)
capa_b = ParagraphStyle('capa_b', parent=capa, fontName='Serif-B')
formula = ParagraphStyle('formula', parent=corpo, alignment=TA_CENTER, firstLineIndent=0, spaceBefore=4, spaceAfter=4)
ref = ParagraphStyle('ref', fontName='Serif', fontSize=12, leading=14, alignment=TA_LEFT, spaceAfter=8)
sumario_t = ParagraphStyle('sumario_t', parent=capa_b, spaceAfter=18)


# ---------------------------------------------------------------- documento com sumário
class Doc(BaseDocTemplate):
    def afterFlowable(self, fl):
        if isinstance(fl, Paragraph) and fl.style.name in ('h1', 'h2'):
            nivel = 0 if fl.style.name == 'h1' else 1
            texto = fl.getPlainText()
            chave = f'sec{self.seq.nextf("sec")}'
            self.canv.bookmarkPage(chave)
            self.notify('TOCEntry', (nivel, texto, self.page, chave))


def pagina_numerada(canv, doc):
    canv.saveState()
    canv.setFont('Serif', 10)
    canv.drawRightString(A4[0] - 2 * cm, A4[1] - 1.5 * cm, str(doc.page))
    canv.restoreState()


def sem_numero(canv, doc):
    pass


doc = Doc(SAIDA, pagesize=A4, leftMargin=3 * cm, rightMargin=2 * cm, topMargin=3 * cm, bottomMargin=2 * cm,
          title='Previsão de vendas com modelos de regressão', author='Gabriel Pessoni; Lívia Portela Ferreira')
quadro = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id='f')
doc.addPageTemplates([PageTemplate('capa', frames=[quadro], onPage=sem_numero, autoNextPageTemplate='sumario'),
                      PageTemplate('sumario', frames=[quadro], onPage=sem_numero, autoNextPageTemplate='corpo'),
                      PageTemplate('corpo', frames=[quadro], onPage=pagina_numerada)])


# ---------------------------------------------------------------- helpers
def P(t, st=corpo):
    return Paragraph(t, st)


def tabela(titulo, cabecalho, linhas, larguras, fonte_txt, alinhar=None):
    """Tabela estilo ABNT (traços horizontais); `alinhar` é a lista de estilos de célula por coluna."""
    alinhar = alinhar or [cel] * len(cabecalho)
    dados = [[Paragraph(c, cel_b) for c in cabecalho]]
    dados += [[Paragraph(str(c), alinhar[j]) for j, c in enumerate(l)] for l in linhas]
    t = Table(dados, colWidths=[l * cm for l in larguras], hAlign='CENTER')
    t.setStyle(TableStyle([
        ('LINEABOVE', (0, 0), (-1, 0), 1, colors.black), ('LINEBELOW', (0, 0), (-1, 0), 0.5, colors.black),
        ('LINEBELOW', (0, -1), (-1, -1), 1, colors.black), ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 3), ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    return KeepTogether([Paragraph(titulo, legenda), t, Paragraph(fonte_txt, fonte)])


def figura(arq, titulo, fonte_txt, largura_cm):
    caminho = os.path.join(FIGURAS, arq)
    w, h = PILImage.open(caminho).size
    img = Image(caminho, width=largura_cm * cm, height=largura_cm * cm * h / w)
    return KeepTogether([Paragraph(titulo, legenda), img, Paragraph(fonte_txt, fonte)])


R = lambda t: t.replace('.', ',')          # noqa: E731  (decimal com vírgula)
FONTE_AUTORES = 'Fonte: elaborado pelos autores (2026).'
FONTE_COOK = 'Fonte: elaborado pelos autores (2026), com dados de Cook et al. (2021).'

hist = []   # elementos do corpo

# ---------------------------------------------------------------- capa e sumário
hist += [P('FACULDADE DE TECNOLOGIA DE FRANCA – FATEC FRANCA', capa_b), P('Disciplina: Machine Learning', capa),
         Spacer(1, 4.2 * cm), P('Gabriel Pessoni', capa), P('Lívia Portela Ferreira', capa),
         Spacer(1, 5.2 * cm),
         P('PREVISÃO DE VENDAS COM MODELOS DE REGRESSÃO', capa_b),
         P('Pré-processamento e avaliação sobre a base <i>Store Sales</i> e sobre os dados do sistema StockIQ', capa),
         Spacer(1, 5.2 * cm), P('Franca', capa), P('2026', capa), PageBreak()]

toc = TableOfContents()
toc.dotsMinLevel = 0
toc.levelStyles = [
    ParagraphStyle('t0', fontName='Serif', fontSize=12, leading=15, leftIndent=0, rightIndent=20),
    ParagraphStyle('t1', fontName='Serif', fontSize=12, leading=15, leftIndent=1 * cm, rightIndent=20),
]
hist += [P('SUMÁRIO', sumario_t), toc, PageBreak()]

# ---------------------------------------------------------------- 1 e 2
hist += [
    P('1 INTRODUÇÃO', h1),
    P('Prever a demanda é uma das tarefas mais valiosas na gestão de um varejo: a quantidade de produtos em estoque '
      'depende diretamente de quanto se espera vender. Estoque a menos gera ruptura e perda de vendas; estoque a mais '
      'imobiliza capital e aumenta o risco de perdas. Modelos de aprendizado de máquina permitem estimar essa demanda a '
      'partir do histórico de vendas e de variáveis que a influenciam, como promoções, calendário e características das '
      'lojas.'),
    P('Este documento descreve o trabalho desenvolvido no notebook <i>ML-Gabriel-Livia.ipynb</i>, em duas '
      'partes. Na Parte 1 (seções 3 a 7), prevê-se a quantidade vendida por dia, loja e família de produtos a partir da '
      'base pública <i>Store Sales – Time Series Forecasting</i>, do entendimento da base e do pré-processamento até a '
      'comparação de dois algoritmos de regressão e de dois métodos de seleção de atributos. Na Parte 2 (seção 8), o '
      'mesmo método é aplicado aos dados do sistema de gestão de estoque (WMS) StockIQ, desenvolvido pelos autores, '
      'para prever a demanda de cada produto do catálogo, agora com validação temporal e comparação com uma previsão '
      'simples.'),
    P('2 OBJETIVOS', h1),
    P('2.1 Objetivo geral', h2),
    P('Construir um fluxo de aprendizado de máquina que, a partir de dados históricos de vendas, estime o volume '
      'vendido, primeiro por dia, loja e família de produtos de uma rede varejista (Parte 1) e depois por dia e '
      'produto do estoque do sistema StockIQ (Parte 2).'),
    P('2.2 Objetivos específicos', h2),
    P('Os objetivos específicos são: (a) compreender a estrutura das bases e identificar problemas de qualidade; '
      '(b) preparar os dados por meio de limpeza, integração de tabelas e criação de atributos; (c) reduzir o número '
      'de atributos com dois métodos de seleção (<i>SelectKBest</i> e RFE); (d) treinar e comparar a Regressão Linear '
      'e a <i>Random Forest</i>; (e) avaliar os modelos com métricas de erro e discutir as limitações do experimento; '
      '(f) avaliar o modelo com validação temporal e compará-lo a uma previsão simples, para saber se ele de fato '
      'agrega; e (g) converter a previsão em uma decisão de reposição de estoque.'),
]

# ---------------------------------------------------------------- 3 Base de dados
hist += [
    P('3 BASE DE DADOS', h1),
    P('3.1 Origem e estrutura', h2),
    P('A base <i>Store Sales – Time Series Forecasting</i> foi disponibilizada na plataforma Kaggle (COOK et al., '
      '2021) e reúne dados de lojas da rede varejista equatoriana Corporación Favorita. Ela é formada por seis '
      'arquivos CSV, resumidos na Tabela 1. O arquivo central é o <i>train.csv</i>, com 3.000.888 registros diários '
      'de 54 lojas e 33 famílias de produtos, de 1º de janeiro de 2013 a 15 de agosto de 2017. Cada linha informa a '
      'data, a loja (<i>store_nbr</i>), a família de produtos (<i>family</i>), o total vendido no dia (<i>sales</i>) '
      'e quantos itens da família estavam em promoção (<i>onpromotion</i>). A coluna <i>sales</i> é a variável que se '
      'deseja prever.'),
    tabela('Tabela 1 – Arquivos que compõem a base de dados',
           ['Arquivo', 'Conteúdo', 'Registros', 'Uso no notebook'],
           [['train.csv', 'Vendas por data, loja e família', '3.000.888', 'Base principal'],
            ['test.csv', 'Dias seguintes (16/08 a 31/08/2017), sem a coluna sales', '28.512', 'Não utilizado nesta versão'],
            ['stores.csv', 'Cidade, estado, tipo (A a E) e agrupamento (<i>cluster</i>) de cada loja', '54', 'Tipo e <i>cluster</i>'],
            ['oil.csv', 'Preço diário do petróleo (<i>dcoilwtico</i>), importante para a economia do país', '1.218', 'Preço do petróleo'],
            ['holidays_events.csv', 'Feriados e eventos', '350', 'Não utilizado'],
            ['transactions.csv', 'Número de transações por loja e dia', '83.488', 'Não utilizado']],
           [3.4, 6.0, 2.0, 3.6], 'Fonte: adaptado de Cook et al. (2021).', [cel, cel, cel_c, cel]),
    P('3.2 Recorte utilizado', h2),
    P('Como a base completa é grande, o notebook trabalha com um recorte: as lojas de número 1 a 5 e os registros a '
      'partir de 1º de janeiro de 2016, o que resulta em 97.680 linhas. As cinco lojas pertencem ao tipo D; quatro '
      'ficam em Quito e uma em Santo Domingo. Nesse recorte, a média de vendas é de 532,8 unidades por registro, com '
      'mediana de apenas 37 e máximo de 124.717, e 10,5% dos registros têm venda igual a zero. A distribuição é '
      'assimétrica, e poucas famílias concentram o volume. A Figura 1 mostra as oito famílias com maior média '
      'diária.'),
    figura('fig1_familias.png', 'Figura 1 – Famílias de produtos com maior média diária de vendas (lojas 1 a 5, a partir de 2016)',
           FONTE_COOK, 11.5),
]

# ---------------------------------------------------------------- 4 Pré-processamento
hist += [
    P('4 PRÉ-PROCESSAMENTO', h1),
    P('4.1 Remoção do período anterior à abertura das lojas', h2),
    P('Em 53 das 54 lojas há registros com venda zero antes da primeira venda real. Esse zero não indica falta de '
      'demanda: a loja ainda não existia. Mantê-lo ensinaria ao modelo uma relação falsa. Para cada loja, o notebook '
      'calcula a data do primeiro dia com vendas maiores que zero e descarta as linhas anteriores. Na base completa, '
      'isso remove 222.057 dos 3.000.888 registros, todos com venda zero. As lojas 20, 21, 22, 29, 42, 52 e 53, por '
      'exemplo, só passaram a vender entre 2014 e 2017. Nas lojas 1 a 5, que operam desde 2013, a etapa não altera o '
      'recorte; ela garante o fluxo correto se mais lojas forem incluídas.'),
    P('4.2 Recorte, duplicados e valores ausentes', h2),
    P('Feito o recorte descrito na seção 3.2, o notebook verifica linhas duplicadas e campos essenciais ausentes '
      '(data, loja, família e vendas). Nenhum dos dois problemas foi encontrado; atributos ausentes seriam '
      'preenchidos pela mediana (numéricos) ou por uma categoria explícita (texto).'),
    P('4.3 Integração das tabelas', h2),
    P('A tabela de vendas é enriquecida por junções. De <i>stores.csv</i> entram o tipo e o <i>cluster</i> da loja. '
      'De <i>oil.csv</i> entra o preço do petróleo, que tem 43 valores vazios e cotações apenas em dias úteis. Para '
      'evitar lacunas, o petróleo é expandido para todos os dias do calendário e os dias sem cotação recebem o último '
      'valor conhecido; se faltar no início da série, usa-se o primeiro valor disponível. Sem esse cuidado, as '
      'junções deixavam valores vazios.'),
    P('4.4 Valores extremos', h2),
    P('Pelo método do intervalo interquartil, 14.016 registros (cerca de 14%) ficam fora do intervalo de −484,31 a '
      '823,19. Como são picos de grandes famílias, e não erros de registro, foram mantidos: removê-los esconderia os '
      'dias de maior demanda.'),
    P('4.5 Agrupamento de <i>onpromotion</i>', h2),
    P('A quantidade de itens em promoção assume 216 valores distintos. Para reduzir essa cardinalidade e capturar a '
      'intensidade da promoção, ela foi dividida em quatro faixas ordenadas: nenhum item (0), de 1 a 3 itens (1), de '
      '4 a 16 (2) e mais de 16 itens (3). Os registros ficam distribuídos em 57.484, 17.301, 13.257 e 9.638, '
      'respectivamente.'),
    P('4.6 Atributos de data e codificação', h2),
    P('A data original é um texto e não pode ser usada diretamente. Dela são extraídos o dia da semana, o dia do mês '
      'e o mês, que capturam padrões como o aumento de vendas aos fins de semana. As colunas <i>id</i> e <i>date</i> '
      'são removidas, por serem identificador e informação já aproveitada. As variáveis categóricas (família e tipo '
      'da loja) são convertidas em colunas de 0 e 1 (<i>one-hot encoding</i>), pois os algoritmos operam apenas '
      'sobre números. Ao final, a tabela tem 97.680 linhas e 41 atributos, além da variável-alvo. Como as cinco '
      'lojas são do tipo D, a coluna de tipo é constante e não contribui para o modelo.'),
]

# ---------------------------------------------------------------- 5, 6, 7
hist += [
    P('5 SELEÇÃO DE ATRIBUTOS E NORMALIZAÇÃO', h1),
    P('Primeiro, os dados são divididos aleatoriamente em 70% para treino (68.376 linhas) e 30% para teste (29.304), '
      'com semente fixa (<i>random_state</i> = 1) para que o resultado seja reprodutível. A seleção de atributos usa '
      'apenas o treino, para que nenhuma informação do teste influencie a escolha. Dos 41 atributos, mantêm-se dez '
      'por dois métodos distintos, o que permite comparar o efeito da escolha (GUYON; ELISSEEFF, 2003).'),
    P('O <i>SelectKBest</i> é um método de filtro: pontua cada atributo isoladamente pelo teste F de regressão, que '
      'mede a relação linear com a venda, e retém os dez melhores (PEDREGOSA et al., 2011). Ele escolheu a promoção e '
      'nove famílias de produtos (bebidas, livros, limpeza, laticínios, mercearia I, ferragens, eletrodomésticos, '
      'hortifrúti e material escolar).'),
    P('O RFE (<i>Recursive Feature Elimination</i>) é um método <i>wrapper</i>: treina um modelo, descarta o atributo '
      'menos importante e repete o processo até restarem dez (GUYON et al., 2002). Aqui o modelo-base é uma regressão '
      'linear com padronização. Ele escolheu o número da loja, a promoção, o <i>cluster</i> e sete famílias (bebidas, '
      'limpeza, laticínios, mercearia I, utensílios II, hortifrúti e frutos do mar).'),
    P('A normalização (padronização pela média e pelo desvio-padrão) é aplicada somente à Regressão Linear, por meio '
      'de um <i>pipeline</i> que aprende os parâmetros no treino. Atributos em escalas diferentes, como o número da '
      'loja e as colunas de 0 e 1, tornariam os coeficientes incomparáveis. A <i>Random Forest</i> não precisa dessa '
      'etapa, pois suas decisões dependem apenas da ordem dos valores.'),
    P('6 ALGORITMOS DE REGRESSÃO', h1),
    P('A variável a prever é numérica e contínua, o que caracteriza um problema de regressão (HASTIE; TIBSHIRANI; '
      'FRIEDMAN, 2009). Foram escolhidos dois algoritmos de naturezas opostas: um modelo simples e interpretável e um '
      'modelo flexível capaz de capturar relações complexas. Ambos foram implementados com a biblioteca '
      '<i>scikit-learn</i> (PEDREGOSA et al., 2011) e os dados foram manipulados com <i>pandas</i> (MCKINNEY, 2010).'),
    P('6.1 Regressão Linear', h2),
    P('A Regressão Linear supõe que a venda é uma soma ponderada dos atributos:'),
    P('y = β<sub>0</sub> + β<sub>1</sub>x<sub>1</sub> + β<sub>2</sub>x<sub>2</sub> + … + β<sub>p</sub>x<sub>p</sub> + ε'
      '&nbsp;&nbsp;&nbsp;&nbsp;(1)', formula),
    P('em que <i>y</i> é a venda, <i>x<sub>j</sub></i> são os atributos, <i>β<sub>j</sub></i> são os coeficientes '
      'estimados pelo método dos mínimos quadrados e <i>ε</i> é o erro. Sua principal vantagem é a '
      'interpretabilidade: cada coeficiente mostra o quanto a venda muda quando o atributo aumenta uma unidade (aqui, '
      'um desvio-padrão, pois os dados são padronizados). No modelo com RFE, o intercepto é de 535,16 e os maiores '
      'coeficientes são os das famílias mercearia I (+705,6), bebidas (+573,4) e hortifrúti (+556,3), coerentes com '
      'a Figura 1. Sua limitação é supor relações lineares e aditivas.', sem_recuo),
    P('6.2 Random Forest', h2),
    P('A <i>Random Forest</i> combina muitas árvores de decisão treinadas em amostras diferentes dos dados e com '
      'sorteio de atributos a cada divisão; a previsão final é a média das previsões das árvores (BREIMAN, 2001). '
      'Esse método captura relações não lineares e interações (como o efeito da promoção diferir entre famílias ou '
      'lojas) sem exigir normalização. O notebook usa 50 árvores na Parte 1, para manter o treino rápido, e semente '
      'fixa. Em contrapartida, é menos interpretável que a regressão.'),
    P('6.3 Métricas de avaliação', h2),
    P('Os modelos são avaliados no conjunto de teste, que não participou do treino nem da seleção de atributos. O '
      'coeficiente de determinação (R²) indica a fração da variação das vendas explicada pelo modelo, sendo 1 o valor '
      'ideal. O erro absoluto médio (MAE) é a média dos erros em unidades vendidas, e a raiz do erro quadrático médio '
      '(RMSE) penaliza mais os erros grandes.'),
    P('7 RESULTADOS E DISCUSSÃO', h1),
    P('A Tabela 2 reúne o desempenho das quatro combinações no conjunto de teste (29.304 registros).'),
    tabela('Tabela 2 – Desempenho dos modelos no conjunto de teste (Parte 1)',
           ['Seleção', 'Algoritmo', 'R²', 'MAE', 'RMSE'],
           [['SelectKBest', 'Regressão Linear', '0,6270', '311,80', '857,40'],
            ['SelectKBest', 'Random Forest', '0,6279', '312,22', '856,27'],
            ['RFE', 'Regressão Linear', '0,6337', '345,62', '849,67'],
            ['RFE', 'Random Forest', '0,9156', '172,82', '407,87']],
           [3.2, 4.2, 2.4, 2.4, 2.4], FONTE_AUTORES + ' MAE e RMSE em unidades vendidas.',
           [cel, cel, cel_c, cel_c, cel_c]),
    P('Os resultados mostram três pontos, e o RMSE bem maior que o MAE em todos os modelos indica erros concentrados '
      'em poucos registros de alto volume. Primeiro, a combinação <i>Random Forest</i> com RFE foi claramente a '
      'melhor: explica 91,6% da variação das vendas e tem erro médio de 172,8 unidades, contra R² próximo de 0,63 nas '
      'demais. Segundo, com o <i>SelectKBest</i> os dois algoritmos ficaram praticamente empatados (0,6270 e 0,6279). '
      'Os dez atributos escolhidos são a promoção e famílias de produtos, que não distinguem uma loja da outra nem um '
      'dia do outro; sem essas informações, nem um modelo flexível consegue ir além. Terceiro, o RFE incluiu o número '
      'da loja e o <i>cluster</i>, e foi com eles que a <i>Random Forest</i> pôde aprender o nível de venda de cada '
      'loja e dar o salto de desempenho. Já a Regressão Linear quase não melhorou com o RFE, o que sugere que a '
      'relação entre esses atributos e a venda não é linear.'),
    P('Para dimensionar o efeito da seleção, treinamos também a <i>Random Forest</i> com os 41 atributos, o que deu '
      'R² de 0,9518. Assim, reduzir a dez atributos pelo RFE custou cerca de 0,036 de R²; o <i>SelectKBest</i> '
      'descartou informação decisiva. A escolha do método de seleção pesou mais do que a escolha do algoritmo.'),
    P('Esse R² de 0,9156, porém, vem de uma divisão aleatória: dias vizinhos aparecem no treino e no teste, e o '
      'modelo não usa vendas passadas. Para medir a qualidade de uma previsão de dias realmente futuros, a Parte 2 '
      'adota outro desenho de avaliação.'),
]

# ---------------------------------------------------------------- 8 Parte 2
hist += [
    P('8 DADOS DO PRÓPRIO SISTEMA (PARTE 2)', h1),
    P('8.1 Motivação e diferenças em relação à Parte 1', h2),
    P('Na Parte 1 o modelo foi treinado com uma base pública. Na Parte 2, o mesmo método é aplicado aos dados do '
      'sistema de gestão de estoque que desenvolvemos, o StockIQ, para prever a demanda de cada produto do catálogo: '
      'quantas unidades devem sair do estoque por dia. Essa previsão alimenta duas telas do sistema (<i>Previsão de '
      'Vendas</i> e <i>IA Analítica</i>) e permite decidir quando e quanto repor. Há quatro diferenças em relação à '
      'Parte 1: (a) o alvo é o número de unidades que saem de cada produto por dia, uma série muito esparsa; (b) a '
      'avaliação usa validação temporal, em vez de divisão aleatória; (c) o modelo é comparado a uma previsão simples, '
      'sem aprendizado; e (d) a previsão é convertida em uma sugestão de reposição.'),
    P('8.2 Base de dados', h2),
    P('As movimentações vêm do banco do sistema e foram exportadas para dois arquivos: <i>movimentacoes.csv</i> '
      '(tipo da movimentação, produto, quantidade, custo e motivo) e <i>produtos.csv</i> (categoria, preços, estoque '
      'mínimo e estoque atual). São 1.307 movimentações, de 9 de outubro de 2025 a 20 de outubro de 2026, de 26 '
      'produtos em sete categorias; 1.034 são saídas, 174 são entradas e as demais são perdas (54), inventários (34), '
      'transferências (8) e ajustes (3). Esses dados foram gerados pelo <i>script</i> de demonstração do sistema, com '
      'datas e quantidades sorteadas. São, portanto, <b>dados simulados, e não a operação real de uma empresa</b>. '
      'Por isso não se espera um padrão semanal marcante, e a análise serve sobretudo para validar o método, a '
      'avaliação e a integração; com movimentações reais, o mesmo código se aplica sem alterações.'),
    P('8.3 Pré-processamento', h2),
    P('O pré-processamento seguiu os mesmos princípios da Parte 1, adaptados à natureza dos dados. Primeiro, '
      'filtram-se apenas as saídas, pois só elas representam demanda; entradas, inventários e transferências não são '
      'vendas. Em seguida, verifica-se a qualidade: não há linhas duplicadas, valores ausentes, quantidades menores ou '
      'iguais a zero nem saídas de produtos fora do cadastro. As 1.034 saídas são então agregadas por produto e dia, '
      'resultando em 989 linhas produto-dia, com média de 18,4 unidades e máximo de 144.'),
    P('O sistema só grava os dias em que há movimento; para o modelo, o dia sem saída vale zero. Por isso a tabela é '
      'expandida para o calendário completo, de 30 de outubro de 2025 a 5 de outubro de 2026, em uma matriz de 26 '
      'produtos por 341 dias. Apenas 11,2% dos produto-dias têm alguma saída, ou seja, a série diária é muito '
      'esparsa; o que o modelo consegue prever com alguma estabilidade é o nível de demanda de cada produto, e não o '
      'dia exato.'),
    P('Como na Parte 1, os valores extremos foram diagnosticados pelo intervalo interquartil (limite superior de 56,5 '
      'unidades; 57 produto-dias, ou 5,8%, acima dele) e mantidos, pois são vendas reais. Por fim, considera-se o '
      'histórico de cada produto a partir do primeiro dia com saída, análogo à remoção do período anterior à abertura '
      'das lojas. Produtos com menos de 56 dias de histórico ou menos de cinco dias com saída não têm dados '
      'suficientes e recebem a média dos últimos 28 dias; apenas a calculadora descontinuada (duas saídas) ficou fora, '
      'e 25 dos 26 produtos foram ao modelo. A Figura 2 resume a exploração: o volume mensal, a média por dia da '
      'semana, que varia pouco (de 48 a 63 unidades) e <b>sem padrão de fim de semana</b>, e o volume por categoria. '
      'A ausência de padrão semanal é esperada pela origem simulada e antecipa o resultado: o calendário não deve '
      'ajudar o modelo.'),
    figura('wms_exploracao.png', 'Figura 2 – Exploração das saídas do sistema: (a) unidades por mês; (b) média por dia da semana; (c) unidades por categoria',
           FONTE_AUTORES + ' Dados do sistema StockIQ.', 15.5),
    P('8.4 Atributos', h2),
    P('Para cada produto, cada origem <i>O</i> (um dia do histórico) e cada dia-alvo <i>O</i>+<i>k</i>, com <i>k</i> '
      'de 1 a 28, forma-se uma linha da tabela de treino. Todos os atributos do produto usam apenas informação até a '
      'origem; nenhum dado posterior entra, o que evita o vazamento de dados (<i>data leakage</i>). A tabela de '
      'treino final tem 38.275 linhas e 11 atributos, descritos na Tabela 3. O dia do mês e o mês foram deixados de '
      'fora do modelo e testados à parte, na ablação da seção 8.7.'),
    tabela('Tabela 3 – Atributos do modelo da Parte 2',
           ['Atributo', 'Descrição'],
           [['mean7, mean28, mean56', 'média diária dos últimos 7, 28 e 56 dias'],
            ['mean_all', 'média diária de todo o histórico'],
            ['active_rate28', 'fração dos últimos 28 dias com alguma saída'],
            ['days_since_sale', 'dias desde a última saída'],
            ['same_dow_8w', 'média do mesmo dia da semana do dia-alvo nas 8 semanas anteriores'],
            ['dow', 'dia da semana do dia-alvo'],
            ['k', 'distância, em dias, entre a origem e o dia-alvo'],
            ['month_start, month_end', 'dia-alvo no início (dia ≤ 3) ou no fim (dia ≥ 28) do mês']],
           [4.6, 10.4], FONTE_AUTORES),
    P('8.5 Modelos, validação temporal e métricas', h2),
    P('Na Parte 1, a divisão aleatória deixava dias vizinhos nos dois conjuntos. Na Parte 2, usa-se validação '
      'temporal com janelas móveis: em cada uma de quatro janelas de teste, o modelo é treinado apenas com o que '
      'aconteceu antes e prevê os 14 dias seguintes, que são comparados ao que de fato saiu. Assim, o teste está '
      'sempre no futuro do treino. As métricas são calculadas por produto e semana, o nível em que se decide uma '
      'compra, o que dá 200 amostras de teste.'),
    P('Foram comparados três métodos: (a) a <i>Random Forest</i> (60 árvores, profundidade máxima 12, mínimo de 40 '
      'amostras por folha e semente fixa), que é o modelo usado no sistema; (b) a Regressão Linear com '
      '<i>SelectKBest</i> (<i>k</i> = 6), como na Parte 1; e (c) uma referência (<i>baseline</i>), a média do mesmo '
      'dia da semana nas oito semanas anteriores, sem aprendizado. Se o modelo não superar a referência, ele não '
      'agrega. Além de R², MAE e RMSE, usaram-se o RMSLE; o WAPE, que é o erro absoluto total dividido pelo total '
      'vendido; o viés (previsto menos real, em %); e a cobertura da faixa de incerteza de 80% (previsão ± 1,28 '
      'desvio diário do produto), que, se calibrada, cobriria 80% dos dias.'),
    P('8.6 Resultados', h2),
    P('A Tabela 4 e a Figura 3 mostram o desempenho nas quatro janelas de teste.'),
    tabela('Tabela 4 – Desempenho na validação temporal (200 amostras produto × semana)',
           ['Método', 'R²', 'MAE', 'RMSE', 'RMSLE', 'WAPE', 'Viés'],
           [['Random Forest', '0,173', '14,83', '27,14', '1,545', '82,4%', '−10,2%'],
            ['Regressão Linear (SelectKBest)', '0,203', '14,97', '26,65', '1,582', '83,1%', '−6,2%'],
            ['Média do mesmo dia da semana', '0,199', '14,30', '26,70', '1,572', '79,4%', '−5,1%']],
           [5.0, 1.5, 1.6, 1.6, 1.7, 1.6, 1.7], FONTE_AUTORES + ' MAE e RMSE em unidades por produto e semana.',
           [cel, cel_c, cel_c, cel_c, cel_c, cel_c, cel_c]),
    figura('wms_avaliacao.png', 'Figura 3 – (a) Previsto × real por produto e semana; (b) erro relativo (WAPE) por método',
           FONTE_AUTORES, 15.5),
    P('Os resultados mostram quatro pontos. Primeiro, os três métodos ficaram na mesma faixa (R² entre 0,17 e 0,20; '
      'WAPE entre 79% e 83%): a <i>Random Forest</i> não superou a referência simples (WAPE de 82,4% contra 79,4%) '
      'nem a Regressão Linear em R² (0,173 contra 0,203). Segundo, as causas estão nos dados: a base é simulada e não '
      'tem padrão semanal, então o calendário não ajuda; a série é esparsa (11% dos dias com saída), de modo que o '
      'dia a dia é quase imprevisível; e há só cerca de um ano de histórico e 25 produtos. Terceiro, o viés de −10% '
      'indica que o modelo subestima um pouco o volume, e a faixa de 80% cobriu 84,9% dos dias, ou seja, está bem '
      'calibrada, um pouco conservadora. Quarto, diferentemente da Parte 1, não há salto de desempenho da <i>Random '
      'Forest</i>: lá ela aproveitava o nível de venda de cada loja e família; aqui esse nível já está contido na '
      'média histórica, que a referência também usa.'),
    P('8.7 Importância dos atributos e ablação', h2),
    P('O <i>SelectKBest</i> escolheu seis atributos, todos de nível e frequência (as médias de 7, 28 e 56 dias e de '
      'todo o histórico, a fração de dias com saída e a média do mesmo dia da semana); nenhum é de calendário. A '
      '<i>Random Forest</i> concentra cerca de 72% da importância nesses atributos (só a média de todo o histórico '
      'responde por 46%); o dia da semana ainda recebe 11%, mas, sem padrão semanal real nos dados, esse peso tende a '
      'ser ajuste ao ruído (Figura 4).'),
    figura('wms_importancia.png', 'Figura 4 – Importância dos atributos na Random Forest (em destaque, os escolhidos pelo SelectKBest)',
           FONTE_AUTORES, 10.5),
    P('Na ablação, testou-se o que muda se o dia do mês e o mês entrarem como atributos, com as mesmas janelas de '
      'teste (Tabela 5). A diferença é pequena para 200 amostras, dentro do ruído, e os dois atributos somam 28% da '
      'importância na floresta com 13 atributos. Eles ficaram de fora por parcimônia: com um único ano de histórico, '
      'cada mês aparece uma vez e se confunde com a tendência. Vale repetir o teste com dois anos de dados.'),
    tabela('Tabela 5 – Ablação: efeito do dia do mês e do mês (mesmas janelas de teste)',
           ['Conjunto de atributos', 'R²', 'MAE', 'RMSE', 'RMSLE', 'WAPE', 'Viés'],
           [['11 atributos (usado)', '0,173', '14,83', '27,14', '1,545', '82,4%', '−10,2%'],
            ['13 atributos (+ dia do mês e mês)', '0,196', '14,59', '26,77', '1,544', '81,0%', '−9,7%']],
           [5.0, 1.5, 1.6, 1.6, 1.7, 1.6, 1.7], FONTE_AUTORES,
           [cel, cel_c, cel_c, cel_c, cel_c, cel_c, cel_c]),
    P('8.8 Teste de sanidade do algoritmo', h2),
    P('Como o resultado da seção 8.6 não mostra ganho sobre a média simples, é preciso verificar que o algoritmo '
      'funciona quando existe padrão. Em dados sintéticos com padrão conhecido, a <i>Random Forest</i> deve '
      'reproduzi-lo. Um produto que vende 10 unidades apenas aos fins de semana teve previsão média de 10,0 unidades '
      'nos sábados e domingos e 0,0 nos dias úteis, e um produto que vende 4 unidades por dia teve previsão de 4,0. '
      'O modelo recupera o padrão: o desempenho modesto da seção 8.6 vem dos dados (simulados, sem padrão), e não de '
      'uma falha do método. Esse teste está automatizado no módulo <i>ml-service</i> do sistema.'),
    P('8.9 Da previsão à decisão e integração ao sistema', h2),
    P('O modelo final é treinado com todo o histórico e prevê os próximos 28 dias de cada produto. Com a previsão '
      'calculam-se o estoque de segurança, igual à raiz da soma dos quadrados dos desvios diários da faixa superior '
      'durante o prazo de reposição (os erros de dias diferentes são tratados como independentes), e a reposição '
      'sugerida, igual à demanda prevista dos próximos 28 dias mais o estoque de segurança menos o estoque atual '
      '(mínimo zero). O prazo de reposição é de 7 dias, parâmetro configurável no sistema. A Tabela 6 mostra os cinco '
      'produtos de maior demanda prevista; no banco de demonstração o estoque atual é zero para quase todos os '
      'produtos, porque o <i>script</i> de carga zera o saldo ao final, e por isso a sugestão cobre toda a demanda '
      'prevista mais a segurança. A Figura 5 mostra a previsão de um produto, com a faixa de 80%.'),
    tabela('Tabela 6 – Cinco produtos com maior demanda prevista para os próximos 28 dias',
           ['Produto', 'Demanda 28 dias', 'Média por dia', 'Estoque atual', 'Reposição sugerida'],
           [['Máscara PFF2 sem Válvula', '260', '9,3', '0', '310'],
            ['Caixa de Papelão 40×30×30', '251', '9,0', '0', '348'],
            ['Fita Adesiva Transparente 48mm', '160', '5,7', '0', '201'],
            ['Protetor Auricular Plug', '158', '5,6', '0', '189'],
            ['Álcool 70% INPM 1L', '144', '5,1', '0', '184']],
           [5.6, 2.3, 2.1, 2.1, 2.5], FONTE_AUTORES + ' Valores em unidades.',
           [cel, cel_c, cel_c, cel_c, cel_c]),
    figura('wms_previsao.png', 'Figura 5 – Saídas reais (56 dias), previsão dos 28 dias seguintes e faixa de 80% para a Máscara PFF2 sem Válvula',
           FONTE_AUTORES, 14),
    P('O código desta parte é o mesmo do sistema (módulo <i>ml-service</i>); com a mesma base e a última data em '
      '5 de outubro de 2026, o serviço reproduz exatamente as métricas do notebook (R² de 0,1735, MAE de 14,827 e '
      'RMSE de 27,135 para a <i>Random Forest</i>). O fluxo é: a tela <i>Previsão de Vendas</i> ou <i>IA Analítica</i> '
      '(Next.js) chama a API do backend, que lê as movimentações no PostgreSQL e as envia ao serviço de '
      'aprendizado de máquina; este treina a <i>Random Forest</i>, faz a validação temporal e devolve a previsão diária '
      'com a faixa de 80%. Na tela, a origem da previsão é &quot;ontem&quot;; como as saídas de demonstração terminam '
      'em 5 de outubro, as janelas de teste do sistema caem em semanas sem nenhuma saída e as métricas ali ficam '
      'piores que as do notebook. Em uso real, com movimentações contínuas, as duas coincidem.'),
]

# ---------------------------------------------------------------- 9 Considerações finais e referências
hist += [
    P('9 CONSIDERAÇÕES FINAIS', h1),
    P('O trabalho percorreu o caminho completo de um projeto de regressão nas duas bases: entendimento, limpeza, '
      'integração, criação de atributos, seleção, treinamento, validação e interpretação. O pré-processamento foi '
      'decisivo para a qualidade dos dados. Na Parte 1, a <i>Random Forest</i> com atributos escolhidos pelo RFE '
      'entregou o melhor resultado (R² de 0,9156). Na Parte 2, com validação temporal e uma referência simples, a '
      '<i>Random Forest</i> não superou a média do mesmo dia da semana (WAPE de 82,4% contra 79,4%), pois os dados '
      'de demonstração não têm padrão semanal; o teste de sanidade mostrou que o método é correto, e o erro, a faixa '
      'de incerteza e a conversão em reposição estão implementados no sistema.'),
    P('Há limitações que precisam ficar claras. Na Parte 1, a divisão entre treino e teste é aleatória, e não '
      'cronológica: dias vizinhos aparecem nos dois conjuntos, o que tende a tornar o R² mais otimista do que seria '
      'ao prever dias realmente futuros; o modelo também não usa vendas passadas, feriados nem transações, o recorte '
      'cobre apenas cinco lojas do mesmo tipo e o arquivo <i>test.csv</i> não é usado. Na Parte 2, os dados são '
      'simulados e cobrem cerca de um ano, a série é esparsa, não há preço, promoção, feriados ou sazonalidade '
      'externa, e os atributos de mês e dia do mês só podem ser reavaliados com mais histórico.'),
    P('Como trabalhos futuros, sugerem-se repetir a Parte 2 com movimentações reais; usar a divisão por data na '
      'Parte 1; incluir feriados, promoções e lags; usar todas as lojas; adotar modelos para demanda intermitente, '
      'como o método de Croston (HYNDMAN; ATHANASOPOULOS, 2021); e prever por categoria quando o produto tem pouco '
      'histórico.'),
    P('REFERÊNCIAS', ParagraphStyle('hr', parent=h1, alignment=TA_CENTER)),
]
for r in (
    'BREIMAN, Leo. Random forests. <i>Machine Learning</i>, v. 45, n. 1, p. 5-32, 2001.',
    'COOK, Alexis; DANB; INVERSION; HOLBROOK, Ryan. <i>Store Sales – Time Series Forecasting</i>. Kaggle, 2021. '
    'Disponível em: https://www.kaggle.com/competitions/store-sales-time-series-forecasting. Acesso em: out. 2026.',
    'GUYON, Isabelle; ELISSEEFF, André. An introduction to variable and feature selection. <i>Journal of Machine '
    'Learning Research</i>, v. 3, p. 1157-1182, 2003.',
    'GUYON, Isabelle; WESTON, Jason; BARNHILL, Stephen; VAPNIK, Vladimir. Gene selection for cancer classification '
    'using support vector machines. <i>Machine Learning</i>, v. 46, p. 389-422, 2002.',
    'HASTIE, Trevor; TIBSHIRANI, Robert; FRIEDMAN, Jerome. <i>The elements of statistical learning</i>: data '
    'mining, inference, and prediction. 2. ed. New York: Springer, 2009.',
    'HYNDMAN, Rob J.; ATHANASOPOULOS, George. <i>Forecasting</i>: principles and practice. 3. ed. Melbourne: '
    'OTexts, 2021.',
    'MCKINNEY, Wes. Data structures for statistical computing in Python. In: PYTHON IN SCIENCE CONFERENCE, 9., 2010, '
    'Austin. <i>Proceedings</i> [...]. Austin: SciPy, 2010. p. 56-61.',
    'PEDREGOSA, Fabian et al. Scikit-learn: machine learning in Python. <i>Journal of Machine Learning Research</i>, '
    'v. 12, p. 2825-2830, 2011.',
):
    hist.append(P(r, ref))

doc.multiBuild(hist)
print('gerado:', SAIDA)
