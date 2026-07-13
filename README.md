# 闲序

轻量、可私有化部署的团队项目管理工具。React + Vite 前端与 NestJS API 构建为一个应用镜像，PostgreSQL 独立运行。

## 本地运行

```bash
docker compose up --build
```

打开 `http://localhost:8080`，注册后会自动创建工作区、项目和四个看板列。

开发模式：复制 `.env.example` 为 `.env`，启动 PostgreSQL 后运行 `npm run db:migrate && npm run dev`。

## 交付

- API 文档：`/api/docs`
- 健康检查：`/api/v1/health/live`、`/api/v1/health/ready`
- 镜像只使用 commit SHA 发布；回滚时重新部署上一 SHA。
- 数据库迁移在应用启动前执行，迁移记录保存在 `_migrations`。
