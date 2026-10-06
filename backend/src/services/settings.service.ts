import { prisma } from '../prisma/client'
import { Company, Preferences, UpdateSettingsInput } from '../schemas/settings.schema'

const DEFAULT_COMPANY: Company = {
  legalName: 'StockIQ Sistemas de Gestão Ltda',
  tradeName: 'StockIQ',
  cnpj: '',
  email: '',
  phone: '',
  website: '',
  address: '',
  zip: '',
  city: '',
  state: '',
}

const DEFAULT_PREFERENCES: Preferences = { expiryAlertDays: 30, leadTimeDays: 7 }

let cachedPreferences: { value: Preferences; at: number } | null = null
const CACHE_MS = 30_000

async function read<T extends object>(key: string, fallback: T): Promise<T> {
  const row = await prisma.setting.findUnique({ where: { key } })
  return { ...fallback, ...((row?.value as Partial<T> | undefined) ?? {}) }
}

export async function getSettings() {
  const [company, preferences] = await Promise.all([
    read('company', DEFAULT_COMPANY),
    read('preferences', DEFAULT_PREFERENCES),
  ])
  return { company, preferences }
}

export async function updateSettings(input: UpdateSettingsInput) {
  const current = await getSettings()
  const company = { ...current.company, ...input.company }
  const preferences = { ...current.preferences, ...input.preferences }

  await prisma.$transaction([
    prisma.setting.upsert({ where: { key: 'company' }, create: { key: 'company', value: company }, update: { value: company } }),
    prisma.setting.upsert({ where: { key: 'preferences' }, create: { key: 'preferences', value: preferences }, update: { value: preferences } }),
  ])
  cachedPreferences = null
  return { company, preferences }
}

export async function getPreferences(): Promise<Preferences> {
  if (!cachedPreferences || Date.now() - cachedPreferences.at > CACHE_MS) {
    cachedPreferences = { value: await read('preferences', DEFAULT_PREFERENCES), at: Date.now() }
  }
  return cachedPreferences.value
}

/** Expiry window in days, cached briefly because lots/alerts/dashboard read it on every request. */
export async function getExpiryAlertDays(): Promise<number> {
  return (await getPreferences()).expiryAlertDays
}
