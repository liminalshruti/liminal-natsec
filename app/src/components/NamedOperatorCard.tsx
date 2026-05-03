/**
 * NamedOperatorCard — the operator-persona sentence that anchors every
 * procurement screenshot. Mounted at the top of the substrate panel.
 *
 * Source of truth for the sentence: docs/liminal-custody-onepager.md.
 */
export function NamedOperatorCard() {
  return (
    <section className="named-operator" aria-label="Named operator persona">
      <div className="named-operator__header">Named operator · 5th Fleet J2</div>
      <p className="named-operator__body">
        A maritime watch officer at U.S. 5th Fleet, 0200 local, monitoring AIS
        disruptions near a strategic chokepoint in the Strait of Hormuz, deciding
        whether a dark-gap reappearance under a new identity deserves immediate
        escalation or second-source collection.
      </p>
    </section>
  );
}
