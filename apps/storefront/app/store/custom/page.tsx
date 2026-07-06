import { CustomerDesignConcierge } from "./CustomerDesignConcierge";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <main>
      <section className="store-page-hero">
        <h1>Custom Design Concierge</h1>
        <p>Describe a safe custom shirt or gift idea, review private candidates, and approve one before any purchase-link request is made.</p>
      </section>
      <section className="store-section">
        <CustomerDesignConcierge />
      </section>
    </main>
  );
}
