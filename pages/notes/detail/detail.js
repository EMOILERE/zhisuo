const app = getApp()

Page({
  data: {
    note: null,
    categories: [],
    isEditing: false,
    editData: {
      categoryId: '',
      content: '',
      tags: []
    },
    newTag: '',
    contentLength: 0,
    isLoading: true
  },

  onLoad(options) {
    if (!options.id) {
      this.handleError('笔记ID不存在');
      return;
    }
    this.noteId = options.id;
    this.loadData();
  },

  async loadData() {
    try {
      await this.loadCategories();
      await this.loadNoteDetail();
    } catch (error) {
      console.error('加载数据失败：', error);
      this.handleError('加载失败，请重试');
    } finally {
      this.setData({ isLoading: false });
    }
  },

  loadCategories() {
    const db = wx.cloud.database()
    return new Promise((resolve, reject) => {
      db.collection('NOTE_CATEGORIES')
        .where({
          _openid: wx.getStorageSync('userInfo')._openid
        })
        .get({
          success: res => {
            const categories = res.data.map(category => ({
              _id: category._id,
              name: category.name || '未命名分类',
              createTime: category.createTime || new Date()
            }));
            
            categories.unshift({
              _id: 'uncategorized',
              name: '未分类',
              createTime: new Date(0)
            });

            this.setData({ categories });
            resolve(categories);
          },
          fail: err => {
            console.error('加载分类失败：', err);
            reject(err);
          }
        })
    })
  },

  loadNoteDetail() {
    const db = wx.cloud.database()
    return new Promise((resolve, reject) => {
      if (!this.noteId) {
        reject(new Error('笔记ID不存在'));
        return;
      }

      db.collection('NOTES')
        .doc(this.noteId)
        .get({
          success: res => {
            if (!res.data) {
              this.handleError('笔记不存在');
              reject(new Error('笔记不存在'));
              return;
            }

            const note = {
              ...res.data,
              createTimeFormatted: this.formatDateTime(res.data.createTime)
            };

            this.handleNoteCategory(note);

            note.tags = note.tags || [];

            this.setData({
              note,
              editData: {
                categoryId: note.categoryId || 'uncategorized',
                content: note.content || '',
                tags: [...note.tags]
              },
              contentLength: (note.content || '').length
            });

            resolve(note);
          },
          fail: err => {
            console.error('加载笔记失败：', err);
            reject(err);
          }
        })
    })
  },

  handleNoteCategory(note) {
    if (!note.categoryId || !this.data.categories.find(c => c._id === note.categoryId)) {
      note.categoryId = 'uncategorized';
      note.categoryName = '未分类';
    } else {
      const category = this.data.categories.find(c => c._id === note.categoryId);
      note.categoryName = category ? category.name : '未分类';
    }
  },

  async saveEdit() {
    const { editData, note } = this.data;
    if (!editData.content.trim()) {
      this.handleError('请输入笔记内容');
      return;
    }

    wx.showLoading({ title: '保存中...' });

    try {
      const db = wx.cloud.database();
      
      const selectedCategory = this.data.categories.find(c => c._id === editData.categoryId) || {
        _id: 'uncategorized',
        name: '未分类'
      };

      const updateData = {
        categoryId: selectedCategory._id,
        categoryName: selectedCategory.name,
        content: editData.content.trim(),
        tags: editData.tags.filter(tag => tag && tag.trim()),
        updateTime: db.serverDate()
      };

      await db.collection('NOTES').doc(note._id).update({
        data: updateData
      });

      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });

      await this.loadNoteDetail();
      this.setData({ isEditing: false });

    } catch (err) {
      console.error('保存失败：', err);
      this.handleError('保存失败，请重试');
    } finally {
      wx.hideLoading();
    }
  },

  handleError(message) {
    wx.showToast({
      title: message,
      icon: 'error',
      duration: 2000
    });
    setTimeout(() => {
      wx.navigateBack();
    }, 2000);
  },

  toggleEdit() {
    this.setData({
      isEditing: !this.data.isEditing,
      editData: {
        categoryId: this.data.note.categoryId,
        content: this.data.note.content,
        tags: [...this.data.note.tags]
      },
      contentLength: this.data.note.content.length
    })
  },

  selectCategory(e) {
    this.setData({
      'editData.categoryId': e.currentTarget.dataset.id
    })
  },

  onContentInput(e) {
    this.setData({
      'editData.content': e.detail.value,
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
    if (tag && !this.data.editData.tags.includes(tag)) {
      this.setData({
        'editData.tags': [...this.data.editData.tags, tag],
        newTag: ''
      })
    }
  },

  deleteTag(e) {
    const index = e.currentTarget.dataset.index
    const tags = [...this.data.editData.tags]
    tags.splice(index, 1)
    this.setData({
      'editData.tags': tags
    })
  },

  cancelEdit() {
    this.setData({ isEditing: false })
  },

  deleteNote() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条笔记吗？',
      success: res => {
        if (res.confirm) {
          const db = wx.cloud.database()
          db.collection('NOTES').doc(this.data.note._id).remove({
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
  },

  navigateToTask() {
    if (this.data.note.taskId) {
      wx.navigateTo({
        url: `/pages/tasks/detail/detail?id=${this.data.note.taskId}`
      })
    }
  },

  formatDateTime(date) {
    if (!date) return ''
    date = new Date(date)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }
}) 