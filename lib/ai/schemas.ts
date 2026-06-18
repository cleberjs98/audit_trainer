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

export type AiActionPlanPayload = z.infer<typeof AiActionPlanPayloadSchema>;
export type AiDashboardInsightPayload = z.infer<
  typeof AiDashboardInsightPayloadSchema
>;
