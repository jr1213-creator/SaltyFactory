import { DataTable, LinkButton, PageHeader, ProviderStatusCard, StatusBadge } from "@saltyfactory/ui";
import { SchemaSetupState } from "../../data";
import { getMarketingCommandCenterData } from "../../marketing-command-center/data";

export const runtime = "nodejs";

export default async function VerticalPackSettingsPage() {
  const data = await getMarketingCommandCenterData();
  const activeRecords = data.sourceRecords.filter((record: any) => String(record.source_name ?? record.sourceName ?? "") === "active_vertical_pack");
  const latestActive = activeRecords[activeRecords.length - 1] as any;
  return <>
    <PageHeader eyebrow="Vertical pack settings" title="Vertical Pack" description="View and switch configurable vertical operating packs. Templates/rules are config-driven; no extra vertical-specific backend tables are required.">
      <LinkButton href="/studio/marketing/setup" variant="secondary">Marketing Setup</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <div className="sf-grid sf-grid-2">
      <ProviderStatusCard title="Active vertical pack" status={latestActive ? "owner verified" : "setup needed"} tone={latestActive ? "success" : "warning"} description={latestActive ? String(latestActive.source_label ?? latestActive.sourceLabel) : "Seed vertical packs and record the active pack."} />
      <ProviderStatusCard title="Switching behavior" status="confirmation required" tone="warning" description="Switching records an owner-verified source record and does not duplicate templates/rules." />
    </div>
    <section className="sf-card" style={{ marginTop: 18 }}>
      <h2>Available Packs</h2>
      <DataTable columns={["Pack", "Status", "Config preview", "Activate"]} rows={data.verticalPacks.length ? data.verticalPacks.map((pack: any) => [
        pack.name,
        <StatusBadge key={pack.id} status={String(pack.status ?? "active").replace(/_/g, " ")} />,
        JSON.stringify(pack.config ?? {}).slice(0, 160),
        <form key={`${pack.id}-activate`} action="/api/studio/shared/source-records" method="post">
          <input type="hidden" name="next" value="/studio/settings/vertical-pack" />
          <input type="hidden" name="origin" value="owner_verified" />
          <input type="hidden" name="source_name" value="active_vertical_pack" />
          <input type="hidden" name="source_label" value={String(pack.name)} />
          <input type="hidden" name="raw_payload" value={JSON.stringify({ activeVerticalPackKey: pack.key, verticalPackId: pack.id, confirmedByOwner: true })} />
          <button className="sf-button sf-button-secondary" type="submit">Activate</button>
        </form>
      ]) : [["No packs", "Run seed in Marketing Setup.", "-", "-"]]} />
    </section>
  </>;
}
