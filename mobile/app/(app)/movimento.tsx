import { Stack, useLocalSearchParams } from 'expo-router'
import { MovementForm, FormKind } from '@/components/MovementForm'
import { RequireRole } from '@/components/RequireRole'
import { WRITERS } from '@/lib/permissions'

const TITLES: Record<FormKind, string> = { entry: 'Nova entrada', exit: 'Nova saída', transfer: 'Transferência', adjustment: 'Ajuste de estoque' }

/** Movimentação genérica (transferência/ajuste), chamada a partir do produto, endereços ou scanner. */
export default function MovimentoScreen() {
  const { kind = 'adjustment', productId } = useLocalSearchParams<{ kind?: FormKind; productId?: string }>()
  return (
    <RequireRole roles={WRITERS}>
      <Stack.Screen options={{ title: TITLES[kind] }} />
      <MovementForm kind={kind} productId={productId} />
    </RequireRole>
  )
}
