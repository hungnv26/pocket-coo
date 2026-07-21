/**
 * Dev-only helper: mounts the DevHarness without touching main.tsx.
 * From the browser console on the vite dev server run:
 *   const m = await import('/src/presentation/dev/mount.ts'); m.mountPreview()
 * Owned by: P2. Never imported by app code.
 */
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { DevHarness } from './DevHarness'

export function mountPreview(): void {
  document.body.innerHTML = ''
  const el = document.createElement('div')
  el.id = 'preview-root'
  document.body.appendChild(el)
  createRoot(el).render(createElement(DevHarness))
}
