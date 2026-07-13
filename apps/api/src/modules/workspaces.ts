import { Body, Controller, ForbiddenException, Get, Injectable, NotFoundException, Param, Patch, Post, Req } from '@nestjs/common'
import { z } from 'zod'
import { randomBytes } from 'node:crypto'
import { DatabaseService } from '../database/database.service.js'
import { memberSchema, workspaceSchema } from '../common/contracts.js'
import { AppRequest, parse } from '../common/http.js'
import { can, Permission, Role } from '../common/policy.js'

@Injectable()
export class WorkspaceService {
  constructor(private readonly db: DatabaseService) {}
  async role(workspaceId: string, userId: string, permission: Permission) { const [row] = await this.db.client<{ role: Role }[]>`SELECT role FROM memberships WHERE workspace_id=${workspaceId} AND user_id=${userId} AND disabled_at IS NULL`; if (!row) throw new NotFoundException({ code: 'WORKSPACE_NOT_FOUND', message: '工作区不存在' }); if (!can(row.role, permission)) throw new ForbiddenException({ code: 'FORBIDDEN', message: '没有此操作权限' }); return row.role }
  async list(userId: string) { return this.db.client`SELECT w.id,w.name,w.slug,m.role FROM workspaces w JOIN memberships m ON m.workspace_id=w.id WHERE m.user_id=${userId} AND m.disabled_at IS NULL ORDER BY w.created_at` }
  async create(userId: string, name: string) { const slug = `${name.toLowerCase().replace(/\W+/g,'-').slice(0,32)}-${randomBytes(3).toString('hex')}`; return this.db.client.begin(async sql => { const [workspace] = await sql`INSERT INTO workspaces(name,slug,created_by) VALUES(${name},${slug},${userId}) RETURNING id,name,slug`; await sql`INSERT INTO memberships(workspace_id,user_id,role) VALUES(${workspace!.id},${userId},'OWNER')`; return workspace }) }
  async members(workspaceId: string, userId: string) { await this.role(workspaceId,userId,'member.read'); return this.db.client`SELECT u.id,u.name,u.email,m.role,m.disabled_at AS "disabledAt" FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.workspace_id=${workspaceId} ORDER BY m.joined_at` }
  async addMember(workspaceId: string, userId: string, email: string, role: Role) { await this.role(workspaceId,userId,'member.manage'); const [target] = await this.db.client<{ id: string }[]>`SELECT id FROM users WHERE email=${email.toLowerCase()}`; if (!target) throw new NotFoundException({ code:'USER_NOT_FOUND',message:'该邮箱尚未注册' }); await this.db.client`INSERT INTO memberships(workspace_id,user_id,role) VALUES(${workspaceId},${target.id},${role}) ON CONFLICT(workspace_id,user_id) DO UPDATE SET role=${role},disabled_at=NULL`; return { ok:true } }
}

@Controller('workspaces')
export class WorkspaceController {
  constructor(private readonly workspaces: WorkspaceService, private readonly db: DatabaseService) {}
  @Get() list(@Req() req: AppRequest) { return this.workspaces.list(req.user!.id) }
  @Post() create(@Req() req: AppRequest,@Body() body:unknown) { return this.workspaces.create(req.user!.id,parse(workspaceSchema,body).name) }
  @Get(':id/members') members(@Req() req:AppRequest,@Param('id') id:string) { return this.workspaces.members(id,req.user!.id) }
  @Post(':id/members') add(@Req() req:AppRequest,@Param('id') id:string,@Body() body:unknown) { const input=parse(memberSchema,body); return this.workspaces.addMember(id,req.user!.id,input.email,input.role) }
  @Patch(':id/members/:memberId') async update(@Req() req:AppRequest,@Param('id') id:string,@Param('memberId') memberId:string,@Body() body:unknown) { await this.workspaces.role(id,req.user!.id,'member.manage'); const input=z.object({role:z.enum(['ADMIN','MEMBER','VIEWER']).optional(),disabled:z.boolean().optional()}).strict().parse(body); await this.db.client`UPDATE memberships SET role=coalesce(${input.role ?? null}::member_role,role),disabled_at=CASE WHEN ${input.disabled ?? false} THEN now() ELSE NULL END WHERE workspace_id=${id} AND user_id=${memberId}`; return {ok:true} }
}
