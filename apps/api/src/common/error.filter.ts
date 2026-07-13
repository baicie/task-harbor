import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common'
import type { Response } from 'express'
import type { AppRequest } from './http.js'

@Catch()
export class ApiErrorFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>()
    const request = host.switchToHttp().getRequest<AppRequest>()
    const status = error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR
    const payload = error instanceof HttpException ? error.getResponse() : {}
    const value = typeof payload === 'object' && payload ? payload as Record<string, unknown> : {}
    response.status(status).json({ code: value.code ?? `HTTP_${status}`, message: value.message ?? (status === 500 ? '服务器内部错误' : '请求失败'), requestId: request.requestId, ...(value.details ? { details: value.details } : {}) })
  }
}
