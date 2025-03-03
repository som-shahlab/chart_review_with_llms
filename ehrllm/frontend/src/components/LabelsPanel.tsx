import { Badge } from './ui/badge'
import { PatientMetadata } from '@/types'

export function N2C22018LabelsPanel({ patientMetadata }: { patientMetadata: PatientMetadata }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-2">
        Inclusion Criteria
      </p>
      <div className="flex flex-wrap gap-2">
        {patientMetadata?.labels?.map((label) => (
          <Badge key={label.name} variant={label.is_met ? 'success' : 'outline'}>
            {label.name}
          </Badge>
        ))}
      </div>
    </div>
  )
}
