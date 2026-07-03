import { PageHeader } from "@saltyfactory/ui";

export default function SetupHelpPage() {
  return <div className="setup-command-page onboarding-command-page">
    <PageHeader title="Request Setup Help" eyebrow="Setup concierge" description="Ask for help connecting providers or understanding a blocker. Do not paste tokens, passwords, EIN, routing numbers, bank account details, or provider secrets." />
    <section className="surface-card setup-help-panel">
      <h2>Concierge help request</h2>
      <form method="post" action="/api/studio/onboarding/request-help">
        <label><span>Request type</span><select name="requestType" defaultValue="setup_help">
          <option value="setup_help">General setup help</option>
          <option value="provider_issue">Provider issue</option>
          <option value="token_validation">Token validation</option>
          <option value="shopify_collection">Shopify collection</option>
          <option value="printify_shop">Printify shop</option>
          <option value="image_generation">Image generation</option>
          <option value="storage">Storage</option>
          <option value="business_profile">Business profile</option>
          <option value="first_launch">First launch</option>
        </select></label>
        <label><span>Related provider</span><input name="relatedProvider" placeholder="printify, shopify, image_generation, storage..." /></label>
        <label><span>How can the setup concierge help?</span><textarea name="message" rows={6} placeholder="Describe the blocker. Do not paste tokens or secrets." /></label>
        <p className="setup-security-note">Safety warning: do not paste API tokens, passwords, EIN, routing numbers, bank account numbers, or private provider credentials.</p>
        <button className="btn btn-primary" type="submit">Create help request</button>
      </form>
    </section>
  </div>;
}
