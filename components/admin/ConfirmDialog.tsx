'use client'

import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ConfirmState {
  message: string
  title: string
  confirmLabel: string
  resolve: (value: boolean) => void
}

interface ConfirmOptions {
  title?: string
  confirmLabel?: string
}

// Promise-based replacement for window.confirm():
//   const { confirm, confirmDialog } = useConfirm()
//   if (await confirm('Delete this?')) { ... }
// Render {confirmDialog} once in the component's JSX.
export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null)

  const confirm = useCallback(
    (message: string, options: ConfirmOptions = {}) =>
      new Promise<boolean>((resolve) => {
        setState({
          message,
          title: options.title ?? 'Are you sure?',
          confirmLabel: options.confirmLabel ?? 'Delete',
          resolve,
        })
      }),
    [],
  )

  const close = (value: boolean) => {
    state?.resolve(value)
    setState(null)
  }

  const confirmDialog = (
    <Dialog open={state !== null} onOpenChange={(open) => !open && close(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{state?.title}</DialogTitle>
          <DialogDescription>{state?.message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => close(true)}>
            {state?.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  return { confirm, confirmDialog }
}
