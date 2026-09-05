'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  Boxes,
  ArrowRight,
  ShieldCheck,
  Zap,
  BarChart3,
  PackageSearch,
  ClipboardList,
  Bell,
  ScanLine,
  Layers,
  Sparkles,
  CheckCircle2,
  Menu,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

const nav = [
  { label: 'Recursos', href: '#recursos' },
  { label: 'Módulos', href: '#modulos' },
  { label: 'IA', href: '#ia' },
  { label: 'Sobre', href: '#sobre' },
]

const features = [
  {
    icon: PackageSearch,
    title: 'Endereçamento físico',
    desc: 'Organize o armazém por corredor, prateleira e posição, com rastreabilidade completa de onde cada item está guardado.',
  },
  {
    icon: Layers,
    title: 'Lotes e validade',
    desc: 'Controle de lotes com data de vencimento e alertas automáticos antes que o estoque perca validade.',
  },
  {
    icon: ClipboardList,
    title: 'Movimentações completas',
    desc: 'Entrada, saída, transferência, perda, ajuste e inventário — cada operação registrada com trilha de auditoria.',
  },
  {
    icon: Bell,
    title: 'Alertas automáticos',
    desc: 'Notificações de estoque baixo e produtos próximos do vencimento, direto no dashboard.',
  },
  {
    icon: BarChart3,
    title: 'Relatórios gerenciais',
    desc: 'Dashboard executivo com curva ABC, giro de estoque e indicadores para decisões mais rápidas.',
  },
  {
    icon: ShieldCheck,
    title: 'Perfis de acesso',
    desc: 'Autenticação segura e controle de permissões por perfil de usuário, do operador ao administrador.',
  },
]

const modules = [
  {
    step: '01',
    title: 'Cadastros',
    desc: 'Produtos, categorias, marcas, fornecedores, clientes e endereços — a base de dados do seu armazém.',
  },
  {
    step: '02',
    title: 'Operação diária',
    desc: 'Movimentações, contagens de inventário e leitura por scanner para o dia a dia do time de estoque.',
  },
  {
    step: '03',
    title: 'Inteligência',
    desc: 'Alertas, relatórios, curva ABC e previsão de demanda para antecipar decisões de reposição.',
  },
]

