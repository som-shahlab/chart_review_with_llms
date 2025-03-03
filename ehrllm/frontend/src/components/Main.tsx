import { PatientHeader } from './PatientHeader'
import { NotesList } from './NotesList'
import { ChatInterface } from './ChatInterface'
import { useEffect, useState } from 'react'
import { getPatientInfo } from '@/lib/api'
import { PatientData, Evidence, Message } from '@/types'

export function Main() {
    const [patientId, setPatientId] = useState<number | null>(null)
    const [patientData, setPatientData] = useState<PatientData | null>(null)
    const [headerError, setHeaderError] = useState<string | null>(null)
    const [highlightClaimQuoteTuples, setHighlightClaimQuoteTuples] = useState<string[][]>([])

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
          const quotes = evidence.quotes?.map(quote => [quote.quote, quote.note_id]) || []
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
      const resp = await getPatientInfo(id);
      // Parse response
      if (resp.error) {
        console.error('Error loading patient data:', resp.error)
        setHeaderError(resp.error);
        setPatientData(null);
      } else {
        setPatientData(resp.data);
      }
    }
    return (
        <div className="container mx-auto p-4">
            <PatientHeader 
                loadPatient={loadPatient} 
                patientMetadata={patientData?.metadata}
                error={headerError}
                setError={setHeaderError}
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
                  />
                </div>
            </div>
        </div>
    )
}