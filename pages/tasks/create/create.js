const app = getApp()

Page({
  data: {
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    reminderTime: '',
    today: new Date().toISOString().split('T')[0],
    isSubmitting: false
  },

  setPriority(e) {
    this.setData({
      priority: e.currentTarget.dataset.priority
    })
  },

  setDueDate(e) {
    this.setData({
      dueDate: e.detail.value
    })
  },

  setReminderTime(e) {
    this.setData({
      reminderTime: e.detail.value
    })
  },

  formatDateTime(dateStr, timeStr) {
    if (!dateStr || !timeStr) return null;
    const formattedDate = dateStr.replace(/-/g, '/');
    return new Date(`${formattedDate} ${timeStr}`);
  },

  submitTask(e) {
    if (this.data.isSubmitting) return;
    this.setData({ isSubmitting: true });

    const { title, description } = e.detail.value;
    const { priority, dueDate, reminderTime } = this.data;

    if (!title) {
      wx.showToast({
        title: '请输入任务标题',
        icon: 'none'
      });
      this.setData({ isSubmitting: false });
      return;
    }

    if (dueDate && reminderTime) {
      const reminderDateTime = this.formatDateTime(dueDate, reminderTime);
      const now = new Date();
      
      if (!reminderDateTime) {
        wx.showToast({
          title: '日期格式错误',
          icon: 'none'
        });
        this.setData({ isSubmitting: false });
        return;
      }

      if (reminderDateTime > now) {
        this.saveTaskWithReminder(title, description, priority, dueDate, reminderTime);
      } else {
        wx.showToast({
          title: '提醒时间不能早于当前时间',
          icon: 'none'
        });
        this.setData({ isSubmitting: false });
      }
    } else {
      this.saveTask(title, description, priority, dueDate, reminderTime);
    }
  },

  saveTaskWithReminder(title, description, priority, dueDate, reminderTime) {
    const db = wx.cloud.database();
    
    db.collection('TASKS').add({
      data: {
        title,
        description,
        priority,
        dueDate,
        reminderTime,
        status: 'ongoing',
        createTime: db.serverDate(),
        updateTime: db.serverDate(),
        needReminder: true,
        reminderStatus: 'pending',
        _createTime: new Date().getTime()
      },
      success: (res) => {
        const reminderDateTime = this.formatDateTime(dueDate, reminderTime);
        
        let reminders = wx.getStorageSync('taskReminders') || [];
        const reminder = {
          taskId: res._id,
          title,
          dueDate,
          reminderTime,
          reminderTimestamp: reminderDateTime.getTime(),
          priority
        };
        reminders.push(reminder);
        wx.setStorageSync('taskReminders', reminders);

        // 立即检查并设置提醒
        getApp().checkReminders();

        wx.showToast({
          title: '创建成功，已设置提醒',
          icon: 'success'
        });
        setTimeout(() => wx.navigateBack(), 1500);
      },
      fail: (err) => {
        console.error('创建任务失败：', err);
        wx.showToast({
          title: '创建失败',
          icon: 'error'
        });
      },
      complete: () => {
        this.setData({ isSubmitting: false });
      }
    });
  },

  saveTask(title, description, priority, dueDate, reminderTime) {
    const db = wx.cloud.database();
    
    db.collection('TASKS').add({
      data: {
        title,
        description,
        priority,
        dueDate,
        reminderTime,
        status: 'ongoing',
        createTime: db.serverDate(),
        updateTime: db.serverDate(),
        needReminder: false,
        _createTime: new Date().getTime()
      },
      success: () => {
        wx.showToast({
          title: '创建成功',
          icon: 'success'
        });
        setTimeout(() => wx.navigateBack(), 1500);
      },
      fail: (err) => {
        console.error('创建任务失败：', err);
        wx.showToast({
          title: '创建失败',
          icon: 'error'
        });
      },
      complete: () => {
        this.setData({ isSubmitting: false });
      }
    });
  },

  cancel() {
    wx.navigateBack()
  }
}) 