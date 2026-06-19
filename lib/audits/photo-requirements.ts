import type { QuestionScoringGroup } from '@/components/checklist/types'

export type PhotoRequirementQuestion = {
  id: string
  questionText: string
  displayNumber: number | null
  scoringGroup: QuestionScoringGroup
}

export type MissingRequiredPhotoRequirement = {
  questionId: string
  displayNumber: number | null
  questionText: string
}

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

export function findMissingRequiredPhotoRequirements(
  questions: Array<PhotoRequirementQuestion & { evidenceCount?: number | null }>
) {
  return questions.reduce<MissingRequiredPhotoRequirement[]>(
    (missing, question) => {
      if (
        !isPhotoRequiredQuestion(question.displayNumber, question.scoringGroup)
      ) {
        return missing
      }

      if ((question.evidenceCount ?? 0) > 0) {
        return missing
      }

      missing.push({
        questionId: question.id,
        displayNumber: question.displayNumber,
        questionText: question.questionText,
      })

      return missing
    },
    []
  )
}
