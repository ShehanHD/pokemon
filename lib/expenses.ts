import { ObjectId } from 'mongodb'
import { getDb } from './db'
import type {
  Expense,
  UnifiedExpenseRow,
  ExpenseCategory,
  PokemonCard,
} from './types'
import {
  addExpenseInputSchema,
  updateExpenseInputSchema,
  type AddExpenseInput,
  type UpdateExpenseInput,
} from './schemas/expense'

function serialize(doc: Record<string, unknown>): Expense {
  const { _id, ...rest } = doc
  return { _id: String(_id), ...rest } as Expense
}

function toObjectId(id: string): ObjectId {
  if (!ObjectId.isValid(id)) throw new Error(`Invalid id: ${id}`)
  return new ObjectId(id)
}

export async function addExpense(
  userId: string,
  input: AddExpenseInput,
): Promise<Expense> {
  const parsed = addExpenseInputSchema.parse(input)
  const db = await getDb()
  const now = new Date()
  const doc = {
    userId,
    amount: parsed.amount,
    date: parsed.date,
    category: parsed.category,
    ...(parsed.note ? { note: parsed.note } : {}),
    ...(parsed.cardId ? { cardId: parsed.cardId } : {}),
    createdAt: now,
    updatedAt: now,
  }
  const res = await db.collection('expenses').insertOne(doc)
  return { ...doc, _id: String(res.insertedId) }
}

export async function updateExpense(
  userId: string,
  input: UpdateExpenseInput,
): Promise<Expense | null> {
  const parsed = updateExpenseInputSchema.parse(input)
  const { id, cardId, ...rest } = parsed
  const db = await getDb()

  const set: Record<string, unknown> = { ...rest, updatedAt: new Date() }
  const unset: Record<string, ''> = {}
  if (cardId === null) unset.cardId = ''
  else if (cardId !== undefined) set.cardId = cardId

  const update: Record<string, unknown> = { $set: set }
  if (Object.keys(unset).length > 0) update.$unset = unset

  const res = await db
    .collection('expenses')
    .findOneAndUpdate(
      { _id: toObjectId(id), userId },
      update,
      { returnDocument: 'after' },
    )
  return res ? serialize(res as Record<string, unknown>) : null
}

export async function removeExpense(
  userId: string,
  id: string,
): Promise<{ ok: true }> {
  const db = await getDb()
  await db.collection('expenses').deleteOne({ _id: toObjectId(id), userId })
  return { ok: true }
}

export async function getExpenseById(
  userId: string,
  id: string,
): Promise<Expense | null> {
  const db = await getDb()
  const doc = await db
    .collection('expenses')
    .findOne({ _id: toObjectId(id), userId })
  return doc ? serialize(doc as Record<string, unknown>) : null
}

interface UnifiedTotals {
  total: number
  expenseTotal: number
  cardCostTotal: number
  count: number
}

export async function getUnifiedExpenses(
  userId: string,
): Promise<{ rows: UnifiedExpenseRow[]; totals: UnifiedTotals }> {
  const db = await getDb()

  const [expenseDocs, cardRows] = await Promise.all([
    db
      .collection('expenses')
      .aggregate<Record<string, unknown>>([
        { $match: { userId } },
        {
          $lookup: {
            from: 'cards',
            localField: 'cardId',
            foreignField: 'pokemontcg_id',
            as: 'card',
          },
        },
        {
          $addFields: {
            card: { $arrayElemAt: ['$card', 0] },
          },
        },
      ])
      .toArray(),
    db
      .collection('userCards')
      .aggregate<Record<string, unknown>>([
        { $match: { userId, cost: { $gt: 0 } } },
        {
          $lookup: {
            from: 'cards',
            localField: 'cardId',
            foreignField: 'pokemontcg_id',
            as: 'card',
          },
        },
        {
          $addFields: {
            card: { $arrayElemAt: ['$card', 0] },
          },
        },
      ])
      .toArray(),
  ])

  const expenseRows: UnifiedExpenseRow[] = expenseDocs.map((d) => {
    const card = d.card as Record<string, unknown> | undefined
    return {
      id: String(d._id),
      source: 'expense',
      date: d.date as Date,
      category: d.category as ExpenseCategory,
      amount: d.amount as number,
      note: d.note as string | undefined,
      cardId: d.cardId as string | undefined,
      cardName: card ? (card.name as string) : undefined,
      cardImageUrl: card ? (card.imageUrl as string) : undefined,
    }
  })

  const cardCostRows: UnifiedExpenseRow[] = cardRows.map((d) => {
    const card = d.card as Record<string, unknown> | undefined
    return {
      id: `card:${String(d._id)}`,
      source: 'card',
      date: (d.acquiredAt as Date) ?? (d.createdAt as Date),
      category: 'purchase',
      amount: d.cost as number,
      note: d.notes as string | undefined,
      cardId: d.cardId as string,
      cardName: card ? (card.name as string) : undefined,
      cardImageUrl: card ? (card.imageUrl as string) : undefined,
    }
  })

  const rows = [...expenseRows, ...cardCostRows].sort(
    (a, b) => b.date.getTime() - a.date.getTime(),
  )

  const expenseTotal = expenseRows.reduce((acc, r) => acc + r.amount, 0)
  const cardCostTotal = cardCostRows.reduce((acc, r) => acc + r.amount, 0)

  return {
    rows,
    totals: {
      total: expenseTotal + cardCostTotal,
      expenseTotal,
      cardCostTotal,
      count: rows.length,
    },
  }
}

export async function getRecentUnifiedExpenses(
  userId: string,
  limit: number,
): Promise<UnifiedExpenseRow[]> {
  const { rows } = await getUnifiedExpenses(userId)
  return rows.slice(0, limit)
}

export async function getTotalSpend(userId: string): Promise<number> {
  const db = await getDb()
  const [exp] = await db
    .collection('expenses')
    .aggregate<{ total: number }>([
      { $match: { userId } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
      { $project: { _id: 0, total: 1 } },
    ])
    .toArray()
  const [cards] = await db
    .collection('userCards')
    .aggregate<{ total: number }>([
      { $match: { userId } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$cost', 0] } } } },
      { $project: { _id: 0, total: 1 } },
    ])
    .toArray()
  return (exp?.total ?? 0) + (cards?.total ?? 0)
}

export async function getCardForLink(
  cardId: string,
): Promise<Pick<PokemonCard, 'pokemontcg_id' | 'name' | 'imageUrl'> | null> {
  const db = await getDb()
  const doc = await db
    .collection('cards')
    .findOne(
      { pokemontcg_id: cardId },
      { projection: { pokemontcg_id: 1, name: 1, imageUrl: 1 } },
    )
  if (!doc) return null
  return {
    pokemontcg_id: doc.pokemontcg_id as string,
    name: doc.name as string,
    imageUrl: doc.imageUrl as string,
  }
}
