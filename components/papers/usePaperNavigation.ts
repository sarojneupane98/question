'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'

import { useAppStore } from '@/lib/store'
import { toast } from '@/lib/toast'

/**
 * Opening and creating papers always means the same two steps: change the store,
 * then land in the editor. Keeping that pair here stops the Dashboard, My
 * Question Papers and Templates pages from each inventing their own version —
 * and in particular stops any of them from navigating without first pointing
 * `currentPaperId` at the paper the teacher clicked.
 */

/** Makes `paperId` the current paper and goes to the editor. */
export function useOpenPaper(): (paperId: string) => void {
  const router = useRouter()
  const openPaper = useAppStore((state) => state.openPaper)

  return useCallback(
    (paperId: string) => {
      openPaper(paperId)
      router.push('/editor')
    },
    [openPaper, router],
  )
}

/**
 * Creates a paper — from a template, or blank when `templateId` is null — and
 * goes to the editor.
 */
export function useCreatePaper(): (templateId?: string | null) => void {
  const router = useRouter()
  const newPaper = useAppStore((state) => state.newPaper)

  return useCallback(
    (templateId: string | null = null) => {
      newPaper(templateId)
      router.push('/editor')
    },
    [newPaper, router],
  )
}

/** Duplicates a paper and opens the copy, which is what "Duplicate" implies. */
export function useDuplicatePaper(): (paperId: string) => void {
  const router = useRouter()
  const duplicatePaper = useAppStore((state) => state.duplicatePaper)

  return useCallback(
    (paperId: string) => {
      const id = duplicatePaper(paperId)
      // The store hands back the id it was *given* when there was nothing to
      // copy, so an unchanged id means the paper has already gone — navigating
      // then would drop the teacher into some other paper without explanation.
      if (id === paperId) {
        toast.error('Nothing to duplicate', 'That paper is no longer in your library.')
        return
      }
      toast.success('Paper duplicated', 'You are now editing the copy — the original is untouched.')
      router.push('/editor')
    },
    [duplicatePaper, router],
  )
}

/**
 * Adds the example paper and opens it.
 *
 * Separate from `useCreatePaper` because it is a different promise: this one
 * puts finished content in front of the teacher to look at, and the toast says
 * so — otherwise a paper full of Class 8 Science questions appearing in their
 * library with no explanation is alarming rather than helpful.
 */
export function useLoadExample(): () => void {
  const router = useRouter()
  const loadExample = useAppStore((state) => state.loadExample)

  return useCallback(() => {
    loadExample()
    toast.info(
      'Example paper opened',
      'Have a look around, change anything you like, and delete it when you are done.',
    )
    router.push('/editor')
  }, [loadExample, router])
}
