# Security Policy

## Supported Versions

安全修复优先覆盖最新发布版本和 `main` 分支。

## Reporting a Vulnerability

请不要在公开 Issue 中粘贴漏洞利用代码、API Key、聊天记录或服务器地址。通过 GitHub Security Advisory 的私密报告入口提交以下信息：

- 受影响版本和模块
- 最小复现步骤
- 可能影响的数据或权限范围
- 已尝试的缓解措施

维护者确认问题后会协调修复与披露时间。未经确认，请勿扫描不属于你的部署。

## Sensitive Features

- 屏幕观察默认关闭，必须由用户明确授权。
- 记忆命中审计不保存原始查询文本，默认保留 30 天。
- 私网 OpenAI 兼容端点默认禁止，仅限可信自托管环境显式开启。
- `.env`、`certs/`、平台密钥和发布签名材料不得提交到仓库。
