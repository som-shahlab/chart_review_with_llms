import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export const MODEL_2_DISPLAY_NAME = {
  "azure/gpt-4o-mini": "GPT-4o-mini (Azure)",
  "azure/gpt-4o": "GPT-4o (Azure)",
  "azure/gpt-o1-preview": "GPT-o1 (Azure)",
  "ollama_chat/hf.co/bartowski/HuatuoGPT-o1-8B-GGUF:Q8_0": "Med-Llama-3.2-8B (Local)",
  "ollama_chat/phi4:latest" : "Phi4 (Local)",
  "ollama_chat/gemma:2b" : "Gemma 2 (Local)",
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function createKeyboardShortcut( shortcut: string, callback: (event: KeyboardEvent) => void, callbackCondition: boolean ) {
  const handleKeyUp = (event: KeyboardEvent) => {
    // Only process keyboard shortcuts if callbackCondition is TRUE
    if (!callbackCondition) return;

    // Check if the active element is an input or textacallbackDependenciesrea to avoid interfering with typing
    const activeElement = document.activeElement;
    const isTypingInField = 
      activeElement instanceof HTMLInputElement || 
      activeElement instanceof HTMLTextAreaElement;
    
    if (isTypingInField) return;
    
    if (event.key === shortcut) {
      console.log(`'${shortcut}' pressed`);
      callback(event);
    }
  };
  window.addEventListener('keyup', handleKeyUp);

  // Clean up the event listener when component unmounts
  return () => {
    window.removeEventListener('keyup', handleKeyUp);
  };
}