import { createClient } from "@supabase/supabase-js";
import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { and, eq, or } from "drizzle-orm";
import { getDb, organizationMembers, users, workspaces } from "@saltyfactory/db";

export type StudioRole = "owner" | "admin" | "reviewer" | "member" | "operator" | "viewer";
export type StudioUser = {
  id: string;
  email: string;
  role: StudioRole;
  workspaceId: string;
  organizationId?: string;
  supabaseUserId: string;
};

export type SupabaseIdentity = {
  id: string;
  email: string;
  emailVerified: boolean;
};

type AuthInput = Request | Headers | string | undefined | null;
type SupabaseVerifier = (accessToken: string) => Promise<SupabaseIdentity | null>;
type WorkspaceAuthorizer = (identity: SupabaseIdentity, workspaceId: string) => Promise<StudioUser | null>;
type MagicLinkStarter = (email: string, redirectTo: string, cookies?: CookieMethodsServer) => Promise<void>;
type CodeExchanger = (code: string, cookies?: CookieMethodsServer) => Promise<{ access_token: string; refresh_token: string; expires_in?: number }>;

export const SUPABASE_ACCESS_COOKIE = "sb-access-token";
export const SUPABASE_REFRESH_COOKIE = "sb-refresh-token";
export const STUDIO_ROLES: StudioRole[] = ["owner", "admin", "reviewer", "member", "operator", "viewer"];
export const STUDIO_ADMIN_ROLES: StudioRole[] = ["owner", "admin"];
export const STUDIO_REVIEW_ROLES: StudioRole[] = ["owner", "admin", "reviewer"];
export const STUDIO_DRAFT_MUTATION_ROLES: StudioRole[] = ["owner", "admin", "reviewer", "member", "operator"];

let verifierForTests: SupabaseVerifier | null = null;
let authorizerForTests: WorkspaceAuthorizer | null = null;
let magicLinkStarterForTests: MagicLinkStarter | null = null;
let codeExchangerForTests: CodeExchanger | null = null;

function authError(message: string, status = 401) {
  return Object.assign(new Error(message), { status });
}

function isProduction() {
  return process.env.NODE_ENV === "production" || process.env.APP_ENV === "production";
}

function publicSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
}

function publicSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
}

export function getSupabaseAuthConfigStatus() {
  const hasUrl = Boolean(publicSupabaseUrl());
  const hasAnonKey = Boolean(publicSupabaseAnonKey());
  return { ok: hasUrl && hasAnonKey, hasUrl, hasAnonKey };
}

function getSupabaseAuthClient() {
  const config = getSupabaseAuthConfigStatus();
  if (!config.ok) throw authError("supabase_auth_not_configured", 503);
  return createClient(publicSupabaseUrl(), publicSupabaseAnonKey(), {
    auth: { autoRefreshToken: false, persistSession: false, flowType: "pkce" }
  });
}

export function createStudioSupabaseServerClient(cookies: CookieMethodsServer) {
  const config = getSupabaseAuthConfigStatus();
  if (!config.ok) throw authError("supabase_auth_not_configured", 503);
  return createServerClient(publicSupabaseUrl(), publicSupabaseAnonKey(), {
    auth: { autoRefreshToken: false, flowType: "pkce" },
    cookies
  });
}

export function getAllowedStudioEmails(input = process.env.STUDIO_ADMIN_EMAIL || "") {
  return input
    .split(/[,\s;]+/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function cookieHeader(input: AuthInput) {
  if (!input) return "";
  if (typeof input === "string") return input;
  if (input instanceof Headers) return input.get("cookie") || "";
  return input.headers.get("cookie") || "";
}

function readCookie(input: AuthInput, name: string) {
  const header = cookieHeader(input);
  for (const part of header.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName === name) return decodeURIComponent(rawValue.join("="));
  }
  return "";
}

function parseCookieHeader(input: AuthInput) {
  const header = cookieHeader(input);
  if (!header) return [];
  return header
    .split(";")
    .map((part) => {
      const [rawName, ...rawValue] = part.trim().split("=");
      if (!rawName) return null;
      return { name: rawName, value: decodeURIComponent(rawValue.join("=")) };
    })
    .filter((item): item is { name: string; value: string } => Boolean(item));
}

function cookie(name: string, value: string, maxAge: number) {
  const secure = isProduction() ? "; Secure" : "";
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function setSupabaseUserVerifierForTests(verifier: SupabaseVerifier | null) {
  if (process.env.NODE_ENV !== "test") throw new Error("Test Supabase verifier is only allowed in tests");
  verifierForTests = verifier;
}

export function setWorkspaceAuthorizerForTests(authorizer: WorkspaceAuthorizer | null) {
  if (process.env.NODE_ENV !== "test") throw new Error("Test workspace authorizer is only allowed in tests");
  authorizerForTests = authorizer;
}

export function setMagicLinkStarterForTests(starter: MagicLinkStarter | null) {
  if (process.env.NODE_ENV !== "test") throw new Error("Test Supabase magic-link starter is only allowed in tests");
  magicLinkStarterForTests = starter;
}

export function setCodeExchangerForTests(exchanger: CodeExchanger | null) {
  if (process.env.NODE_ENV !== "test") throw new Error("Test Supabase code exchanger is only allowed in tests");
  codeExchangerForTests = exchanger;
}

export async function startStudioMagicLink(email: string, redirectTo: string, cookies?: CookieMethodsServer) {
  if (magicLinkStarterForTests) {
    await magicLinkStarterForTests(email.trim().toLowerCase(), redirectTo, cookies);
    return { ok: true };
  }
  const client = cookies ? createStudioSupabaseServerClient(cookies) : getSupabaseAuthClient();
  const { error } = await client.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: redirectTo }
  });
  if (error) throw authError("supabase_magic_link_failed", 503);
  return { ok: true };
}

