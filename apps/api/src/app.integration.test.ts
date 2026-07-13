import 'reflect-metadata'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { NestFactory } from '@nestjs/core'
import request from 'supertest'
import type { INestApplication } from '@nestjs/common'
import { AppModule } from './app.module.js'
import { ApiErrorFilter } from './common/error.filter.js'

describe('authenticated project flow',()=>{
  let app:INestApplication,cookie='',csrf='',workspaceId='',projectId='',columnId='',taskId='',version=0
  beforeAll(async()=>{app=await NestFactory.create(AppModule,{logger:false});app.setGlobalPrefix('api/v1');app.useGlobalFilters(new ApiErrorFilter());await app.init()})
  afterAll(async()=>app.close())
  it('registers and logs in',async()=>{const email=`test-${Date.now()}@example.com`,password='secure-password';await request(app.getHttpServer()).post('/api/v1/auth/register').send({email,password,name:'测试用户',workspaceName:'测试空间'}).expect(201);const response=await request(app.getHttpServer()).post('/api/v1/auth/login').send({email,password}).expect(201);cookie=response.headers['set-cookie'][0].split(';')[0];csrf=response.body.csrfToken;expect(cookie).toContain('session=')})
  it('isolates workspace resources and creates a task',async()=>{const workspaces=await request(app.getHttpServer()).get('/api/v1/workspaces').set('Cookie',cookie).expect(200);workspaceId=workspaces.body[0].id;const projects=await request(app.getHttpServer()).get(`/api/v1/workspaces/${workspaceId}/projects`).set('Cookie',cookie).expect(200);projectId=projects.body[0].id;const columns=await request(app.getHttpServer()).get(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/columns`).set('Cookie',cookie).expect(200);columnId=columns.body[0].id;const task=await request(app.getHttpServer()).post(`/api/v1/workspaces/${workspaceId}/tasks`).set('Cookie',cookie).set('x-csrf-token',csrf).send({projectId,columnId,title:'集成测试任务'}).expect(201);taskId=task.body.id;version=task.body.version;expect(task.body.key).toBe('TEAM-1');const tasks=await request(app.getHttpServer()).get(`/api/v1/workspaces/${workspaceId}/tasks?projectId=${projectId}`).set('Cookie',cookie).expect(200);expect(tasks.body.data).toHaveLength(1)})
  it('rejects stale concurrent updates',async()=>{await request(app.getHttpServer()).patch(`/api/v1/workspaces/${workspaceId}/tasks/${taskId}`).set('Cookie',cookie).set('x-csrf-token',csrf).send({title:'第一次更新',version}).expect(200);const conflict=await request(app.getHttpServer()).patch(`/api/v1/workspaces/${workspaceId}/tasks/${taskId}`).set('Cookie',cookie).set('x-csrf-token',csrf).send({title:'过期更新',version}).expect(409);expect(conflict.body.code).toBe('TASK_VERSION_CONFLICT')})
})
