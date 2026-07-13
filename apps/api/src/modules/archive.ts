import { createHash } from 'node:crypto'
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import { z } from 'zod'

const date=z.string()
const member=z.object({email:z.string().email(),name:z.string(),role:z.enum(['OWNER','ADMIN','MEMBER','VIEWER'])})
const comment=z.object({body:z.string(),authorEmail:z.string().email(),createdAt:date})
const checklist=z.object({title:z.string(),isDone:z.boolean(),position:z.number()})
const task=z.object({sourceId:z.string().uuid(),columnSourceId:z.string().uuid(),number:z.number().int(),title:z.string(),description:z.string(),kind:z.enum(['TASK','STORY','BUG']),priority:z.enum(['HIGH','MEDIUM','LOW']),dueDate:z.string().nullable(),position:z.number(),version:z.number().int(),archived:z.boolean(),assigneeEmails:z.array(z.string().email()),labels:z.array(z.string()),checklist:z.array(checklist),comments:z.array(comment)})
const column=z.object({sourceId:z.string().uuid(),name:z.string(),color:z.string(),position:z.number()})
const project=z.object({sourceId:z.string().uuid(),name:z.string(),code:z.string(),description:z.string(),color:z.string(),archived:z.boolean(),columns:z.array(column),tasks:z.array(task)})
const documentVersion=z.object({version:z.number().int(),title:z.string(),kind:z.enum(['ARCHITECTURE','REQUIREMENT','DESIGN','MEETING','RETROSPECTIVE']),status:z.enum(['DRAFT','PUBLISHED','ARCHIVED']),content:z.string(),changeNote:z.string(),createdAt:date})
const document=z.object({sourceId:z.string().uuid(),projectSourceId:z.string().uuid().nullable(),title:z.string(),kind:z.enum(['ARCHITECTURE','REQUIREMENT','DESIGN','MEETING','RETROSPECTIVE']),status:z.enum(['DRAFT','PUBLISHED','ARCHIVED']),content:z.string(),version:z.number().int(),versions:z.array(documentVersion)})
const planItem=z.object({position:z.number().int(),title:z.string(),description:z.string(),kind:z.enum(['TASK','STORY','BUG']),priority:z.enum(['HIGH','MEDIUM','LOW']),taskSourceId:z.string().uuid().nullable()})
const plan=z.object({sourceId:z.string().uuid(),projectSourceId:z.string().uuid(),title:z.string(),goal:z.string(),status:z.enum(['DRAFT','APPLIED']),source:z.string(),version:z.number().int(),items:z.array(planItem)})
export const snapshotSchema=z.object({schemaVersion:z.literal(1),workspace:z.object({name:z.string()}),members:z.array(member),projects:z.array(project),documents:z.array(document),plans:z.array(plan)})
export type WorkspaceSnapshot=z.infer<typeof snapshotSchema>

type Manifest={format:'taskharbor';version:1;exportedAt:string;workspaceName:string;files:{path:string;sha256:string}[]}
const digest=(data:Uint8Array)=>createHash('sha256').update(data).digest('hex')
const csv=(rows:(string|number|null)[][])=>rows.map(row=>row.map(value=>{const text=String(value??'');return /[",\n]/.test(text)?`"${text.replaceAll('"','""')}"`:text}).join(',')).join('\n')
const safeName=(value:string)=>value.normalize('NFKC').replace(/[^\p{L}\p{N}._-]+/gu,'-').replace(/^-+|-+$/g,'').slice(0,80)||'document'

export function createArchive(snapshot:WorkspaceSnapshot){
  const value=snapshotSchema.parse(snapshot),files:Record<string,Uint8Array>={}
  files['data/workspace.json']=strToU8(JSON.stringify(value,null,2))
  files['csv/projects.csv']=strToU8(csv([['code','name','description','archived'],...value.projects.map(project=>[project.code,project.name,project.description,String(project.archived)])]))
  files['csv/tasks.csv']=strToU8(csv([['project','number','type','priority','title','due_date','archived'],...value.projects.flatMap(project=>project.tasks.map(task=>[project.code,task.number,task.kind,task.priority,task.title,task.dueDate,String(task.archived)]))]))
  for(const document of value.documents)files[`documents/${safeName(document.title)}-${document.sourceId}.md`]=strToU8(document.content)
  const manifest:Manifest={format:'taskharbor',version:1,exportedAt:new Date().toISOString(),workspaceName:value.workspace.name,files:Object.entries(files).map(([path,data])=>({path,sha256:digest(data)}))}
  files['manifest.json']=strToU8(JSON.stringify(manifest,null,2))
  return zipSync(files,{level:6})
}

export function readArchive(data:Uint8Array){
  if(data.length>25*1024*1024)throw new Error('Archive exceeds 25 MB')
  let total=0
  const files=unzipSync(data,{filter:file=>{total+=file.originalSize;if(file.originalSize>25*1024*1024||total>100*1024*1024)throw new Error('Archive expands beyond the safe limit');return true}})
  const paths=Object.keys(files)
  if(paths.length>5000||paths.some(path=>path.startsWith('/')||path.split('/').includes('..')))throw new Error('Archive contains unsafe paths')
  const manifestFile=files['manifest.json'];if(!manifestFile)throw new Error('Archive manifest is missing')
  const manifest=z.object({format:z.literal('taskharbor'),version:z.literal(1),files:z.array(z.object({path:z.string(),sha256:z.string().length(64)})).max(4999)}).parse(JSON.parse(strFromU8(manifestFile)))
  const expected=new Set(['manifest.json',...manifest.files.map(file=>file.path)])
  if(paths.some(path=>!expected.has(path))||expected.size!==paths.length)throw new Error('Archive file list does not match its manifest')
  for(const entry of manifest.files){const file=files[entry.path];if(!file||digest(file)!==entry.sha256)throw new Error(`Checksum failed: ${entry.path}`)}
  const snapshotFile=files['data/workspace.json'];if(!snapshotFile)throw new Error('Workspace snapshot is missing')
  return snapshotSchema.parse(JSON.parse(strFromU8(snapshotFile)))
}
