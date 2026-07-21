import { describe, expect, it } from 'vitest'
import type { Asset } from '@/api'
import { getDeletableAssetIds } from './assets'

const asset = (id: string, referenceCount: number): Asset => ({
  id,
  referenceCount,
  originalName: `${id}.png`,
  contentType: 'image/png',
  sizeBytes: 1,
  sha256: id,
  createdAt: '2026-07-21T00:00:00.000Z',
})

describe('static resource selection', () => {
  it('only allows unreferenced files to be selected for deletion', () => {
    expect(getDeletableAssetIds([asset('unused', 0), asset('in-use', 2)])).toEqual(['unused'])
  })
})
