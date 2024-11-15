# 知梭 - 智能任务管理与数据可视化小程序

## 项目简介

知梭是一款集任务管理与笔记功能于一体的微信小程序，旨在帮助用户更好地组织工作与生活。通过数据可视化的方式，让用户的工作更有条理，生活更加高效。本项目采用微信小程序原生框架开发，后端使用微信云开发技术栈。

## 主要功能

### 1. 任务管理系统
- **任务创建与编辑**
  - 支持设置任务标题、描述
  - 可选择任务优先级(高、中、低)
  - 设置截止日期和提醒时间
  - 支持富文本描述

- **任务提醒系统**
  - 到期自动提醒
  - 支持提前提醒(1小时、10分钟)
  - 可设置延迟提醒
  - 震动与声音提示

- **任务状态管理**
  - 进行中/已完成状态切换
  - 任务完成度实时统计
  - 支持任务重启

- **任务筛选与排序**
  - 按优先级筛选
  - 按状态筛选
  - 按创建时间排序
  - 按截止日期排序

### 2. 笔记系统
- **笔记管理**
  - 支持创建、编辑、删除笔记
  - 富文本编辑器
  - 支持添加标签
  - 可关联具体任务

- **分类系统**
  - 自定义笔记分类
  - 分类管理(新建、编辑、删除)
  - 笔记分类统计

- **标签系统**
  - 支持多标签
  - 标签筛选
  - 标签云展示
  - 相关笔记推荐

### 3. 数据可视化
- **任务统计**
  - 任务完成率图表
  - 任务分布饼图
  - 时间趋势分析
  - 效率评估

- **笔记分析**
  - 笔记数量统计
  - 分类占比分析
  - 标签使用频率
  - 创作热力图

### 4. 用户系统
- **账号管理**
  - 微信一键登录
  - 用户信息管理
  - 头像与昵称修改
  - 隐私政策

- **数据同步**
  - 云端数据备份
  - 多设备同步
  - 离线缓存

## 技术架构

### 前端技术
- **微信小程序框架**
  - 使用原生WXML、WXSS开发
  - 组件化设计
  - 响应式布局
  - 自定义组件

- **UI/UX设计**
  - 遵循微信设计规范
  - 流畅的动画效果
  - 友好的交互体验
  - 统一的视觉风格

### 后端技术
- **微信云开发**
  - 云函数处理业务逻辑
  - 云数据库存储数据
  - 云存储管理文件
  - 实时数据同步

### 数据库设计

#### USER集合
json
{
"id": "string", // 用户ID
"openId": "string", // 微信OpenID
"nickName": "string", // 用户昵称
"avatarUrl": "string", // 头像URL
"createTime": "Date", // 创建时间
"updateTime": "Date" // 更新时间
}

#### TASKS集合
json
{
"id": "string", // 任务ID
"openid": "string", // 用户openid
"title": "string", // 任务标题
"description": "string", // 任务描述
"priority": "string", // 优先级(high/medium/low)
"status": "string", // 状态(ongoing/completed)
"dueDate": "string", // 截止日期
"reminderTime": "string", // 提醒时间
"needReminder": "boolean",// 是否需要提醒
"reminderStatus": "string",// 提醒状态
"createTime": "Date", // 创建时间
"updateTime": "Date" // 更新时间
}
#### NOTES集合
json
{
"id": "string", // 笔记ID
"openid": "string", // 用户openid
"categoryId": "string", // 分类ID
"categoryName": "string", // 分类名称
"content": "string", // 内容
"tags": ["string"], // 标签数组
"taskId": "string", // 关联任务ID
"taskTitle": "string", // 关联任务标题
"createTime": "Date", // 创建时间
"updateTime": "Date" // 更新时间
}

#### NOTE_CATEGORIES集合
json
{
"id": "string", // 分类ID
"openid": "string", // 用户openid
"name": "string", // 分类名称
"createTime": "Date", // 创建时间
"updateTime": "Date" // 更新时间
}

