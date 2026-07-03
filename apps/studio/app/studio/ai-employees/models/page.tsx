import { createRepositories } from "@saltyfactory/db";
import { ensureDefaultModelRuntimeRecords, sanitizeModel, sanitizeModelProvider } from "@saltyfactory/ai-free";
import { DataTable, EmptyState, PageHeader, ProviderHealthBadge, StatusBadge } from "@saltyfactory/ui";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export default async function AiModelRegistryPage() {
  const repos = createRepositories();
  await ensureDefaultModelRuntimeRecords(workspaceId, repos);
  const providers = (await repos.aiModelRuntime.providers.listByWorkspace(workspaceId)).map(sanitizeModelProvider);
  const providerIds = new Set(providers.map((provider) => provider.id));
  const models = (await repos.aiModelRuntime.models.list())
    .filter((model) => providerIds.has(String(model.provider_id ?? model.providerId)))
    .map(sanitizeModel);
  const providerFor = (id: unknown) => providers.find((provider) => provider.id === id);

  return <>
    <PageHeader
      title="AI Model Runtime Registry"
      eyebrow="Governed model routing"
      description="Register local/open-source, hosted-open, or optional review models for AI employees without weakening owner gates or exposing credentials."
    />

    <section className="surface-card">
      <h2>Register Local/Open Model Candidate</h2>
      <p className="text-muted">Open-source/open-weight models reduce vendor cost but still require compute. Local models use this machine or your server. Hosted open models may still charge inference fees.</p>
      <form className="form-grid" action="/api/studio/ai-employees/models" method="post">
        <label>Provider key
          <select name="providerKey" defaultValue="ollama">
            <option value="ollama">ollama</option>
            <option value="lm_studio">lm_studio</option>
            <option value="vllm">vllm</option>
            <option value="huggingface">huggingface</option>
          </select>
        </label>
        <label>Display name<input name="displayName" defaultValue="Ollama local runtime" /></label>
        <label>Provider type
          <select name="providerType" defaultValue="local">
            <option value="local">local</option>
            <option value="self_hosted">self_hosted</option>
            <option value="hosted_open">hosted_open</option>
          </select>
        </label>
        <label>Base URL<input name="baseUrl" placeholder="http://localhost:11434" /></label>
        <label>Model key<input name="modelKey" placeholder="llama3.1:8b" /></label>
        <label>Model display name<input name="modelDisplayName" placeholder="Llama 3.1 8B Local" /></label>
        <input type="hidden" name="enabled" value="false" />
        <button className="btn btn-primary" type="submit">Register Candidate</button>
      </form>
    </section>

    <section className="surface-card" style={{ marginTop: 18 }}>
      <h2>Provider Readiness</h2>
      <DataTable
        columns={["Provider", "Type", "Status", "Cost", "Data allowed", "Notes"]}
        rows={providers.map((provider) => [
          provider.display_name,
          provider.provider_type,
          <ProviderHealthBadge key={provider.id} status={String(provider.configured_status)} />,
          provider.cost_tier,
          provider.data_sensitivity_allowed,
          "Base URLs and tokens are server-side only."
        ])}
      />
    </section>

    <section className="surface-card" style={{ marginTop: 18 }}>
      <h2>Models</h2>
      {models.length ? <DataTable
        columns={["Model", "Provider", "Status", "Recommended for", "Forbidden for", "Open"]}
        rows={models.map((model) => [
          model.display_name,
          providerFor(model.provider_id)?.provider_key ?? "unknown",
          <StatusBadge key={model.id} status={String(model.status)} tone={model.status === "approved" ? "success" : "warning"} />,
          (model.recommended_for as string[]).join(", ") || "Owner evaluation required",
          (model.forbidden_for as string[]).join(", "),
          <a key={model.id} className="btn btn-secondary" href={`/studio/ai-employees/models/${model.id}`}>Review</a>
        ])}
      /> : <EmptyState title="No models registered" description="Register a candidate model, evaluate it, then approve it before AI employees can use it." />}
    </section>
  </>;
}
