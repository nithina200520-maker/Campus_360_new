import React, { useState } from 'react';

export default function MainAdminHandoff() {
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const createHandoffCode = async (event) => {
    event.preventDefault();
    setMessage('');
    setCode('');
    setExpiresAt('');
    setLoading(true);
    try {
      const token = localStorage.getItem('campus360_token');
      const response = await fetch('/api/campus-admin/handoff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (!response.ok || !data.success || !data.code) {
        throw new Error(data.message || `Could not create transfer code (${response.status}).`);
      }
      setCode(data.code);
      setExpiresAt(new Date(data.expires_at).toLocaleString());
      setPassword('');
      setMessage('Share this code only with the intended new Main Admin. It can be claimed once.');
    } catch (error) {
      setMessage(error.message || 'Could not reach the Main Admin transfer service.');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setMessage('Transfer code copied. It expires in 30 minutes and works only once.');
    } catch {
      setMessage('Clipboard access is unavailable. Select and copy the code manually.');
    }
  };

  return (
    <section className="rounded-2xl border border-amber-400/30 bg-[#060e20] p-4 sm:p-5 space-y-4">
      <div>
        <h3 className="text-sm font-bold text-white">Transfer Main Admin</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
          This does not affect normal sign-out. Generate a one-time code only when you intend to hand over Main Admin authority.
          Your access remains active until the recipient claims the code; then your account is deactivated.
        </p>
      </div>

      <form onSubmit={createHandoffCode} className="flex flex-col gap-3 sm:flex-row">
        <input
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          placeholder="Confirm your Main Admin password"
          aria-label="Confirm your Main Admin password"
          className="min-w-0 flex-1 rounded-xl border border-cyan-500/30 bg-[#09152b] px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-cyan-300 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"
        >
          {loading ? 'Generating…' : 'Generate Transfer Code'}
        </button>
      </form>

      {message && (
        <p role="status" className="text-[11px] text-cyan-200">
          {message}
        </p>
      )}

      {code && (
        <div className="space-y-2 rounded-xl border border-amber-400/25 bg-amber-950/20 p-3">
          <label htmlFor="main-admin-handoff-code" className="block text-[11px] font-semibold text-amber-100">
            One-time transfer code — expires {expiresAt}
          </label>
          <div className="flex gap-2">
            <input
              id="main-admin-handoff-code"
              type="text"
              readOnly
              value={code}
              className="min-w-0 flex-1 rounded-lg border border-amber-400/25 bg-[#060b18] px-3 py-2 font-mono text-xs text-white"
            />
            <button
              type="button"
              onClick={copyCode}
              className="rounded-lg border border-amber-300/30 px-3 text-xs font-bold text-amber-100 hover:bg-amber-400/10"
            >
              Copy
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