## 项目结构详解

### cloudfunctions/ (云函数)
- **login/**
  - `index.js`: 处理用户登录,创建/更新用户信息
  - `config.json`: 云函数配置
  - `package.json`: 依赖配置
- **getOpenId/**
  - `index.js`: 获取用户openid
- **setTaskReminder/**
  - `index.js`: 设置任务提醒,发送订阅消息

### miniprogram/ (小程序主目录)
- **pages/tasks/** (任务相关页面)
  - `tasks.js/.wxml/.wxss`: 任务列表页面
  - `create/`: 创建任务页面
  - `detail/`: 任务详情页面
- **pages/notes/** (笔记相关页面) 
  - `notes.js/.wxml/.wxss`: 笔记列表页面
  - `create/`: 创建笔记页面
  - `detail/`: 笔记详情页面
- **pages/data/** (数据统计页面)
  - `visualization/`: 数据可视化页面
- **pages/me/** (个人中心)
  - `me.js/.wxml/.wxss`: 用户信息与统计
- **pages/login/** (登录页面)
  - `login.js/.wxml/.wxss`: 用户登录

## API文档

### 云函数API

#### login
javascript
// 用户登录
wx.cloud.callFunction({
name: 'login',
data: { userInfo }
})


#### getOpenId
javascript
// 获取用户openid
wx.cloud.callFunction({
name: 'getOpenId'
})


#### setTaskReminder
javascript
// 设置任务提醒
wx.cloud.callFunction({
name: 'setTaskReminder',
data: { taskId, title, dueDate, reminderTime }
})


### 数据库API

#### 任务相关
javascript
// 创建任务
db.collection('TASKS').add({
data: {...taskData}
})
// 更新任务
db.collection('TASKS').doc(taskId).update({
data: {...updateData}
})
// 删除任务
db.collection('TASKS').doc(taskId).remove()


#### 笔记相关
javascript
// 创建笔记
db.collection('NOTES').add({
data: {...noteData}
})
// 更新笔记
db.collection('NOTES').doc(noteId).update({
data: {...updateData}
})
// 删除笔记
db.collection('NOTES').doc(noteId).remove()



## 性能优化

1. **数据缓存优化**
- 使用本地存储缓存用户信息
- 合理使用云数据库的查询缓存
- 分页加载列表数据

2. **请求优化**
- 合并重复请求
- 避免频繁的数据库操作
- 使用批量更新接口

3. **渲染优化**
- 使用懒加载
- 长列表使用虚拟列表
- 避免频繁setData

4. **体验优化**
- 添加加载动画
- 合理的骨架屏
- 防抖与节流处理

## 安全性考虑

1. **数据安全**
- 严格的权限控制
- 数据加密存储
- 敏感信息过滤

2. **用户认证**
- 登录态校验
- 操作权限验证
- 敏感操作确认

3. **云函数安全**
- 参数校验
- 错误处理
- 日志记录

## 常见问题

1. **登录失败**
- 检查网络连接
- 确认微信授权
- 查看云开发配置

2. **提醒未触发**
- 检查提醒时间设置
- 登陆小程序

3. **数据同步问题**
- 检查网络状态
- 确认数据库权限
- 查看错误日志

## 后续规划

1. **功能扩展**
- 团队协作功能
- 数据导出功能
- 自定义主题

2. **性能提升**
- 引入缓存机制
- 优化查询性能
- 提升加载速度

3. **用户体验**
- 完善操作引导
- 优化交互设计
- 增加快捷操作

## 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 版本历史

### v1.0.0 (2024-01)
- 初始版本发布
- 实现基础任务管理
- 实现笔记系统
- 添加数据可视化

## 作者

王宇彤 - 兰州大学

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件


## 致谢

感谢所有为本项目做出贡献的开发者和用户。