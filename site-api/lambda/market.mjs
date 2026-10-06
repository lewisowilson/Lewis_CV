// GET /market: FTSE 100 intraday "sea state" for lewis-wilson.com.
// Realised volatility of 5-minute returns, mapped onto the Douglas sea scale (0 glassy .. 6 very rough).
// Cached for 5 minutes per warm Lambda so the upstream is hit rarely.
const URL = 'https://query1.finance.yahoo.com/v8/finance/chart/%5EFTSE?interval=5m&range=1d'
const SCALE = ['Calm (glassy)', 'Calm (rippled)', 'Smooth', 'Slight', 'Moderate', 'Rough', 'Very rough']
let cache = null

const std = (xs) => {
  if (xs.length < 2) return 0
  const m = xs.reduce((a, b) => a + b, 0) / xs.length
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1))
}

export async function marketState(fetchImpl = fetch) {
  if (cache && Date.now() - cache.at < 5 * 60 * 1000) return cache.body
  let body
  try {
    const r = await fetchImpl(URL, { headers: { 'User-Agent': 'Mozilla/5.0 (lewis-wilson.com sea state)' } })
    if (!r.ok) throw new Error('upstream ' + r.status)
    const j = await r.json()
    const res = j.chart.result[0]
    const closes = (res.indicators.quote[0].close ?? []).filter(Number.isFinite)
    const rets = closes.slice(1).map((c, i) => Math.log(c / closes[i]))
    const sd = std(rets)
    // ~0.03% per 5 minutes is a quiet day for the FTSE; ~0.25% is very choppy.
    const state = Math.max(0, Math.min(1, (sd - 0.0002) / 0.0023))
    const scale = Math.round(state * 6)
    const period = res.meta.currentTradingPeriod?.regular
    const now = Date.now() / 1000
    body = {
      index: 'FTSE 100',
      price: res.meta.regularMarketPrice,
      changePct: res.meta.regularMarketChangePercent ?? null,
      sigma5mPct: +(sd * 100).toFixed(3),
      state: +state.toFixed(3),
      douglas: scale,
      label: SCALE[scale],
      open: !!period && now >= period.start && now <= period.end,
      asOf: new Date(res.meta.regularMarketTime * 1000).toISOString(),
    }
  } catch (e) {
    body = { error: 'unavailable' }
  }
  cache = { at: Date.now(), body }
  return body
}

export const handler = async () => ({
  statusCode: 200,
  headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=120' },
  body: JSON.stringify(await marketState()),
})