export async function exchangeSupabaseAuthCode(code: string, cookies?: CookieMethodsServer) {
  if (codeExchangerForTests) return codeExchangerForTests(code, cookies);
  const client = cookies ? createStudioSupabaseServerClient(cookies) : getSupabaseAuthClient();
  const { data, error } = await client.auth.exchangeCodeForSession(code);
  if (error || !data.session?.access_token || !data.session.refresh_token) {
    throw authError("supabase_callback_failed", 401);
  }
  return data.session;
}

export function supabaseSessionCookies(session: { access_token: string; refresh_token: string; expires_in?: number }) {
  const maxAge = Math.max(60, Number(session.expires_in ?? 3600));
  return [
    cookie(SUPABASE_ACCESS_COOKIE, session.access_token, maxAge),
    cookie(SUPABASE_REFRESH_COOKIE, session.refresh_token, 60 * 60 * 24 * 30)
  ];
}

export function supabaseLogoutCookies() {
  return [
    cookie(SUPABASE_ACCESS_COOKIE, "", 0),
    cookie(SUPABASE_REFRESH_COOKIE, "", 0)
  ];
}

async function verifySupabaseAccessToken(accessToken: string): Promise<SupabaseIdentity | null> {
  if (!accessToken) return null;
  if (verifierForTests) return verifierForTests(accessToken);
  const client = getSupabaseAuthClient();
  const { data, error } = await client.auth.getUser(accessToken);
  const user = data.user;
  if (error || !user?.id || !user.email) return null;
  return {
    id: user.id,
    email: user.email.toLowerCase(),
    emailVerified: Boolean(user.email_confirmed_at || user.confirmed_at)
  };
}

async function getVerifiedSupabaseIdentity(input?: AuthInput): Promise<SupabaseIdentity | null> {
  const accessToken = readCookie(input, SUPABASE_ACCESS_COOKIE);
  const identity = accessToken ? await verifySupabaseAccessToken(accessToken) : await verifySupabaseSsrSession(input);
  if (!identity?.emailVerified) return null;
  return identity;
}

async function verifySupabaseSsrSession(input?: AuthInput): Promise<SupabaseIdentity | null> {
  const cookies = parseCookieHeader(input);
  if (!cookies.length) return null;
  const client = createStudioSupabaseServerClient({
    getAll: () => cookies,
    setAll: () => undefined
  });
  const { data, error } = await client.auth.getUser();
  const user = data.user;
  if (error || !user?.id || !user.email) return null;
  return {
    id: user.id,
    email: user.email.toLowerCase(),
    emailVerified: Boolean(user.email_confirmed_at || user.confirmed_at)
  };
}

async function authorizeWorkspace(identity: SupabaseIdentity, workspaceId: string): Promise<StudioUser | null> {
  if (authorizerForTests) return authorizerForTests(identity, workspaceId);
  if (!identity.emailVerified) return null;

  const db = getDb();
  const [workspace] = await db
    .select({ id: workspaces.id, organizationId: workspaces.organizationId })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  if (!workspace) return null;

  const [profile] = await db
    .select({ id: users.id, email: users.email, status: users.status })
    .from(users)
    .where(or(eq(users.id, identity.id), eq(users.email, identity.email)))
    .limit(1);
  if (!profile || profile.status !== "active") return null;

  const [membership] = await db
    .select({ role: organizationMembers.role, status: organizationMembers.status })
    .from(organizationMembers)
    .where(and(
      eq(organizationMembers.organizationId, workspace.organizationId),
      eq(organizationMembers.userId, profile.id),
      eq(organizationMembers.status, "active")
    ))
    .limit(1);
  if (!membership) return null;

  const role = String(membership.role || "");
  if (!STUDIO_ROLES.includes(role as StudioRole)) return null;

  return {
    id: profile.id,
    email: profile.email,
    role: role as StudioRole,
    workspaceId,
    organizationId: workspace.organizationId,
    supabaseUserId: identity.id
  };
}

