import { useEffect, useState } from 'react'

const KEY = 'dear-fitness:v2'

const DEFAULT_STATE = {
  // { id, name, day: 'Monday', repRangeLow, repRangeHigh, restSeconds }
  exercises: [],
  // { id, exerciseId, date, sets: [{weight, reps}] }
  workoutLogs: [],
  // { id, date, weightKg }
  bodyLogs: [],
  // { id, date, type, valueCm }
  measurementLogs: [],
  // { id, date, reason, note }
  skipLogs: [],
  streak: { current: 0, longest: 0, lastWorkoutDate: null },
  settings: { weeklyGoal: 5, plateauDays: 60, defaultRestSeconds: 90 },
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return structuredClone(DEFAULT_STATE)
    const parsed = JSON.parse(raw)
    return {
      ...structuredClone(DEFAULT_STATE),
      ...parsed,
      settings: { ...DEFAULT_STATE.settings, ...(parsed.settings || {}) },
    }
  } catch {
    return structuredClone(DEFAULT_STATE)
  }
}

function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // storage full or unavailable — fail silently, app still works in-memory
  }
}

let listeners = []
let state = load()

function setState(updater) {
  state = typeof updater === 'function' ? updater(state) : updater
  save(state)
  listeners.forEach((l) => l(state))
}

export function useStore() {
  const [local, setLocal] = useState(state)
  useEffect(() => {
    const listener = (s) => setLocal(s)
    listeners.push(listener)
    return () => {
      listeners = listeners.filter((l) => l !== listener)
    }
  }, [])
  return [local, setState]
}

export function daysAgo(dateStr) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
export const DEFAULT = DEFAULT_STATE
export const uid = () => Math.random().toString(36).slice(2, 10)
