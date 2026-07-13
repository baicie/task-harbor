import { describe, expect, it } from 'vitest'
import { documentCreateSchema, documentUpdateSchema, taskSchema } from './contracts.js'

describe('task type contract',()=>{
  const base={projectId:'11111111-1111-4111-8111-111111111111',columnId:'22222222-2222-4222-8222-222222222222',title:'修复登录失败'}
  it('defaults to TASK and accepts BUG',()=>{
    expect(taskSchema.parse(base).kind).toBe('TASK')
    expect(taskSchema.parse({...base,kind:'BUG'}).kind).toBe('BUG')
  })
})

describe('document contracts', () => {
  it('normalizes a new design document', () => {
    expect(documentCreateSchema.parse({ title: ' API 设计 ' })).toEqual({
      title: 'API 设计',
      kind: 'DESIGN',
      content: '',
      projectId: null,
    })
  })

  it('requires the current version when updating content', () => {
    expect(documentUpdateSchema.safeParse({ content: '# 新内容' }).success).toBe(false)
    expect(documentUpdateSchema.parse({ content: '# 新内容', version: 2 }).version).toBe(2)
  })
})
