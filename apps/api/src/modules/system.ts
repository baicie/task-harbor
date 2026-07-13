import { Controller, Get, Param, Post, Req } from '@nestjs/common'
import { DatabaseService } from '../database/database.service.js'
import { AppRequest, Public } from '../common/http.js'
import { WorkspaceService } from './workspaces.js'

@Controller()
export class SystemController {
  constructor(private readonly db:DatabaseService,private readonly workspaces:WorkspaceService) {}
  @Public() @Get('health/live') live(){return{status:'ok'}}
  @Public() @Get('health/ready') async ready(){await this.db.client`SELECT 1`;return{status:'ready'}}
  @Get('notifications') notifications(@Req() req:AppRequest){return this.db.client`SELECT id,title,is_read AS "isRead",created_at AS "createdAt" FROM notifications WHERE user_id=${req.user!.id} ORDER BY created_at DESC LIMIT 50`}
  @Post('notifications/read') async read(@Req() req:AppRequest){await this.db.client`UPDATE notifications SET is_read=true WHERE user_id=${req.user!.id}`;return{ok:true}}
  @Get('workspaces/:workspaceId/audit-logs') async audit(@Req() req:AppRequest,@Param('workspaceId') workspaceId:string){await this.workspaces.role(workspaceId,req.user!.id,'workspace.manage');return this.db.client`SELECT id,action,entity_type AS "entityType",entity_id AS "entityId",request_id AS "requestId",created_at AS "createdAt" FROM audit_logs WHERE workspace_id=${workspaceId} ORDER BY created_at DESC LIMIT 100`}
}
