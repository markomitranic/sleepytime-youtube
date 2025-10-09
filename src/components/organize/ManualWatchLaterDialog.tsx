"use client";

import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Loader2, ExternalLink, Copy, Check } from "lucide-react";
import { toast } from "sonner";

type ManualWatchLaterDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onVideoIdsSubmit: (videoIds: string[]) => Promise<void>;
};

const CONSOLE_SCRIPT = `// Collect all video links on the playlist page
const links = Array.from(document.querySelectorAll('a[href*="watch?v="]'));
const videoIds = new Set();

links.forEach(link => {
  // Extract video ID using RegExp
  const match = link.href.match(/v=([a-zA-Z0-9_-]{11})/);
  if (match) videoIds.add(match[1]);
});

// Output as JSON array
const result = JSON.stringify(Array.from(videoIds));
console.log('Found', videoIds.size, 'videos. Copy the array below:');
console.log(result);`;

export function ManualWatchLaterDialog({
  isOpen,
  onClose,
  onVideoIdsSubmit,
}: ManualWatchLaterDialogProps) {
  const [pastedJson, setPastedJson] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scriptCopied, setScriptCopied] = useState(false);

  const handleCopyScript = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(CONSOLE_SCRIPT);
      setScriptCopied(true);
      toast.success("Script copied to clipboard!");
      setTimeout(() => setScriptCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy script");
    }
  }, []);

  const handleOpenWatchLater = useCallback(() => {
    window.open("https://www.youtube.com/playlist?list=WL", "_blank", "noopener,noreferrer");
  }, []);

  const handleSubmit = useCallback(async () => {
    setError(null);
    
    if (!pastedJson.trim()) {
      setError("Please paste the video IDs array from the console.");
      return;
    }

    try {
      // Parse the JSON array
      const parsed = JSON.parse(pastedJson.trim());
      
      if (!Array.isArray(parsed)) {
        setError("The pasted content must be a JSON array.");
        return;
      }

      const videoIds = parsed.filter((id) => typeof id === "string" && id.length > 0);
      
      if (videoIds.length === 0) {
        setError("No valid video IDs found in the array.");
        return;
      }

      setIsProcessing(true);
      await onVideoIdsSubmit(videoIds);
      
      // Reset and close on success
      setPastedJson("");
      setError(null);
      onClose();
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError("Invalid JSON format. Please paste the array exactly as shown in the console.");
      } else {
        setError((err as Error)?.message ?? "Failed to process video IDs");
      }
    } finally {
      setIsProcessing(false);
    }
  }, [pastedJson, onVideoIdsSubmit, onClose]);

  const handleDialogClose = useCallback(() => {
    if (!isProcessing) {
      setPastedJson("");
      setError(null);
      onClose();
    }
  }, [isProcessing, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Watch Later Videos</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 px-1">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              YouTube's API doesn't allow third-party apps to read your Watch Later playlist. Follow these steps to import it manually:
            </p>

            {/* Step 1 */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Step 1: Open Watch Later</h3>
              <Button
                onClick={handleOpenWatchLater}
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open Watch Later in New Tab
              </Button>
            </div>

            {/* Step 2 */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Step 2: Copy & Run Script</h3>
              <p className="text-xs text-muted-foreground">
                Open your browser's Developer Console (F12 or Cmd+Option+J), paste this script, and press Enter:
              </p>
              <div className="relative">
                <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto font-mono">
                  <code>{CONSOLE_SCRIPT}</code>
                </pre>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopyScript}
                  className="absolute top-2 right-2"
                >
                  {scriptCopied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Step 3 */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Step 3: Paste Result</h3>
              <p className="text-xs text-muted-foreground">
                Copy the array output from the console and paste it below:
              </p>
              <textarea
                value={pastedJson}
                onChange={(e) => setPastedJson(e.target.value)}
                placeholder='["dQw4w9WgXcQ", "oHg5SJYRHA0", ...]'
                className="w-full h-32 p-3 border rounded-lg text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={isProcessing}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleDialogClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isProcessing || !pastedJson.trim()}>
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Importing...
              </>
            ) : (
              "Import Videos"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

