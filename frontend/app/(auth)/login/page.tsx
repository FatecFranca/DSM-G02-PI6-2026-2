'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Boxes, ArrowRight, ShieldCheck, Zap, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/cn'

const features = [
  { icon: ShieldCheck, title: 'WMS Completo', desc: 'Gestão por endereço, corredor, prateleira e posição' },
  { icon: Zap, title: 'IA Integrada', desc: 'Identificação automática e previsão de demanda' },
  { icon: BarChart3, title: 'Analytics Avançado', desc: 'Curva ABC, giro de estoque e mapa de calor' },
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('carlos.silva@empresa.com.br')
  const [password, setPassword] = useState('••••••••')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await new Promise(r => setTimeout(r, 800))
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col w-[520px] bg-[#0f172a] relative overflow-hidden p-12">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-violet-600/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <Boxes className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-none">StockIQ</p>
              <p className="text-white/40 text-xs">WMS · ERP Lite</p>
            </div>
          </div>

          {/* Hero text */}
          <div className="mt-24 mb-10">
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              Gestão de estoque<br />
              <span className="text-blue-400">inteligente</span> e precisa.
            </h1>
            <p className="text-white/50 text-base leading-relaxed">
              Controle total do seu almoxarifado com WMS avançado, rastreabilidade por lote e inteligência artificial.
            </p>
          </div>

          {/* Features */}
          <div className="mt-auto space-y-4">
            {features.map(f => (
              <div key={f.title} className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{f.title}</p>
                  <p className="text-white/40 text-xs mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Clients */}
         
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[color:var(--bg-subtle)]">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Boxes className="w-4 h-4 text-white" />
            </div>
            <p className="font-bold text-[color:var(--text-primary)]">StockIQ</p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[color:var(--text-primary)]">Bem-vindo de volta</h2>
            <p className="text-sm text-[color:var(--text-secondary)] mt-1">Acesse sua conta para continuar</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="E-mail corporativo"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@empresa.com.br"
              required
            />
            <div>
              <Input
                label="Senha"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Sua senha"
                required
                rightIcon={
                  <button type="button" onClick={() => setShowPass(v => !v)} className="cursor-pointer">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
              <div className="flex justify-end mt-1.5">
                <button type="button" className="text-xs text-[color:var(--brand)] hover:underline">
                  Esqueci minha senha
                </button>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              loading={loading}
              className="w-full mt-2"
              rightIcon={!loading ? <ArrowRight className="w-4 h-4" /> : undefined}
            >
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-6 p-4 rounded-[var(--radius-lg)] bg-[color:var(--brand-subtle)] border border-[color:var(--brand-muted)]">
            <p className="text-xs text-[color:var(--brand)] font-medium mb-1">Acesso de demonstração</p>
            <p className="text-xs text-[color:var(--text-secondary)]">
              E-mail: <span className="font-mono">carlos.silva@empresa.com.br</span><br />
              Senha: qualquer valor
            </p>
          </div>

          <p className="text-center text-xs text-[color:var(--text-tertiary)] mt-8">
            © 2026 StockIQ · Todos os direitos reservados
          </p>
        </div>
      </div>
    </div>
  )
}
