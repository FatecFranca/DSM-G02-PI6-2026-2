import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'

/**
 * Armazenamento chave/valor: SecureStore (Keychain/Keystore) no celular e localStorage no web
 * (o SecureStore não existe no navegador). Nunca lança: falhas viram `null`.
 */
export async function getItem(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(key) ?? null
    return await SecureStore.getItemAsync(key)
  } catch {
    return null
  }
}

export async function setItem(key: string, value: string | null): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (value === null) globalThis.localStorage?.removeItem(key)
      else globalThis.localStorage?.setItem(key, value)
      return
    }
    if (value === null) await SecureStore.deleteItemAsync(key)
    else await SecureStore.setItemAsync(key, value)
  } catch {
    // armazenamento indisponível: o app continua funcionando sem persistir
  }
}
