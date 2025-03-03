import { createKeyboardShortcut } from "@/lib/utils";
import { useEffect } from "react";

interface KeyboardShortcutProps {
    shortcut: string;
    tooltip: string;
    callback: () => void;
    callbackDependencies: Array<any>;
    callbackCondition: boolean;
}

function KeyboardShortcut({
    shortcut,
    tooltip,
    callback,
    callbackDependencies,
    callbackCondition,
    className,
    ...props
  }: React.ComponentProps<"span"> & KeyboardShortcutProps) {
    // Add keyboard event listener for navigation

    useEffect(() => {
      return createKeyboardShortcut(shortcut, callback, callbackCondition);
    }, [callbackCondition, ...callbackDependencies]); // Re-add listener when these dependencies change

    return (
      <>
        <span className="text-xs bg-muted px-1 rounded font-mono">
            [{shortcut}]
        </span>
    </>
    )
  }
  
  export { KeyboardShortcut }


