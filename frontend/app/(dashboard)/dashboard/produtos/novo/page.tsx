'use client'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ProductForm } from '@/components/products/ProductForm'

export default function NovoProdutoPage() {
  // useSearchParams exige um limite de Suspense no App Router.
  return <Suspense fallback={null}><NovoProduto /></Suspense>
}

/** Aceita ?name, ?description, ?categoryId e ?brandId para pré-preencher (ex.: vindo da IA — Produtos). */
function NovoProduto() {
  const params = useSearchParams()
  return (
    <ProductForm
      prefill={{
        name: params.get('name') ?? undefined,
        description: params.get('description') ?? undefined,
        categoryId: params.get('categoryId') ?? undefined,
        brandId: params.get('brandId') ?? undefined,
      }}
    />
  )
}
