'use client'

import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import {
  DEFAULT_LAYOUT,
  DEFAULT_SETTINGS,
  convertQuestionType,
  createInstruction,
  createMatchPair,
  createOption,
  createPaper,
  createQuestion,
  createSection,
  questionTypeSpec,
} from './defaults'
import { clone, nowIso, uid } from './ids'
import { autoBalanceMarks, balanceSectionTo } from './marks'
import { STORAGE_KEY, safeLocalStorage } from './storage'
import { createSampleBank, createSamplePapers } from './sample'
import { getTemplate } from './templates'
import type {
  AppSettings,
  BankEntry,
  Difficulty,
  ExamInfo,
  Paper,
  PaperLayout,
  Question,
  QuestionType,
  SchoolInfo,
  Section,
  ThemeMode,
} from './types'

const HISTORY_LIMIT = 50

function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to) return items
  const next = items.slice()
  if (from < 0 || from >= next.length) return items
  const [item] = next.splice(from, 1)
  const target = Math.max(0, Math.min(next.length, to))
  next.splice(target, 0, item)
  return next
}

interface QuestionLocation {
  section: Section
  question: Question
  sectionIndex: number
  questionIndex: number
}

function locateQuestion(paper: Paper, questionId: string): QuestionLocation | null {
  for (let s = 0; s < paper.sections.length; s += 1) {
    const section = paper.sections[s]
    const q = section.questions.findIndex((item) => item.id === questionId)
    if (q >= 0) {
      return { section, question: section.questions[q], sectionIndex: s, questionIndex: q }
    }
  }
  return null
}

/* -------------------------------------------------------------------------- */

interface PersistedState {
  papers: Paper[]
  bank: BankEntry[]
  settings: AppSettings
  currentPaperId: string | null
}

interface TransientState {
  hydrated: boolean
  /** Undo/redo stacks hold whole-paper snapshots. Not persisted. */
  past: Paper[]
  future: Paper[]
  activeQuestionId: string | null
  lastSavedAt: string | null
}

interface Actions {
  bootstrap: () => void

  /* paper lifecycle ------------------------------------------------------- */
  newPaper: (templateId?: string | null) => string
  openPaper: (paperId: string) => void
  duplicatePaper: (paperId: string) => string
  deletePaper: (paperId: string) => void
  renamePaper: (paperId: string, name: string) => void
  importPaper: (paper: Paper) => string
  /**
   * Restores a backup file. `mode: 'merge'` keeps the existing library and adds
   * to it; `mode: 'replace'` swaps it out wholesale. Returns how many papers and
   * bank entries were added so the caller can report it.
   */
  restoreBackup: (
    payload: { papers: Paper[]; bank: BankEntry[]; settings?: AppSettings },
    mode?: 'merge' | 'replace',
  ) => { papers: number; bank: number }
  /** Guarantees `currentPaperId` points at a real paper; returns its id. */
  ensurePaper: () => string
  touchPaper: () => void

  /* current paper --------------------------------------------------------- */
  updatePaper: (patch: Partial<Pick<Paper, 'name' | 'templateId'>>) => void
  updateSchool: (patch: Partial<SchoolInfo>) => void
  updateExam: (patch: Partial<ExamInfo>) => void
  updateLayout: (patch: Partial<PaperLayout>) => void
  resetLayout: () => void
  replaceCurrentPaper: (paper: Paper) => void

  /* instructions ---------------------------------------------------------- */
  addInstruction: (text?: string) => void
  updateInstruction: (instructionId: string, text: string) => void
  removeInstruction: (instructionId: string) => void
  reorderInstructions: (from: number, to: number) => void

  /* sections -------------------------------------------------------------- */
  addSection: (title?: string) => string
  updateSection: (sectionId: string, patch: Partial<Section>) => void
  removeSection: (sectionId: string) => void
  duplicateSection: (sectionId: string) => void
  reorderSections: (from: number, to: number) => void
  balanceSection: (sectionId: string, target: number) => void

