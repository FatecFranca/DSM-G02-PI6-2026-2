import { Request, Response, NextFunction } from 'express'
import * as service from '../services/customer.service'

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.listCustomers(req.query as any))
  } catch (err) {
    next(err)
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const customer = await service.getCustomerById(req.params.id as string)
    if (!customer) {
      res.status(404).json({ message: 'Cliente não encontrado' })
      return
    }
    res.json(customer)
  } catch (err) {
    next(err)
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const customer = await service.createCustomer(req.body)
    res.status(201).json(customer)
  } catch (err) {
    next(err)
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const customer = await service.updateCustomer(req.params.id as string, req.body)
    res.json(customer)
  } catch (err) {
    next(err)
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await service.removeCustomer(req.params.id as string)
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}
