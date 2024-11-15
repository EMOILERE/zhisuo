const app = getApp()

Page({
  data: {
    task: null,
    isEditing: false,
    editData: {},
    today: new Date().toISOString().split('T')[0]
  },

  onLoad(options) {
    if (options.id) {
      this.loadTaskDetail(options.id)
    }
  },

  loadTaskDetail(id) {
    const db = wx.cloud.database()
    db.collection('TASKS')
      .where({
        _id: id,
        _openid: wx.getStorageSync('userInfo')._openid  // 确保只能查看自己的任务
      })
      .get({
        success: res => {
          if (res.data.length === 0) {
            wx.showToast({
              title: '任务不存在',
              icon: 'error'
            })
            setTimeout(() => {
              wx.navigateBack()
            }, 1500)
            return
          }

          const task = {
            ...res.data[0],
            priorityText: this.getPriorityText(res.data[0].priority),
            statusText: this.getStatusText(res.data[0].status),
            dueDateFormatted: this.formatDate(res.data[0].dueDate),
            createTimeFormatted: this.formatDateTime(res.data[0].createTime)
          }

          this.setData({
            task,
            editData: {
              title: task.title,
              description: task.description,
              priority: task.priority,
              dueDate: task.dueDate,
              reminderTime: task.reminderTime
            }
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

  formatDateTime(date) {
    if (!date) return '未知时间'
    date = new Date(date)
    return `${this.formatDate(date)} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  },

  toggleEdit() {
    this.setData({
      isEditing: !this.data.isEditing
    })
  },

  onTitleInput(e) {
    this.setData({
      'editData.title': e.detail.value
    })
  },

  onDescInput(e) {
    this.setData({
      'editData.description': e.detail.value
    })
  },

  setPriority(e) {
    this.setData({
      'editData.priority': e.currentTarget.dataset.priority
    })
  },

  setDueDate(e) {
    this.setData({
      'editData.dueDate': e.detail.value
    })
  },

  cancelEdit() {
    this.setData({
      isEditing: false,
      editData: {
        title: this.data.task.title,
        description: this.data.task.description,
        priority: this.data.task.priority,
        dueDate: this.data.task.dueDate
      }
    })
  },

  saveEdit() {
    const { editData, task } = this.data
    if (!editData.title) {
      wx.showToast({
        title: '请输入任务标题',
        icon: 'none'
      })
      return
    }

    const db = wx.cloud.database()
    db.collection('TASKS').doc(task._id).update({
      data: {
        ...editData,
        updateTime: db.serverDate()
      },
      success: () => {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        })
        this.loadTaskDetail(task._id)
        this.setData({ isEditing: false })
      }
    })
  },

  toggleStatus() {
    const { task } = this.data
    const newStatus = task.status === 'completed' ? 'ongoing' : 'completed'

    const db = wx.cloud.database()
    db.collection('TASKS').doc(task._id).update({
      data: {
        status: newStatus,
        updateTime: db.serverDate()
      },
      success: () => {
        wx.showToast({
          title: newStatus === 'completed' ? '任务已完成' : '任务已重启',
          icon: 'success'
        })
        this.loadTaskDetail(task._id)
      }
    })
  },

  deleteTask() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个任务吗？',
      success: res => {
        if (res.confirm) {
          const db = wx.cloud.database()
          db.collection('TASKS').doc(this.data.task._id).remove({
            success: () => {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              })
              setTimeout(() => {
                wx.navigateBack()
              }, 1500)
            }
          })
        }
      }
    })
  }
}) 