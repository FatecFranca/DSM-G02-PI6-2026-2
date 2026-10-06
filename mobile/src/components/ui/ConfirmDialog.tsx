import { Sheet } from './Sheet'
import { Button } from './Button'
import { AppText } from './Text'

interface ConfirmDialogProps {
  visible: boolean
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  loading?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({ visible, title, message, confirmLabel = 'Confirmar', danger = true, loading, onConfirm, onClose }: ConfirmDialogProps) {
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button title="Cancelar" variant="outline" onPress={onClose} disabled={loading} />
          <Button title={confirmLabel} variant={danger ? 'danger' : 'primary'} onPress={onConfirm} loading={loading} />
        </>
      }
    >
      <AppText color="secondary">{message}</AppText>
    </Sheet>
  )
}
