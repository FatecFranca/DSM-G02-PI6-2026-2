import { Href, useRouter } from 'expo-router'
import { useCallback } from 'react'

/**
 * Volta para a tela anterior; se não houver histórico (tela aberta por link direto ou depois de
 * recarregar no web), vai para `fallback`. `router.back()` sozinho não faz nada nesse caso.
 */
export function useSafeBack(fallback: Href) {
  const router = useRouter()
  return useCallback(() => {
    if (router.canGoBack()) router.back()
    else router.replace(fallback)
  }, [router, fallback])
}
