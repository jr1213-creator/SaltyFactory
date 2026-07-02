import { PageHeader, MetricCard, DataTable, StatusBadge } from "@saltyfactory/ui";
import { scoreBusinessProfile } from "@saltyfactory/domain";
import { getBusinessProfileStudioData, SchemaSetupState } from "../../data";

export default async function BusinessProfilePage() {
  const lists = await getBusinessProfileStudioData();
  const profile = lists.businessProfiles[0] as any;
  const profileJson = (profile?.profile_json ?? profile?.profileJson ?? {}) as Record<string, any>;
  const readiness = scoreBusinessProfile(profileJson);
  return <>
    <PageHeader title="Business Profile" description="Workspace identity, brand safety, fulfillment, and owner-visible readiness for AI-operable workflows.">
      <StatusBadge status={readiness.status} tone={readiness.status === "ready" ? "success" : "warning"} />
    </PageHeader>
    <SchemaSetupState message={lists.setupMessage} />
    <div className="sf-grid sf-grid-4">
      <MetricCard title="Readiness" value={`${readiness.score}%`} delta="Saved workspace data" tone={readiness.score >= 90 ? "success" : "warning"} />
      <MetricCard title="Brand" value={String(profile?.public_brand_name ?? profileJson.publicBrandName ?? "Not set")} delta="Public-facing" />
      <MetricCard title="Model" value={String(profile?.business_type ?? profileJson.businessType ?? "Not set")} delta="Business type" />
      <MetricCard title="Fulfillment" value={String(profile?.fulfillment_model ?? profileJson.fulfillmentModel ?? "Not set")} delta="Workflow routing" />
    </div>
    <section className="card" style={{ marginTop: 18 }}>
      <h2>Update Profile</h2>
      <form className="sf-grid sf-grid-2" action="/api/studio/business-profile" method="post">
        <label>Business name<input name="businessName" defaultValue={profileJson.businessName ?? ""} required /></label>
        <label>Public brand name<input name="publicBrandName" defaultValue={profileJson.publicBrandName ?? ""} required /></label>
        <label>Business type<select name="businessType" defaultValue={profileJson.businessType ?? "hybrid"}><option value="POD">POD</option><option value="ecommerce">ecommerce</option><option value="handmade">handmade</option><option value="dropshipping">dropshipping</option><option value="hybrid">hybrid</option></select></label>
        <label>Fulfillment model<select name="fulfillmentModel" defaultValue={profileJson.fulfillmentModel ?? "hybrid"}><option value="POD">POD</option><option value="dropship">dropship</option><option value="handmade">handmade</option><option value="hybrid">hybrid</option><option value="digital">digital</option><option value="service">service</option></select></label>
        <label>Target customer<input name="targetCustomer" defaultValue={profileJson.targetCustomer ?? ""} /></label>
        <label>Brand voice<input name="brandVoice" defaultValue={profileJson.brandVoice ?? ""} /></label>
        <label>Primary offer<input name="primaryOffer" defaultValue={profileJson.primaryOffer ?? ""} /></label>
        <label>Support email<input name="supportEmail" type="email" defaultValue={profileJson.supportEmail ?? ""} /></label>
        <label>Country<input name="country" defaultValue={profileJson.country ?? "US"} /></label>
        <label>Currency<input name="currency" defaultValue={profileJson.currency ?? "USD"} /></label>
        <label>Product categories<input name="productCategories" defaultValue={(profileJson.productCategories ?? []).join(", ")} /></label>
        <label>Brand colors<input name="brandColors" defaultValue={(profileJson.brandColors ?? []).join(", ")} /></label>
        <label>Returns policy notes<textarea name="returnsPolicyNotes" defaultValue={profileJson.returnsPolicyNotes ?? ""} /></label>
        <label>Production partner disclosure<textarea name="productionPartnerDisclosureNotes" defaultValue={profileJson.productionPartnerDisclosureNotes ?? ""} /></label>
        <label>Banned words<input name="bannedWords" defaultValue={(profileJson.bannedWords ?? []).join(", ")} /></label>
        <label>Trademark caution list<input name="trademarkCautionList" defaultValue={(profileJson.trademarkCautionList ?? []).join(", ")} /></label>
        <button className="sf-button" type="submit">Save Business Profile</button>
      </form>
    </section>
    <DataTable columns={["Readiness blocker"]} rows={readiness.blockers.length ? readiness.blockers.map((blocker) => [blocker]) : [["No blockers"]]} />
  </>;
}
