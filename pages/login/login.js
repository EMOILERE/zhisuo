// pages/login/login.js
const app = getApp()

Page({
  data: {
    userInfo: {},
    hasUserInfo: false,
    loginStatusText: '未登录',
    isLoading: false,
    retryCount: 0,
    maxRetries: 3,
    logoSrc: '/images/logo_zhisuo.png',
    wechatIconSrc: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIj48cGF0aCBmaWxsPSIjZmZmIiBkPSJNMjcuNzcgMjAuMzhjLS4yNyAwLS41NC4yLS41NC40NXMuMjQuNDUuNTQuNDVjLjI3IDAgLjU0LS4yLjU0LS40NXMtLjI0LS40NS0uNTQtLjQ1ek0yMC40NiAxMy45NWMuMzMgMCAuNi0uMjcuNi0uNnMtLjI3LS42LS42LS42Yy0uMzMgMC0uNi4yNy0uNi42cy4yNy42LjYuNnptLTcuMDIgMGMuMzMgMCAuNi0uMjcuNi0uNnMtLjI3LS42LS42LS42Yy0uMzMgMC0uNi4yNy0uNi42cy4yNy42LjYuNnptMTEuOTMgNi40M2MuMjcgMCAuNTQtLjIuNTQtLjQ1cy0uMjQtLjQ1LS41NC0uNDVjLS4yNyAwLS41NC4yLS41NC40NXMuMjQuNDUuNTQuNDV6Ii8+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTI5LjkyIDIwLjM4YzAtMy4zNC0zLjMzLTYuMDUtNy40NC02LjA1cy03LjQ0IDIuNzEtNy40NCA2LjA1IDMuMzMgNi4wNSA3LjQ0IDYuMDUgNy40NC0yLjcxIDcuNDQtNi4wNXpNMjAuNDYgOS4xNWM0LjU2IDAgOC4yNiAzLjEyIDguMjYgNi45NnMtMy43IDYuOTYtOC4yNiA2Ljk2LTguMjYtMy4xMi04LjI2LTYuOTYgMy43LTYuOTYgOC4yNi02Ljk2eiIvPjwvc3ZnPg==',
    showPrivacyModal: false,
    showLoadingDots: false
  },

  onLoad() {
    this.checkLoginStatus();
    this.startLoadingAnimation();
  },

  onUnload() {
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
    }
  },

  // 开始加载动画
  startLoadingAnimation() {
    this.setData({ showLoadingDots: true });
    this.loadingInterval = setInterval(() => {
      this.setData({ showLoadingDots: !this.data.showLoadingDots });
    }, 500);
  },

  // 检查登录状态
  async checkLoginStatus() {
    try {
      const userInfo = wx.getStorageSync('userInfo');
      if (userInfo && userInfo._openid) {
        await this.verifyUserInfo(userInfo);
      }
    } catch (error) {
      console.error('检查登录状态失败：', error);
      this.handleError('登录状态检查失败');
    }
  },

  // 验证用户信息
  async verifyUserInfo(userInfo) {
    try {
      const db = wx.cloud.database();
      const result = await db.collection('USER')
        .where({
          _openid: userInfo._openid
        })
        .get();

      if (result.data.length > 0) {
        this.setData({
          userInfo,
          hasUserInfo: true,
          loginStatusText: '已登录'
        });
        app.globalData.userInfo = userInfo;
      } else {
        wx.removeStorageSync('userInfo');
      }
    } catch (error) {
      console.error('验证用户信息失败：', error);
      throw error;
    }
  },

  // 获取用户信息
  async getUserProfile() {
    if (this.data.isLoading) return;
    if (this.data.retryCount >= this.data.maxRetries) {
      this.showErrorModal('登录失败次数过多，请稍后再试');
      return;
    }

    this.setData({ isLoading: true });

    try {
      const userProfile = await this.getUserProfilePromise();
      await this.saveUserInfo(userProfile.userInfo);
    } catch (error) {
      console.error('登录失败：', error);
      this.setData({
        retryCount: this.data.retryCount + 1
      });
      this.handleLoginError(error);
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 获取用户信息Promise
  getUserProfilePromise() {
    return new Promise((resolve, reject) => {
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: resolve,
        fail: reject
      });
    });
  },

  // 保存用户信息
  async saveUserInfo(userInfo) {
    const db = wx.cloud.database();
    
    try {
      // 使用默认头像
      const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0';
      
      // 检查用户是否已存在
      const existUser = await db.collection('USER')
        .where({
          _openid: app.globalData.openid
        })
        .get();

      if (existUser.data.length > 0) {
        // 更新用户信息
        await db.collection('USER')
          .doc(existUser.data[0]._id)
          .update({
            data: {
              nickName: userInfo.nickName,
              avatarUrl: defaultAvatarUrl,
              updateTime: db.serverDate()
            }
          });
      } else {
        // 创建新用户
        await db.collection('USER').add({
          data: {
            nickName: userInfo.nickName,
            avatarUrl: defaultAvatarUrl,
            createTime: db.serverDate(),
            updateTime: db.serverDate()
          }
        });
      }

      // 更新本地存储
      const localUserInfo = {
        ...userInfo,
        avatarUrl: defaultAvatarUrl,
        _openid: app.globalData.openid
      };
      wx.setStorageSync('userInfo', localUserInfo);
      
      this.setLoginSuccess(localUserInfo);
    } catch (error) {
      console.error('保存用户信息失败：', error);
      throw error;
    }
  },

  // 设置登录成功状态
  setLoginSuccess(userInfo) {
    this.setData({
      userInfo,
      hasUserInfo: true,
      loginStatusText: '登录成功',
      retryCount: 0
    });
    
    app.globalData.userInfo = userInfo;
    
    wx.showToast({
      title: '登录成功',
      icon: 'success'
    });

    setTimeout(() => {
      wx.switchTab({
        url: '/pages/tasks/tasks',
        fail: (err) => {
          this.handleError('跳转失败：' + err.errMsg);
        }
      });
    }, 2000);
  },

  // 错误处理
  handleError(message, showToast = true) {
    console.error(message);
    if (showToast) {
      wx.showToast({
        title: message,
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 显示错误弹窗
  showErrorModal(content) {
    wx.showModal({
      title: '提示',
      content,
      showCancel: false
    });
  },

  // 显示隐私政策
  showPrivacyPolicy() {
    this.setData({
      showPrivacyModal: true
    });
  },

  // 关闭隐私政策
  closePrivacyPolicy() {
    this.setData({
      showPrivacyModal: false
    });
  },

  // 重置重试次数
  resetRetryCount() {
    this.setData({ retryCount: 0 });
  }
})