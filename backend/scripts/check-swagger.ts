import 'dotenv/config'
import app from '../src/app'
import { swaggerSpec } from '../src/config/swagger'

const actual = new Set<string>()
function walk(stack: any[], prefix: string) {
  for (const l of stack) {
    if (l.route) {
      for (const m of Object.keys(l.route.methods)) actual.add(`${m.toUpperCase()} ${prefix}${l.route.path === '/' ? '' : l.route.path}`)
    } else if (l.name === 'router' && l.handle.stack) {
      const m = l.regexp.source.match(/^\^\\\/(.*?)\\\/\?\(\?=\\\/\|\$\)/)
      walk(l.handle.stack, prefix + (m ? '/' + m[1].replace(/\\\//g, '/') : ''))
    }
  }
}
walk((app as any)._router.stack, '')
const doc = new Set<string>()
for (const [p, ops] of Object.entries((swaggerSpec as any).paths ?? {}))
  for (const m of Object.keys(ops as object)) doc.add(`${m.toUpperCase()} ${p.replace(/\{(\w+)\}/g, ':$1')}`)
const norm = (s: string) => s.replace(/:\w+/g, ':p')
const docN = new Set([...doc].map(norm))
const actN = new Set([...actual].filter(a => a.includes('/api/')).map(norm))
console.log('UNDOCUMENTED:', [...actual].filter(a => a.includes('/api/') && !docN.has(norm(a))))
console.log('DOCUMENTED BUT MISSING:', [...doc].filter(d => !actN.has(norm(d))))
console.log('total actual', actN.size, 'documented', doc.size)
process.exit(0)
