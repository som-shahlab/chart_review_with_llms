import { Badge } from './ui/badge'
import { PatientMetadata } from '@/types'

const promptTemplate = `
The inclusion criterion being assessed is: '{labelDefinition}' 

Based on the patient's clinical note, does this patient meet this inclusion criterion?
`.trim();

export function N2C22018LabelsPanel({ patientMetadata, setQuery }: { patientMetadata: PatientMetadata, setQuery: (query: string) => void }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-2">
        Inclusion Criteria
      </p>
      <div className="flex flex-wrap gap-2">
        {patientMetadata?.labels?.map((label) => (
          <Badge 
            key={label.name} 
            variant={label.is_met ? 'success' : 'outline'}
            className="cursor-pointer"
            onClick={() => {
              setQuery(`${promptTemplate.replace('{labelDefinition}', label.definition)}`);
              // Focus on the input field
              document.getElementById('chat-query-input')?.focus();
            }}
          >
            {label.name}
          </Badge>
        ))}
      </div>
    </div>
  )
}