  /* questions ------------------------------------------------------------- */
  addQuestion: (sectionId: string, type?: QuestionType) => string
  insertQuestions: (sectionId: string, questions: Question[], atIndex?: number) => void
  updateQuestion: (questionId: string, patch: Partial<Question>) => void
  setQuestionType: (questionId: string, type: QuestionType) => void
  removeQuestion: (questionId: string) => void
  duplicateQuestion: (questionId: string) => void
  reorderQuestions: (sectionId: string, from: number, to: number) => void
  moveQuestion: (questionId: string, toSectionId: string, toIndex: number) => void

  /* mcq options ----------------------------------------------------------- */
  addOption: (questionId: string) => void
  updateOption: (questionId: string, optionId: string, html: string) => void
  removeOption: (questionId: string, optionId: string) => void
  setCorrectOption: (questionId: string, optionId: string | null) => void

  /* matching pairs -------------------------------------------------------- */
  addMatchPair: (questionId: string) => void
  updateMatchPair: (questionId: string, pairId: string, patch: { left?: string; right?: string }) => void
  removeMatchPair: (questionId: string, pairId: string) => void

  /* marks ----------------------------------------------------------------- */
  autoBalance: () => void

  /* question bank --------------------------------------------------------- */
  addToBank: (question: Question, meta: { subject: string; className: string; chapter: string; difficulty: Difficulty }) => void
  updateBankEntry: (entryId: string, patch: Partial<Omit<BankEntry, 'id' | 'question'>>) => void
  removeBankEntry: (entryId: string) => void
  insertFromBank: (entryIds: string[], sectionId: string) => void

  /* settings -------------------------------------------------------------- */
  updateSettings: (patch: Partial<AppSettings>) => void
  setTheme: (theme: ThemeMode) => void
  applySchoolPreset: () => void
  saveSchoolPreset: () => void
  applyLayoutPreset: () => void
  saveLayoutPreset: () => void

  /* history / misc -------------------------------------------------------- */
  setActiveQuestion: (questionId: string | null) => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  resetEverything: () => void
}

export type AppStore = PersistedState & TransientState & Actions

