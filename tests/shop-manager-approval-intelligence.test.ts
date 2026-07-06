import { describe, expect, it } from "vitest";
import {
  createApprovalPrediction,
  prioritizeApprovalQueue,
  recordOwnerApprovalFeedback,
  registerCommerceAgentRoles,
  runCommerceAgent
} from "@saltyfactory/ai-free";
import { createMemoryRepositories, createRepositoryStore } from "../packages/db/src/repositories/memory";
import { marketingActorId, marketingWorkspaceId, seedMarketingLaunchPlan } from "./marketing-test-helpers";

function value(row: Record<string, unknown>, snake: string, camel = snake.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())) {
  return row[snake] ?? row[camel];
}

function seedRepos() {
  return createMemoryRepositories(createRepositoryStore());
}

describe("shop manager approval intelligence", () => {
  it("creates advisory approval predictions and learns from real owner feedback without auto-approval", async () => {
    const repos = seedRepos();
    const fixture = await seedMarketingLaunchPlan({ repos });
    await registerCommerceAgentRoles({ repos, workspaceId: marketingWorkspaceId, actorId: marketingActorId });
    await runCommerceAgent({
      repos,
      workspaceId: marketingWorkspaceId,
      actorId: marketingActorId,
      roleKey: "product_readiness_launch_gate",
      launchPlanId: fixture.launchPlanId,
      sourceEntityType: "product_concept_candidate",
      sourceEntityId: fixture.conceptId
    });

    const queueResult = await prioritizeApprovalQueue({
      repos,
      workspaceId: marketingWorkspaceId,
      actorId: marketingActorId,
      roleKey: "approval_queue"
    });
    expect(queueResult.approvalQueueItems.length).toBeGreaterThan(0);

    const approvalItem = queueResult.approvalQueueItems[0]!;
    const prediction = await createApprovalPrediction({
      repos,
      workspaceId: marketingWorkspaceId,
      actorId: marketingActorId,
      roleKey: "shop_manager_approval_intelligence",
      approvalItemId: approvalItem.id
    });
    expect(prediction.prediction.requires_human_decision).toBe(true);
    expect(["approve", "request_changes"]).toContain(prediction.prediction.recommended_owner_decision);
    expect(Number(value(prediction.row, "confidence_score", "confidenceScore"))).toBeGreaterThan(0);

    const unchangedItem = await repos.commerceAgent.approvalQueueItems.getById(approvalItem.id, marketingWorkspaceId);
    expect(unchangedItem?.status).toBe("pending");
    expect(unchangedItem?.approved_by ?? unchangedItem?.approvedBy ?? null).toBeNull();

    const feedback = await recordOwnerApprovalFeedback({
      repos,
      workspaceId: marketingWorkspaceId,
      actorId: marketingActorId,
      roleKey: "shop_manager_approval_intelligence",
      approvalItemId: approvalItem.id,
      ownerDecision: "request_changes",
      ownerNotes: "Needs proof-backed policy-safe wording.",
      editedFields: { summary: "Tightened owner-facing clarity." },
      preferenceSignal: {
        patternType: "prefers",
        summary: "Jennie prefers proof-backed policy-safe wording."
      }
    });

    expect(value(feedback.feedback, "owner_decision", "ownerDecision")).toBe("needs_changes");
    const updatedPrediction = await repos.commerceAgent.approvalPredictionRecords.getById(prediction.row.id, marketingWorkspaceId);
    expect(value(updatedPrediction!, "actual_decision", "actualDecision")).toBe("needs_changes");
    expect(updatedPrediction?.decided_at ?? updatedPrediction?.decidedAt).toBeTruthy();

    const patternsAfterFirstFeedback = await repos.commerceAgent.ownerDecisionPatterns.listByWorkspace(marketingWorkspaceId);
    expect(patternsAfterFirstFeedback).toHaveLength(1);
    expect(value(patternsAfterFirstFeedback[0]!, "pattern_type", "patternType")).toBe("prefers");
    expect(value(patternsAfterFirstFeedback[0]!, "tentative")).toBe(true);
    expect(value(patternsAfterFirstFeedback[0]!, "evidence_approval_ids", "evidenceApprovalIds")).toContain(approvalItem.id);

    await repos.commerceAgent.approvalQueueItems.create({
      id: "approval_item_corrected_preference",
      workspace_id: marketingWorkspaceId,
      source_entity_type: "commerce_recommendation",
      source_entity_id: "rec_corrected",
      requested_action: "request_changes",
      priority: 75,
      reason: "Corrected owner preference evidence.",
      risk_summary: { severity: "medium" },
      status: "pending",
      created_by: marketingActorId
    });

    await recordOwnerApprovalFeedback({
      repos,
      workspaceId: marketingWorkspaceId,
      actorId: marketingActorId,
      roleKey: "shop_manager_approval_intelligence",
      approvalItemId: "approval_item_corrected_preference",
      ownerDecision: "approve",
      ownerNotes: "Updated preference pattern.",
      preferenceSignal: {
        patternType: "prefers",
        summary: "Jennie prefers concise proof-backed wording with fewer checklist details."
      }
    });

    const patterns = await repos.commerceAgent.ownerDecisionPatterns.listByWorkspace(marketingWorkspaceId);
    const superseded = patterns.find((pattern) => value(pattern, "summary") === "Jennie prefers proof-backed policy-safe wording.");
    const current = patterns.find((pattern) => value(pattern, "summary") === "Jennie prefers concise proof-backed wording with fewer checklist details.");
    expect(superseded?.superseded_by ?? superseded?.supersededBy).toBe(current?.id);
    expect(current?.superseded_by ?? current?.supersededBy ?? null).toBeNull();

    const queueRows = await repos.commerceAgent.approvalQueueItems.listByWorkspace(marketingWorkspaceId);
    expect(queueRows.some((item) => item.status === "approved")).toBe(false);
  });
});
