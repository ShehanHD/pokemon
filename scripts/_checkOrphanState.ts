import 'dotenv/config'
import { getDb } from '../lib/db'
async function main() {
  const db = await getDb()
  const sets = db.collection('sets')
  for (const id of ['me01','me02.5','me03','sv10.5w','sv03','sv04','sv08.5','sv09']) {
    const docs = await sets.find({ $or: [{ tcgdex_id: id }, { pokemontcg_id: id }] }, { projection: { pokemontcg_id: 1, tcgdex_id: 1, name: 1 } }).toArray()
    console.log(`${id}:`, JSON.stringify(docs))
  }
  for (const id of ['me1','me2pt5','me3','rsv10pt5','sv3','sv4','sv8pt5','sv9']) {
    const docs = await sets.find({ pokemontcg_id: id }, { projection: { pokemontcg_id: 1, tcgdex_id: 1, name: 1 } }).toArray()
    console.log(`legacy ${id}:`, JSON.stringify(docs))
  }
}
main().then(()=>process.exit(0))
