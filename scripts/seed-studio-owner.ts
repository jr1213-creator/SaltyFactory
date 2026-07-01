import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type User } from "@supabase/supabase-js";
import postgres from "postgres";

export type StudioOwnerSeedEnv = {
  DATABASE_URL?: string;
  STUDIO_ADMIN_EMAIL?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  STUDIO_WORKSPACE_ID?: string;
  STUDIO_ORGANIZATION_ID?: string;
  STUDIO_ORGANIZATION_NAME?: string;
  STUDIO_WORKSPACE_NAME?: string;
};

export type StudioOwnerSeedSummary = {
  ok: true;
  status: "studio_owner_seeded";
  foundAuthUser: true;
  userLinked: true;
  organizationId: string;
  workspaceId: string;
  role: "owner";
  membershipTablesCreated: string[];
  userCreated: boolean;
  organizationCreated: boolean;
  workspaceCreated: boolean;
  membershipCreated: boolean;
  membershipAlreadyExists: boolean;
  nextStep: string;
};

const requiredTables = ["users", "organizations", "workspaces", "organization_members"] as const;
const migrationCommand = "corepack pnpm db:migrate";

export function loadRootEnvLocal(root = process.cwd(), target: Record<string, string | undefined> = process.env) {
  const envPath = resolve(root, ".env.local");
  if (!existsSync(envPath)) return false;

  for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    if (!match) continue;
    const key = match[1];
    const rawValue = match[2] || "";
    if (!key) continue;
    if (target[key] !== undefined) continue;
    target[key] = rawValue.trim().replace(/^(['"])(.*)\1$/, "$2");
  }

  return true;
}

export function validateStudioOwnerSeedEnv(env: StudioOwnerSeedEnv) {
  const missing = ["DATABASE_URL", "STUDIO_ADMIN_EMAIL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
    .filter((key) => !String(env[key as keyof StudioOwnerSeedEnv] || "").trim());
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

function safeSlug(value: string, fallback: string) {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return slug || fallback;
}

function memberId(organizationId: string, userId: string) {
  return `mem_${organizationId}_${userId}`.replace(/[^a-zA-Z0-9_:-]/g, "_");
}

async function existingRequiredTables(sql: postgres.Sql) {
  const rows = await sql<{ table_name: string }[]>`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name in ${sql(requiredTables)}
  `;
  const present = new Set(rows.map((row) => row.table_name));
  return requiredTables.filter((table) => !present.has(table));
}

async function ensureRequiredTables(sql: postgres.Sql) {
  const missing = await existingRequiredTables(sql);
  if (!missing.length) return [];

  try {
    if (missing.includes("users")) {
      await sql`
        create table if not exists users (
          id text primary key not null,
          email text not null,
          display_name text,
          avatar_url text,
          status text default 'active' not null,
          last_login_at timestamp with time zone,
          created_at timestamp with time zone default now() not null,
          updated_at timestamp with time zone default now() not null,
          metadata jsonb default '{}'::jsonb not null
        )
      `;
      await sql`create unique index if not exists users_email_unique on users using btree (email)`;
      await sql`create index if not exists users_status_idx on users using btree (status)`;
    }

    if (missing.includes("organizations")) {
      await sql`
        create table if not exists organizations (
          id text primary key not null,
          name text not null,
          slug text not null,
          owner_user_id text,
          status text default 'active' not null,
          billing_email text,
          created_at timestamp with time zone default now() not null,
          updated_at timestamp with time zone default now() not null,
          metadata jsonb default '{}'::jsonb not null
        )
      `;
      await sql`create unique index if not exists organizations_slug_unique on organizations using btree (slug)`;
      await sql`create index if not exists organizations_owner_idx on organizations using btree (owner_user_id)`;
    }

    if (missing.includes("workspaces")) {
      await sql`
        create table if not exists workspaces (
          id text primary key not null,
          organization_id text not null,
          name text not null,
          slug text not null,
          default_brand_name text default 'Salty Cowhide Co.' not null,
          primary_domain text,
          status text default 'active' not null,
          created_by text,
          created_at timestamp with time zone default now() not null,
          updated_at timestamp with time zone default now() not null,
          metadata jsonb default '{}'::jsonb not null
        )
      `;
      await sql`create unique index if not exists workspaces_org_slug_unique on workspaces using btree (organization_id, slug)`;
      await sql`create index if not exists workspaces_org_idx on workspaces using btree (organization_id)`;
      await sql`create index if not exists workspaces_status_idx on workspaces using btree (status)`;
    }

    if (missing.includes("organization_members")) {
      await sql`
        create table if not exists organization_members (
          id text primary key not null,
          organization_id text not null,
          user_id text not null,
          role text default 'member' not null,
          status text default 'active' not null,
          invited_by text,
          invited_at timestamp with time zone,
          joined_at timestamp with time zone,
          created_at timestamp with time zone default now() not null,
          updated_at timestamp with time zone default now() not null,
          metadata jsonb default '{}'::jsonb not null
        )
      `;
      await sql`create unique index if not exists organization_members_org_user_unique on organization_members using btree (organization_id, user_id)`;
      await sql`create index if not exists organization_members_org_idx on organization_members using btree (organization_id)`;
      await sql`create index if not exists organization_members_user_idx on organization_members using btree (user_id)`;
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown database error";
    throw new Error(`Required membership tables are missing and could not be created: ${detail}. Apply migrations with: ${migrationCommand}`);
  }

  const stillMissing = await existingRequiredTables(sql);
  if (stillMissing.length) {
    throw new Error(`Required membership tables are still missing: ${stillMissing.join(", ")}. Apply migrations with: ${migrationCommand}`);
  }

  return missing;
}

async function findAuthUserByEmail(supabaseUrl: string, serviceRoleKey: string, email: string) {
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error("Supabase Auth user lookup failed");
    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match;
    if (data.users.length < 1000) break;
  }

  throw new Error("Supabase Auth user does not exist for STUDIO_ADMIN_EMAIL");
}

export async function seedStudioOwner(env: StudioOwnerSeedEnv = process.env as StudioOwnerSeedEnv): Promise<StudioOwnerSeedSummary> {
  validateStudioOwnerSeedEnv(env);

  const databaseUrl = env.DATABASE_URL!;
  const email = env.STUDIO_ADMIN_EMAIL!.trim().toLowerCase();
  const workspaceId = env.STUDIO_WORKSPACE_ID || "wks_default";
  const organizationId = env.STUDIO_ORGANIZATION_ID || "org_default";
  const organizationName = env.STUDIO_ORGANIZATION_NAME || "SaltyFactory";
  const workspaceName = env.STUDIO_WORKSPACE_NAME || "Salty Cowhide Co.";
  const now = new Date();

  let authUser: User;
  let db: postgres.Sql | null = null;

  try {
    authUser = await findAuthUserByEmail(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, email);
    const authUserId = authUser.id;
    if (!authUserId) throw new Error("Supabase Auth user is missing an id");
    db = postgres(databaseUrl, { max: 1, prepare: false });
    const membershipTablesCreated = await ensureRequiredTables(db);

    const existingUsers = await db<{ id: string }[]>`
      select id from users where id = ${authUser.id} or email = ${email} limit 1
    `;
    const userId = existingUsers[0]?.id || authUserId;
    const userCreated = existingUsers.length === 0;
    const displayName = email.split("@")[0] || "studio-owner";

    await db`
      insert into users (id, email, display_name, status, created_at, updated_at, metadata)
      values (${userId}, ${email}, ${displayName}, 'active', ${now}, ${now}, ${db.json({ supabaseUserId: authUserId })})
      on conflict (id) do update set
        email = excluded.email,
        status = 'active',
        updated_at = excluded.updated_at,
        metadata = users.metadata || excluded.metadata
    `;

    let organizationCreated = false;
    try {
      const existingOrganizations = await db<{ id: string }[]>`
        select id from organizations where id = ${organizationId} limit 1
      `;
      organizationCreated = existingOrganizations.length === 0;

      await db`
        insert into organizations (id, name, slug, owner_user_id, status, billing_email, created_at, updated_at, metadata)
        values (${organizationId}, ${organizationName}, ${safeSlug(organizationId.replace(/^org_/, ""), "default")}, ${userId}, 'active', ${email}, ${now}, ${now}, ${db.json({})})
        on conflict (id) do update set
          owner_user_id = excluded.owner_user_id,
          status = 'active',
          updated_at = excluded.updated_at
      `;
    } catch {
      organizationCreated = false;
    }

    const existingWorkspaces = await db<{ id: string }[]>`
      select id from workspaces where id = ${workspaceId} limit 1
    `;
    const workspaceCreated = existingWorkspaces.length === 0;

    await db`
      insert into workspaces (id, organization_id, name, slug, default_brand_name, status, created_by, created_at, updated_at, metadata)
      values (${workspaceId}, ${organizationId}, ${workspaceName}, ${safeSlug(workspaceId.replace(/^wks_/, ""), "default")}, 'Salty Cowhide Co.', 'active', ${userId}, ${now}, ${now}, ${db.json({})})
      on conflict (id) do update set
        organization_id = excluded.organization_id,
        status = 'active',
        updated_at = excluded.updated_at
    `;

    const existingMemberships = await db<{ id: string }[]>`
      select id from organization_members
      where organization_id = ${organizationId} and user_id = ${userId}
      limit 1
    `;
    const membershipAlreadyExists = existingMemberships.length > 0;

    await db`
      insert into organization_members (id, organization_id, user_id, role, status, joined_at, created_at, updated_at, metadata)
      values (${membershipAlreadyExists ? existingMemberships[0]!.id : memberId(organizationId, userId)}, ${organizationId}, ${userId}, 'owner', 'active', ${now}, ${now}, ${now}, ${db.json({ seededBy: "seed-studio-owner" })})
      on conflict (organization_id, user_id) do update set
        role = 'owner',
        status = 'active',
        joined_at = coalesce(organization_members.joined_at, excluded.joined_at),
        updated_at = excluded.updated_at
    `;

    return {
      ok: true,
      status: "studio_owner_seeded",
      foundAuthUser: true,
      userLinked: true,
      organizationId,
      workspaceId,
      role: "owner",
      membershipTablesCreated,
      userCreated,
      organizationCreated,
      workspaceCreated,
      membershipCreated: !membershipAlreadyExists,
      membershipAlreadyExists,
      nextStep: "Restart Studio dev server, then open http://localhost:3001/studio"
    };
  } finally {
    await db?.end({ timeout: 5 });
  }
}

function sanitizeError(error: unknown) {
  const message = error instanceof Error ? error.message : "Studio owner seed failed";
  return message
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "postgres://[redacted]")
    .replace(/(service_role|eyJ)[A-Za-z0-9._-]+/g, "[redacted]");
}

async function main() {
  loadRootEnvLocal();
  const summary = await seedStudioOwner();
  console.log(JSON.stringify(summary, null, 2));
}

if (process.env.NODE_ENV !== "test") {
  main().catch((error) => {
    console.error(JSON.stringify({ ok: false, status: "studio_owner_seed_failed", error: sanitizeError(error) }, null, 2));
    process.exitCode = 1;
  });
}
