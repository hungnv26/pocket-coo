/**
 * ToastHost — stacked confirmation toasts. Owned by: P2 (presentation).
 *
 * Pure renderer: P3 owns the toast queue and its 3-second auto-expiry; this
 * host just renders whatever list it is given, newest at the bottom, with a
 * CSS entrance animation.
 */
import type { ToastHostProps } from './contracts'

export function ToastHost({ toasts }: ToastHostProps) {
  if (toasts.length === 0) return null
  return (
    <div className="toast-host" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className="toast">
          {toast.message}
        </div>
      ))}
    </div>
  )
}
