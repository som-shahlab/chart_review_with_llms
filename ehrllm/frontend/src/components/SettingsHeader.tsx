import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Settings, ChevronDown, ChevronUp } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function SettingsHeader({ settings, setSettings }: { settings: any, setSettings: any }) {
  const [isOpen, setIsOpen] = useState(false)

  // Initialize state from settings
  const model = settings.model;
  const database = settings.database;

  // Update settings
  const setModel = (value: string) => {
    setSettings({ ...settings, model: value });
  }
  const setDatabase = (value: string) => {
    setSettings({ ...settings, database: value });
  }

  // Toggle dropdown
  const toggleDropdown = () => {
    setIsOpen(!isOpen)
  }

  return (
    <div className="flex justify-end">
        <div className="relative">
        <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-1"
            onClick={toggleDropdown}
        >
            <Settings className="h-4 w-4" />
            Settings
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>

        {isOpen && (
            <Card className="absolute top-full right-0 mt-1 p-4 w-80 z-50 shadow-lg">
            <div className="space-y-4">
                <div>
                <label className="text-sm font-medium mb-1 block">Model</label>
                <Select value={model} onValueChange={setModel}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="gpt-4o-mini">GPT-4o-mini (Azure)</SelectItem>
                        <SelectItem value="gpt-4o">GPT-4o (Azure)</SelectItem>
                        <SelectItem value="gpt-o1-preview">GPT-o1 (Azure)</SelectItem>
                        <SelectItem value="llama-3.2-8b">Med-Llama-3.2-8B (Local)</SelectItem>
                    </SelectContent>
                </Select>
                </div>

                <div>
                <label className="text-sm font-medium mb-1 block">Database</label>
                <Select value={database} onValueChange={setDatabase}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select database" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="mimiciv-notes">MIMIC-IV Notes</SelectItem>
                        <SelectItem value="n2c2-2018">n2c2 2018</SelectItem>
                    </SelectContent>
                </Select>
                </div>

                <div className="flex justify-end">
                <Button size="sm" onClick={toggleDropdown}>
                    Close
                </Button>
                </div>
            </div>
            </Card>
        )}
        </div>
    </div>
  )
}