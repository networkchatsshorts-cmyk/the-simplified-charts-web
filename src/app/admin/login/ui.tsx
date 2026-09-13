'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError('');

        const r = await fetch('/api/admin/login', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({ password }),
        });

        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          setError(data.error || 'Invalid password');
          return;
        }

        router.push('/admin');
      }}
    >
      <label>Password</label>

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <button className="btn primary" type="submit">
        Sign in
      </button>

      {error && <p className="small">{error}</p>}
    </form>
  );
}
