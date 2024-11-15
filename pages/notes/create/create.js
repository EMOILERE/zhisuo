const app = getApp()

Page({
  data: {
    categories: [],
    selectedCategory: '',
    content: '',
    contentLength: 0,
    tags: [],
    newTag: '',
    tasks: [],
    selectedTask: null
  },

  onLoad() {
    this.loadCategories()
    this.loadTasks()
  },

  loadCategories() {
    const db = wx.cloud.database()
    db.collection('NOTE_CATEGORIES')
      .where({
        _openid: wx.getStorageSync('userInfo')._openid
      })
      .orderBy('createTime', 'asc')
      .get({
        success: res => {
          const uniqueCategories = Array.from(new Map(res.data.map(item => [item.name, item])).values())
          this.setData({ categories: uniqueCategories })
        }
      })
  },

  loadTasks() {
    const db = wx.cloud.database()
    db.collection('TASKS').where({
      _openid: app.globalData.openid,
      status: 'ongoing'
    }).get({
      success: res => {
        this.setData({ tasks: res.data })
      }
    })
  },

  selectCategory(e) {
    this.setData({
      selectedCategory: e.currentTarget.dataset.id
    })
  },

  onContentInput(e) {
    this.setData({
      content: e.detail.value,
      contentLength: e.detail.value.length
    })
  },

  onTagInput(e) {
    this.setData({
      newTag: e.detail.value
    })
  },

  addTag(e) {
    const tag = e.detail.value.trim()
    if (tag && !this.data.tags.includes(tag)) {
      this.setData({
        tags: [...this.data.tags, tag],
        newTag: ''
      })
    }
  },

  deleteTag(e) {
    const index = e.currentTarget.dataset.index
    const tags = [...this.data.tags]
    tags.splice(index, 1)
    this.setData({ tags })
  },

  selectTask(e) {
    const index = e.detail.value
    this.setData({
      selectedTask: this.data.tasks[index]
    })
  },

  submitNote(e) {
    const { content } = e.detail.value
    const { selectedCategory, tags, selectedTask } = this.data

    if (!selectedCategory) {
      wx.showToast({
        title: '请选择分类',
        icon: 'none'
      })
      return
    }

    if (!content.trim()) {
      wx.showToast({
        title: '请输入笔记内容',
        icon: 'none'
      })
      return
    }

    const db = wx.cloud.database()
    
    db.collection('NOTE_CATEGORIES')
      .doc(selectedCategory)
      .get({
        success: res => {
          const category = res.data
          
          db.collection('NOTES').add({
            data: {
              categoryId: selectedCategory,
              categoryName: category.name,
              content,
              tags,
              taskId: selectedTask?._id,
              taskTitle: selectedTask?.title,
              createTime: db.serverDate(),
              updateTime: db.serverDate()
            },
            success: () => {
              wx.showToast({
                title: '保存成功',
                icon: 'success'
              })
              setTimeout(() => {
                wx.navigateBack()
              }, 1500)
            },
            fail: err => {
              console.error('保存笔记失败：', err)
              wx.showToast({
                title: '保存失败',
                icon: 'error'
              })
            }
          })
        },
        fail: () => {
          wx.showToast({
            title: '分类不存在',
            icon: 'error'
          })
        }
      })
  },

  cancel() {
    wx.navigateBack()
  }
}) 