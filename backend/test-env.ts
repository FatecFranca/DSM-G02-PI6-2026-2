const testDatabaseUrl = process.env.TEST_DATABASE_URL

if (!testDatabaseUrl) {
  throw new Error(
    'TEST_DATABASE_URL is required. Tests must use a dedicated isolated database.',
  )
}

const databaseName = new URL(testDatabaseUrl).pathname.replace(/^\//, '')
if (!databaseName.toLowerCase().includes('test')) {
  throw new Error('TEST_DATABASE_URL must point to a database with "test" in its name.')
}

process.env.DATABASE_URL = testDatabaseUrl
