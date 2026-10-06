import { MovementList } from '@/components/MovementList'

export default function EntradasScreen() {
  return <MovementList types="entry" newHref="/entradas/nova" csvName="entradas.csv" icon="arrow-down-circle" labels={{ today: 'Entradas', units: 'Unidades', value: 'Valor recebido' }} />
}
