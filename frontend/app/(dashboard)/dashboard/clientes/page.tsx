'use client'
import { PartnerManager, CUSTOMERS_CONFIG } from '@/components/partners/PartnerManager'

export default function ClientesPage() {
  return <PartnerManager config={CUSTOMERS_CONFIG} />
}
