import { z } from "zod";

export const AiPrioritySchema = z.enum(["low", "medium", "high"]);

export const AiActionPlanPayloadSchema = z
  .object({
    executive_summary: z.string().min(1),
    what_went_well: z.array(z.string().min(1)),
    priority_focus: z.array(
      z
        .object({
          area: z.string().min(1),
          reason: z.string().min(1),
          evidence: z.string().min(1),
          priority: AiPrioritySchema,
        })
        .strict(),
    ),
    action_items: z
      .array(
        z
          .object({
            title: z.string().min(1),
            issue_observed: z.string().min(1),
            recommended_action: z.string().min(1),
            owner_suggestion: z.string().min(1),
            priority: AiPrioritySchema,
            due_in_days: z.number().int().min(1).max(30),
            success_measure: z.string().min(1),
          })
          .strict(),
      )
      .min(3)
      .max(5),
    dashboard_insight: z
      .object({
        summary: z.string().min(1),
        risk_level: AiPrioritySchema,
        coaching_focus: z.string().min(1),
        next_best_action: z.string().min(1),
      })
      .strict(),
  })
  .strict();

export const AiDashboardInsightPayloadSchema = z
  .object({
    summary: z.string().min(1),
    risk_level: AiPrioritySchema,
    top_focus_areas: z.array(
      z
        .object({
          title: z.string().min(1),
          reason: z.string().min(1),
          priority: AiPrioritySchema,
          evidence: z.string().min(1).optional(),
          related_questions: z.array(z.number().int().positive()).optional(),
        })
        .strict(),
    ),
    positive_trends: z.array(z.string().min(1)),
    risk_alerts: z.array(
      z
        .object({
          title: z.string().min(1),
          severity: AiPrioritySchema,
          evidence: z.string().min(1),
        })
        .strict(),
    ),
    recommended_actions: z.array(
      z
        .object({
          title: z.string().min(1),
          owner_suggestion: z.string().min(1),
          due_in_days: z.number().int().min(1).max(30),
          success_measure: z.string().min(1).optional(),
        })
        .strict(),
    ),
  })
  .strict();

const PosterTextSchema = z.string().min(1).max(220);
const PosterShortTextSchema = z.string().min(1).max(90);
const PosterTitleSchema = z.string().min(1).max(45);
const PosterWinTitleSchema = z.string().min(1).max(32);
const PosterBulletSchema = z.string().min(1).max(90);
const PosterActionTitleSchema = z.string().min(1).max(36);
const PosterActionBulletSchema = z.string().min(1).max(62);

export const AiActionPlanPdfPayloadSchema = z
  .object({
    report_kind: z.literal("ai_action_plan_pdf"),
    title: z.literal("Action Plan"),
    subtitle: z.literal("Mystery Shopper Feedback & Goals"),
    source: z
      .object({
        action_plan_id: z.string().min(1).max(80),
        audit_id: z.string().min(1).max(80).nullable(),
        store_name: PosterShortTextSchema,
        store_code: z.string().min(1).max(80).nullable(),
        location_label: z.string().min(1).max(160).nullable(),
        date_label: z.string().min(1).max(80).nullable(),
      })
      .strict(),
    score_overview: z
      .object({
        display_score: PosterShortTextSchema.nullable(),
        core_score: z.number().int().min(0).max(95).nullable(),
        core_max_score: z.literal(95).nullable(),
        bonus_score: z.number().int().min(0).max(5).nullable(),
        bonus_max_score: z.literal(5).nullable(),
        percentage: z.number().min(0).max(100).nullable(),
        band: z.enum(["excellent", "good", "needs_focus", "critical"]).nullable(),
        target_message: PosterTextSchema.nullable(),
      })
      .strict(),
    wins: z
      .array(
        z
          .object({
            title: PosterWinTitleSchema,
            detail: z.string().min(1).max(120),
          })
          .strict(),
      )
      .min(2)
      .max(5),
    action_areas: z
      .array(
        z
          .object({
            rank: z.union([z.literal(1), z.literal(2), z.literal(3)]),
            title: PosterActionTitleSchema,
            source_items: z.array(PosterBulletSchema).min(1).max(4),
            feedback_summary: z.string().min(1).max(120),
            actions: z.array(PosterActionBulletSchema).min(2).max(3),
            coaching_phrases: z.array(z.string().min(1).max(80)).min(1).max(3),
            goal: z.string().min(1).max(55),
          })
          .strict(),
      )
      .length(3),
    additional_opportunities: z
      .array(
        z
          .object({
            title: PosterWinTitleSchema,
            action: z.string().min(1).max(120),
          })
          .strict(),
      )
      .min(0)
      .max(4),
    focus: z
      .object({
        title: PosterTitleSchema,
        bullets: z.array(PosterBulletSchema).min(2).max(5),
      })
      .strict(),
    closing_message: PosterTextSchema,
    source_summary: z
      .object({
        action_item_count: z.number().int().min(0),
        low_score_question_count: z.number().int().min(0),
        critical_issue_count: z.number().int().min(0),
        comment_count: z.number().int().min(0),
        photo_evidence_count: z.number().int().min(0),
      })
      .strict(),
  })
  .strict();

export type AiActionPlanPayload = z.infer<typeof AiActionPlanPayloadSchema>;
export type AiDashboardInsightPayload = z.infer<
  typeof AiDashboardInsightPayloadSchema
>;
export type AiActionPlanPdfPayload = z.infer<
  typeof AiActionPlanPdfPayloadSchema
>;
