import type { StorageReadinessDiagnostic } from "@saltyfactory/storage";

function yesNo(value: boolean) {
  return value ? "Yes" : "No";
}

function checkTone(value: boolean) {
  return value ? "tone-success" : "tone-warning";
}

export function StorageReadinessPanel({ diagnostic }: { diagnostic: StorageReadinessDiagnostic }) {
  const checks = [
    { label: "Supabase project URL present", value: diagnostic.environment.SUPABASE_URL.present },
    { label: "Service role key present server-side", value: diagnostic.environment.SUPABASE_SERVICE_ROLE_KEY.present },
    { label: "Can create service-role storage client", value: diagnostic.checks.canCreateSupabaseAdminClient },
    { label: "Private generated-assets bucket exists", value: diagnostic.checks.privateBucketExists },
    { label: "Public approved-assets bucket exists", value: diagnostic.checks.publicBucketExists },
    { label: "Can write a test object to private storage", value: diagnostic.checks.canWriteTestObjectToPrivateBucket },
    { label: "Can delete the test object", value: diagnostic.checks.canDeleteTestObject }
  ];

  return <section className="setup-section" id="storage-readiness" aria-label="Storage readiness diagnostic">
    <div className="setup-section-header">
      <div>
        <p className="eyebrow-label">Storage Diagnostic</p>
        <h2>Generated asset storage readiness</h2>
        <p>{diagnostic.safeMessage} This diagnostic only shows booleans and bucket names; it never displays the service role key.</p>
      </div>
      <span className={`status-badge ${diagnostic.ok ? "tone-success" : "tone-warning"}`}>{diagnostic.status.replace(/_/g, " ")}</span>
    </div>
    <div className="setup-card-grid">
      <article className="setup-feature-card is-compact">
        <h3>Bucket names</h3>
        <p>Private generated assets are stored separately from approved public assets.</p>
        <ul>
          <li><strong>Private bucket:</strong> <code>{diagnostic.environment.SUPABASE_PRIVATE_ASSETS_BUCKET.name}</code></li>
          <li><strong>Public bucket:</strong> <code>{diagnostic.environment.SUPABASE_PUBLIC_ASSETS_BUCKET.name}</code></li>
        </ul>
      </article>
      <article className="setup-feature-card is-compact">
        <h3>Readiness checks</h3>
        <ul>
          {checks.map((check) => <li key={check.label}>
            <strong>{check.label}:</strong> <span className={`status-badge ${checkTone(check.value)}`}>{yesNo(check.value)}</span>
          </li>)}
        </ul>
      </article>
      <article className="setup-feature-card is-compact">
        <h3>Next action</h3>
        {diagnostic.setupRequired.length ? <ul>{diagnostic.setupRequired.map((item) => <li key={item}>{item}</li>)}</ul> : <p>Storage is ready for real image generation output.</p>}
        <a className="btn btn-secondary" href="/api/studio/config/storage-readiness">Open redacted diagnostic</a>
      </article>
    </div>
  </section>;
}
