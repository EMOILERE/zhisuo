// pages/data/visualization/visualization.js
const app = getApp()

Page({
  data: {
    taskStats: {
      total: 0,
      completed: 0,
      ongoing: 0,
      completionRate: 0
    },
    priorityStats: {
      high: 0,
      medium: 0,
      low: 0
    },
    noteStats: {
      total: 0,
      categories: [],
      tags: []
    },
    weeklyStats: [], // 最近7天的任务完成情况
    canvasWidth: 300,
    canvasHeight: 200,
    isLoading: true,
    hasError: false,
    errorMsg: '',
    refreshing: false, // 下拉刷新状态
    animation: {}, // 动画实例
  },

  onLoad() {
    this.initAnimation()
    this.initCanvas()
  },

  onShow() {
    this.loadData()
  },

  // 初始化动画实例
  initAnimation() {
    this.chartAnimation = wx.createAnimation({
      duration: 500,
      timingFunction: 'ease'
    })
  },

  // 初始化Canvas尺寸
  initCanvas() {
    try {
      const systemInfo = wx.getSystemInfoSync()
      const canvasWidth = systemInfo.windowWidth - 40
      this.setData({
        canvasWidth: canvasWidth,
        canvasHeight: canvasWidth * 0.6
      })
    } catch (error) {
      console.error('获取系统信息失败：', error)
      this.showError('初始化失败')
    }
  },

  // 加载数据
  async loadData(showLoading = true) {
    if (showLoading) {
      this.setData({ isLoading: true, hasError: false })
    }

    try {
      await Promise.all([
        this.loadTaskStats(),
        this.loadNoteStats(),
        this.loadWeeklyStats()
      ])
      
      // 添加动画效果
      this.animateCharts()
      this.drawCharts()
      
    } catch (error) {
      console.error('加载数据失败：', error)
      this.showError('数据加载失败')
    } finally {
      this.setData({ 
        isLoading: false,
        refreshing: false 
      })
    }
  },

  // 显示错误信息
  showError(msg) {
    this.setData({
      hasError: true,
      errorMsg: msg
    })
    wx.showToast({
      title: msg,
      icon: 'error'
    })
  },

  // 下拉刷新
  async onPullDownRefresh() {
    this.setData({ refreshing: true })
    await this.loadData(false)
    wx.stopPullDownRefresh()
  },

  // 重试加载
  onRetryTap() {
    this.loadData()
  },

  // 添加图表动画
  animateCharts() {
    this.chartAnimation.opacity(0).scale(0.8).step()
    this.chartAnimation.opacity(1).scale(1).step()
    this.setData({
      animation: this.chartAnimation.export()
    })
  },

  // 绘制所有图表
  drawCharts() {
    try {
      this.drawCompletionRate()
      this.drawPriorityDistribution()
      this.drawWeeklyTrend()
    } catch (error) {
      console.error('绘制图表失败：', error)
      this.showError('图表渲染失败')
    }
  },

  // 绘制任务完成率圆环图
  drawCompletionRate() {
    const ctx = wx.createCanvasContext('completionChart')
    const { canvasWidth, canvasHeight } = this.data
    const centerX = canvasWidth / 2
    const centerY = canvasHeight / 2
    const radius = Math.min(centerX, centerY) * 0.6

    const rate = this.data.taskStats.completionRate / 100
    
    // 绘制背景圆环
    ctx.beginPath()
    ctx.setLineWidth(12)
    ctx.setLineCap('round')
    ctx.setStrokeStyle('#f0f2f5')
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
    ctx.stroke()

    // 绘制进度圆环
    ctx.beginPath()
    ctx.setLineWidth(12)
    ctx.setLineCap('round')
    ctx.setStrokeStyle('#3498db')
    ctx.arc(centerX, centerY, radius, -Math.PI/2, -Math.PI/2 + rate * 2 * Math.PI)
    ctx.stroke()

    // 绘制中心文字
    ctx.setFillStyle('#2c3e50')
    ctx.setFontSize(24)
    ctx.setTextAlign('center')
    ctx.setTextBaseline('middle')
    ctx.fillText(`${this.data.taskStats.completionRate}%`, centerX, centerY - 8)
    
    ctx.setFontSize(14)
    ctx.setFillStyle('#95a5a6')
    ctx.fillText('任务完成率', centerX, centerY + 20)

    ctx.draw()
  },

  // 绘制优先级分布柱状图
  drawPriorityDistribution() {
    const ctx = wx.createCanvasContext('priorityChart')
    const { canvasWidth, canvasHeight } = this.data
    const stats = this.data.priorityStats
    const total = stats.high + stats.medium + stats.low
    
    const padding = 40
    const chartWidth = canvasWidth - padding * 2
    const chartHeight = canvasHeight - padding * 2
    const barWidth = chartWidth / 5
    const gap = barWidth / 2
    const startX = padding + gap

    // 绘制背景网格
    ctx.setStrokeStyle('#f0f2f5')
    ctx.setLineWidth(1)
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight * i / 5)
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(canvasWidth - padding, y)
      ctx.stroke()
    }

    // 绘制柱状图
    const drawBar = (value, index, color, label) => {
      const maxHeight = chartHeight * 0.9
      const barHeight = total ? (value / total) * maxHeight : 0
      const x = startX + index * (barWidth + gap)
      const y = padding + chartHeight - barHeight

      // 绘制柱子
      ctx.beginPath()
      ctx.setFillStyle(color)
      ctx.rect(x, y, barWidth, barHeight)
      ctx.fill()

      // 绘制数值
      ctx.setFillStyle('#2c3e50')
      ctx.setFontSize(16)
      ctx.setTextAlign('center')
      ctx.fillText(value, x + barWidth/2, y - 10)

      // 绘制标签
      ctx.setFontSize(14)
      ctx.fillText(label, x + barWidth/2, canvasHeight - padding/2)
    }

    drawBar(stats.high, 0, '#e74c3c', '高')
    drawBar(stats.medium, 1, '#3498db', '中')
    drawBar(stats.low, 2, '#2ecc71', '低')

    ctx.draw()
  },

  // 绘制每周趋势折线图
  drawWeeklyTrend() {
    const ctx = wx.createCanvasContext('weeklyChart')
    const { canvasWidth, canvasHeight } = this.data
    const stats = this.data.weeklyStats
    
    const padding = 40
    const chartWidth = canvasWidth - padding * 2
    const chartHeight = canvasHeight - padding * 2

    // 找出最大值
    const maxCount = Math.max(...stats.map(s => s.count), 1)
    
    // 绘制背景网格
    ctx.setStrokeStyle('#f0f2f5')
    ctx.setLineWidth(1)
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight * i / 5)
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(canvasWidth - padding, y)
      ctx.stroke()
    }

    // 绘制Y轴刻度
    ctx.setFillStyle('#95a5a6')
    ctx.setFontSize(12)
    ctx.setTextAlign('right')
    for (let i = 0; i <= 5; i++) {
      const value = Math.round(maxCount * (5-i) / 5)
      const y = padding + (chartHeight * i / 5)
      ctx.fillText(value, padding - 10, y + 6)
    }

    // 绘制折线
    ctx.beginPath()
    stats.forEach((stat, index) => {
      const x = padding + (index * chartWidth / 6)
      const y = padding + chartHeight - (stat.count / maxCount * chartHeight)
      
      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        // 使用贝塞尔曲线使折线更平滑
        const prevX = padding + ((index-1) * chartWidth / 6)
        const prevY = padding + chartHeight - (stats[index-1].count / maxCount * chartHeight)
        const cp1x = (prevX + x) / 2
        const cp2x = (prevX + x) / 2
        ctx.bezierCurveTo(cp1x, prevY, cp2x, y, x, y)
      }
    })
    ctx.setStrokeStyle('#3498db')
    ctx.setLineWidth(3)
    ctx.stroke()

    // 绘制数据点
    stats.forEach((stat, index) => {
      const x = padding + (index * chartWidth / 6)
      const y = padding + chartHeight - (stat.count / maxCount * chartHeight)
      
      // 绘制白色背景
      ctx.beginPath()
      ctx.arc(x, y, 6, 0, 2 * Math.PI)
      ctx.setFillStyle('#fff')
      ctx.fill()
      
      // 绘制蓝色边框
      ctx.beginPath()
      ctx.arc(x, y, 5, 0, 2 * Math.PI)
      ctx.setFillStyle('#3498db')
      ctx.fill()
    })

    // 绘制日期标签
    ctx.setFontSize(12)
    ctx.setFillStyle('#95a5a6')
    ctx.setTextAlign('center')
    stats.forEach((stat, index) => {
      const x = padding + (index * chartWidth / 6)
      const date = new Date(stat.date)
      const label = `${date.getMonth()+1}/${date.getDate()}`
      ctx.fillText(label, x, canvasHeight - padding/3)
    })

    ctx.draw()
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: '我的任务数据统计',
      path: '/pages/data/visualization/visualization'
    }
  },

  // 加载任务统计
  async loadTaskStats() {
    const db = wx.cloud.database()
    const _ = db.command
    const userOpenId = wx.getStorageSync('userInfo')._openid

    try {
      const tasks = await db.collection('TASKS')
        .where({
          _openid: userOpenId
        })
        .get()

      const taskList = tasks.data
      const completed = taskList.filter(t => t.status === 'completed').length
      const total = taskList.length
      const high = taskList.filter(t => t.priority === 'high').length
      const medium = taskList.filter(t => t.priority === 'medium').length
      const low = taskList.filter(t => t.priority === 'low').length

      this.setData({
        'taskStats.total': total,
        'taskStats.completed': completed,
        'taskStats.ongoing': total - completed,
        'taskStats.completionRate': total ? Math.round((completed / total) * 100) : 0,
        'priorityStats.high': high,
        'priorityStats.medium': medium,
        'priorityStats.low': low
      })
    } catch (error) {
      console.error('加载任务统计失败：', error)
      throw new Error('任务数据加载失败')
    }
  },

  // 加载笔记统计
  async loadNoteStats() {
    const db = wx.cloud.database()
    const userOpenId = wx.getStorageSync('userInfo')._openid

    try {
      const notes = await db.collection('NOTES')
        .where({
          _openid: userOpenId
        })
        .get()

      // 统计分类数据
      const categoryMap = new Map()
      const tagSet = new Set()

      notes.data.forEach(note => {
        // 统计分类
        const category = note.categoryName || '未分类'
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1)
        
        // 统计标签
        note.tags?.forEach(tag => tagSet.add(tag))
      })

      const categories = Array.from(categoryMap.entries()).map(([name, count]) => ({
        name,
        count
      }))

      this.setData({
        'noteStats.total': notes.data.length,
        'noteStats.categories': categories,
        'noteStats.tags': Array.from(tagSet)
      })
    } catch (error) {
      console.error('加载笔记统计失败：', error)
      throw new Error('笔记数据加载失败')
    }
  },

  // 加载周统计数据
  async loadWeeklyStats() {
    const db = wx.cloud.database()
    const _ = db.command
    const userOpenId = wx.getStorageSync('userInfo')._openid
    
    try {
      // 获取最近7天的日期
      const dates = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        dates.push(date.toISOString().split('T')[0])
      }

      // 获取这段时间内完成的任务
      const startDate = new Date(dates[0])
      startDate.setHours(0, 0, 0, 0)

      const tasks = await db.collection('TASKS')
        .where({
          _openid: userOpenId,
          status: 'completed',
          updateTime: _.gte(startDate)
        })
        .get()

      // 统计每天完成的任务数
      const dailyStats = dates.map(date => {
        const count = tasks.data.filter(task => {
          const taskDate = new Date(task.updateTime)
          return taskDate.toISOString().split('T')[0] === date
        }).length
        return { date, count }
      })

      this.setData({ weeklyStats: dailyStats })
    } catch (error) {
      console.error('加载周统计失败：', error)
      throw new Error('周统计数据加载失败')
    }
  }
})