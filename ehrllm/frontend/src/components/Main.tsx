import { PatientHeader } from './PatientHeader'
import { NotesList } from './NotesList'
import { ChatInterface } from './ChatInterface'
import { useEffect, useState } from 'react'
import { getPatientInfo } from '@/lib/api'
import { PatientData, Evidence, Message } from '@/types'
import { SettingsHeader } from './SettingsHeader'

export function Main() {
  const [settings, setSettings] = useState({
    model: "gpt-4o-mini",
    database: "mimiciv-notes",
  })
  const [patientId, setPatientId] = useState<number | null>(null)
  const [patientData, setPatientData] = useState<PatientData | null>(null)
  const [headerError, setHeaderError] = useState<string | null>(null)
  const [highlightClaimQuoteTuples, setHighlightClaimQuoteTuples] = useState<string[][]>([])
  const [query, setQuery] = useState<string>('');

  useEffect(() => { 
      setHighlightClaimQuoteTuples(
        [
          [ 
            "claim1", 
            "We arranged for you to meet with hospice coordinators, and you will be discharged home with hospice.",
            "10000032-DS-24"
          ],
          [
            "claim2",
            "We",
            "note2",
          ]
        ]);
  }, []);

  const hideEvidence = () => {
      setHighlightClaimQuoteTuples([]);
  }

  const highlightEvidence = (message: Message) => {
      // First, flatten the evidence / quotes arrays into a single array of tuples
      // where each tuple is (claim, quote, note_id)
      const claimQuoteTuples = message.evidence?.reduce((acc: string[][], evidence: Evidence) => {
        const claim = evidence.claim || "";
        const quotes = evidence.quotes?.map(quote => [quote.quote, quote.source]) || []
        for (const quote of quotes) {
          acc.push([claim, quote[0], quote[1]]);
        }
        return acc;
      }, []);

      // Highlight quotes
      setHighlightClaimQuoteTuples(claimQuoteTuples || []);
  }

  const loadPatient = async (id: number) => {
    setPatientId(id);
    // Fetch patient info
    const resp = await getPatientInfo(id, settings);
    // Parse response
    if (resp.error) {
      console.error('Error loading patient data:', resp.error)
      setHeaderError(resp.error);
      setPatientData(null);
    } else {
      setHeaderError(null);
      setPatientData(resp.data);
    }
  }
  return (
      <div className="container mx-auto p-2">
          <div className="mb-1">
            <SettingsHeader
              settings={settings}
              setSettings={setSettings}
            />
          </div>
          <PatientHeader 
              loadPatient={loadPatient} 
              patientMetadata={patientData?.metadata}
              setQuery={setQuery}
              error={headerError}
              setError={setHeaderError}
              settings={settings}
          />
          <div className="grid grid-cols-2 gap-6">
              <div>
                <NotesList 
                  notes={patientData?.notes} 
                  highlightClaimQuoteTuples={highlightClaimQuoteTuples} 
                  hideEvidence={hideEvidence}
                />
              </div>
              <div>
                <ChatInterface 
                  patientId={patientId} 
                  highlightEvidence={highlightEvidence} 
                  query={query}
                  setQuery={setQuery}
                  settings={settings}
                />
              </div>
          </div>
      </div>
  )
}