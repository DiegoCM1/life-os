// Shown at the top of a page when one or more backend reads came back empty
// because the API was unreachable — so an outage reads as an outage, not as an
// empty day (and not as "Notion isn't configured"). Pure markup; a server
// component decides when to render it, gated on `anyUnreachable(...)` from
// @/lib/api over that page's fetches.
export function BackendBanner() {
  return (
    <section
      role="alert"
      className="card border-bad bg-bad-dim py-3 text-center text-sm font-semibold text-bad"
    >
      ⚠ Backend unreachable — showing empty data. Changes won’t save until it’s back.
    </section>
  );
}
