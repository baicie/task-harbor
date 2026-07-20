import { describe, expect, it } from 'vitest'
import { workflowTemplate, workflowTemplates } from './workflows.js'

describe('workflow templates', () => {
  it('offers simple, delivery, and release workflows', () => {
    expect(workflowTemplates.map(template => template.key)).toEqual(['SIMPLE', 'DELIVERY', 'RELEASE'])
  })

  it('models delivery review and rejection without allowing states to be skipped', () => {
    const template = workflowTemplate('DELIVERY')

    expect(template.columns.map(column => column.type)).toEqual(['BACKLOG', 'ACTIVE', 'REVIEW', 'DONE'])
    expect(template.transitions.map(transition => [transition.from, transition.to])).toEqual([
      ['BACKLOG', 'ACTIVE'],
      ['ACTIVE', 'REVIEW'],
      ['REVIEW', 'DONE'],
      ['REVIEW', 'ACTIVE'],
    ])
    expect(template.transitions).not.toContainEqual(expect.objectContaining({ from: 'ACTIVE', to: 'DONE' }))
  })

  it('uses repair language for bug transitions', () => {
    const submit = workflowTemplate('DELIVERY').transitions.find(transition => transition.from === 'ACTIVE' && transition.to === 'REVIEW')

    expect(submit).toMatchObject({ name: '提交测试', bugName: '修复完成并提测' })
  })
})
