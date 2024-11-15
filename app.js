App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloud-6gxc7xuw95f55ba4',
        traceUser: true
      })
    }

    // 检查并处理提醒
    this.checkReminders();
    // 定期检查提醒（每分钟检查一次）
    setInterval(() => {
      this.checkReminders();
    }, 60000);
  },

  globalData: {
    userInfo: null,
    openid: null,
    isAuthenticated: false,
    activeReminders: new Map() // 存储活动的定时器
  },

  checkReminders() {
    const reminders = wx.getStorageSync('taskReminders') || [];
    const now = new Date().getTime();
    const updatedReminders = [];
    
    // 清除所有现有的定时器
    this.clearAllReminders();

    reminders.forEach(reminder => {
      if (reminder.reminderTimestamp > now) {
        updatedReminders.push(reminder);
        
        const timeUntilReminder = reminder.reminderTimestamp - now;
        
        // 对于24小时内的提醒，设置多个提醒点
        if (timeUntilReminder <= 24 * 60 * 60 * 1000) {
          this.setMultipleReminders(reminder, timeUntilReminder);
        }
      }
    });

    wx.setStorageSync('taskReminders', updatedReminders);
  },

  setMultipleReminders(reminder, timeUntilReminder) {
    // 设置主要提醒
    const mainReminder = setTimeout(() => {
      this.showReminderNotification(reminder);
    }, timeUntilReminder);

    // 提前1小时提醒
    if (timeUntilReminder > 60 * 60 * 1000) {
      const hourReminder = setTimeout(() => {
        this.showReminderNotification(reminder, '任务将在1小时后到期');
      }, timeUntilReminder - 60 * 60 * 1000);
      this.globalData.activeReminders.set(`${reminder.taskId}_hour`, hourReminder);
    }

    // 提前10分钟提醒
    if (timeUntilReminder > 10 * 60 * 1000) {
      const tenMinReminder = setTimeout(() => {
        this.showReminderNotification(reminder, '任务将在10分钟后到期');
      }, timeUntilReminder - 10 * 60 * 1000);
      this.globalData.activeReminders.set(`${reminder.taskId}_tenMin`, tenMinReminder);
    }

    this.globalData.activeReminders.set(reminder.taskId, mainReminder);
  },

  showReminderNotification(reminder, customMessage) {
    const message = customMessage || `任务"${reminder.title}"即将到期，截止时间：${reminder.dueDate} ${reminder.reminderTime}`;
    
    wx.showModal({
      title: '任务提醒',
      content: message,
      showCancel: true,
      cancelText: '稍后提醒',
      confirmText: '查看详情',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({
            url: `/pages/tasks/detail/detail?id=${reminder.taskId}`
          });
        } else if (res.cancel) {
          // 稍后提醒（5分钟后）
          const laterReminder = setTimeout(() => {
            this.showReminderNotification(reminder, '延迟提醒：' + message);
          }, 5 * 60 * 1000);
          this.globalData.activeReminders.set(`${reminder.taskId}_later`, laterReminder);
        }
      }
    });

    // 同时显示轻提示
    wx.showToast({
      title: '您有一个任务即将到期',
      icon: 'none',
      duration: 3000
    });

    // 震动提醒
    wx.vibrateShort();
  },

  clearAllReminders() {
    for (let timer of this.globalData.activeReminders.values()) {
      clearTimeout(timer);
    }
    this.globalData.activeReminders.clear();
  },

  onShow() {
    // 每次小程序显示时检查提醒
    this.checkReminders();
  },

  onHide() {
    // 小程序隐藏时记录当前时间
    wx.setStorageSync('lastHideTime', new Date().getTime());
  }
}); 