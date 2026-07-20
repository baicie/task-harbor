import { FormEvent, useEffect, useState } from 'react'
import { ListChecks, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { api, type Subtask } from '@/api'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'

export default function TaskSubtasks({workspaceId,taskId,en}:{workspaceId:string;taskId:string;en:boolean}){
  const [items,setItems]=useState<Subtask[]>([]),[title,setTitle]=useState(''),[busy,setBusy]=useState(false)
  const load=()=>api.subtasks(workspaceId,taskId).then(setItems).catch(reason=>toast.error(reason instanceof Error?reason.message:(en?'Failed to load subtasks':'子任务加载失败')))
  useEffect(()=>{void load()},[workspaceId,taskId])
  const add=async(event:FormEvent)=>{event.preventDefault();const next=title.trim();if(!next)return;setBusy(true);try{const created=await api.createSubtask(workspaceId,taskId,next);setItems(current=>[...current,created]);setTitle('')}catch(reason){toast.error(reason instanceof Error?reason.message:(en?'Failed to add subtask':'添加子任务失败'))}finally{setBusy(false)}}
  const toggle=async(item:Subtask)=>{const isDone=!item.isDone;setItems(current=>current.map(value=>value.id===item.id?{...value,isDone}:value));try{await api.updateSubtask(workspaceId,taskId,item.id,{isDone})}catch(reason){setItems(current=>current.map(value=>value.id===item.id?item:value));toast.error(reason instanceof Error?reason.message:(en?'Update failed':'更新失败'))}}
  const remove=async(item:Subtask)=>{setBusy(true);try{await api.deleteSubtask(workspaceId,taskId,item.id);setItems(current=>current.filter(value=>value.id!==item.id))}catch(reason){toast.error(reason instanceof Error?reason.message:(en?'Delete failed':'删除失败'))}finally{setBusy(false)}}
  const done=items.filter(item=>item.isDone).length
  return <section className="task-subtasks"><div className="task-subtasks-heading"><span><ListChecks/><strong>{en?'Subtasks':'子任务'}</strong></span><small>{done}/{items.length}</small></div>{items.length?<div className="subtask-list">{items.map(item=><div key={item.id}><Checkbox aria-label={item.title} checked={item.isDone} onCheckedChange={()=>void toggle(item)}/><span data-done={item.isDone||undefined}>{item.title}</span><Button type="button" size="icon-sm" variant="ghost" disabled={busy} aria-label={en?'Delete subtask':'删除子任务'} onClick={()=>void remove(item)}><Trash2/></Button></div>)}</div>:null}<form className="subtask-composer" onSubmit={add}><Input value={title} maxLength={300} disabled={busy} placeholder={en?'Add a subtask':'添加一个子任务'} onChange={event=>setTitle(event.target.value)}/><Button type="submit" size="icon" disabled={busy||!title.trim()} aria-label={en?'Add subtask':'添加子任务'}><Plus/></Button></form></section>
}
