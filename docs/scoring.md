# Pret CE V1 Scoring

Audit Trainer V1 uses a simplified Pret CE operational scoring model.

## Core Score

- 19 required core questions.
- Each core question has `max_score = 5`.
- Core maximum score is `95`.
- Core questions use:
  - `scoring_model_version = pret_ce_v1`
  - `scoring_group = core`
  - `response_type = score`
  - `required_for_completion = true`
- Pret CE core questions do not allow N/A.

## Outstanding Card Bonus

- One optional bonus question.
- Maximum bonus score is `5`.
- Bonus question uses:
  - `scoring_group = bonus`
  - `response_type = boolean_score`
  - `required_for_completion = false`
- Allowed bonus values are `0` or `5`.
- Bonus is not included in `audits.total_score`, `audits.max_score`, or `audits.percentage`.

## Display

Always display Pret CE V1 completed score as core plus separate bonus:

```txt
87/95 + 0/5 bonus
```

Do not fold the bonus into `/100`.

## Percentage and Bands

Percentage is based on the core score only:

```txt
percentage = core_total_score / 95 * 100
```

Score bands:

| Percentage | Band |
| --- | --- |
| `95-100` | `excellent` |
| `85-94` | `good` |
| `70-84` | `needs_focus` |
| `<70` | `critical` |

## Source Checklist Note

The source Pret report displays Q13 as 3 points and Q14 as 2 points. App V1 intentionally normalizes every core question to 5 points so the operational model stays simple:

```txt
19 core questions x 5 = 95
```

See `docs/pret-customer-experience-checklist.md` for question text and the normalization note.
