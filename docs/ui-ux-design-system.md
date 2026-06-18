# UI/UX Design System

Audit Trainer uses a premium Graphite + Signal Crimson identity. It should feel like a native mobile operations command center, not a Pret-branded clone and not a generic blue SaaS tool.

## Product Identity

- Display name: Audit Trainer.
- Visual direction: Graphite + Signal Crimson.
- Mobile-first, with desktop sidebar/dashboard support.
- App UI and report output must be in English.

## Color Tokens

| Token | Hex | Use |
| --- | --- | --- |
| `background` | `#F4F6F8` | App background |
| `foreground` | `#171A1F` | Primary text |
| `surface` | `#FFFFFF` | Cards and forms |
| `surface-soft` | `#F8FAFC` | Soft panels and secondary fields |
| `primary` | `#D11F3A` | Primary actions and active states |
| `primary-dark` | `#A9152D` | Primary hover/press |
| `primary-soft` | `#FDE8EC` | Soft brand badges |
| `border` | `#D9DEE7` | Borders |
| `muted` | `#667085` | Secondary text |
| `muted-strong` | `#475467` | Strong secondary text |
| `accent` | `#FFB020` | Outstanding Card bonus |
| `success` | `#12B76A` | Completed/full score |
| `success-soft` | `#ECFDF3` | Soft success backgrounds |
| `warning` | `#F79009` | In progress/warning |
| `warning-soft` | `#FFFAEB` | Soft warning backgrounds |
| `danger` | `#F04438` | Critical/low score |
| `danger-soft` | `#FEF3F2` | Soft danger backgrounds |
| `info` | `#344054` | Graphite info panels |
| `info-soft` | `#F2F4F7` | Soft graphite panels |

Primary crimson buttons must always use white text.

## Surface Rules

- Mobile pages use soft graphite/light gray backgrounds.
- Cards are raised white surfaces with subtle border/shadow.
- Summary panels can use graphite or graphite-soft contrast.
- Signal Crimson is reserved for primary actions, active nav, and progress accents.
- Functional status should use semantic colors: green, amber, red, graphite/info, and gold for bonus.

## Components

- Primary button: Signal Crimson background, white text.
- Secondary button: white or soft surface, graphite border/text.
- Card: white, subtle gray border, premium shadow.
- Input/select: gray border, readable label, Signal Crimson focus.
- Status chip: semantic color.
- Score selector: segmented `0-5` buttons for Pret CE V1 core questions.
- Checklist stepper: circular markers connected by a guide line.
- Mobile bottom navigation: role-aware, active item in Signal Crimson.
- Desktop sidebar: dark graphite, clear active state, Sign out integrated near account details.

## Checklist Stepper Rules

- Core 5/5: green.
- Core 4/5: amber.
- Core 0-3/5: red.
- Unanswered: neutral.
- Current answered marker preserves score color and adds crimson ring.
- Current unanswered marker is crimson with white text.
- Bonus 5/5: gold.
- Bonus 0/5 or unanswered: neutral, never red.

## Mobile Route Patterns

- Login: graphite/soft graphite brand area, elevated sign-in card, full-width crimson CTA.
- Dashboard: compact Command Center, KPI cards, analytics first, Quick Actions hidden on mobile.
- Audit History: compact header, horizontal status chips, compact search, compact audit cards.
- Checklist: progress summary, horizontal stepper, one question card, bottom-row Back and Save & Continue.
- Action Plans: compact list/detail cards with semantic status and priority chips.
- Store Management: list first, `+ Create store`, store profile/report, edit form only after explicit action.
- Team Management: invite form and pending invitations in premium cards; manual link wraps safely.
- Accept Invite: centered success/error card with no raw token exposure.

## Iconography

Use `lucide-react` only.

| Meaning | Icon |
| --- | --- |
| Dashboard | Home |
| Audits | ClipboardList |
| Action plans | ListChecks |
| Stores | Store |
| Team | Users/UserPlus |
| Create | Plus |
| Edit | Pencil/Edit |
| Completed | CircleCheck |
| In progress | Clock |
| Attention | TriangleAlert |
| Search | Search |
| Filter | SlidersHorizontal/Filter |

## Accessibility and Responsiveness

- Touch targets must be comfortable on mobile.
- Avoid horizontal overflow.
- Keep text readable without oversized mobile hero blocks.
- Bottom navigation must not cover content or submit buttons.
- Icon-only clickable controls need labels or accessible text.
