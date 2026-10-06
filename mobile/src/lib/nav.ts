import type { IconName } from '@/components/ui/Icon'
import type { UserRole } from '@/types/user'

export interface MenuItem {
  label: string
  href: string
  icon: IconName
  desc: string
  roles?: UserRole[]
}

export interface MenuGroup {
  label: string
  items: MenuItem[]
}

/** Menu completo (espelha NAV_GROUPS do web). As abas cobrem Dashboard, Produtos, Movimentar e Alertas. */
export const MENU: MenuGroup[] = [
  {
    label: 'Catálogo',
    items: [
      { label: 'Categorias', href: '/categorias', icon: 'tag', desc: 'Agrupamento de produtos' },
      { label: 'Marcas', href: '/marcas', icon: 'award', desc: 'Fabricantes e marcas' },
      { label: 'Fornecedores', href: '/fornecedores', icon: 'truck', desc: 'Cadastro de fornecedores' },
      { label: 'Clientes', href: '/clientes', icon: 'users', desc: 'Cadastro de clientes' },
    ],
  },
  {
    label: 'Movimentações',
    items: [
      { label: 'Entradas', href: '/entradas', icon: 'arrow-down-circle', desc: 'Recebimentos de mercadoria' },
      { label: 'Saídas', href: '/saidas', icon: 'arrow-up-circle', desc: 'Vendas, perdas e consumo' },
      { label: 'Histórico', href: '/movimentacoes', icon: 'clock', desc: 'Todas as movimentações' },
      { label: 'Lotes', href: '/lotes', icon: 'layers', desc: 'Validade e rastreabilidade' },
    ],
  },
  {
    label: 'WMS',
    items: [
      { label: 'Endereços', href: '/enderecos', icon: 'map-pin', desc: 'Mapa do armazém' },
      { label: 'Inventário', href: '/inventario', icon: 'clipboard', desc: 'Contagens e divergências' },
      { label: 'Scanner', href: '/scanner', icon: 'maximize', desc: 'Leitura de código de barras' },
    ],
  },
  {
    label: 'Inteligência',
    items: [
      { label: 'IA — Produtos', href: '/ia', icon: 'image', desc: 'Identificação por foto' },
      { label: 'IA Analítica', href: '/ia-analitica', icon: 'cpu', desc: 'Previsão e sugestões de compra' },
      { label: 'Relatórios', href: '/relatorios', icon: 'file-text', desc: 'Relatórios e exportação' },
    ],
  },
  {
    label: 'Administração',
    items: [
      { label: 'Usuários', href: '/usuarios', icon: 'user-check', desc: 'Contas e perfis de acesso', roles: ['admin', 'supervisor'] },
      { label: 'Auditoria', href: '/auditoria', icon: 'shield', desc: 'Quem alterou o quê', roles: ['admin', 'supervisor'] },
      { label: 'Configurações', href: '/configuracoes', icon: 'settings', desc: 'Perfil, segurança e aparência' },
    ],
  },
]
