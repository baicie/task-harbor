import { Body, ConflictException, Controller, Get, Injectable, NotFoundException, Param, Patch, Post, Req } from '@nestjs/common'
import { DatabaseService } from '../database/database.service.js'
import { documentCreateSchema, documentUpdateSchema } from '../common/contracts.js'
import { AppRequest, parse } from '../common/http.js'
import { WorkspaceService } from './workspaces.js'

type CreateDocument = ReturnType<typeof documentCreateSchema.parse>
type UpdateDocument = ReturnType<typeof documentUpdateSchema.parse>

@Injectable()
export class DocumentService {
  constructor(private readonly db: DatabaseService, private readonly workspaces: WorkspaceService) {}

  async list(workspaceId: string, userId: string) {
    await this.workspaces.role(workspaceId, userId, 'document.read')
    return this.db.client`SELECT d.id,d.project_id AS "projectId",p.name AS "projectName",d.title,d.kind,d.status,d.version,d.updated_at AS "updatedAt",u.name AS "updatedByName" FROM documents d LEFT JOIN projects p ON p.id=d.project_id JOIN users u ON u.id=d.updated_by WHERE d.workspace_id=${workspaceId} ORDER BY d.updated_at DESC`
  }

  async get(workspaceId: string, userId: string, documentId: string) {
    await this.workspaces.role(workspaceId, userId, 'document.read')
    const [document] = await this.db.client`SELECT id,project_id AS "projectId",title,kind,status,content,version,created_at AS "createdAt",updated_at AS "updatedAt" FROM documents WHERE id=${documentId} AND workspace_id=${workspaceId}`
    if (!document) throw new NotFoundException({ code: 'DOCUMENT_NOT_FOUND', message: '文档不存在' })
    return document
  }

  async create(workspaceId: string, userId: string, input: CreateDocument) {
    await this.workspaces.role(workspaceId, userId, 'document.create')
    if (input.projectId) await this.assertProject(workspaceId, input.projectId)
    return this.db.client.begin(async sql => {
      const [document] = await sql<{ id: string }[]>`INSERT INTO documents(workspace_id,project_id,title,kind,content,created_by,updated_by) VALUES(${workspaceId},${input.projectId},${input.title},${input.kind},${input.content},${userId},${userId}) RETURNING id,project_id AS "projectId",title,kind,status,content,version,created_at AS "createdAt",updated_at AS "updatedAt"`
      await sql`INSERT INTO document_versions(workspace_id,document_id,project_id,title,kind,status,content,version,created_by) VALUES(${workspaceId},${document!.id},${input.projectId},${input.title},${input.kind},'DRAFT',${input.content},1,${userId})`
      return document
    })
  }

  async update(workspaceId: string, userId: string, documentId: string, input: UpdateDocument) {
    await this.workspaces.role(workspaceId, userId, 'document.update')
    if (input.projectId) await this.assertProject(workspaceId, input.projectId)
    return this.db.client.begin(async sql => {
      const [current] = await sql<{ version: number }[]>`SELECT version FROM documents WHERE id=${documentId} AND workspace_id=${workspaceId} FOR UPDATE`
      if (!current) throw new NotFoundException({ code: 'DOCUMENT_NOT_FOUND', message: '文档不存在' })
      if (current.version !== input.version) throw new ConflictException({ code: 'DOCUMENT_VERSION_CONFLICT', message: '文档已被其他人更新，请刷新后重试' })
      const [document] = await sql`UPDATE documents SET project_id=CASE WHEN ${input.projectId !== undefined} THEN ${input.projectId ?? null} ELSE project_id END,title=coalesce(${input.title ?? null},title),kind=coalesce(${input.kind ?? null}::document_kind,kind),status=coalesce(${input.status ?? null}::document_status,status),content=coalesce(${input.content ?? null},content),version=version+1,updated_by=${userId},updated_at=now() WHERE id=${documentId} AND workspace_id=${workspaceId} RETURNING id,project_id AS "projectId",title,kind,status,content,version,created_at AS "createdAt",updated_at AS "updatedAt"`
      await sql`INSERT INTO document_versions(workspace_id,document_id,project_id,title,kind,status,content,version,change_note,created_by) VALUES(${workspaceId},${documentId},${document!.projectId},${document!.title},${document!.kind},${document!.status},${document!.content},${document!.version},${input.changeNote},${userId})`
      return document
    })
  }

  async versions(workspaceId: string, userId: string, documentId: string) {
    await this.get(workspaceId, userId, documentId)
    return this.db.client`SELECT v.id,v.version,v.title,v.status,v.change_note AS "changeNote",v.created_at AS "createdAt",u.name AS "createdByName" FROM document_versions v JOIN users u ON u.id=v.created_by WHERE v.workspace_id=${workspaceId} AND v.document_id=${documentId} ORDER BY v.version DESC`
  }

  private async assertProject(workspaceId: string, projectId: string) {
    const [project] = await this.db.client`SELECT id FROM projects WHERE id=${projectId} AND workspace_id=${workspaceId} AND deleted_at IS NULL`
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: '项目不存在' })
  }
}

@Controller('workspaces/:workspaceId/documents')
export class DocumentController {
  constructor(private readonly documents: DocumentService) {}
  @Get() list(@Req() req: AppRequest, @Param('workspaceId') workspaceId: string) { return this.documents.list(workspaceId, req.user!.id) }
  @Post() create(@Req() req: AppRequest, @Param('workspaceId') workspaceId: string, @Body() body: unknown) { return this.documents.create(workspaceId, req.user!.id, parse(documentCreateSchema, body)) }
  @Get(':documentId') get(@Req() req: AppRequest, @Param('workspaceId') workspaceId: string, @Param('documentId') documentId: string) { return this.documents.get(workspaceId, req.user!.id, documentId) }
  @Patch(':documentId') update(@Req() req: AppRequest, @Param('workspaceId') workspaceId: string, @Param('documentId') documentId: string, @Body() body: unknown) { return this.documents.update(workspaceId, req.user!.id, documentId, parse(documentUpdateSchema, body)) }
  @Get(':documentId/versions') versions(@Req() req: AppRequest, @Param('workspaceId') workspaceId: string, @Param('documentId') documentId: string) { return this.documents.versions(workspaceId, req.user!.id, documentId) }
}
