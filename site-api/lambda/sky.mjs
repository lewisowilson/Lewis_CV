// WebSocket "multiplayer sky": every visitor is a paper plane; positions are relayed to everyone else.
// Messages carry only a section id, a relative position and an optional 3-letter origin code. No personal data.
const MAX_PEERS = 60

export function sanitise(msg) {
  if (!msg || msg.t !== 'move') return null
  const num = (v) => (Number.isFinite(v) ? Math.max(0, Math.min(1, +v)) : null)
  const rx = num(msg.rx)
  const ry = num(msg.ry)
  const s = typeof msg.s === 'string' && /^[a-z]{2,16}$/.test(msg.s) ? msg.s : null
  if (rx === null || ry === null || !s) return null
  const c = typeof msg.c === 'string' && /^[A-Z]{3}$/.test(msg.c) ? msg.c : ''
  return { t: 'move', rx: +rx.toFixed(4), ry: +ry.toFixed(4), s, c }
}

export const handler = async (event) => {
  const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb')
  const { DynamoDBDocumentClient, PutCommand, DeleteCommand, ScanCommand } = await import('@aws-sdk/lib-dynamodb')
  const { ApiGatewayManagementApiClient, PostToConnectionCommand } = await import('@aws-sdk/client-apigatewaymanagementapi')
  const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
  const Table = process.env.TABLE
  const { routeKey, connectionId, domainName, stage } = event.requestContext

  if (routeKey === '$connect') {
    await ddb.send(new PutCommand({ TableName: Table, Item: { pk: connectionId, ttl: Math.floor(Date.now() / 1000) + 2 * 3600 } }))
    return { statusCode: 200 }
  }
  if (routeKey === '$disconnect') {
    await ddb.send(new DeleteCommand({ TableName: Table, Key: { pk: connectionId } }))
    return { statusCode: 200 }
  }
  let msg
  try {
    msg = sanitise(JSON.parse(event.body))
  } catch {
    msg = null
  }
  if (!msg) return { statusCode: 400 }
  const peers = (await ddb.send(new ScanCommand({ TableName: Table, Limit: MAX_PEERS, ProjectionExpression: 'pk' }))).Items ?? []
  const api = new ApiGatewayManagementApiClient({ endpoint: `https://${domainName}/${stage}` })
  const data = JSON.stringify({ ...msg, id: connectionId.slice(-8), n: peers.length })
  await Promise.all(
    peers
      .filter((p) => p.pk !== connectionId)
      .map((p) =>
        api.send(new PostToConnectionCommand({ ConnectionId: p.pk, Data: data })).catch((e) => {
          if (e.$metadata?.httpStatusCode === 410) return ddb.send(new DeleteCommand({ TableName: Table, Key: { pk: p.pk } }))
        }),
      ),
  )
  return { statusCode: 200 }
}
