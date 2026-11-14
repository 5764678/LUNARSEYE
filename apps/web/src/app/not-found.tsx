import Link from "next/link";

/** Renders inside the shell, so the nav stays available and the page keeps the dark theme
 *  (Next's built-in 404 paints its own white page). */
export default function NotFound() {
  return (
    <div className="page not-found">
      <h1>Page not found</h1>
      <p className="dim">
        There is no page at this address. The pages are Overview, Illumination &amp; Earth, Terrain,
        Compare and Data.
      </p>
      <p>
        <Link className="btn primary" href="/">
          Back to Overview
        </Link>
      </p>
    </div>
  );
}
