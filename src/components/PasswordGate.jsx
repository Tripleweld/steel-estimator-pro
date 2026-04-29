import { useState, useEffect } from 'react'
import { Lock, AlertCircle } from 'lucide-react'

// SHA-256 hash of the temporary access password.
// Stored as hash so the plaintext password is not visible in the bundle.
const PASSWORD_HASH = 'b9a2df362b853d9074cc574828830e1609c2cc25b04094229a060e8a4aaaa1b9'
const SESSION_KEY = 'tw_gate_authed_v1'

async function sha256(text) {
  const buf = new TextEncoder().encode(text.toLowerCase().trim())
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function PasswordGate({ children }) {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1')
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (authed) sessionStorage.setItem(SESSION_KEY, '1')
  }, [authed])

  const submit = async (e) => {
    e.preventDefault()
    if (!pw) return
    setBusy(true)
    setError('')
    try {
      const h = await sha256(pw)
      if (h === PASSWORD_HASH) {
        setAuthed(true)
      } else {
        setError('Incorrect password. Try again or contact Triple Weld for access.')
        setPw('')
      }
    } catch (err) {
      setError('Authentication error. Refresh and try again.')
    }
    setBusy(false)
  }

  if (authed) return children

  return (
    <div className="min-h-screen bg-steel-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-fire-500/15 border border-fire-500/30 mb-4">
            <Lock className="w-8 h-8 text-fire-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Steel Estimator Pro</h1>
          <p className="text-sm text-steel-400 mt-1">Triple Weld Inc. &middot; Private Access</p>
        </div>

        <form onSubmit={submit} className="rounded-xl border border-steel-700 bg-steel-900/50 p-6 shadow-2xl">
          <label className="block text-xs uppercase tracking-wider text-steel-400 font-bold mb-2">Access password</label>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoFocus
            disabled={busy}
            placeholder="Enter password"
            className="w-full rounded-lg border border-steel-700 bg-steel-950 text-white px-4 py-3 text-sm font-mono outline-none transition focus:border-fire-500/50 focus:ring-1 focus:ring-fire-500/50 disabled:opacity-50"
          />

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded border border-red-500/30 bg-red-950/30 px-3 py-2">
              <AlertCircle className="w-4 h-4 text-red-300 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-red-200">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !pw}
            className="mt-4 w-full rounded-lg bg-fire-500 hover:bg-fire-600 disabled:bg-steel-700 disabled:cursor-not-allowed text-white font-bold py-3 text-sm transition"
          >
            {busy ? 'Verifying...' : 'Unlock'}
          </button>

          <p className="mt-4 text-[10px] text-center text-steel-500 leading-relaxed">
            This is a temporary access gate. Full multi-user authentication is coming soon.
            <br />
            By entering, you agree this software is the property of Triple Weld Inc. and may not be copied, redistributed, or reverse-engineered.
          </p>
        </form>

        <p className="text-center text-[10px] text-steel-600 mt-6">&copy; 2026 Triple Weld Inc. &middot; Etobicoke, ON</p>
      </div>
    </div>
  )
}
