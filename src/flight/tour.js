// Autopilot: the site flies itself. A timed camera path through every section, with captions.
// Any wheel, touch, key or click hands control straight back to the visitor.
import gsap from 'gsap'

const top = (sel) => {
  const el = document.querySelector(sel)
  return el ? el.getBoundingClientRect().top + window.scrollY : 0
}
const bottom = (sel) => {
  const el = document.querySelector(sel)
  return el ? el.getBoundingClientRect().bottom + window.scrollY - window.innerHeight : 0
}

// [from, to, seconds, waypoint, caption, hold-at-end seconds]
function legs() {
  return [
    [0, bottom('.hero'), 7, 'Departure', 'Dawn over the archipelago. Real sky, real time.', 0.4],
    [null, top('#bearing'), 2.2, 'Bearing', 'Maths with Economics at Exeter. Builder by habit.', 2.6],
    [null, top('#atlas'), 2.2, 'Atlas', 'Four islands of skills, each one surveyed.', 2.4],
    [null, bottom('.descent'), 8, 'Descent', 'A LiDAR survey lands on the island.', 0.4],
    [null, top('#work'), 1.6, 'Waypoints', 'Things I have built, as boarding passes.', 3],
    [null, top('#log'), 3, 'Flight log', 'Where I have worked.', 2.4],
    [null, top('#charts'), 2.2, 'Charts', 'Education and certifications.', 2.2],
    [null, top('#logbook'), 2.4, 'Logbook', 'Career terrain: every peak is a real milestone.', 3.2],
    [null, top('#expedition'), 2.4, 'Expedition', 'Somewhere remote, with a map and a canoe.', 2.4],
    [null, top('#arrival'), 2.4, 'Arrival', 'Cleared for departure. Let us talk about 2027-28.', 2],
  ]
}

export function createTour({ lenis }) {
  const ui = document.querySelector('.autopilot')
  const label = ui.querySelector('[data-ap-wp]')
  const caption = ui.querySelector('[data-ap-caption]')
  const bar = ui.querySelector('.autopilot__bar i')
  let tl = null

  const scrollTo = (y) => (lenis ? lenis.scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y))

  function stop() {
    if (!tl) return
    tl.kill()
    tl = null
    ui.classList.remove('is-on')
    document.documentElement.classList.remove('is-autopilot')
    lenis?.start()
    removeEventListener('wheel', stop)
    removeEventListener('touchstart', stop)
    removeEventListener('keydown', onKey)
    removeEventListener('pointerdown', onPointer, true)
  }
  const onKey = (e) => e.key !== 'Shift' && stop()
  const onPointer = (e) => !e.target.closest('.autopilot') && stop()

  function start() {
    if (tl) return
    const path = legs()
    const cam = { y: window.scrollY }
    tl = gsap.timeline({
      onUpdate: () => (bar.style.transform = `scaleX(${tl.progress()})`),
      onComplete: () => {
        caption.textContent = 'Autopilot off. You have control.'
        setTimeout(stop, 1600)
      },
    })
    tl.to(cam, { y: 0, duration: Math.min(1.2, window.scrollY / 2000 + 0.3), ease: 'power2.inOut', onUpdate: () => scrollTo(cam.y) })
    for (const [from, to, dur, wp, text, hold] of path) {
      if (from !== null) tl.set(cam, { y: from })
      tl.call(() => {
        label.textContent = wp
        gsap.fromTo(caption, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.5 })
        caption.textContent = text
      })
      tl.to(cam, { y: to, duration: dur, ease: dur > 5 ? 'none' : 'power2.inOut', onUpdate: () => scrollTo(cam.y) })
      if (hold) tl.to({}, { duration: hold })
    }
    ui.classList.add('is-on')
    document.documentElement.classList.add('is-autopilot')
    // Let the timeline drive, then listen for the visitor taking over (next frame, so the click that started it doesn't stop it).
    requestAnimationFrame(() => {
      addEventListener('wheel', stop, { passive: true })
      addEventListener('touchstart', stop, { passive: true })
      addEventListener('keydown', onKey)
      addEventListener('pointerdown', onPointer, true)
    })
  }

  ui.querySelector('[data-ap-stop]').addEventListener('click', stop)
  return { start, stop, get running() { return !!tl } }
}
