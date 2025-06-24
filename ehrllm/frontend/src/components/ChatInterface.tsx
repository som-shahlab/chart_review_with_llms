import { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { HRHeader } from '@/components/ui/hr-header'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { getChatResponse } from '@/utils/api'
import { Loader2, ChevronDown, ChevronUp, ExternalLink, } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import React from 'react'
import { Message, PatientData } from "@/types";
import { KeyboardShortcut } from './ui/keyboard-shortcut'
import { createKeyboardShortcut, MODEL_2_DISPLAY_NAME } from '@/utils/utils'
import { searchEmitter } from '@/events/search'

interface ChatInterfaceProps {
  patientId: string | null;
  highlightEvidence: (message: Message) => void;
  settings: any;
  query: string;
  setQuery: (query: string) => void;
  patientData: PatientData | null;
}

const UserMessage = ({ index, n_messages, message }: { index: number; n_messages: number; message: Message }) => {
  return (
    <div
      className="mb-4 text-right whitespace-pre-line"
    >
      <Card className={`inline-block text-left p-3 max-w-[80%] bg-primary/10`}>
        <p className="text-sm">{message.content}</p>
      </Card>
    </div>
  );
};

const AssistantMessage = ({ index, n_messages, message, highlightEvidence }: { index: number; n_messages: number; message: Message; highlightEvidence: (message: Message) => void }) => {
  const [isThinkingVisible, setIsThinkingVisible] = useState(false);
  
  const toggleThinking = () => {
    setIsThinkingVisible(!isThinkingVisible);
  };
  
  return (
    <div
      className="mb-4 text-left whitespace-pre-line"
    >
      <Card className={`inline-block p-3 max-w-[80%] bg-muted`}>
        <p className="text-sm">
          {message.content}
        </p>
        {message.evidence && message.evidence.length > 0 &&
          <Badge
            variant="outline"
            className="mt-2 cursor-pointer"
            onClick={() => highlightEvidence(message)}
          >
            Highlight Evidence
            <ExternalLink className="h-3 w-3 ml-1" />
            {/* Only show keyboard shortcut for last message */}
            {index === n_messages - 1 && (
              <KeyboardShortcut 
                shortcut="h" 
                tooltip="Highlight Evidence" 
                callback={() => highlightEvidence(message)}
                callbackDependencies={[]}
                callbackCondition={true}
              />
            )}
          </Badge>
        }
        {message.thinking && (
          <div className="mt-2">
            <button 
              onClick={toggleThinking}
              className="flex items-center text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
            >
              {isThinkingVisible ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Hide thinking
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Show thinking
                </>
              )}
            </button>
            {isThinkingVisible && (
              <p className="text-sm text-muted-foreground mt-2">
                {message.thinking}
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

function formatMessages(messages: Message[], highlightEvidence: (message: Message) => void) {
  return messages.map((message, index) => (
    message.role === 'user' 
      ? <UserMessage key={index} index={index} n_messages={messages.length} message={message} /> 
      : <AssistantMessage key={index} index={index} n_messages={messages.length} message={message} highlightEvidence={highlightEvidence} />
  ));
}

export function ChatInterface({ patientId, highlightEvidence, settings, query, setQuery, patientData }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Create keyboard shortcut to focus input field on 't'
    return createKeyboardShortcut('t', (e: KeyboardEvent) => {
      // Prevent 't' from being typed into input field
      e.preventDefault();
      // Focus
      inputRef.current?.focus();
    }, true);
  }, []);

  // Force scroll to bottom of chat interface when new message is added
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, [patientData]);

  useEffect(() => {
    if (settings.database === 'n2c2-2018' && patientData) {
      setMessages([
        { role: 'assistant', id: 'assistant', content: `Hi! I am a bot that can help you determine if this patient is eligible for a clinical trial. Please double check important details, as I can make mistakes.` }
      ]);
    } else if (settings.database === 'mimiciv-notes' && patientData) {
      setMessages([
        { role: 'assistant', id: 'assistant', content: `Hi! I am a bot that can answer any question you have about this patient. Please double check important details, as I can make mistakes.` }
      ]);
    }
  }, [settings.database, settings.model, patientData]);

  useEffect(() => {
    const existingHandlers = Array.from(searchEmitter.all.keys());
    if (!existingHandlers.includes('submitQuery')) {
      searchEmitter.on("submitQuery", (query: unknown) => {
        submitQuery(query);
      });
    }
  }, []);

  // Submit query to chatbot
  const submitQuery = async (query: string) => {
    setError(null);
    if (!query.trim() || !patientId) return

    const newMessage: Message = { role: 'user', content: query, id: 'user' };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setQuery('');
    inputRef.current?.focus(); // Focus input after sending

    // Fetch response
    setIsLoading(true);
    const resp = await getChatResponse(patientId, updatedMessages, settings);
    setIsLoading(false);

    // Parse response
    if (resp.error) {
      setError(resp.error);
    } else {
      console.log(resp.data);
      // Parse final answer
      const messageId = resp.data.message_id;
      const answer = resp.data.response.answer;
      const evidence = resp.data.response.evidence;
      const reflection = resp.data.response.reflection;
      const thinking = resp.data.response.thinking;

      // Update UI with bot's response
      setMessages(prev => [...prev, { role: 'assistant', id: messageId, content: answer, thinking: thinking, reflection: reflection, evidence: evidence }])
    }
  }

  return (
    <>
      <HRHeader title="Chat" />
      <div className="flex-1 flex flex-col justify-end">
        <ScrollArea className="w-full max-h-[calc(60vh)] overflow-y-auto">

          {/* Display chat messages */}
          {messages.length > 0 ? 
            formatMessages(messages, highlightEvidence) : 
            <div className="text-center text-muted-foreground my-2">No messages yet</div>
          }

          {/* If isLoading, show a loading message */}
          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground my-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Thinking...
            </div>
          )}

          <div ref={scrollRef} />
        </ScrollArea>
        <div className="p-4 border-t flex gap-2">
          <Input
            id="chat-query-input"
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type your message [t]..."
            onKeyDown={(e) => e.key === 'Enter' && submitQuery(query)}
            disabled={!patientId}
          />
          <Button onClick={() => submitQuery(query)} disabled={!patientId || isLoading || !query.trim()}>
            {isLoading ? 
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </> : 
              'Send'
            }
          </Button>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </>
  )
} 