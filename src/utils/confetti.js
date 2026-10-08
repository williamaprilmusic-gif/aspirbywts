import { prefersReducedMotion } from './format.js'

// Tiny dependency-free confetti burst. No-op when reduced motion is preferred.
export function burstConfetti() {
  if (prefersReducedMotion() || typeof document === 'undefined') return

  const colors = ['#10b981', '#8b5cf6', '#34d399', '#a78bfa', '#f59e0b']
  const layer = document.createElement('div')
  layer.setAttribute('aria-hidden', 'true')
  Object.assign(layer.style, {
    position: 'fixed',
    inset: '0',
    pointerEvents: 'none',
    zIndex: '60',
    overflow: 'hidden',
  })
  document.body.appendChild(layer)

  const N = 80
  for (let i = 0; i < N; i++) {
    const p = document.createElement('div')
    const size = 6 + Math.random() * 6
    const left = 50 + (Math.random() - 0.5) * 30
    const color = colors[Math.floor(Math.random() * colors.length)]
    const dx = (Math.random() - 0.5) * 60
    const dur = 900 + Math.random() * 900
    const delay = Math.random() * 120
    Object.assign(p.style, {
      position: 'absolute',
      top: '38%',
      left: `${left}%`,
      width: `${size}px`,
      height: `${size * 0.6}px`,
      background: color,
      borderRadius: '1px',
      opacity: '0',
      transform: 'transl(0,0) rotate(0deg)',
    })
    layer.appendChild(p)
    p.animate(
      [
        { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx}vw, 70vh) rotate(${Math.random() * 720 - 360}deg)`, opacity: 0 },
      ],
      { duration: dur, delay, easing: 'cubic-bezier(0.22,0.61,0.36,1)', fill: 'forwards' },
    )
  }
  setTimeout(() => layer.remove(), 2200)
}
