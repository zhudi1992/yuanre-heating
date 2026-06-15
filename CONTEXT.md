# 远热供暖调度系统 - 项目上下文

## 项目概述
远热公司供暖调度 Web 应用，功能包括数据录入、报表、仪表盘、天气展示、热负荷预测。

## 技术栈
- 前端: React 18 + Vite 5 + Recharts
- 后端: Node.js + Express, 端口 3001
- 前端开发端口: 5173 (Vite 代理 `/api` → 3001)
- 认证: JWT, 密码 SHA-256 哈希
- 数据存储: JSON 文件 (server/data/)

## 目录结构
- `server/server.js` — 主后端 (236+ 行, 含所有 API 路由)
- `server/auth.js` — JWT + 密码 + 角色中间件
- `server/predictionService.js` — HDD 模型预测
- `server/weatherService.js` — 西安天气服务
- `server/data/communities.json` — 126 个小区 (6 个标段 A-F, 总面积 573.88 万 m²)
- `server/data/users.json` — 用户存储
- `server/start-all.bat` — 同时启动前后端
- `client/src/App.jsx` — 主布局 + 侧边栏导航
- `client/src/context/AuthContext.jsx` — 认证状态管理
- `client/src/api/index.js` — API 客户端 (带 token)
- `client/src/components/LoginPage.jsx` — 登录页
- `client/src/components/Dashboard.jsx` — 仪表盘 (标段分组卡片 + 图表)
- `client/src/components/ManualEntry.jsx` — 手动录入 (编辑表格)
- `client/src/components/BatchEntry.jsx` — 批量导入 (CSV/粘贴/URL)
- `client/src/components/CommunityTable.jsx` — 小区表格 (标段 + 非天然气标签)
- `client/src/components/AnalysisPanel.jsx` — 标段对比 + 气/非气分析
- `client/src/components/ReportView.jsx` — 报表 (标段分组)
- `client/src/components/PredictionPanel.jsx` — 预测面板
- `client/src/components/WeatherWidget.jsx` — 天气组件
- `client/src/components/ImageEntry.jsx` — OCR 图片识别
- `client/src/components/DataValidator.js` — 数据验证工具
- `client/src/components/UserManagement.jsx` — 用户管理 (admin 专用)

## 角色权限
- admin (管理员): 全部权限, 包括用户管理
- entry (录入员): 可编辑数据
- viewer (查看员): 只读, 无"数据录入"选项卡

## 默认账号
- admin / admin123
- entry / entry123
- viewer / viewer123

## 关键业务规则
- 采暖季: 11月13日–次年3月15日
- 热负荷: 22–28 W/m²
- HDD 基准温度: 18°C
- 天然气系数: 0.0041
- 小区名含 (大网)/(电)/（电）/热泵 视为非天然气锅炉, 排除出气量统计
- 共 18 个非天然气小区

## 数据格式
小区对象: { id, name, section, heatingArea(㎡), dailyGas(m³), dailyElectricity(kWh), dailyWater(t), date }
Area 内部以 ㎡ 存储 (CSV 中万㎡→×10000)

## 部署
- 公测: Cloudflare Tunnel (trycloudflare.com)
- 双击 `start-public-test.bat` 启动
- 修改代码后: `cd client && npm run build` 重新构建, 重启脚本

## 已完成的功能
- JWT 认证系统 (登录/登出/token 刷新)
- 基于角色的路由和侧边栏
- 真实小区数据 126 个 (CSV 解析)
- 标段(区段 A-F)分组
- 非天然气小区检测
- 手动录入 (可编辑表格)
- 批量导入 (CSV/粘贴/URL 三种模式)
- 模糊匹配 + 手动映射
- OCR 图片识别 (Tesseract.js)
- HDD 预测模型 (校准系数)
- 仪表盘 (汇总卡片 + 图表)
- 标段对比分析
- 报表生成 + CSV 导出
- 用户管理 (admin CRUD)
- 天气预报 (西安)
- 数据验证 + 异常标记

## 已修复的问题 (2026-06-15)
- WeatherWidget: 可选链处理 partial API 响应
- PredictionPanel: input/summary/predictions 空值守卫
- PredictionPanel: 移除死 import (Line) 和误导性的置信区间柱
- ReportView: totalArea/communities 空值守卫
- DataValidator: isGasHeated 处理 undefined name
- Dashboard: NaN 显示用 '--' 替代
- ImageEntry: URL.createObjectURL 内存泄漏 (useEffect 清理)
- BatchEntry: 模式切换时重置解析数据
- 所有 29 个 API 测试通过
- 非天然气: 增加"热泵"匹配
- 部署: server.js 增加静态文件服务 + SPA catch-all 路由

## 启动方式
1. 开发: `start-all.bat` (前端 5173 + 后端 3001)
2. 生产/公测: `start-public-test.bat` (仅后端 3001 + cloudflare tunnel)
3. 构建前端: `cd client && npm run build`
4. 运行测试: `cd server && node api_test.js`
