'use client'
import { PartnerManager, SUPPLIERS_CONFIG } from '@/components/partners/PartnerManager'

export default function FornecedoresPage() {
  return <PartnerManager config={SUPPLIERS_CONFIG} />
}