const stats = [
  { value: '67', label: 'endpoints de API' },
  { value: '12', label: 'entidades modeladas' },
  { value: '20+', label: 'telas navegáveis' },
  { value: '6', label: 'tipos de movimentação' },
]

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[color:var(--bg-base)] text-[color:var(--text-primary)]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[color:var(--border)] bg-[color:var(--bg-base)]/80 backdrop-blur-md">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Boxes className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-[15px]">StockIQ</span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            {nav.map(item => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Link href="/login">
              <Button size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Acessar o sistema
              </Button>
            </Link>
          </div>

          <button
            className="md:hidden p-2 cursor-pointer text-[color:var(--text-secondary)]"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Abrir menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-[color:var(--border)] px-6 py-4 flex flex-col gap-4 animate-fade-in">
            {nav.map(item => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="text-sm text-[color:var(--text-secondary)]"
              >
                {item.label}
              </a>
            ))}
            <Link href="/login" className="mt-2">
              <Button className="w-full" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Acessar o sistema
              </Button>
            </Link>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/60 via-transparent to-transparent dark:from-blue-500/[0.06]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative max-w-[1200px] mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32">
          <div className="max-w-[720px] mx-auto text-center">
            <Badge variant="brand" className="mx-auto">
              <Sparkles className="w-3 h-3" />
              Novo: módulo de IA para previsão de demanda
            </Badge>

            <h1 className="mt-6 text-4xl md:text-6xl font-bold leading-[1.1] tracking-tight">
              Gestão de estoque <span className="text-blue-600">inteligente</span>, do recebimento à expedição.
            </h1>

            <p className="mt-6 text-lg text-[color:var(--text-secondary)] leading-relaxed">
              O StockIQ é um WMS + ERP Lite que controla produtos, endereços, lotes e movimentações do seu
              armazém em um só lugar — com inteligência artificial para prever demanda e sugerir reposição.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/login">
                <Button size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Acessar o sistema
                </Button>
              </Link>
              <a href="#recursos">
                <Button variant="outline" size="lg">
                  Ver recursos
                </Button>
              </a>
            </div>

            <p className="mt-4 text-xs text-[color:var(--text-tertiary)]">
              Protótipo navegável · dados de demonstração · sem necessidade de cartão de crédito
            </p>
          </div>

          {/* Product preview mock */}
          <div className="mt-16 max-w-[960px] mx-auto">
            <div className="rounded-[var(--radius-2xl)] border border-[color:var(--border)] bg-[color:var(--bg-subtle)] shadow-[var(--shadow-xl)] overflow-hidden">
              <div className="h-9 flex items-center gap-1.5 px-4 border-b border-[color:var(--border)] bg-[color:var(--bg-base)]">
                <span className="w-2.5 h-2.5 rounded-full bg-[color:var(--danger-muted)]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[color:var(--warning-muted)]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[color:var(--success-muted)]" />
              </div>
              <div className="grid grid-cols-4 gap-4 p-6 bg-[color:var(--bg-base)]">
                {stats.map(s => (
                  <div key={s.label} className="rounded-[var(--radius-lg)] border border-[color:var(--border)] p-4">
                    <p className="text-2xl font-bold text-blue-600">{s.value}</p>
                    <p className="text-xs text-[color:var(--text-tertiary)] mt-1">{s.label}</p>
                  </div>
                ))}
                <div className="col-span-4 h-40 rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--bg-subtle)] flex items-center justify-center gap-2 text-[color:var(--text-tertiary)]">
                  <BarChart3 className="w-4 h-4" />
                  <span className="text-xs">Dashboard com curva ABC, giro de estoque e alertas em tempo real</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="recursos" className="py-24 border-t border-[color:var(--border)]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="max-w-[560px] mx-auto text-center mb-16">
            <p className="text-sm font-medium text-blue-600">Recursos</p>
            <h2 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight">
              Tudo que seu armazém precisa, em um só sistema
            </h2>
            <p className="mt-4 text-[color:var(--text-secondary)]">
              Do cadastro de produtos ao relatório gerencial — StockIQ cobre o ciclo completo de operação.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(f => (
              <div
                key={f.title}
                className="rounded-[var(--radius-xl)] border border-[color:var(--border)] p-6 hover:border-[color:var(--border-strong)] hover:shadow-[var(--shadow-md)] transition-all"
              >
                <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[color:var(--brand-subtle)] flex items-center justify-center">
                  <f.icon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-[color:var(--text-secondary)] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules / how it works */}
      <section id="modulos" className="py-24 border-t border-[color:var(--border)] bg-[color:var(--bg-subtle)]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="max-w-[560px] mx-auto text-center mb-16">
            <p className="text-sm font-medium text-blue-600">Como funciona</p>
            <h2 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight">
              Da base de dados à decisão, em três camadas
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {modules.map((m, i) => (
              <div key={m.step} className="relative rounded-[var(--radius-xl)] border border-[color:var(--border)] bg-[color:var(--bg-base)] p-6">
                <span className="text-4xl font-bold text-[color:var(--border-strong)]">{m.step}</span>
                <h3 className="mt-3 font-semibold text-lg">{m.title}</h3>
                <p className="mt-2 text-sm text-[color:var(--text-secondary)] leading-relaxed">{m.desc}</p>
                {i < modules.length - 1 && (
                  <ArrowRight className="hidden md:block absolute top-1/2 -right-4 -translate-y-1/2 w-6 h-6 text-[color:var(--border-strong)]" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI section */}
      <section id="ia" className="py-24 border-t border-[color:var(--border)]">
        <div className="max-w-[1200px] mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Badge variant="brand">
              <Zap className="w-3 h-3" />
              IA Analítica
            </Badge>
            <h2 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight leading-tight">
              Preveja a demanda antes que ela vire ruptura de estoque
            </h2>
            <p className="mt-4 text-[color:var(--text-secondary)] leading-relaxed">
              O módulo de mineração de dados do StockIQ analisa o histórico de movimentações por categoria
              para estimar a demanda futura e sugerir reposição no momento certo — reduzindo tanto a falta
              quanto o excesso de estoque.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                'Previsão de demanda por categoria de produto',
                'Sugestão automática de reposição',
                'Classificação ABC para priorizar itens críticos',
              ].map(item => (
                <li key={item} className="flex items-center gap-2.5 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[var(--radius-2xl)] border border-[color:var(--border)] bg-[color:var(--bg-subtle)] p-8">
            <div className="flex items-center gap-2 text-xs text-[color:var(--text-tertiary)] mb-6">
              <ScanLine className="w-3.5 h-3.5" />
              previsao_demanda.csv · regressão linear
            </div>
            <div className="space-y-3">
              {[62, 84, 45, 96, 71].map((v, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-2.5 rounded-full bg-[color:var(--bg-muted)] flex-1 overflow-hidden">
                    <div className="h-full rounded-full bg-blue-600" style={{ width: `${v}%` }} />
                  </div>
                  <span className="text-xs text-[color:var(--text-tertiary)] w-8 text-right">{v}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-[color:var(--border)]">
        <div className="max-w-[800px] mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Pronto para modernizar a gestão do seu estoque?
          </h2>
          <p className="mt-4 text-[color:var(--text-secondary)]">
            Acesse o protótipo navegável do StockIQ e explore o dashboard, os cadastros e o módulo de IA.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link href="/login">
              <Button size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Acessar o sistema
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="sobre" className="border-t border-[color:var(--border)] py-12">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <Boxes className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold leading-none">StockIQ</p>
              <p className="text-xs text-[color:var(--text-tertiary)] mt-0.5">WMS · ERP Lite</p>
            </div>
          </div>

          <p className="text-xs text-[color:var(--text-tertiary)] text-center">
            Projeto Integrador · FATEC Franca — Desenvolvimento de Software Multiplataforma<br />
            Gabriel da Silveira Pessoni e Lívia Portela Ferreira
          </p>

          <div className="flex items-center gap-4 text-[color:var(--text-tertiary)]">
            <span className="text-xs">© 2026 StockIQ</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
