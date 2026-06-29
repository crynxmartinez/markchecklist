'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface PushProgressItem {
  id: string
  name: string
  status: 'pending' | 'pushing' | 'success' | 'error'
  error?: string
}

interface PushToGHLProgressModalProps {
  open: boolean
  items: PushProgressItem[]
  onClose: () => void
}

export function PushToGHLProgressModal({ open, items, onClose }: PushToGHLProgressModalProps) {
  const total = items.length
  const done = items.filter((i) => i.status === 'success' || i.status === 'error').length
  const succeeded = items.filter((i) => i.status === 'success').length
  const failed = items.filter((i) => i.status === 'error').length
  const isComplete = done === total && total > 0

  const progressPercent = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && isComplete) onClose() }}>
      <DialogContent className="max-w-md" showCloseButton={isComplete}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isComplete ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Push to GHL Complete
              </>
            ) : (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                Pushing to GHL...
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{done} of {total} processed</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Summary chips when complete */}
        {isComplete && (
          <div className="flex gap-3">
            <div className="flex-1 flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 p-3">
              <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-green-700 font-medium">Success</p>
                <p className="text-lg font-bold text-green-800">{succeeded}</p>
              </div>
            </div>
            {failed > 0 && (
              <div className="flex-1 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3">
                <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-red-700 font-medium">Failed</p>
                  <p className="text-lg font-bold text-red-800">{failed}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Scrollable item list */}
        <div className="max-h-60 overflow-y-auto space-y-1 border rounded-md p-2 bg-muted/30">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded text-sm"
            >
              {item.status === 'pending' && (
                <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
              )}
              {item.status === 'pushing' && (
                <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
              )}
              {item.status === 'success' && (
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
              )}
              {item.status === 'error' && (
                <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              )}
              <span className={`flex-1 truncate ${item.status === 'pushing' ? 'font-medium' : ''}`}>
                {item.name}
              </span>
              {item.status === 'error' && item.error && (
                <span className="text-xs text-red-500 truncate max-w-[120px]" title={item.error}>
                  {item.error}
                </span>
              )}
            </div>
          ))}
        </div>

        {isComplete && (
          <Button onClick={onClose} className="w-full">
            Done
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}
