import { MovementList } from '@/components/MovementList'

export default function SaidasScreen() {
  return <MovementList types="exit,loss" newHref="/saidas/nova" csvName="saidas.csv" icon="arrow-up-circle" labels={{ today: 'Saídas', units: 'Unidades', value: 'Valor expedido' }} />
}
