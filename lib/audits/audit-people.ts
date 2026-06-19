import type {
  AuditPeopleValues,
  AuditPersonType,
  MissingAuditPersonRequirement,
} from '@/components/checklist/types'

export const auditPeopleFields: Array<{
  personType: AuditPersonType
  key: keyof AuditPeopleValues
  label: string
}> = [
  {
    personType: 'team_member',
    key: 'teamMemberName',
    label: 'Team Member name',
  },
  {
    personType: 'barista',
    key: 'baristaName',
    label: 'Barista name',
  },
  {
    personType: 'mod',
    key: 'modName',
    label: 'MOD / Manager on Duty name',
  },
]

export function normalizeAuditPersonName(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

export function findMissingAuditPeople(
  values: AuditPeopleValues
): MissingAuditPersonRequirement[] {
  return auditPeopleFields
    .filter((field) => normalizeAuditPersonName(values[field.key]) === '')
    .map((field) => ({
      personType: field.personType,
      label: field.label,
    }))
}
