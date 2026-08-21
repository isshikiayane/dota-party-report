# Dota 2 开黑档案

输入任意 2–5 个 Dota 账号，查询他们在 OpenDota 公开记录中同场、同阵营的比赛，并生成带筛选、年份统计、英雄池和锐评的深色互动报告。报告可以直接下载为一个 HTML 文件，发给朋友后用浏览器打开。

## 给普通用户

在 GitHub Releases 下载 `Windows-x64-免安装版.zip`，完整解压后双击 `启动 Dota 2 开黑档案.bat`。免安装版已经包含运行环境，不需要安装 Node.js，也不用输入命令。

## 本地运行

需要 Node.js 20 或更高版本。

```bash
npm start
```

打开 `http://localhost:3000`。页面支持：

- Dota Account ID（例如 `123456789`）
- Steam64 ID
- 末尾包含数字 ID 的 Steam / OpenDota 个人资料链接

首次查询会访问 OpenDota，可能需要一两分钟；结果默认在本机缓存 12 小时。点击“下载单 HTML”可以保存一份完全独立的报告。

## Docker 部署

```bash
docker compose up -d --build
```

然后访问 `http://localhost:3000`。缓存保存在 Docker 数据卷中。

## 可选配置

复制 `.env.example` 为 `.env`：

```env
OPENDOTA_API_KEY=你的_OpenDota_Key
PORT=3000
CACHE_TTL_HOURS=12
```

没有 API Key 也能运行，但公开接口的限流更严格。不要把自己的 `.env` 提交到公开仓库。

## 数据口径与限制

本项目统计的是：指定账号出现在同一场公开比赛，并处于同一阵营。它不是 Valve 客户端的官方好友组队统计。因此以下情况会造成数字不一致：

- 玩家关闭公开比赛数据；
- OpenDota 没有收录或尚未解析某些比赛；
- 旧比赛缺少 `party_size` 等字段；
- Valve 和 OpenDota 的历史数据范围、去重或刷新时间不同。

报告会继续展示可证实的“同场同阵营”记录，并明确标注不能确认正式组队人数的数据，避免把字段缺失误写成“没有一起排”。

## 隐私

账号与缓存数据只保存在部署本项目的机器上。服务不会建立用户系统，也不会把查询历史发送到项目作者处；但查询本身会请求 OpenDota 的公开 API。

## 开发与检查

```bash
npm test
```

## 许可证与声明

代码使用 [MIT License](LICENSE)。Dota、Dota 2、Steam、Valve 及英雄美术资产的商标和版权归 Valve Corporation 所有。本项目是非官方社区工具，与 Valve 或 OpenDota 无隶属关系。公开发布时请不要把 Valve 的图标或英雄图片声明为本项目自有资产。

