import { Router } from 'express'
import * as ctrl from '../controllers/file.controller'

const router = Router()

// Sem autenticação por JWT: o acesso é controlado pela assinatura temporária da URL (<img> não envia Authorization).
router.get('/*', ctrl.serve)

export default router
