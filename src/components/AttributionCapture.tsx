'use client'

import { useEffect } from 'react'
import { captureAttribution } from '@/lib/attribution'

// No renderiza nada — solo dispara la captura de UTM/referrer al montar.
// Ver src/lib/attribution.ts para el porqué.
export function AttributionCapture() {
  useEffect(() => {
    captureAttribution()
  }, [])
  return null
}
