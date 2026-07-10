# Contributing to LianYu-PC

感谢你愿意改进恋语。提交改动前，请先确认没有把 API Key、`.env`、证书、聊天数据或安装包加入 Git。

## Development

```bash
# Backend
cd backend
mvn -B test

# Frontend
cd frontend
npm ci --ignore-scripts
npm run build
npm run test -- --run

# Compose validation
docker compose -f docker-compose.yml -f docker-compose.lite.yml config --quiet
```

Electron 打包需要 Node.js 20、Python 3 和可用的 Windows C++ 构建工具；普通 Web 开发不需要执行 Electron 原生依赖的安装脚本。

## Pull Requests

- 一个 PR 聚焦一个问题，说明行为变化和验证命令。
- 数据库变更必须新增 Flyway migration，不修改已经发布的 migration。
- 新增用户数据采集能力时必须默认关闭，并提供可见的授权、撤销和删除路径。
- 新增 AI provider 时不得在日志、响应或测试夹具中暴露完整密钥。
- UI 改动需同时检查桌面与窄屏布局。

提交贡献即表示你同意按 Apache-2.0 许可证授权该贡献。
