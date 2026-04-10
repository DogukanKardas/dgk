"use client";

import { useState } from "react";

const btn =
  "rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-white";

export function LogoutButton() {
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.assign("/login");
    }
  }

  return (
    <button type="button" className={btn} disabled={pending} onClick={logout}>
      {pending ? "Çıkış…" : "Çıkış"}
    </button>
  );
}
