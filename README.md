# Dota 2 开黑档案

输入 2–5 个 Dota 账号，看看这群人到底是在一起上分，还是集体坐牢。

本项目会读取 OpenDota 的公开比赛记录，查找指定玩家同场且同阵营的比赛，并生成一份带组合筛选、年份统计、英雄池和锐评的深色互动报告。报告可以导出为独立 HTML 文件，直接发给朋友用浏览器打开。

[下载 Windows 免安装版](https://github.com/isshikiayane/dota-party-report/releases/latest) · [查看源代码](https://github.com/isshikiayane/dota-party-report) · [反馈问题](https://github.com/isshikiayane/dota-party-report/issues)

## 可以看什么

- 双黑、三黑、四黑、五黑任意组合
- 共同比赛场数、胜负、胜率和时间跨度
- 每年共同比赛数量和当年统计
- 每位玩家在共同比赛中的英雄池
- 常用英雄、招牌英雄和组合表现
- 根据实际数据生成的刀味锐评
- 当前公开个人资料名称，不只显示账号 ID
- 导出一份可以离线打开的单 HTML 报告

## Windows 用户：免安装版

这是最简单的使用方式，不需要安装 Git、Node.js、npm 或 Docker，也不用输入命令。

1. 打开 [Releases 下载页面](https://github.com/isshikiayane/dota-party-report/releases/latest)。
2. 下载名称类似 `Dota2-Party-Report-Windows-x64-Portable-v1.1.7.zip` 的文件。
3. 右键 ZIP 文件并完整解压，不要直接在压缩软件里运行。
4. 打开解压后的文件夹，双击 `启动 Dota 2 开黑档案.bat`。
5. 浏览器会自动打开 `http://localhost:3000`。
6. 输入 2–5 个账号，点击开始查询。

运行期间请保持启动窗口开启；关闭窗口后，本地网页也会停止。查询数据和缓存都保存在这台电脑上。

### 支持哪些账号格式

- Dota Account ID，例如 `123456789`
- Steam64 ID
- 末尾包含数字 ID 的 Steam 或 OpenDota 个人资料链接

Steam 自定义名称链接不能直接转换时，请改用 Dota Account ID 或 Steam64 ID。

### 第一次查询要多久

首次查询需要从 OpenDota 读取每个账号的公开资料和比赛历史，通常需要几十秒到几分钟。账号比赛较多、OpenDota 限流或网络较慢时，等待时间可能更长。

查询结果默认在本机缓存 12 小时。再次查询相同账号会优先使用缓存；需要重新获取时，可以勾选“忽略本地缓存”。

### 如何分享报告

生成报告后点击“下载单 HTML”，即可保存一份独立网页。接收者不需要安装本项目，直接用浏览器打开 HTML 文件即可查看。

## 数据从哪里来

本项目使用 OpenDota 的公开接口。它判断的是：指定账号是否出现在同一场公开比赛中，并且处于同一阵营。

这不等于 Valve 客户端里的官方好友组队场次，因此两边的数字可能不同。常见原因包括：

- 玩家关闭了公开比赛数据；
- OpenDota 没有收录或尚未解析部分比赛；
- 较早的比赛缺少组队人数等字段；
- Valve 和 OpenDota 的历史范围、去重方式或更新时间不同；
- OpenDota 当前只能返回该账号的一部分公开历史。

报告会继续展示能够证实的“同场同阵营”记录，并标注无法确认的信息。字段缺失不代表这些玩家没有一起组队。

## 常见问题

### 双击后浏览器没有打开

先不要关闭启动窗口，手动在浏览器访问：

```text
http://localhost:3000
```

如果仍然打不开，请查看启动窗口中的错误提示。

### 黑色窗口一闪就关闭

最常见的原因是直接在压缩软件里运行，或者压缩包没有完整解压。请重新解压整个 ZIP，再从解压后的文件夹启动。

### 提示 3000 端口被占用

通常是之前启动的程序仍在运行。关闭旧的“Dota 2 开黑档案”窗口后重新启动。

### 查询很慢或显示 OpenDota 请求失败

公开接口可能正在限流或暂时不可用。稍后重试，或者按下方说明配置自己的 OpenDota API Key。

### 为什么找不到首次共同比赛

这通常表示 OpenDota 没有提供足够早的公开记录，或老比赛缺少必要字段，因此工具无法可靠确认真正的首次共同比赛。

### 为什么资料名或头像不是最新的

公开资料可能仍在本地缓存中。勾选“忽略本地缓存”后重新查询；如果仍未更新，则可能是 OpenDota 尚未同步。

## 开发者：从源码运行

下面的内容面向希望查看、修改或参与开发的用户。普通 Windows 用户不需要执行这些命令。

### 环境要求

- Git
- Node.js 20 或更高版本

### 下载源码

`git clone` 的意思是把 GitHub 仓库中的源代码复制到当前电脑：

```bash
git clone https://github.com/isshikiayane/dota-party-report.git
cd dota-party-report
```

### 启动项目

```bash
npm start
```

`npm start` 会执行 `node server/index.js`，在本机启动网页服务。启动后访问：

```text
http://localhost:3000
```

本项目目前没有第三方运行时依赖，因此不需要额外执行 `npm install`。

### 运行自动测试

```bash
npm test
```

## Docker 部署

已经安装 Docker Desktop 或 Docker Engine 的用户可以运行：

```bash
docker compose up -d --build
```

然后访问 `http://localhost:3000`。缓存保存在 Docker 数据卷中。

停止服务：

```bash
docker compose down
```

## 可选配置

复制 `.env.example` 为 `.env`，按需要修改：

```env
OPENDOTA_API_KEY=你的_OpenDota_Key
PORT=3000
CACHE_TTL_HOURS=12
REQUEST_TIMEOUT_MS=45000
```

| 配置项 | 作用 | 默认值 |
| --- | --- | --- |
| `OPENDOTA_API_KEY` | 使用自己的 OpenDota API Key | 空 |
| `PORT` | 本地网页端口 | `3000` |
| `CACHE_TTL_HOURS` | 账号数据缓存时间 | `12` |
| `REQUEST_TIMEOUT_MS` | 单次 OpenDota 请求超时 | `45000` |

没有 API Key 也能运行，但公开接口的限流更严格。不要把包含密钥的 `.env` 文件提交到公开仓库。

## 项目结构

```text
public/                 账号输入页
server/                 本地服务、OpenDota 查询和缓存
work/build_dota_report.js
                        报告数据计算与单 HTML 生成
test/                   自动测试
.github/workflows/      GitHub 自动测试和版本打包
```

## 隐私与安全

- 本项目不建立用户账号，也没有作者运营的中央服务器。
- 查询记录和缓存保存在运行项目的电脑或 Docker 数据卷中。
- 查询时，输入的账号 ID 会发送给 OpenDota 公开接口。
- 导出的 HTML 可能包含账号名称、ID、比赛和英雄统计，分享前请确认接收对象。
- 不要在 Issue、截图或日志中公开自己的 OpenDota API Key。

## 参与和反馈

如果遇到启动失败、数据异常、英雄译名错误或页面显示问题，可以在 [GitHub Issues](https://github.com/isshikiayane/dota-party-report/issues) 提交反馈。请尽量提供：

- 使用的版本号；
- 操作系统；
- 问题截图；
- 可以公开的错误文字；
- 是否使用免安装版、源码或 Docker。

提交截图和日志前，请先检查其中是否包含不希望公开的账号 ID 或 API Key。

## 许可证与声明

代码使用 [MIT License](LICENSE)。Dota、Dota 2、Steam、Valve 及英雄美术资产的商标和版权归 Valve Corporation 所有。

本项目是非官方社区工具，与 Valve Corporation、Steam 或 OpenDota 没有隶属、授权或合作关系。公开发布时请勿将 Valve 的图标、英雄图片或其他美术资产声明为本项目自有资产。


