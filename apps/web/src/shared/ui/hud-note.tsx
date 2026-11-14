import type { ReactNode } from "react";

import { Icon } from "./icons";

/**
 * A caveat that stays visible as one short line and expands to the full explanation.
 * A native <details>: it works without JavaScript, is keyboard operable, and announces
 * its expanded state, with no positioning or dismissal logic to get wrong.
 */
export function HudNote({ summary, children }: { summary: ReactNode; children: ReactNode }) {
  return (
    <details className="hud-note">
      <summary>
        <Icon name="info" size={14} />
        <span>{summary}</span>
        <Icon name="chevron" size={14} className="chev" />
      </summary>
      <div className="hud-note-body">{children}</div>
    </details>
  );
}
