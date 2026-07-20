import { describe, expect, it } from 'vitest'
import { createTaskTypeFields } from './taskFields'

describe('task type fields',()=>{
  it('creates an independent complete draft',()=>{
    const first=createTaskTypeFields(),second=createTaskTypeFields()
    first.reproductionSteps='打开登录页'
    expect(second.reproductionSteps).toBe('')
    expect(first.severity).toBe('MAJOR')
  })
})
