const app = getApp()

Page({
  data: {
    currentCategory: 'all',
    categories: [],
    tags: [],
    selectedTags: [],
    notes: [],
    filteredNotes: [],
    showCategoryModal: false,
    newCategory: ''
  },

  onShow() {
    this.loadCategories()
    this.loadNotes()
  },

  // 加载分类
  loadCategories() {
    const db = wx.cloud.database()
    db.collection('NOTE_CATEGORIES')
      .where({
        _openid: wx.getStorageSync('userInfo')._openid  // 只查询当前用户的分类
      })
      .get({
        success: res => {
          this.setData({ categories: res.data })
        }
      })
  },

  // 加载笔记
  loadNotes() {
    const db = wx.cloud.database()
    db.collection('NOTES')
      .where({
        _openid: wx.getStorageSync('userInfo')._openid  // 只查询当前用户的笔记
      })
      .orderBy('createTime', 'desc')
      .get({
        success: res => {
          const notes = res.data.map(note => ({
            ...note,
            createTimeFormatted: this.formatDateTime(note.createTime)
          }))
          
          // 收集所有标签
          const allTags = new Set()
          notes.forEach(note => {
            note.tags?.forEach(tag => allTags.add(tag))
          })

          this.setData({
            notes,
            filteredNotes: notes,
            tags: Array.from(allTags)
          })
        }
      })
  },

  // 切换分类
  switchCategory(e) {
    const category = e.currentTarget.dataset.category
    this.setData({
      currentCategory: category
    })
    this.filterNotes()
  },

  // 切换标签
  toggleTag(e) {
    const tag = e.currentTarget.dataset.tag
    const selectedTags = [...this.data.selectedTags]
    const index = selectedTags.indexOf(tag)
    
    if (index > -1) {
      selectedTags.splice(index, 1)
    } else {
      selectedTags.push(tag)
    }
    
    this.setData({ selectedTags })
    this.filterNotes()
  },

  // 筛选笔记
  filterNotes() {
    let filtered = [...this.data.notes]
    const { currentCategory, selectedTags } = this.data

    // 按分类筛选
    if (currentCategory !== 'all') {
      filtered = filtered.filter(note => note.categoryId === currentCategory)
    }

    // 按标签筛选
    if (selectedTags.length > 0) {
      filtered = filtered.filter(note => 
        selectedTags.every(tag => note.tags?.includes(tag))
      )
    }

    this.setData({ filteredNotes: filtered })
  },

  // 显示新建分类弹窗
  showCategoryModal() {
    this.setData({
      showCategoryModal: true,
      newCategory: ''
    })
  },

  // 分类名称输入
  onCategoryInput(e) {
    this.setData({
      newCategory: e.detail.value
    })
  },

  // 取消新建分类
  cancelCategory() {
    this.setData({
      showCategoryModal: false,
      newCategory: ''
    })
  },

  // 保存新分类
  saveCategory() {
    const name = this.data.newCategory.trim()
    if (!name) {
      wx.showToast({
        title: '请输入分类名称',
        icon: 'none'
      })
      return
    }

    const db = wx.cloud.database()
    
    // 先检查是否存在同名分类
    db.collection('NOTE_CATEGORIES')
      .where({
        _openid: wx.getStorageSync('userInfo')._openid,
        name: name
      })
      .get({
        success: res => {
          if (res.data.length > 0) {
            wx.showToast({
              title: '分类已存在',
              icon: 'none'
            })
            return
          }

          // 不存在同名分类，继续添加
          db.collection('NOTE_CATEGORIES').add({
            data: {
              name,
              createTime: db.serverDate(),
              updateTime: db.serverDate()
            },
            success: () => {
              wx.showToast({
                title: '创建成功',
                icon: 'success'
              })
              this.setData({
                showCategoryModal: false,
                newCategory: ''
              })
              // 重新加载分类列表
              this.loadCategories()
            },
            fail: (err) => {
              console.error('创建分类失败：', err)
              wx.showToast({
                title: '创建失败',
                icon: 'error'
              })
            }
          })
        },
        fail: (err) => {
          console.error('检查分类失败：', err)
          wx.showToast({
            title: '创建失败',
            icon: 'error'
          })
        }
      })
  },

  // 跳转到笔记详情
  navigateToDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/notes/detail/detail?id=${id}`
    })
  },

  // 跳转到创建笔记
  navigateToCreate() {
    wx.navigateTo({
      url: '/pages/notes/create/create'
    })
  },

  // 格式化时间
  formatDateTime(date) {
    if (!date) return ''
    date = new Date(date)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  },

  // 删除分类
  deleteCategory(e) {
    const categoryId = e.currentTarget.dataset.id
    const categoryName = e.currentTarget.dataset.name

    wx.showModal({
      title: '确认删除',
      content: `确定要删除分类"${categoryName}"吗？相关笔记将变为未分类`,
      success: res => {
        if (res.confirm) {
          const db = wx.cloud.database()
          
          // 删除分类
          db.collection('NOTE_CATEGORIES')
            .doc(categoryId)
            .remove({
              success: () => {
                // 更新相关笔记的分类
                db.collection('NOTES')
                  .where({
                    _openid: wx.getStorageSync('userInfo')._openid,
                    categoryId: categoryId
                  })
                  .update({
                    data: {
                      categoryId: '',
                      categoryName: '未分类'
                    }
                  })

                wx.showToast({
                  title: '删除成功',
                  icon: 'success'
                })
                
                // 重新加载数据
                this.loadCategories()
                this.loadNotes()
              }
            })
        }
      }
    })
  },

  // 删除标签
  deleteTag(e) {
    const tag = e.currentTarget.dataset.tag

    wx.showModal({
      title: '确认删除',
      content: `确定要删除标签"${tag}"吗？`,
      success: res => {
        if (res.confirm) {
          const db = wx.cloud.database()
          const _ = db.command

          // 从所有笔记中移除该标签
          db.collection('NOTES')
            .where({
              _openid: wx.getStorageSync('userInfo')._openid,
              tags: tag
            })
            .update({
              data: {
                tags: _.pull(tag)
              },
              success: () => {
                wx.showToast({
                  title: '删除成功',
                  icon: 'success'
                })
                
                // 重新加载笔记
                this.loadNotes()
              }
            })
        }
      }
    })
  },

  // 删除笔记
  deleteNote(e) {
    const noteId = e.currentTarget.dataset.id

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条笔记吗？',
      success: res => {
        if (res.confirm) {
          const db = wx.cloud.database()
          
          db.collection('NOTES')
            .doc(noteId)
            .remove({
              success: () => {
                wx.showToast({
                  title: '删除成功',
                  icon: 'success'
                })
                
                // 重新加载笔记
                this.loadNotes()
              }
            })
        }
      }
    })
  }
}) 