export async function getStudioUser(input?: AuthInput, workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default"): Promise<StudioUser | null> {
  const identity = await getVerifiedSupabaseIdentity(input);
  if (!identity) return null;
  return authorizeWorkspace(identity, workspaceId);
}

export async function requireStudioUser(input?: AuthInput, workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default") {
  if (process.env.NODE_ENV === "production" && process.env.STUDIO_AUTH_ENABLED === "false") {
    throw new Error("Production auth bypass forbidden");
  }
  const identity = await getVerifiedSupabaseIdentity(input);
  if (!identity) throw authError("unauthenticated", 401);
  const user = await authorizeWorkspace(identity, workspaceId);
  if (!user) throw authError("forbidden", 403);
  return user;
}

export async function requireWorkspaceMember(input?: AuthInput, workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default") {
  return requireStudioUser(input, workspaceId);
}

export async function requireWorkspaceRole(
  input: AuthInput,
  workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default",
  allowedRoles: readonly StudioRole[]
) {
  const user = await requireStudioUser(input, workspaceId);
  if (!allowedRoles.includes(user.role)) throw authError("forbidden", 403);
  return user;
}

export async function requireStudioAdmin(input?: AuthInput, workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default") {
  return requireWorkspaceRole(input, workspaceId, STUDIO_ADMIN_ROLES);
}

export async function requirePublishPermission(input?: AuthInput, workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default") {
  return requireWorkspaceRole(input, workspaceId, STUDIO_ADMIN_ROLES);
}

export async function requireProviderMutationPermission(input?: AuthInput, workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default") {
  return requireWorkspaceRole(input, workspaceId, STUDIO_ADMIN_ROLES);
}

export async function requireApprovalPermission(input?: AuthInput, workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default") {
  return requireWorkspaceRole(input, workspaceId, STUDIO_ADMIN_ROLES);
}

export async function requireReviewerOrAbove(input?: AuthInput, workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default") {
  return requireWorkspaceRole(input, workspaceId, STUDIO_REVIEW_ROLES);
}

export async function requireDraftMutationPermission(input?: AuthInput, workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default") {
  return requireWorkspaceRole(input, workspaceId, STUDIO_DRAFT_MUTATION_ROLES);
}

export async function getAuditActor(input?: AuthInput) {
  const user = await getStudioUser(input);
  return user ? { actor_type: "human" as const, actor_id: user.id } : null;
}

export async function getStudioAuthDebug(input?: AuthInput, workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default") {
  const supabaseConfigured = getSupabaseAuthConfigStatus().ok;
  let identity: SupabaseIdentity | null = null;

  try {
    identity = await getVerifiedSupabaseIdentity(input);
  } catch {
    return {
      supabaseConfigured,
      hasSession: false,
      userId: null,
      userEmail: null,
      workspaceResolved: false,
      role: null,
      missingMembership: false,
      reason: "session_check_failed"
    };
  }

  if (!identity) {
    return {
      supabaseConfigured,
      hasSession: false,
      userId: null,
      userEmail: null,
      workspaceResolved: false,
      role: null,
      missingMembership: false,
      reason: supabaseConfigured ? "no_session" : "supabase_not_configured"
    };
  }

  try {
    const user = await authorizeWorkspace(identity, workspaceId);
    return {
      supabaseConfigured,
      hasSession: true,
      userId: identity.id,
      userEmail: identity.email,
      workspaceResolved: Boolean(user),
      role: user?.role ?? null,
      missingMembership: !user,
      reason: user ? "ok" : "missing_membership"
    };
  } catch {
    return {
      supabaseConfigured,
      hasSession: true,
      userId: identity.id,
      userEmail: identity.email,
      workspaceResolved: false,
      role: null,
      missingMembership: true,
      reason: process.env.DATABASE_URL ? "membership_check_failed" : "database_not_configured"
    };
  }
}

export async function requireAuditActor(input?: AuthInput) {
  const actor = await getAuditActor(input);
  if (!actor?.actor_id) throw authError("audit_actor_required", 401);
  return actor;
}