/* -------------------------------------------------------------------------- */

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => {
      /**
       * The single write path for every edit to the paper being edited.
       * It clones, mutates, stamps `updatedAt`, and pushes the previous version
       * onto the undo stack — so no action needs to think about any of that.
       */
      const editPaper = (mutator: (paper: Paper) => void) => {
        set((state) => {
          const index = state.papers.findIndex((p) => p.id === state.currentPaperId)
          if (index === -1) return {}
          const previous = state.papers[index]
          const next = clone(previous)
          mutator(next)
          next.updatedAt = nowIso()
          const papers = state.papers.slice()
          papers[index] = next
          const past = [...state.past, previous]
          return {
            papers,
            past: past.length > HISTORY_LIMIT ? past.slice(past.length - HISTORY_LIMIT) : past,
            future: [],
            lastSavedAt: next.updatedAt,
          }
        })
      }

      const currentPaper = (): Paper | null => {
        const state = get()
        return state.papers.find((p) => p.id === state.currentPaperId) ?? null
      }

      const withQuestion = (questionId: string, mutator: (found: QuestionLocation, paper: Paper) => void) => {
        editPaper((paper) => {
          const found = locateQuestion(paper, questionId)
          if (found) mutator(found, paper)
        })
      }

      return {
        /* ---------------------------------------------------------------- */
        papers: [],
        bank: [],
        settings: clone(DEFAULT_SETTINGS),
        currentPaperId: null,

        hydrated: false,
        past: [],
        future: [],
        activeQuestionId: null,
        lastSavedAt: null,

        /* ---------------------------------------------------------------- */
        bootstrap: () => {
          const state = get()
          if (state.hydrated) return
          let papers = state.papers
          let bank = state.bank
          if (papers.length === 0) {
            papers = createSamplePapers()
            bank = bank.length === 0 ? createSampleBank() : bank
          }
          const currentPaperId = papers.some((p) => p.id === state.currentPaperId)
            ? state.currentPaperId
            : (papers[0]?.id ?? null)
          set({ papers, bank, currentPaperId, hydrated: true, past: [], future: [] })
        },

        /* paper lifecycle ------------------------------------------------- */
        newPaper: (templateId = null) => {
          const template = templateId ? getTemplate(templateId) : null
          const settings = get().settings
          const paper = template ? template.create() : createPaper()
          if (!template) {
            paper.school = clone(settings.schoolPreset)
            paper.layout = clone(settings.layoutPreset)
          }
          set((state) => ({
            papers: [paper, ...state.papers],
            currentPaperId: paper.id,
            past: [],
            future: [],
            activeQuestionId: null,
            lastSavedAt: paper.updatedAt,
          }))
          return paper.id
        },

        openPaper: (paperId) => {
          if (!get().papers.some((p) => p.id === paperId)) return
          set({ currentPaperId: paperId, past: [], future: [], activeQuestionId: null })
        },

        duplicatePaper: (paperId) => {
          const source = get().papers.find((p) => p.id === paperId)
          if (!source) return paperId
          const copy = clone(source)
          copy.id = uid('paper')
          copy.name = `${source.name} (copy)`
          copy.createdAt = nowIso()
          copy.updatedAt = copy.createdAt
          copy.instructions = copy.instructions.map((i) => ({ ...i, id: uid('ins') }))
          copy.sections = copy.sections.map((section) => ({
            ...section,
            id: uid('sec'),
            questions: section.questions.map((q) => ({
              ...q,
              id: uid('q'),
              options: q.options.map((o) => ({ ...o, id: uid('opt') })),
              matchPairs: q.matchPairs.map((p) => ({ ...p, id: uid('pair') })),
              correctOptionId: null,
            })),
          }))
          // Correct-answer links were rebuilt with new ids, so re-point them.
          source.sections.forEach((section, si) => {
            section.questions.forEach((q, qi) => {
              if (!q.correctOptionId) return
              const optIndex = q.options.findIndex((o) => o.id === q.correctOptionId)
              if (optIndex >= 0) {
                copy.sections[si].questions[qi].correctOptionId =
                  copy.sections[si].questions[qi].options[optIndex]?.id ?? null
              }
            })
          })
          set((state) => ({ papers: [copy, ...state.papers], currentPaperId: copy.id, past: [], future: [] }))
          return copy.id
        },

        deletePaper: (paperId) => {
          set((state) => {
            const papers = state.papers.filter((p) => p.id !== paperId)
            const currentPaperId =
              state.currentPaperId === paperId ? (papers[0]?.id ?? null) : state.currentPaperId
            return { papers, currentPaperId, past: [], future: [] }
          })
        },

        renamePaper: (paperId, name) => {
          set((state) => ({
            papers: state.papers.map((p) =>
              p.id === paperId ? { ...p, name, updatedAt: nowIso() } : p,
            ),
          }))
        },

        importPaper: (paper) => {
          const imported = clone(paper)
          imported.id = uid('paper')
          imported.createdAt = imported.createdAt || nowIso()
          imported.updatedAt = nowIso()
          set((state) => ({
            papers: [imported, ...state.papers],
            currentPaperId: imported.id,
            past: [],
            future: [],
          }))
          return imported.id
        },

        /**
         * Restores a backup.
         *
         * Paper, section and instruction ids are re-minted so that restoring a
         * backup into a library that still holds the same papers produces copies
         * rather than two objects claiming one id. Question, option and pair ids
         * are left alone: the only caller is `lib/fileIO.ts`, whose `coercePaper`
         * has already replaced every id in the file, and re-pointing
         * `correctOptionId` a second time here would just be a second chance to
         * get it wrong. In `merge` mode the restored papers land at the top of
         * the list, which is where "My Question Papers" shows newest first.
         */
        restoreBackup: (payload, mode = 'merge') => {
          const restoredPapers = payload.papers.map((paper) => {
            const copy = clone(paper)
            copy.id = uid('paper')
            copy.instructions = copy.instructions.map((i) => ({ ...i, id: uid('ins') }))
            copy.sections = copy.sections.map((section) => ({ ...section, id: uid('sec') }))
            return copy
          })
          const restoredBank = payload.bank.map((entry) => {
            const copy = clone(entry)
            copy.id = uid('bank')
            copy.question = { ...copy.question, id: uid('q') }
            return copy
          })

          set((state) => {
            const papers =
              mode === 'replace' ? restoredPapers : [...restoredPapers, ...state.papers]
            const bank = mode === 'replace' ? restoredBank : [...restoredBank, ...state.bank]
            return {
              papers,
              bank,
              settings: payload.settings ? clone(payload.settings) : state.settings,
              currentPaperId: papers[0]?.id ?? null,
              past: [],
              future: [],
              activeQuestionId: null,
            }
          })

          return { papers: restoredPapers.length, bank: restoredBank.length }
        },

        ensurePaper: () => {
          const state = get()
          const existing = state.papers.find((p) => p.id === state.currentPaperId)
          if (existing) return existing.id
          if (state.papers.length > 0) {
            const id = state.papers[0].id
            set({ currentPaperId: id })
            return id
          }
          return get().newPaper(null)
        },

        touchPaper: () => {
          editPaper(() => {
            /* stamps updatedAt via editPaper */
          })
        },

        /* current paper --------------------------------------------------- */
        updatePaper: (patch) => editPaper((paper) => Object.assign(paper, patch)),
        updateSchool: (patch) => editPaper((paper) => Object.assign(paper.school, patch)),
        updateExam: (patch) => editPaper((paper) => Object.assign(paper.exam, patch)),
        updateLayout: (patch) =>
          editPaper((paper) => {
            Object.assign(paper.layout, patch)
            if (patch.margins) paper.layout.margins = { ...paper.layout.margins, ...patch.margins }
          }),
        resetLayout: () =>
          editPaper((paper) => {
            paper.layout = { ...DEFAULT_LAYOUT, margins: { ...DEFAULT_LAYOUT.margins } }
          }),
        replaceCurrentPaper: (paper) =>
          editPaper((draft) => {
            const keepId = draft.id
            Object.assign(draft, clone(paper))
            draft.id = keepId
          }),

        /* instructions ---------------------------------------------------- */
        addInstruction: (text = '') =>
          editPaper((paper) => {
            paper.instructions.push(createInstruction(text))
          }),
        updateInstruction: (instructionId, text) =>
          editPaper((paper) => {
            const found = paper.instructions.find((i) => i.id === instructionId)
            if (found) found.text = text
          }),
        removeInstruction: (instructionId) =>
          editPaper((paper) => {
            paper.instructions = paper.instructions.filter((i) => i.id !== instructionId)
          }),
        reorderInstructions: (from, to) =>
          editPaper((paper) => {
            paper.instructions = moveItem(paper.instructions, from, to)
          }),

        /* sections -------------------------------------------------------- */
        addSection: (title) => {
          const paper = currentPaper()
          const index = paper ? paper.sections.length : 0
          const section = createSection(index, title ? { title } : {})
          editPaper((draft) => {
            draft.sections.push(section)
          })
          return section.id
        },
        updateSection: (sectionId, patch) =>
          editPaper((paper) => {
            const section = paper.sections.find((s) => s.id === sectionId)
            if (section) Object.assign(section, patch)
          }),
        removeSection: (sectionId) =>
          editPaper((paper) => {
            paper.sections = paper.sections.filter((s) => s.id !== sectionId)
          }),
        duplicateSection: (sectionId) =>
          editPaper((paper) => {
            const index = paper.sections.findIndex((s) => s.id === sectionId)
            if (index < 0) return
            const source = paper.sections[index]
            const copy: Section = {
              ...clone(source),
              id: uid('sec'),
              title: `${source.title} (copy)`,
              questions: source.questions.map((q) => {
                const nq = clone(q)
                nq.id = uid('q')
                nq.options = nq.options.map((o) => ({ ...o, id: uid('opt') }))
                nq.matchPairs = nq.matchPairs.map((p) => ({ ...p, id: uid('pair') }))
                const optIndex = q.options.findIndex((o) => o.id === q.correctOptionId)
                nq.correctOptionId = optIndex >= 0 ? nq.options[optIndex].id : null
                return nq
              }),
            }
            paper.sections.splice(index + 1, 0, copy)
          }),
        reorderSections: (from, to) =>
          editPaper((paper) => {
            paper.sections = moveItem(paper.sections, from, to)
          }),
        balanceSection: (sectionId, target) => {
          const paper = currentPaper()
          if (!paper) return
          const balanced = balanceSectionTo(paper, sectionId, target)
          editPaper((draft) => {
            draft.sections = balanced.sections
          })
        },

        /* questions ------------------------------------------------------- */
        addQuestion: (sectionId, type = 'short') => {
          const spec = questionTypeSpec(type)
          const settings = get().settings
          const question = createQuestion(type)
          if (spec.defaultAnswerLines > 0) {
            question.answerLines = settings.defaultAnswerLines
          }
          editPaper((paper) => {
            const section = paper.sections.find((s) => s.id === sectionId)
            if (section) section.questions.push(question)
          })
          set({ activeQuestionId: question.id })
          return question.id
        },

        insertQuestions: (sectionId, questions, atIndex) =>
          editPaper((paper) => {
            const section = paper.sections.find((s) => s.id === sectionId)
            if (!section) return
            const at = atIndex === undefined ? section.questions.length : atIndex
            section.questions.splice(at, 0, ...questions.map((q) => clone(q)))
          }),

        updateQuestion: (questionId, patch) =>
          withQuestion(questionId, ({ section, questionIndex }) => {
            section.questions[questionIndex] = { ...section.questions[questionIndex], ...patch }
          }),

        setQuestionType: (questionId, type) =>
          withQuestion(questionId, ({ section, questionIndex }) => {
            section.questions[questionIndex] = convertQuestionType(
              section.questions[questionIndex],
              type,
            )
          }),

        removeQuestion: (questionId) =>
          withQuestion(questionId, ({ section }) => {
            section.questions = section.questions.filter((q) => q.id !== questionId)
          }),

        duplicateQuestion: (questionId) =>
          withQuestion(questionId, ({ section, questionIndex, question }) => {
            const copy = clone(question)
            copy.id = uid('q')
            copy.options = copy.options.map((o) => ({ ...o, id: uid('opt') }))
            copy.matchPairs = copy.matchPairs.map((p) => ({ ...p, id: uid('pair') }))
            const optIndex = question.options.findIndex((o) => o.id === question.correctOptionId)
            copy.correctOptionId = optIndex >= 0 ? copy.options[optIndex].id : null
            section.questions.splice(questionIndex + 1, 0, copy)
          }),

        reorderQuestions: (sectionId, from, to) =>
          editPaper((paper) => {
            const section = paper.sections.find((s) => s.id === sectionId)
            if (section) section.questions = moveItem(section.questions, from, to)
          }),

        moveQuestion: (questionId, toSectionId, toIndex) =>
          editPaper((paper) => {
            const found = locateQuestion(paper, questionId)
            if (!found) return
            const target = paper.sections.find((s) => s.id === toSectionId)
            if (!target) return
            const [moved] = found.section.questions.splice(found.questionIndex, 1)
            const at = Math.max(0, Math.min(target.questions.length, toIndex))
            target.questions.splice(at, 0, moved)
          }),

        /* mcq options ----------------------------------------------------- */
        addOption: (questionId) =>
          withQuestion(questionId, ({ question }) => {
            question.options.push(createOption(''))
          }),
        updateOption: (questionId, optionId, html) =>
          withQuestion(questionId, ({ question }) => {
            const option = question.options.find((o) => o.id === optionId)
            if (option) option.html = html
          }),
        removeOption: (questionId, optionId) =>
          withQuestion(questionId, ({ question }) => {
            question.options = question.options.filter((o) => o.id !== optionId)
            if (question.correctOptionId === optionId) question.correctOptionId = null
          }),
        setCorrectOption: (questionId, optionId) =>
          withQuestion(questionId, ({ question }) => {
            question.correctOptionId = question.correctOptionId === optionId ? null : optionId
          }),

        /* matching pairs -------------------------------------------------- */
        addMatchPair: (questionId) =>
          withQuestion(questionId, ({ question }) => {
            question.matchPairs.push(createMatchPair())
          }),
        updateMatchPair: (questionId, pairId, patch) =>
          withQuestion(questionId, ({ question }) => {
            const pair = question.matchPairs.find((p) => p.id === pairId)
            if (pair) Object.assign(pair, patch)
          }),
        removeMatchPair: (questionId, pairId) =>
          withQuestion(questionId, ({ question }) => {
            question.matchPairs = question.matchPairs.filter((p) => p.id !== pairId)
          }),

        /* marks ----------------------------------------------------------- */
        autoBalance: () => {
          const paper = currentPaper()
          if (!paper) return
          const balanced = autoBalanceMarks(paper)
          editPaper((draft) => {
            draft.sections = balanced.sections
          })
        },

        /* question bank --------------------------------------------------- */
        addToBank: (question, meta) => {
          const entry: BankEntry = {
            id: uid('bank'),
            question: (() => {
              const copy = clone(question)
              copy.id = uid('q')
              copy.meta = { ...copy.meta, chapter: meta.chapter, difficulty: meta.difficulty }
              return copy
            })(),
            subject: meta.subject,
            className: meta.className,
            chapter: meta.chapter,
            difficulty: meta.difficulty,
            createdAt: nowIso(),
            usageCount: 0,
          }
          set((state) => ({ bank: [entry, ...state.bank] }))
        },

        updateBankEntry: (entryId, patch) =>
          set((state) => ({
            bank: state.bank.map((entry) => (entry.id === entryId ? { ...entry, ...patch } : entry)),
          })),

        removeBankEntry: (entryId) =>
          set((state) => ({ bank: state.bank.filter((entry) => entry.id !== entryId) })),

        insertFromBank: (entryIds, sectionId) => {
          const bank = get().bank
          const chosen = entryIds
            .map((id) => bank.find((entry) => entry.id === id))
            .filter((entry): entry is BankEntry => Boolean(entry))
          if (chosen.length === 0) return

          const questions = chosen.map((entry) => {
            const q = clone(entry.question)
            q.id = uid('q')
            const optIndex = entry.question.options.findIndex(
              (o) => o.id === entry.question.correctOptionId,
            )
            q.options = q.options.map((o) => ({ ...o, id: uid('opt') }))
            q.matchPairs = q.matchPairs.map((p) => ({ ...p, id: uid('pair') }))
            q.correctOptionId = optIndex >= 0 ? q.options[optIndex].id : null
            return q
          })

          editPaper((paper) => {
            const section = paper.sections.find((s) => s.id === sectionId)
            if (section) section.questions.push(...questions)
          })

          set((state) => ({
            bank: state.bank.map((entry) =>
              entryIds.includes(entry.id) ? { ...entry, usageCount: entry.usageCount + 1 } : entry,
            ),
          }))
        },

        /* settings -------------------------------------------------------- */
        updateSettings: (patch) =>
          set((state) => ({ settings: { ...state.settings, ...patch } })),

        setTheme: (theme) => set((state) => ({ settings: { ...state.settings, theme } })),

        applySchoolPreset: () => {
          const preset = get().settings.schoolPreset
          editPaper((paper) => {
            paper.school = clone(preset)
          })
        },
        saveSchoolPreset: () => {
          const paper = currentPaper()
          if (!paper) return
          set((state) => ({ settings: { ...state.settings, schoolPreset: clone(paper.school) } }))
        },
        applyLayoutPreset: () => {
          const preset = get().settings.layoutPreset
          editPaper((paper) => {
            paper.layout = clone(preset)
          })
        },
        saveLayoutPreset: () => {
          const paper = currentPaper()
          if (!paper) return
          set((state) => ({ settings: { ...state.settings, layoutPreset: clone(paper.layout) } }))
        },

        /* history / misc -------------------------------------------------- */
        setActiveQuestion: (questionId) => set({ activeQuestionId: questionId }),

        undo: () =>
          set((state) => {
            if (state.past.length === 0) return {}
            const index = state.papers.findIndex((p) => p.id === state.currentPaperId)
            if (index === -1) return {}
            const previous = state.past[state.past.length - 1]
            const papers = state.papers.slice()
            const currentSnapshot = papers[index]
            papers[index] = previous
            return {
              papers,
              past: state.past.slice(0, -1),
              future: [currentSnapshot, ...state.future].slice(0, HISTORY_LIMIT),
            }
          }),

        redo: () =>
          set((state) => {
            if (state.future.length === 0) return {}
            const index = state.papers.findIndex((p) => p.id === state.currentPaperId)
            if (index === -1) return {}
            const [next, ...rest] = state.future
            const papers = state.papers.slice()
            const currentSnapshot = papers[index]
            papers[index] = next
            return {
              papers,
              past: [...state.past, currentSnapshot].slice(-HISTORY_LIMIT),
              future: rest,
            }
          }),

        canUndo: () => get().past.length > 0,
        canRedo: () => get().future.length > 0,

        resetEverything: () => {
          set({
            papers: createSamplePapers(),
            bank: createSampleBank(),
            settings: clone(DEFAULT_SETTINGS),
            past: [],
            future: [],
            activeQuestionId: null,
          })
          const first = get().papers[0]
          set({ currentPaperId: first ? first.id : null })
        },
      }
    },
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: (state) => ({
        papers: state.papers,
        bank: state.bank,
        settings: state.settings,
        currentPaperId: state.currentPaperId,
      }),
      merge: (persisted, current) => {
        const incoming = (persisted ?? {}) as Partial<PersistedState>
        return {
          ...current,
          papers: Array.isArray(incoming.papers) ? incoming.papers : current.papers,
          bank: Array.isArray(incoming.bank) ? incoming.bank : current.bank,
          settings: { ...current.settings, ...(incoming.settings ?? {}) },
          currentPaperId: incoming.currentPaperId ?? current.currentPaperId,
        }
      },
    },
  ),
)

