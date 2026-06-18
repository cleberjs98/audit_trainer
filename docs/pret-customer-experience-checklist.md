# Pret Customer Experience Checklist

## Purpose

This document is the source of truth for the Pret CE V1 checklist text and scoring model used by the current app.

The app V1 checklist should include only:

1. Core Score questions 1-19
2. Outstanding Card bonus question

The real report's Information Only section is excluded from the app checklist for now.

## Official Scoring Model

### Core Score

- Questions 1 to 19.
- Total max: 95 points.
- This is the base audit score.
- This is the score used for the normal performance result.

### Outstanding Card

- Final outstanding-service question.
- Bonus max: +5 points.
- It is displayed separately from the core score as a possible `+5` bonus.
- It should not penalize the shop if not achieved.
- If no outstanding service or card is achieved, the core score remains out of 95.

### Display Rule

Prefer:

```txt
87/95 + 0/5 bonus
```

Do not display only:

```txt
87/100
```

The official base score is out of 95, so the app must keep the core score visible as the primary result and keep bonus separate.

## A. Core Score - Global Brand Standards - 95 Points

All core questions use:

- `scoring_group: core`
- `response_type: score`
- `required_for_completion: true`
- `max_score: 5`

### V1 Scoring Normalization Note

The source report displays question 13 as 3 points and question 14 as 2 points. App V1 intentionally normalizes every core question to 5 points so the operational model stays simple:

```txt
19 core questions x 5 points = 95 points
```

This means questions 13 and 14 are stored as 5-point questions in the app, even though the source PDF uses smaller point values for those two rows.

### 1. Shop Exterior and Entrance

Question:
How clean and tidy was the shop from the outside and at the entrance (signage, door, doormat, outside seating)?

- `max_score: 5`
- `scoring_group: core`
- `response_type: score`
- `required_for_completion: true`

### 2. Main Fridge and Hot Food Presentation

Question:
How well presented were the MAIN fridge display units, including hot food (neat, at the front of the shelf, with labels facing forward and with a price ticket)?

- `max_score: 5`
- `scoring_group: core`
- `response_type: score`
- `required_for_completion: true`

### 3. Snacks and Bakery Presentation

Question:
How well presented were SNACKS in snack stands and BAKERY at the till counter?

- `max_score: 5`
- `scoring_group: core`
- `response_type: score`
- `required_for_completion: true`

### 4. Cold Fridge Availability

Question:
For this visit, EVERY price ticket for freshly-made COLD FRIDGE products should have at least 1 item available. Was this availability target met and, if not, by how many price tickets?

- `max_score: 5`
- `scoring_group: core`
- `response_type: score`
- `required_for_completion: true`

### 5. Hot Food Availability

Question:
For this visit, EVERY price ticket for freshly-made HOT FOOD products should have at least 1 item available. Was this availability target missed and, if so, by how many price tickets?

- `max_score: 5`
- `scoring_group: core`
- `response_type: score`
- `required_for_completion: true`

### 6. Snacks and Bottled Drinks Availability

Question:
Were ALL snacks and bottled drinks available and, if not, how many products were missing?

- `max_score: 5`
- `scoring_group: core`
- `response_type: score`
- `required_for_completion: true`

### 7. Bakery Range

Question:
For this visit, you should have a choice of AT LEAST 10 different freshly-made BAKERY products. Were there at least 10 (target met), 9 (1 fewer than target), 8 (2 fewer), 7 (3 fewer), or less than 7 (4/4+ fewer)?

- `max_score: 5`
- `scoring_group: core`
- `response_type: score`
- `required_for_completion: true`

### 8. Team Member Presentation

Question:
How smart and presentable was the team member serving you?

- `max_score: 5`
- `scoring_group: core`
- `response_type: score`
- `required_for_completion: true`

### 9. Queue Time

Question:
How reasonable was your queue time, given how busy it was? We aim for 60 seconds.

- `max_score: 5`
- `scoring_group: core`
- `response_type: score`
- `required_for_completion: true`

### 10. Barista Drink Wait Time

Question:
How reasonable was the wait for your barista prepared drink? We aim for 60 seconds.

- `max_score: 5`
- `scoring_group: core`
- `response_type: score`
- `required_for_completion: true`

### 11. Customer Prioritisation

Question:
How good were all our team members at prioritising customers?

- `max_score: 5`
- `scoring_group: core`
- `response_type: score`
- `required_for_completion: true`

