import { searchEmitter } from '@/events/search';
import { Badge } from './ui/badge'
import { Card } from './ui/card'
import { PatientMetadata } from '@/types'
import { useEffect, useState } from 'react';
import { getChatResponse } from '@/utils/api';
import { ChevronDown, ChevronRight, CheckCircle, XCircle, Loader2, Circle } from 'lucide-react';
import { Button } from './ui/button';

const promptTemplate = `
You are assessing a patient's eligibility for a clinical trial.

The inclusion criterion being assessed is: '{labelDefinition}' 

Based on the patient's clinical note, does this patient meet this inclusion criterion?
`.trim();

export function N2C22018LabelsPanel({ patientMetadata, settings }: { patientMetadata: PatientMetadata, settings: any }) {

  const [eligibilityReport, setEligibilityReport] = useState<any>(null);
  const [expandedCriteria, setExpandedCriteria] = useState<Set<string>>(new Set());
  const [isReportOpen, setIsReportOpen] = useState(true);
  const [criteriaLoading, setCriteriaLoading] = useState<Set<string>>(new Set());

  const submitQuery = (query: string) => {
    searchEmitter.emit('submitQuery', query);
  }

  const toggleExpanded = (criterionName: string) => {
    setExpandedCriteria(prev => {
      const newSet = new Set(prev);
      if (newSet.has(criterionName)) {
        newSet.delete(criterionName);
      } else {
        newSet.add(criterionName);
      }
      return newSet;
    });
  };

  useEffect(() => {
    if (patientMetadata?.labels) {
      const fetchLabels = async () => {
        // Initialize loading state for all criteria
        setCriteriaLoading(new Set(patientMetadata.labels.map((label: any) => label.name)));
        
        const labelPromises = patientMetadata?.labels?.map(async (label: any) => {
          const query = promptTemplate.replace('{labelDefinition}', label.definition);
          const resp = await getChatResponse(patientMetadata?.mrn, [
            { role: 'user', content: query, id: 'user' },
          ], settings);
          
          // Remove this criterion from loading state as it completes
          setCriteriaLoading(prev => {
            const newSet = new Set(prev);
            newSet.delete(label.name);
            return newSet;
          });
          
          return { label, response: resp };
        });
        
        const labels = await Promise.all(labelPromises || []);
        console.log('All label responses:', labels);
        setEligibilityReport(labels);
      };
      
      setEligibilityReport(null);
      fetchLabels();
    }
  }, [patientMetadata]);

  const getEligibilityDecision = (response: any) => {
    if (!response?.data?.response?.answer) return { isMet: null, reasoning: 'No response received' };
    
    const answer = response.data.response.answer.toLowerCase();
    const isMet = answer.includes('yes');
    return { isMet, reasoning: response.data.response.answer };
  };

  return (
    <>
      <div>
        <p className="text-sm text-muted-foreground">
          Inclusion Criteria
        </p>
        <div className="flex flex-wrap gap-2">
          {patientMetadata?.labels?.map((label) => (
            <Badge 
              key={label.name} 
              variant={label.is_met ? 'success' : 'outline'}
              className="cursor-pointer"
              onClick={() => {
                submitQuery(`${promptTemplate.replace('{labelDefinition}', label.definition)}`);
                // Focus on the input field
                document.getElementById('chat-query-input')?.focus();
              }}
            >
              {label.name}
            </Badge>
          ))}
        </div>
      </div>
      
      <div className="mt-1">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground mb-3">
            Eligibility Assessment Report
          </p>
          <Button variant="outline" size="sm" className="mb-2" onClick={() => setIsReportOpen(!isReportOpen)}>
            {isReportOpen ? 'Hide Report' : 'Show Report'}
          </Button>
        </div>
        {isReportOpen && (
          <div className="space-y-2">
            {eligibilityReport?.map((item: any) => {
              const { isMet, reasoning } = getEligibilityDecision(item.response);
              const isExpanded = expandedCriteria.has(item.label.name);
              
              return (
                <Card key={item.label.name} className={`p-3 transition-all duration-200 gap-2 ${
                  isMet === null ? 'border-gray-200 bg-gray-50/50' : isMet ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'
                }`}>
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleExpanded(item.label.name)}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {isMet === null ? (
                        <Circle className="h-5 w-5 text-gray-600" />
                      ) : isMet ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{item.label.name}</h4>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={isMet === null ? 'outline' : isMet ? 'success' : 'destructive'}
                        className="text-xs"
                      >
                        {isMet === null ? 'Unknown' : isMet ? 'Eligible' : 'Not Eligible'}
                      </Badge>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="pt-2 border-t border-border">
                      <p className="text-sm mb-2">Assessment</p>
                      <p className="text-xs bg-background p-3 rounded-md border">
                        {reasoning}
                      </p>
                      <p className="text-sm mb-2 mt-3">Evidence</p>
                      <div className="text-xs bg-background p-3 rounded-md border">
                        {item.response.data.response?.evidence?.map((evidence: any, idx: number) => {
                          return (
                            <div key={idx} className="mb-2">
                              <p className="font-medium">{idx + 1}. {evidence.claim}</p>
                              <ul className="list-disc list-inside">
                                {evidence.quotes.map((quote: any, idx2: number) => (
                                  <li key={idx2}>
                                    <span>"{quote.quote}" (Note #{quote.source})</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )
                        })}
                      </div>
                      <p className="text-sm mb-2 mt-3">Criterion Definition</p>
                      <p className="text-xs bg-background p-3 rounded-md border">
                        {item.label.definition}
                      </p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {!eligibilityReport && (
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-8">
            {/* Loading indicator */}
            <Loader2 className="h-4 w-4 animate-spin" />
            <p>Generating eligibility report...</p>
            <p className="text-xs text-muted-foreground">
              <span className="font-bold mr-1">Loading:</span>
              {Array.from(criteriaLoading).map((criterion) => criterion).join(', ')}
            </p>
          </div>
        )}
      </div>
    </>
  )
}
