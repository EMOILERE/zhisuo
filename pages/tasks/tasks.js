const app = getApp()

Page({
  data: {
    taskStats: {
      total: 0,
      ongoing: 0,
      completed: 0
    },
    progressPercent: 0,
    currentStatus: 'all',
    currentPriority: 'all',
    tasks: [],
    filteredTasks: []
  },

  onShow() {
    this.loadTasks()
  },

  loadTasks() {
    const db = wx.cloud.database()
    db.collection('TASKS')
      .where({
        _openid: wx.getStorageSync('userInfo')._openid
      })
      .orderBy('createTime', 'desc')
      .get({
        success: res => {
          const tasks = res.data.map(task => ({
            ...task,
            priorityText: this.getPriorityText(task.priority),
            statusText: this.getStatusText(task.status),
            dueDateFormatted: this.formatDate(task.dueDate)
          }))

          const stats = this.calculateStats(tasks)
          
          this.setData({
            tasks,
            filteredTasks: tasks,
            taskStats: stats,
            progressPercent: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
          })
        }
      })
  },

  getPriorityText(priority) {
    const map = { high: '高', medium: '中', low: '低' }
    return map[priority] || '中'
  },

  getStatusText(status) {
    const map = { ongoing: '进行中', completed: '已完成' }
    return map[status] || '进行中'
  },

  formatDate(dateStr) {
    if (!dateStr) return '无截止日期'
    const date = new Date(dateStr)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  },

  calculateStats(tasks) {
    return {
      total: tasks.length,
      ongoing: tasks.filter(t => t.status === 'ongoing').length,
      completed: tasks.filter(t => t.status === 'completed').length
    }
  },

  filterByStatus(e) {
    const status = e.currentTarget.dataset.status
    this.setData({ currentStatus: status })
    this.applyFilters()
  },

  filterByPriority(e) {
    const priority = e.currentTarget.dataset.priority
    this.setData({ currentPriority: priority })
    this.applyFilters()
  },

  applyFilters() {
    const { currentStatus, currentPriority, tasks } = this.data
    
    let filtered = tasks
    
    if (currentStatus !== 'all') {
      filtered = filtered.filter(t => t.status === currentStatus)
    }
    
    if (currentPriority !== 'all') {
      filtered = filtered.filter(t => t.priority === currentPriority)
    }

    this.setData({ filteredTasks: filtered })
  },

  navigateToCreate() {
    console.log('准备跳转到创建任务页面')
    wx.navigateTo({
      url: '../tasks/create/create',
      success: () => {
        console.log('跳转成功')
      },
      fail: (err) => {
        console.error('跳转失败：', err)
        wx.showModal({
          title: '创建失败',
          content: '无法打开创建页面，错误信息：' + err.errMsg,
          showCancel: false
        })
      }
    })
  },

  navigateToDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/tasks/detail/detail?id=${id}`
    })
  }
}) 