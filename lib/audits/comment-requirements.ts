export type CommentRequirementReason =
  | 'low_score'
  | 'critical_issue'
  | 'bonus_awarded'

export type CommentRequirementQuestion = {
  id: string
  questionText: string
  displayNumber: number | null
  scoringGroup: 'core' | 'bonus'
  maxScore: number
}

export type CommentRequirementAnswer = {
  score: number | null
  comment: string | null
  isCriticalFlag: boolean
}

export type MissingCommentRequirement = {
  questionId: string
  displayNumber: number | null
  questionText: string
  reason: CommentRequirementReason
}

export function commentRequirementReason(
  question: CommentRequirementQuestion,
  answer: CommentRequirementAnswer | null | undefined
): CommentRequirementReason | null {
  if (!answer || answer.score === null) {
    return null
  }

  if (answer.isCriticalFlag) {
    return 'critical_issue'
  }

  if (question.scoringGroup === 'bonus') {
    return answer.score === question.maxScore ? 'bonus_awarded' : null
  }

  if (question.scoringGroup === 'core' && answer.score < question.maxScore) {
    return 'low_score'
  }

  return null
}

export function commentRequirementText(reason: CommentRequirementReason) {
  if (reason === 'critical_issue') {
    return 'Comment required for critical issues.'
  }

  if (reason === 'bonus_awarded') {
    return 'Comment required to explain the outstanding service.'
  }

  return 'Comment required because the score is below 5.'
}

export function findMissingCommentRequirements(
  questions: Array<CommentRequirementQuestion & { answer?: CommentRequirementAnswer | null }>
) {
  return questions.reduce<MissingCommentRequirement[]>((missing, question) => {
    const answer = question.answer ?? null
    const reason = commentRequirementReason(question, answer)

    if (!reason) {
      return missing
    }

    if (answer?.comment?.trim()) {
      return missing
    }

    missing.push({
      questionId: question.id,
      displayNumber: question.displayNumber,
      questionText: question.questionText,
      reason,
    })

    return missing
  }, [])
}
