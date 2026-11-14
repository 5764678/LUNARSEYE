/**
 * WebGL cannot read CSS, so the 3D scenes ask the document for the same tokens the
 * stylesheet uses (see app/tokens.css). Call from client components only. The CSS stays the
 * single source of truth: there are no hex copies in TypeScript.
 */
export function cssColor(token: `--${string}`): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  if (!value) {
    // A missing token is a programming error: make it obvious on screen instead of black.
    console.warn(`Missing CSS token ${token}`);
    return "magenta";
  }
  return value;
}