### 12. Till Engagement

Question:
How well did the person at the till engage with you (eye contact, smile and greeting)?

- `max_score: 5`
- `scoring_group: core`
- `response_type: score`
- `required_for_completion: true`

### 13. Parting Comment

Question:
Did you receive a pleasant parting comment at point of payment from the team member that served you?

- `max_score: 5`
- `scoring_group: core`
- `response_type: score`
- `required_for_completion: true`

### 14. Drink Handover Acknowledgement

Question:
Were you acknowledged when your drink was handed to you?

- `max_score: 5`
- `scoring_group: core`
- `response_type: score`
- `required_for_completion: true`

### 15. Scenario Enquiry

Question:
Based on the scenario you selected, please rate your experience when making your enquiry to a team member.

- `max_score: 5`
- `scoring_group: core`
- `response_type: score`
- `required_for_completion: true`

### 16. Food Quality and Presentation

Question:
How was the quality and presentation of your food items?

- `max_score: 5`
- `scoring_group: core`
- `response_type: score`
- `required_for_completion: true`

### 17. Barista Drink Quality and Presentation

Question:
How was the quality and presentation of your barista-prepared drink?

- `max_score: 5`
- `scoring_group: core`
- `response_type: score`
- `required_for_completion: true`

### 18. Floors and Seating Area Cleanliness

Question:
How clean and tidy were the floors and seating area in the shop?

- `max_score: 5`
- `scoring_group: core`
- `response_type: score`
- `required_for_completion: true`

### 19. Bin Stations

Question:
How clean, tidy and well stocked with cutlery/sugars were the bin stations?

- `max_score: 5`
- `scoring_group: core`
- `response_type: score`
- `required_for_completion: true`

### Core Total

- 95 points.

## B. Scenario Selector

The real report includes a scenario selector row, but the app will not include it as a separate checklist item for now.

For V1:

- The scenario enquiry is represented by core question 15.
- No separate N/A selector row is needed.
- Future versions may add a scenario selector field if needed.

## C. Outstanding Card Bonus - 5 Points

The real report display number may appear as 21. In the app, treat it as the single bonus question after the 19 core questions.

Question:
Smiling, courteous and competent service is our minimum expected standard. Did any ONE team member go beyond this with truly exceptional service that you would talk about with others?

- `max_score: 5`
- `scoring_group: bonus`
- `response_type: score` or `boolean_score`
- `required_for_completion: false`
- Does not penalize core score if no bonus is awarded.
- Display as `Outstanding Card: 0/5 bonus` or similar.

## D. Excluded From App V1

Do not include these Information Only or report-only fields in the app checklist for now:

- Based only on THIS experience, how likely would you recommend Pret to friends, family and colleagues?
- Are you a Club Pret subscriber?
- When served, were you asked if you were "taking away" or "eating in"?
- Were you charged correctly for your purchase?
- Did the opening hours on the shop door match what is on the website?
- Did you see a manager on duty during your visit that was supporting and motivating the team?
- Please state the name of your server.
- Please provide a description of the team member you asked your scenario question to.

Reason:

- They are not needed for the app's core audit score.
- They would make the checklist longer.
- They should not affect the 95-point core score.

## E. Implementation Notes

- Current 62-question seed is deprecated for the real Pret-style model.
- Do not delete old questions; mark them inactive in a future migration.
- New audits should use the real Pret scoring model.
- Existing test audits may reference old question IDs and should be considered disposable or legacy.
- Need schema support:
  - `question_scoring_group` enum: `core`, `bonus`
  - `question_response_type` enum: `score`, `boolean_score`
  - `scoring_group` column
  - `response_type` column
  - `required_for_completion` column
  - `display_number` column
- Need RPC update:
  - `complete_audit_v1` must calculate core and bonus separately.
  - Core score should be persisted in `audits.total_score`, `audits.max_score`, and `audits.percentage`.
  - Bonus details should be stored in `section_scores` or future dedicated fields.
- Need UI update:
  - Core Score section.
  - Outstanding Card bonus section.
  - No Information Only section.
  - Score inputs only for score or bonus items.

## F. Open Decisions

- Should Outstanding Card require an explicit answer before completion, or default to 0/5 if unanswered?
- Should core question 15 include a scenario selector later?
- Should legacy 62-question test audits be archived or left as draft legacy?
- Should we add `scoring_model_version` to `audits`?
- Should bonus be stored only in `section_scores` or also in dedicated audit columns?
