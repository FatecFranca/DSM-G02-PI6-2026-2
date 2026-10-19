import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { swaggerSpec } from '../src/config/swagger'

/** Exporta a especificação OpenAPI para docs/swagger.json (usada também pelos PDFs de documentação). */
const target = path.resolve(__dirname, '../../docs/swagger.json')
fs.writeFileSync(target, JSON.stringify(swaggerSpec, null, 2) + '\n')
console.log(`Especificação exportada para ${target}`)
