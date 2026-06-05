"use client";

import { useEffect, useState } from "react";
import { Share2, MessageCircle, Mail } from "lucide-react";
import { useT } from "@/components/i18n-provider";

/** Teilen-Leiste: nativer Share (Handy) + WhatsApp + E-Mail. */
export function ShareButtons() {
  const t = useT();
  const [url, setUrl] = useState("");
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setUrl(window.location.origin);
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const text = t.auth.shareText || "WM 2026 Tippspiel ⚽";
  const subject = t.auth.shareSubject || "WM 2026 Tippspiel";
  const waHref = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`.trim())}`;
  const mailHref = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
    `${text}\n${url}`.trim(),
  )}`;

  const nativeShare = () => {
    navigator.share({ title: t.common.appName, text, url }).catch(() => {});
  };

  const btn =
    "inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground";

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <span className="text-xs text-muted-foreground">{t.auth.share}:</span>
      {canShare && (
        <button type="button" onClick={nativeShare} className={btn} aria-label={t.auth.share}>
          <Share2 className="size-3.5" /> {t.auth.share}
        </button>
      )}
      <a href={waHref} target="_blank" rel="noopener noreferrer" className={btn}>
        <MessageCircle className="size-3.5 text-[#25D366]" /> WhatsApp
      </a>
      <a href={mailHref} className={btn}>
        <Mail className="size-3.5" /> {t.auth.shareMail}
      </a>
    </div>
  );
}
