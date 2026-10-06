// POST /pass-request: a recruiter asks for a printed boarding pass by post.
// Stored for 120 days (then deleted automatically) and emailed to Lewis via SNS.
import { createHash, randomUUID } from 'node:crypto'

const LIMITS = { name: 80, company: 100, line1: 120, line2: 120, city: 80, postcode: 16, country: 60, note: 300 }
const REQUIRED = ['name', 'line1', 'city', 'postcode', 'country']

export function validate(input) {
  if (!input || typeof input !== 'object') return { error: 'Invalid request' }
  if (input.website) return { spam: true } // honeypot field, invisible to people
  const out = {}
  for (const [k, max] of Object.entries(LIMITS)) {
    const v = typeof input[k] === 'string' ? input[k].trim().replace(/\s+/g, ' ') : ''
    if (v.length > max) return { error: `${k} is too long` }
    if (REQUIRED.includes(k) && !v) return { error: `Please add your ${k === 'line1' ? 'address' : k}` }
    out[k] = v
  }
  return { value: out }
}

// deps are injected so the same code runs on AWS and in the local dev server.
export async function handlePassRequest({ body, ip, now = new Date() }, { putRequest, bumpRate, notify }) {
  let input
  try {
    input = typeof body === 'string' ? JSON.parse(body) : body
  } catch {
    return { status: 400, body: { error: 'Invalid request' } }
  }
  const v = validate(input)
  if (v.spam) return { status: 200, body: { ok: true } }
  if (v.error) return { status: 400, body: { error: v.error } }
  const ipHash = createHash('sha256').update('lw-pass:' + (ip ?? '')).digest('hex').slice(0, 24)
  const count = await bumpRate(`rate#${ipHash}#${now.toISOString().slice(0, 10)}`)
  if (count > 3) return { status: 429, body: { error: 'Too many requests today. Email Lewis instead.' } }
  const item = { pk: 'req#' + randomUUID(), createdAt: now.toISOString(), ttl: Math.floor(now / 1000) + 120 * 86400, ...v.value }
  await putRequest(item)
  const lines = [v.value.name, v.value.company, v.value.line1, v.value.line2, v.value.city, v.value.postcode, v.value.country].filter(Boolean)
  await notify(`Boarding pass request from ${v.value.name}${v.value.company ? ' (' + v.value.company + ')' : ''}`, `Post a printed boarding pass to:\n\n${lines.join('\n')}\n\nNote: ${v.value.note || '-'}\n\nRequested ${item.createdAt}. Stored until it auto-deletes after 120 days.`)
  return { status: 200, body: { ok: true } }
}

export const handler = async (event) => {
  const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb')
  const { DynamoDBDocumentClient, PutCommand, UpdateCommand } = await import('@aws-sdk/lib-dynamodb')
  const { SNSClient, PublishCommand } = await import('@aws-sdk/client-sns')
  const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
  const sns = new SNSClient({})
  const Table = process.env.TABLE
  const r = await handlePassRequest(
    { body: event.body, ip: event.requestContext?.http?.sourceIp },
    {
      putRequest: (Item) => ddb.send(new PutCommand({ TableName: Table, Item })),
      bumpRate: async (pk) => {
        const out = await ddb.send(new UpdateCommand({
          TableName: Table,
          Key: { pk },
          UpdateExpression: 'ADD hits :one SET #t = if_not_exists(#t, :ttl)',
          ExpressionAttributeNames: { '#t': 'ttl' },
          ExpressionAttributeValues: { ':one': 1, ':ttl': Math.floor(Date.now() / 1000) + 2 * 86400 },
          ReturnValues: 'UPDATED_NEW',
        }))
        return out.Attributes.hits
      },
      notify: (Subject, Message) => sns.send(new PublishCommand({ TopicArn: process.env.TOPIC, Subject: Subject.slice(0, 99), Message })),
    },
  )
  return { statusCode: r.status, headers: { 'content-type': 'application/json' }, body: JSON.stringify(r.body) }
}
