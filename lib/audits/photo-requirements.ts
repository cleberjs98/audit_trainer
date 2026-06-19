import type { QuestionScoringGroup } from '@/components/checklist/types'

export function isPhotoRequiredQuestion(
  displayNumber: number | null,
  scoringGroup: QuestionScoringGroup
) {
  if (scoringGroup !== 'core' || displayNumber === null) {
    return false
  }

  return (
    (displayNumber >= 1 && displayNumber <= 7) ||
    (displayNumber >= 16 && displayNumber <= 19)
  )
}

export function photoRequirementText(
  displayNumber: number | null,
  scoringGroup: QuestionScoringGroup
) {
  return isPhotoRequiredQuestion(displayNumber, scoringGroup)
    ? 'Photo evidence required for this visual standard.'
    : null
}
