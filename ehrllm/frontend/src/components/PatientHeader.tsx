import { useEffect, useRef, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Loader2 } from "lucide-react"
import { createKeyboardShortcut } from '@/lib/utils'
import { PatientMetadata } from '@/types'
import { N2C22018LabelsPanel } from './LabelsPanel'

interface PatientHeaderProps {
  loadPatient: (id: string) => Promise<void>;
  patientMetadata?: PatientMetadata;
  error: string | null;
  setError: (error: string | null) => void;
  settings: any;
  setQuery: (query: string) => void;
  patientId: string;
  setPatientId: (patientId: string) => void;
}

export function PatientHeader({ loadPatient, patientMetadata, error, setError, setQuery, patientId, setPatientId, settings }: PatientHeaderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const patientIdInputRef = useRef<HTMLInputElement>(null);

  // Create keyboard shortcut to focus input field on 's'
  useEffect(() => {
    // Create keyboard shortcut to focus input field on 's'
    return createKeyboardShortcut('s', (e: KeyboardEvent) => {
      // Prevent 'p' from being typed into input field
      e.preventDefault();
      // Focus
      patientIdInputRef.current?.focus();
    }, true);
  }, []);

  const handleSubmit = async () => {
    // Ignore if the patient ID is not a number
    const cleanPatientId = patientId.trim();

    // Load the patient
    setIsLoading(true);
    try {
      await loadPatient(cleanPatientId);
    } finally {
      setIsLoading(false);
    }
  }

  const handlePatientIdChange = (value: string) => {
    setPatientId(value);
    // Reset the alert
    setError(null);
  }

  return (
    <Card className="p-4 mb-6">
      <div className="flex gap-4">
        <Input 
          ref={patientIdInputRef}
          placeholder="Enter Patient ID [s]" 
          value={patientId}
          onChange={(e) => handlePatientIdChange(e.target.value)}
          onKeyUp={(e) => e.key === 'Enter' && handleSubmit()}
          disabled={isLoading}
        />
        <Button 
          onClick={handleSubmit} 
          disabled={patientId.trim() === '' || isLoading}
        >
          {isLoading ? 
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </> : 
            'Load Patient'
          }
        </Button>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      {patientMetadata && (
        <div className="grid grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Name</p>
            <p className="font-medium">{patientMetadata.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Age</p>
            <p className="font-medium">{patientMetadata.age}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">MRN</p>
            <p className="font-medium">{patientMetadata.mrn}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground"># of Notes</p>
            <p className="font-medium">{patientMetadata.n_notes}</p>
          </div>
        </div>
      )}
      {patientMetadata?.labels && patientMetadata.labels.length > 0 && (
        settings?.database === 'n2c2-2018' ? 
          <N2C22018LabelsPanel patientMetadata={patientMetadata} setQuery={setQuery} /> 
          :
          <div>Unknown database</div>
      )}
    </Card>
  )
} 