/* -------------------------------------------------------------------------- */
/*  Selectors                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The paper currently open in the editor, or `null` before bootstrap.
 * Components must tolerate `null` for exactly one render.
 */
export function useCurrentPaper(): Paper | null {
  return useAppStore((state) => state.papers.find((p) => p.id === state.currentPaperId) ?? null)
}

export function useSettings(): AppSettings {
  return useAppStore((state) => state.settings)
}

export function useHydrated(): boolean {
  return useAppStore((state) => state.hydrated)
}

/**
 * True once zustand's `persist` middleware has finished reading localStorage.
 *
 * This is *not* the same as `hydrated` above: that flag means "sample data has
 * been seeded and the app is ready", whereas this one means "the values in the
 * store now reflect what is on disk". Anything that would otherwise render
 * default values on the first client paint — the theme, the paper list — must
 * wait for this, or React will hydrate against markup that is about to change.
 */
export function usePersistHydrated(): boolean {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (useAppStore.persist.hasHydrated()) {
      setReady(true)
      return
    }
    return useAppStore.persist.onFinishHydration(() => setReady(true))
  }, [])

  return ready
}

/** Reads the current paper outside React (exporters, keyboard handlers). */
export function getCurrentPaper(): Paper | null {
  const state = useAppStore.getState()
  return state.papers.find((p) => p.id === state.currentPaperId) ?? null
}
