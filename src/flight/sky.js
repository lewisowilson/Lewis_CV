// Live sky: real sun position + live weather over the archipelago pick the hero's mood.
// dawn / day / dusk / night / fog. A manual switch in the HUD lets people try every mode.
const PLACE = { name: 'SANDHAMN', lat: 59.29, lon: 18.91 } // outer Stockholm archipelago

/** Solar elevation in degrees (NOAA approximation, good to ~0.5°). */
export function sunElevation(date, lat, lon) {
  const rad = Math.PI / 180
  const jd = date.getTime() / 86400000 + 2440587.5
  const n = jd - 2451545.0
  const L = (280.46 + 0.9856474 * n) % 360
  const g = ((357.528 + 0.9856003 * n) % 360) * rad
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad
  const eps = (23.439 - 0.0000004 * n) * rad
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda))
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda))
  const gmst = (18.697374558 + 24.06570982441908 * n) % 24
  const ha = ((gmst * 15 + lon) * rad) - ra
  return Math.asin(Math.sin(lat * rad) * Math.sin(dec) + Math.cos(lat * rad) * Math.cos(dec) * Math.cos(ha)) / rad
}

export function modeFor(date, weather) {
  if (weather && (weather.code === 45 || weather.code === 48 || (weather.visibility ?? 99999) < 1500)) return 'fog'
  const el = sunElevation(date, PLACE.lat, PLACE.lon)
  const before = sunElevation(new Date(date.getTime() - 20 * 60000), PLACE.lat, PLACE.lon)
  const rising = el > before
  if (el < -7) return 'night'
  if (el < 7) return rising ? 'dawn' : 'dusk'
  return 'day'
}

async function fetchWeather() {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${PLACE.lat}&longitude=${PLACE.lon}&current=temperature_2m,weather_code,wind_speed_10m,visibility,cloud_cover&wind_speed_unit=ms`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) return null
    const c = (await res.json()).current
    return { temp: c.temperature_2m, code: c.weather_code, wind: c.wind_speed_10m, visibility: c.visibility, cloud: c.cloud_cover }
  } catch {
    return null
  }
}

export const MODES = ['live', 'dawn', 'day', 'dusk', 'night', 'fog']

export async function initSky({ onMode, readout }) {
  let weather = null
  let override = 'live'
  try {
    override = localStorage.getItem('lw-sky') || 'live'
  } catch {
    /* storage blocked */
  }
  const apply = () => {
    const mode = override === 'live' ? modeFor(new Date(), weather) : override
    document.documentElement.dataset.sky = mode
    onMode?.(mode, override)
  }
  apply()
  weather = await fetchWeather()
  if (weather && readout) {
    readout.textContent = `${PLACE.name} · ${Math.round(weather.temp)}°C · WIND ${Math.round(weather.wind)} M/S`
  }
  apply()
  setInterval(apply, 5 * 60_000)
  return {
    place: PLACE,
    cycle() {
      override = MODES[(MODES.indexOf(override) + 1) % MODES.length]
      try {
        localStorage.setItem('lw-sky', override)
      } catch {
        /* ignore */
      }
      apply()
      return override
    },
    get override() {
      return override
    },
  }
}
