import { useLocalSearchParams } from 'expo-router'
import { MovementForm } from '@/components/MovementForm'
import { RequireRole } from '@/components/RequireRole'
import { WRITERS } from '@/lib/permissions'

export default function NovaEntradaScreen() {
  const { productId } = useLocalSearchParams<{ productId?: string }>()
  return <RequireRole roles={WRITERS}><MovementForm kind="entry" productId={productId} /></RequireRole>
}
