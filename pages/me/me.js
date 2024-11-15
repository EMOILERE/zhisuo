const app = getApp()

Page({
  data: {
    userInfo: {},
    icons: {
      aboutIcon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMjAgMTBDMTkuMiAxMCAxOC41IDEwLjcgMTguNSAxMS41QzE4LjUgMTIuMyAxOS4yIDEzIDIwIDEzQzIwLjggMTMgMjEuNSAxMi4zIDIxLjUgMTEuNUMyMS41IDEwLjcgMjAuOCAxMCAyMCAxMFpNMjAgMTVDMTkuMiAxNSAxOC41IDE1LjcgMTguNSAxNi41VjI4LjVDMTguNSAyOS4zIDE5LjIgMzAgMjAgMzBDMjAuOCAzMCAyMS41IDI5LjMgMjEuNSAyOC41VjE2LjVDMjEuNSAxNS43IDIwLjggMTUgMjAgMTVaIiBmaWxsPSIjM2E3YmQ1Ii8+PC9zdmc+'
    },
    taskStats: {
      total: 0,
      completed: 0,
      ongoing: 0,
      completionRate: 0
    },
    noteStats: {
      total: 0,
      categories: 0,
      tags: 0
    },
    showNicknameModal: false,
    newNickname: ''
  },

  onShow() {
    this.loadUserInfo()
    this.loadStats()
  },

  loadUserInfo() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.setData({ userInfo })
    } else {
      wx.redirectTo({ url: '/pages/login/login' })
    }
  },

  // 加载统计数据
  loadStats() {
    const db = wx.cloud.database()
    const _ = db.command
    const userOpenId = wx.getStorageSync('userInfo')._openid

    // 加载任务统计
    db.collection('TASKS')
      .where({ _openid: userOpenId })
      .get()
      .then(res => {
        const tasks = res.data
        const total = tasks.length
        const completed = tasks.filter(t => t.status === 'completed').length
        const ongoing = total - completed
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

        this.setData({
          taskStats: {
            total,
            completed,
            ongoing,
            completionRate
          }
        })
      })

    // 加载笔记统计
    Promise.all([
      // 笔记总数
      db.collection('NOTES').where({ _openid: userOpenId }).count(),
      // 分类数量
      db.collection('NOTE_CATEGORIES').where({ _openid: userOpenId }).count(),
      // 获取所有笔记的标签
      db.collection('NOTES').where({ _openid: userOpenId }).field({ tags: true }).get()
    ]).then(([notesCount, categoriesCount, notesWithTags]) => {
      // 统计唯一标签数量
      const uniqueTags = new Set()
      notesWithTags.data.forEach(note => {
        note.tags?.forEach(tag => uniqueTags.add(tag))
      })

      this.setData({
        noteStats: {
          total: notesCount.total,
          categories: categoriesCount.total,
          tags: uniqueTags.size
        }
      })
    })
  },

  // 显示关于我们
  showAbout() {
    wx.showModal({
      title: '关于知梭',
      content: '知梭是一款智能任务管理与笔记应用，致力于提升您的工作效率。\n\n版本：1.0.0\n开发者：Your Name\n联系方式：example@email.com',
      showCancel: false,
      confirmText: '确定'
    })
  },

  // 修改头像
  changeAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0]
        
        // 上传图片到云存储
        wx.cloud.uploadFile({
          cloudPath: `avatars/${Date.now()}.jpg`,
          filePath: tempFilePath,
          success: (uploadRes) => {
            // 更新数据库中的头像
            const db = wx.cloud.database()
            db.collection('USER').where({
              _openid: app.globalData.openid
            }).update({
              data: {
                avatarUrl: uploadRes.fileID,
                updateTime: db.serverDate()
              },
              success: () => {
                // 更新本地存储和页面显示
                const userInfo = this.data.userInfo
                userInfo.avatarUrl = uploadRes.fileID
                wx.setStorageSync('userInfo', userInfo)
                this.setData({
                  userInfo: userInfo
                })
                wx.showToast({
                  title: '头像更新成功',
                  icon: 'success'
                })
              },
              fail: () => {
                wx.showToast({
                  title: '更新失败',
                  icon: 'error'
                })
              }
            })
          },
          fail: () => {
            wx.showToast({
              title: '上传失败',
              icon: 'error'
            })
          }
        })
      }
    })
  },

  // 显示修改昵称弹窗
  changeNickname() {
    this.setData({
      showNicknameModal: true,
      newNickname: this.data.userInfo.nickName
    })
  },

  // 昵称输入处理
  onNicknameInput(e) {
    this.setData({
      newNickname: e.detail.value
    })
  },

  // 取消修改昵称
  cancelNicknameEdit() {
    this.setData({
      showNicknameModal: false,
      newNickname: ''
    })
  },

  // 保存新昵称
  saveNickname() {
    const newNickname = this.data.newNickname.trim()
    if (!newNickname) {
      wx.showToast({
        title: '昵称不能为空',
        icon: 'none'
      })
      return
    }

    const db = wx.cloud.database()
    db.collection('USER').where({
      _openid: app.globalData.openid
    }).update({
      data: {
        nickName: newNickname,
        updateTime: db.serverDate()
      },
      success: () => {
        // 更新本地存储和页面显示
        const userInfo = this.data.userInfo
        userInfo.nickName = newNickname
        wx.setStorageSync('userInfo', userInfo)
        this.setData({
          userInfo: userInfo,
          showNicknameModal: false
        })
        wx.showToast({
          title: '昵称更新成功',
          icon: 'success'
        })
      },
      fail: () => {
        wx.showToast({
          title: '更新失败',
          icon: 'error'
        })
      }
    })
  },

  // 在原有代码中添加跳转方法
  navigateToAbout() {
    wx.navigateTo({
      url: '/pages/about/about'
    })
  }
}) 