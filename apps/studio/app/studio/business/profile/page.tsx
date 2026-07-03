import { createRepositories } from "@saltyfactory/db";
import { BusinessBlockerCard, PageHeader, ProviderStatusCard } from "@saltyfactory/ui";
import { businessReadiness, getBusinessProfile } from "../../../api/studio/business/_shared";

export default async function BusinessProfilePage() {
  const repos = createRepositories();
  const profile: any = await getBusinessProfile(repos);
  const readiness = businessReadiness(profile);
  const missing = readiness.items.filter((item) => !item.passed).map((item) => String(item.label));
  return <>
    <PageHeader title="Business Profile" description="Structured public business identity, purpose, goals, brand voice, and sensitive-field references. EIN is never returned in plaintext." />
    <div className="sf-layout-rail">
      <section className="sf-card">
        <h2>Profile Fields</h2>
        <form className="sf-form-grid" action="/api/studio/business/profile" method="post">
          <input type="hidden" name="_method" value="PATCH" />
          <label>Legal business name<input name="legalBusinessName" defaultValue={profile?.legal_business_name ?? profile?.legalBusinessName ?? ""} /></label>
          <label>Public brand name<input name="publicBrandName" defaultValue={profile?.public_brand_name ?? profile?.publicBrandName ?? "Salty Cowhide"} /></label>
          <label>Business type<select name="businessType" defaultValue={profile?.business_type ?? "unknown"}><option value="unknown">Unknown</option><option value="sole_prop">Sole proprietor</option><option value="llc">LLC</option><option value="corporation">Corporation</option></select></label>
          <label>Business email<input name="businessEmail" defaultValue={profile?.business_email ?? ""} /></label>
          <label>Website URL<input name="websiteUrl" defaultValue={profile?.website_url ?? "https://saltycowhide.com"} /></label>
          <label>Business purpose<textarea name="businessPurpose" defaultValue={profile?.business_purpose ?? ""} /></label>
          <label>Brand mantra<input name="brandMantra" defaultValue={profile?.brand_mantra ?? ""} /></label>
          <label>EIN sensitive input<input name="ein" placeholder="Stored as secret_ref + masked display only" /></label>
          <button className="sf-button sf-button-primary" type="submit">Save Business Profile</button>
        </form>
      </section>
      <aside className="sf-grid">
        <ProviderStatusCard title="Readiness score" status={`${readiness.score}%`} tone={readiness.score >= 80 ? "success" : "warning"} description="Calculated only from real saved fields." />
        <BusinessBlockerCard title="Missing information" blockers={missing.length ? missing : ["No profile blockers recorded."]} />
      </aside>
    </div>
  </>;
}
