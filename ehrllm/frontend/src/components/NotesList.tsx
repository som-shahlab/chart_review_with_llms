import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { format } from "date-fns"
import { HRHeader } from "@/components/ui/hr-header";
import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, EyeClosed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Note } from "@/types";
import { KeyboardShortcut } from "./ui/keyboard-shortcut";

interface NotesListProps {
  notes?: Note[];
  highlightClaimQuoteTuples?: string[][];
  hideEvidence: () => void;
}

const formatNoteType = (noteType: string) => {
  if (noteType === 'discharge') {
    return 'Discharge Summary'
  } else if (noteType === 'radiology') {
    return 'Radiology Report'
  } else {
    return noteType
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

const EvidencePanel = ({ hideEvidence, goToPrevHighlight, goToNextHighlight, highlightedIndex, highlightElements }: { hideEvidence: () => void, goToPrevHighlight: () => void, goToNextHighlight: () => void, highlightedIndex: number, highlightElements: HTMLElement[] }) => {
  return (
    <div className="flex justify-between items-start mb-1">
      <div className="flex">
        <Badge
          variant="outline"
          className="cursor-pointer"
          onClick={hideEvidence}
        >
          Hide Evidence
          <EyeClosed className="h-3 w-3 ml-1" />
          <KeyboardShortcut 
            shortcut="H" 
            tooltip="Hide Evidence" 
            callback={hideEvidence}
            callbackDependencies={[]}
            callbackCondition={highlightElements.length > 0}
          />
        </Badge>
      </div>
      <div className="flex-grow">
      </div>
      <div>
        <div className="flex gap-1">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={goToPrevHighlight}
            disabled={highlightElements.length === 0}
            className="h-6 w-14 flex gap-1"
          >
            <ChevronLeft />
            <KeyboardShortcut 
              shortcut="p" 
              tooltip="Previous Highlight" 
              callback={goToPrevHighlight}
              callbackDependencies={[highlightElements.length, highlightedIndex]}
              callbackCondition={highlightElements.length > 0}
            />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={goToNextHighlight}
            disabled={highlightElements.length === 0}
            className="h-6 w-14 flex gap-1"
          >
            <ChevronRight />
            <KeyboardShortcut 
              shortcut="n" 
              tooltip="Next Highlight" 
              callback={goToNextHighlight}
              callbackDependencies={[highlightElements.length, highlightedIndex]}
              callbackCondition={highlightElements.length > 0}
            />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground text-center">
          {highlightedIndex + 1} of {highlightElements.length}
        </p>
      </div>
    </div>
  )
}

export function NotesList({ notes, highlightClaimQuoteTuples = [], hideEvidence }: NotesListProps) {
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [highlightElements, setHighlightElements] = useState<HTMLElement[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Function to highlight text with the search terms
  const highlightText = (text: string, noteId: string) => {
    if (!highlightClaimQuoteTuples || highlightClaimQuoteTuples.length === 0) return text;
    
    // Remove highlightClaimQuoteTuples for notes that don't match the noteId
    const filteredHighlightClaimQuoteTuples = highlightClaimQuoteTuples.filter(([_, __, note_id]) => note_id === noteId);
    console.log('highlightClaimQuoteTuples', highlightClaimQuoteTuples);
    console.log('filteredHighlightClaimQuoteTuples', filteredHighlightClaimQuoteTuples);
    if (filteredHighlightClaimQuoteTuples.length === 0) return text; // ! NOTE: Needed, otherwise `combinedPattern` will default to '/(?:)/gim' which creates an infinite loop

    // Group claims by normalized quote
    const quoteToClaims: Record<string, Set<string>> = {};
    filteredHighlightClaimQuoteTuples.forEach(([claim, quote]) => {
      // Normalize the quote by lowercasing and trimming whitespace
      const normalizedQuote = quote.toLowerCase().trim();
      if (!quoteToClaims[normalizedQuote]) {
        quoteToClaims[normalizedQuote] = new Set();
      }
      quoteToClaims[normalizedQuote].add(claim);
    });
    
    // Build regex parts for each unique quote and a mapping for group names to merged claims
    const patternParts: string[] = [];
    const groupToMergedClaims: Record<string, string> = {};
    let groupIdx = 0;
    for (const [quote, claimsSet] of Object.entries(quoteToClaims)) {
      const escapedQuote = quote
        // Escape regex special characters
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        // Allow flexible whitespace matching
        .replace(/ /g, '\\s*')
        // Allow " and ' to be matched interchangeably
        .replace(/["']/g, '["\']');
      const groupName = `quote_${groupIdx++}`;
      patternParts.push(`(?<${groupName}>${escapedQuote})`);
      // Merge the claims into one string (separated by commas)
      groupToMergedClaims[groupName] = Array.from(claimsSet).join(', ');
    }
    
    // Combine the parts into a single regex pattern
    const combinedPattern = new RegExp(patternParts.join('|'), 'gim');
    
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = combinedPattern.exec(text)) !== null) {
      // Append any text before the match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      
      // Determine which named group was matched
      let matchedGroup: string | null = null;
      if (match.groups) {
        for (const groupName in groupToMergedClaims) {
          if (match.groups[groupName]) {
            matchedGroup = groupName;
            break;
          }
        }
      }
      
      if (matchedGroup !== null) {
        const mergedClaims = groupToMergedClaims[matchedGroup];
        parts.push(
          <TooltipProvider key={`highlight-${matchedGroup}-${match.index}`}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="bg-yellow-200 highlight-term cursor-help"
                >
                  {match[0]}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p className="text-sm">{mergedClaims}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      } else {
        // Fallback: if no group identified, just push the match text
        parts.push(match[0]);
      }
      
      lastIndex = combinedPattern.lastIndex;
    }
    
    // Append any remaining text after the final match
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    return parts;
  };

  // Collect all highlight elements after render
  useEffect(() => {
    if (scrollAreaRef.current) {
      const elements = Array.from(
        scrollAreaRef.current.querySelectorAll('.highlight-term')
      ) as HTMLElement[];
      setHighlightElements(elements);
      
      // Reset highlighted index when terms change
      setHighlightedIndex(0);
    }
  }, [notes, highlightClaimQuoteTuples]);

  // Navigate to the next highlighted term
  const goToNextHighlight = () => {
    if (highlightElements.length === 0) return;
    
    // If there are no more highlights, wrap around to the first highlight
    const nextIndex = highlightedIndex < highlightElements.length - 1 
      ? highlightedIndex + 1 
      : 0;

    // Update the highlighted index
    setHighlightedIndex(nextIndex);

    // Scroll to the next highlight
    scrollToHighlight(nextIndex);
  };

  // Navigate to the previous highlighted term
  const goToPrevHighlight = () => {
    if (highlightElements.length === 0) return;
    
    // If there are no more highlights, wrap around to the last highlight
    const prevIndex = highlightedIndex > 0 
      ? highlightedIndex - 1 
      : highlightElements.length - 1;

    // Update the highlighted index
    setHighlightedIndex(prevIndex);

    // Scroll to the previous highlight
    scrollToHighlight(prevIndex);
  };

  // Scroll to a specific highlight
  const scrollToHighlight = (index: number) => {
    const element = highlightElements[index];
    if (element) {
      // Find the parent ScrollArea for this highlight
      const parentCard = element.closest('.card-container');
      if (parentCard) {
        // First ensure the card is visible in the main scroll area
        parentCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        // Then scroll to the highlight within the card's scroll area
        const scrollArea = parentCard.querySelector('.scroll-area-viewport');
        if (scrollArea) {
          element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
      
      // Add a visual indicator for the current highlight
      highlightElements.forEach((el, i) => {
        if (i === index) {
          el.classList.add('current-highlight');
        } else {
          el.classList.remove('current-highlight');
        }
      });
    }
  };

  return (
    <>
      <HRHeader title="Medical History" />
      {highlightElements.length > 0 && (
        <>
          <EvidencePanel 
            hideEvidence={hideEvidence} 
            goToPrevHighlight={goToPrevHighlight} 
            goToNextHighlight={goToNextHighlight} 
            highlightedIndex={highlightedIndex} 
            highlightElements={highlightElements} 
          />
          <hr className="my-2 py-0" />
       </>
      )}
      <ScrollArea className="h-[calc(65vh)] mt-2" ref={scrollAreaRef}>
        <div className="">
          {notes?.map((note, index) => (
            <Card key={index} className="pt-4 px-4 pb-1 gap-0 mb-3 card-container">
              <div className="flex justify-between items-center">
                <p className="font-medium text-sm">
                  {format(new Date(note.chartdatetime), 'MMM dd, yyyy')}
                </p>
                <p className="text-sm text-muted-foreground">
                  Adm #{note?.hadm_id || 'N/A'} • {formatNoteType(note.note_type)}
                </p>
              </div>
              <div className="flex justify-between items-center">
                <p className="font-medium text-sm">
                </p>
                <p className="text-sm text-muted-foreground">
                  Note #{note?.note_id || 'N/A'}
                </p>
              </div>
              <hr className="mt-2 mb-0 py-0" />
              <ScrollArea type="always" className="h-[200px] py-2 pb-2 pt-1 scroll-area-viewport">
                <p className="text-xs whitespace-pre-line">
                  {highlightText(note.text, note.note_id)}
                </p>
              </ScrollArea>
            </Card>
          ))}
          {notes?.length == 0 || !notes && (
            <p className="text-muted-foreground text-center">
              No notes available
            </p>
          )}
        </div>
      </ScrollArea>
      <hr className="my-2 py-0" />
    </>
  )
} 