# Mobile UX and Design System

Audit Trainer uses a premium Graphite + Signal Crimson identity. The app should feel like a native mobile operations tool, not a desktop page squeezed onto a phone.

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
| `border` | `#D9DEE7` | Card/input borders |
| `muted` | `#667085` | Secondary text |
| `muted-strong` | `#475467` | Strong secondary text |
| `accent` | `#FFB020` | Outstanding Card bonus |
| `success` | `#12B76A` | Completed/full score |
| `success-soft` | `#ECFDF3` | Soft success backgrounds |
| `warning` | `#F79009` | In progress/medium warning |
| `warning-soft` | `#FFFAEB` | Soft warning backgrounds |
| `danger` | `#F04438` | Critical/low score |
| `danger-soft` | `#FEF3F2` | Soft danger backgrounds |
| `info` | `#344054` | Graphite info panels |
| `info-soft` | `#F2F4F7` | Soft graphite panels |

Primary crimson buttons must use white text.

## Mobile Surface Rules

- Use a soft graphite/light gray page background.
- Use raised white cards for content.
- Use graphite or graphite-soft panels for important summaries.
- Use Signal Crimson only for primary actions, active nav, and progress accents.
- Use semantic colors for status and score, not brand red.
- Avoid flat all-white pages.
- Avoid giant hero blocks on mobile.
- Ensure content has enough bottom padding for the mobile bottom navigation.

## Reusable Mobile Classes

The current app defines:

- `mobile-graphite-panel`
- `mobile-premium-card`
- `mobile-soft-card`

Use these for consistent mobile graphite panels, raised cards, and soft supporting surfaces.

## Mobile Shell

- Desktop keeps the approved sidebar.
- Mobile uses a top app header and bottom navigation.
- Bottom navigation is role-aware:
  - Dashboard: Home icon.
  - Audits: ClipboardList icon.
  - Action Plans: ListChecks icon.
  - Stores: Store icon, only for `admin` and `area_manager`.
  - Team: Users icon, for `admin`, `area_manager`, and `store_manager`.
  - Leaders do not see Team or Store Management.

## Checklist Stepper

- Core question markers are circular and connected by a guide line.
- Answered core marker colors:
  - `5/5`: green.
  - `4/5`: amber.
  - `0-3/5`: red.
  - Unanswered: neutral.
- Current answered step keeps its score color and adds a crimson ring.
- Current unanswered step is crimson with white text.
- Bonus uses a star-style marker:
  - `5/5`: gold.
  - `0/5` answered: neutral.
  - Unanswered: neutral.
  - Current bonus: crimson outer ring.
- Bonus `0/5` is never red because it does not penalize core score.

## Store Management Mobile Flow

- Main screen shows the store list first.
- `+ Create store` is visible only to `admin` and `area_manager`.
- Tapping a store opens a store profile/report view.
- `Edit store details` opens the edit form.
- Create/edit forms are secondary and are not shown by default on mobile.

## Iconography

Use existing `lucide-react` icons only.

| Meaning | Icon |
| --- | --- |
| Dashboard | Home |
| Audits | ClipboardList |
| Action plans | ListChecks |
| Store Management | Store |
| Team Management | Users/UserPlus |
| Create | Plus |
| Edit | Pencil/Edit |
| Completed | CircleCheck |
| In progress | Clock |
| Attention | TriangleAlert |
| Search | Search |
| Filter | SlidersHorizontal/Filter |
