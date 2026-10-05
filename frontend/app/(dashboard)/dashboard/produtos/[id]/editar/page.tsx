'use client'
import { use } from 'react'
import { ProductForm } from '@/components/products/ProductForm'
import { PageLoading } from '@/components/ui/Loading'
import { Alert } from '@/components/ui/Alert'
import { useFetch } from '@/hooks/useFetch'
import type { ApiProduct } from '@/types/api'

export default function EditarProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data, loading, error } = useFetch<ApiProduct>(`/products/${id}`)

  if (loading) return <PageLoading rows={4} />
  if (error || !data) return <Alert>{error || 'Produto não encontrado'}</Alert>
  return <ProductForm product={data} />
}
