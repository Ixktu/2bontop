# 2Bon↑ 网站

原生 HTML、CSS、JavaScript；无构建依赖。部署时只发布本目录，不发布学习档案和教参原件。

## 维护

- 唯一成绩数据源是 `data/study.json`。以后由 Codex 根据用户提供的正式成绩、目标和复盘修改并提交，页面不提供新增、编辑、删除、导入、固定分数或改权重的入口。
- 页面保留成绩/目标/复盘导航、查看不同记录和选择趋势科目。这些操作只影响当前浏览视图，不写入成绩或浏览器存储。
- 当前只收录用户 2026-10-17 提供的估分，考试日期未知。正式成绩到达后更新相同记录的状态、日期和分数，除非确为另一场考试，不把估分和正式分数记作两次考试。
- `records` 按时间从早到晚排列；每科可为 `null` 表示缺数据。复盘和预测未提供时保持 `null`，不能填入演示数据。`recordedAt` 是记录日期，`examDate` 才是考试日期。
- `goals.targetTotal` 和班型尚未确认，保持 `null`；不把历史网站截图、测试580分目标等当作用户目标。`schoolBands` 待取得真实班型参考表后补入，注明年份与来源；不编造分数线。
- 目标设定后页面按 `lossWeight` 自动生成总和准确的整数方案，可在数据文件的 `fixedScores` 中固定科目；无解时明确显示，不清空成绩。真实成绩不受方案影响。
- 原 Sites 项目的源码、浏览器本地历史成绩和班型表尚未取得。本版为仓库内重新实现，不声称已经迁移旧站全部数据；旧站浏览器数据应保留，待备份取得后逐项核对再迁移。

## 字体

英文标题与大数字优先调用本机安装的 Michelangelus；未安装时使用随站点分发的 EB Garamond。中文使用思源宋体同源的 Noto Serif SC。无远程字体请求。

Michelangelus 官方下载入口：<https://www.microsoft.com/en-us/download/details.aspx?id=108856>。本任务能取得的 EULA 副本含“No Distribution Rights”；因此没有把该字体二进制放入仓库或作为网页字体下载。当前仅通过 CSS `local()` 使用用户设备已安装的字体；尚未从官方服务器重新核实许可版本。

Noto Serif SC 来自 `@fontsource/noto-serif-sc@5.3.1`，EB Garamond 来自 `@fontsource/eb-garamond@5.3.0`。下载时核对了 npm 公布的 SHA512 完整性信息。各自的 SIL Open Font License 保存在 `assets/fonts/*-OFL.txt`。

## 本地运行

在仓库根运行 `python -m http.server 8000 --directory site`，再使用浏览器打开该本地服务进行内部检查。不能直接双击 HTML 使用 `file:` 协议，因为页面通过 fetch 读取 JSON。

## GitHub Pages

`.github/workflows/pages.yml` 在 `main` 上的本目录更新时发布，只上传 `site/`。首次部署尝试启用 Pages；若仓库套餐/权限不允许自动启用，需要在仓库 Settings → Pages 中选择 GitHub Actions，随后重跑工作流。不能把工作流文件已提交等同于线上已部署。

## 自定义域名：2bon.top

2026-10-18 用户授权绑定原有域名 `2bon.top`。`site/CNAME` 记录该域名；**本项目使用 GitHub Actions 发布，GitHub 官方说明该模式忽略 CNAME 文件，域名仍必须在仓库 Pages 设置中保存，文件提交不等于绑定成功。** 当前云网络对 GitHub Pages 管理 API 返回 Forbidden，尚未从本任务保存或核实后台的自定义域名、部署及 HTTPS 状态。

先在 [Actions](https://github.com/Ixktu/2bontop/actions/workflows/pages.yml) 确认 Publish 2Bon 发布成功，然后打开 [Settings → Pages](https://github.com/Ixktu/2bontop/settings/pages)：

1. Build and deployment → Source 选择 **GitHub Actions**。
2. Custom domain 填 **`2bon.top`**，点击 **Save**。先保存 GitHub 端域名，再调整 DNS。
3. 在域名服务商管理面板进入“DNS 解析／解析记录”，把根域名 `@` 原来指向旧站的 A、AAAA 或 CNAME 冲突记录替换为下表配置。不要删除邮箱等无关记录。

| 记录类型 | 主机记录 | 记录值 |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME（可选，启用 www） | www | ixktu.github.io |

TTL 使用默认值或600秒，解析线路用默认；若面板有代理选项，初次配置先用“仅DNS”。`www` 的 CNAME 目标只写主机名，不加协议、仓库路径或端口。不再使用旧 Sites 的两条根域名 A 地址。

DNS 生效后回到 GitHub Pages，等待 DNS check 和证书就绪，再勾选 **Enforce HTTPS**。证书准备时间与DNS传播有关，不承诺即时完成；未实际检查前不记录为已启用。

官方依据：[Managing a custom domain for your GitHub Pages site](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)。本次已从 GitHub 官方 docs 仓库核对四条 A 地址及 Actions 下 CNAME 文件的行为。
