import { useLocalSearchParams } from 'expo-router'
import { MovementForm } from '@/components/MovementForm'
import { RequireRole } from '@/components/RequireRole'
import { WRITERS } from '@/lib/permissions'

export default function NovaSaidaScreen() {
  const { productId } = useLocalSearchParams<{ productId?: string }>()
  return <RequireRole roles={WRITERS}><MovementForm kind="exit" productId={productId} /></RequireRole>
}
