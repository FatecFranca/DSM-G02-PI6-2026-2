import { ReactElement, ReactNode } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Banner, EmptyState, SkeletonList } from '@/components/ui'
import type { IconName } from '@/components/ui/Icon'
import type { PagedState } from '@/lib/usePaged'
import { useTheme } from '@/theme/ThemeProvider'
import { space } from '@/theme/tokens'

interface Props<T> {
  state: PagedState<T>
  renderItem: (item: T, index: number) => ReactElement
  keyExtractor: (item: T) => string
  /** Busca, filtros, resumo… (rola junto com a lista). */
  header?: ReactNode
  empty?: { title: string; description?: string; icon?: IconName; action?: ReactNode }
  /** Espaço extra no fim para não ficar sob o botão flutuante. */
  fab?: boolean
}

/** Lista com puxar-para-atualizar, rolagem infinita, esqueleto, erro e estado vazio. */
export function ListScreen<T>({ state, renderItem, keyExtractor, header, empty, fab }: Props<T>) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.bgSubtle }}
      data={state.items}
      keyExtractor={keyExtractor}
      renderItem={({ item, index }) => renderItem(item, index)}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: space.lg, gap: space.sm, paddingBottom: insets.bottom + (fab ? 96 : space.xxl) }}
      ListHeaderComponent={
        <View style={{ gap: space.md, marginBottom: space.sm }}>
          {header}
          {state.error ? <Banner onRetry={state.reload}>{state.error}</Banner> : null}
        </View>
      }
      ListEmptyComponent={
        state.loading ? <SkeletonList rows={6} /> : state.error ? null : (
          <EmptyState icon={empty?.icon ?? 'inbox'} title={empty?.title ?? 'Nada por aqui'} description={empty?.description} action={empty?.action} />
        )
      }
      ListFooterComponent={state.loadingMore ? <ActivityIndicator style={styles.footer} color={colors.brand} /> : null}
      onEndReached={state.loadMore}
      onEndReachedThreshold={0.4}
      refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={state.refresh} tintColor={colors.brand} colors={[colors.brand]} />}
    />
  )
}

const styles = StyleSheet.create({ footer: { paddingVertical: space.lg } })
