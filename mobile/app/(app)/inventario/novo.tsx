import { useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'
import { RequireRole } from '@/components/RequireRole'
import { AppText, Badge, Banner, Button, Card, CardHeader, DateField, Icon, Input, Screen, SearchBar, Select } from '@/components/ui'
import { api, errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { brDateToIso } from '@/lib/format'
import { INVENTORY_TYPES } from '@/lib/inventory'
import { STAFF } from '@/lib/permissions'
import { useDebounced } from '@/lib/useFetch'
import { useSafeBack } from '@/lib/useSafeBack'
import { useTheme } from '@/theme/ThemeProvider'
import { space } from '@/theme/tokens'
import type { ApiProduct, Paginated } from '@/types/api'

type InvType = keyof typeof INVENTORY_TYPES

const today = () => {
  const d = new Date()
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export default function NovoInventarioScreen() {
  return <RequireRole roles={STAFF}><Form /></RequireRole>
}

function Form() {
  const goBack = useSafeBack('/inventario')
  const { user } = useAuth()
  const { colors } = useTheme()
  const [name, setName] = useState('')
  const [type, setType] = useState<InvType>('full')
  const [startDate, setStartDate] = useState(today())
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<ApiProduct[]>([])
  const [selected, setSelected] = useState<ApiProduct[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const debounced = useDebounced(search, 250)

  useEffect(() => {
    if (type === 'full') return
    let cancelled = false
    api.get<Paginated<ApiProduct>>('/products', { search: debounced.trim() || undefined, status: 'active', limit: 20 })
      .then(r => { if (!cancelled) setResults(r.data) }).catch(() => { if (!cancelled) setResults([]) })
    return () => { cancelled = true }
  }, [type, debounced])

  const toggle = (p: ApiProduct) => setSelected(prev => (prev.some(x => x.id === p.id) ? prev.filter(x => x.id !== p.id) : [...prev, p]))

  async function save() {
    const iso = brDateToIso(startDate)
    if (name.trim().length < 2) return setError('Informe o nome do inventário.')
    if (!iso) return setError('Data de início inválida (DD/MM/AAAA).')
    if (type !== 'full' && selected.length === 0) return setError('Selecione ao menos um produto para inventários parciais ou cíclicos.')
    setSaving(true)
    setError('')
    try {
      await api.post('/inventory', {
        name: name.trim(), type, startDate: iso, responsibleId: user!.id,
        ...(type === 'full' ? {} : { productIds: selected.map(p => p.id) }),
      })
      goBack()
    } catch (err) {
      setError(errorMessage(err, 'Falha ao criar inventário'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Screen footer={<><Button title="Cancelar" variant="outline" onPress={() => goBack()} disabled={saving} /><Button title="Criar inventário" icon="check" onPress={save} loading={saving} style={{ flex: 1 }} /></>}>
      {error ? <Banner>{error}</Banner> : null}
      <Card>
        <CardHeader title="Dados" description="Os itens são gerados com o estoque atual de cada produto" />
        <View style={{ gap: space.md }}>
          <Input label="Nome do inventário *" value={name} onChangeText={setName} placeholder="Ex.: Inventário Geral Outubro/2026" />
          <Select label="Tipo" value={type} onChange={v => { setType(v as InvType); setSelected([]) }} options={[
            { value: 'full', label: 'Completo — todos os produtos ativos' },
            { value: 'partial', label: 'Parcial — produtos selecionados' },
            { value: 'cyclic', label: 'Cíclico — rotativo por produtos' },
          ]} />
          <DateField label="Data de início" value={startDate} onChangeText={setStartDate} />
        </View>
      </Card>

      {type !== 'full' ? (
        <Card>
          <CardHeader title="Produtos" description={`${selected.length} selecionado(s)`} />
          {selected.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: space.md }}>
              {selected.map(p => (
                <Pressable key={p.id} onPress={() => toggle(p)} accessibilityLabel={`Remover ${p.name}`}><Badge label={`${p.internalCode} ✕`} tone="brand" /></Pressable>
              ))}
            </View>
          ) : null}
          <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar produto para adicionar" />
          <View style={{ marginTop: space.sm }}>
            {results.map(p => {
              const on = selected.some(x => x.id === p.id)
              return (
                <Pressable key={p.id} onPress={() => toggle(p)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <Icon name={on ? 'check-square' : 'square'} size={18} color={on ? 'brand' : 'tertiary'} />
                  <View style={{ flex: 1 }}>
                    <AppText bold numberOfLines={1}>{p.name}</AppText>
                    <AppText variant="caption" color="tertiary">{p.internalCode} · estoque {p.currentStock}</AppText>
                  </View>
                </Pressable>
              )
            })}
          </View>
        </Card>
      ) : null}
    </Screen>
  )
}
