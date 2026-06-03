import { useState, useEffect, useCallback } from "react";
import { buildAuthorityUrl } from "../../lib/apiUrl.js";

const PROVIDER_META = {
  password: { label: "Email & Password", glyph: "✉️" },
  google: { label: "Google", glyph: "G" },
};

// Providers a user can connect from here (password is managed via the auth form).
const LINKABLE = ["google"];

export default function LinkedAccounts() {
  const [identities, setIdentities] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(buildAuthorityUrl("/auth/identities"), { credentials: "include" });
      if (!res.ok) throw new Error("load failed");
      const data = await res.json();
      setIdentities(Array.isArray(data.identities) ? data.identities : []);
    } catch {
      setError("Could not load linked accounts.");
      setIdentities([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const linkedProviders = new Set((identities || []).map((i) => i.provider));

  const handleLink = (provider) => {
    // Logged-in top-level navigation → the callback links via the session.
    window.location.href = buildAuthorityUrl(`/auth/oauth/${provider}`);
  };

  const handleUnlink = async (provider) => {
    setError("");
    setBusy(provider);
    try {
      let csrf = "";
      try {
        const tokRes = await fetch(buildAuthorityUrl("/auth/csrf-token"), { credentials: "include" });
        if (tokRes.ok) csrf = (await tokRes.json()).token || "";
      } catch {
        // The SameSite=Lax session cookie is the primary CSRF defense here.
      }

      const res = await fetch(buildAuthorityUrl(`/auth/identities/${provider}/unlink`), {
        method: "POST",
        credentials: "include",
        headers: csrf ? { "x-csrf-token": csrf } : {},
      });

      if (res.status === 409) {
        setError("You can't unlink your only remaining login method.");
      } else if (!res.ok) {
        setError("Could not unlink that provider.");
      } else {
        await load();
      }
    } catch {
      setError("Could not unlink that provider.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="linked-accounts">
      <h2 className="panel-title">Linked Accounts</h2>
      {error && <p className="linked-error">{error}</p>}

      {identities === null ? (
        <p className="linked-loading">Loading…</p>
      ) : (
        <ul className="linked-list">
          {identities.map((idn) => {
            const meta = PROVIDER_META[idn.provider] || { label: idn.provider, glyph: "🔑" };
            const canUnlink = identities.length > 1;
            return (
              <li key={idn.provider} className="linked-item">
                <span className="linked-glyph" aria-hidden="true">{meta.glyph}</span>
                <span className="linked-info">
                  <strong>{meta.label}</strong>
                  {idn.email && <span className="linked-email">{idn.email}</span>}
                </span>
                {canUnlink && (
                  <button
                    type="button"
                    className="linked-btn linked-btn--unlink"
                    disabled={busy === idn.provider}
                    onClick={() => handleUnlink(idn.provider)}
                  >
                    {busy === idn.provider ? "…" : "Unlink"}
                  </button>
                )}
              </li>
            );
          })}

          {LINKABLE.filter((p) => !linkedProviders.has(p)).map((provider) => {
            const meta = PROVIDER_META[provider];
            return (
              <li key={provider} className="linked-item linked-item--available">
                <span className="linked-glyph" aria-hidden="true">{meta.glyph}</span>
                <span className="linked-info">
                  <strong>{meta.label}</strong>
                  <span className="linked-email">Not connected</span>
                </span>
                <button type="button" className="linked-btn linked-btn--connect" onClick={() => handleLink(provider)}>
                  Connect
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
