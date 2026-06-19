// pages/login/login.js
// 微信小程序原生登录页面
const app = getApp()

Page({
  data: {
    loading: true,
    logging: false,
    isLoggedIn: false,
    userInfo: null,
    isNewUser: false,
    openid: '',
    selectedRole: '',
    registerName: '',
    registerPhone: '',
    roles: [
      { key: 'worker', name: '阿姨', icon: '👩' },
      { key: 'agent', name: '经纪人', icon: '💼' },
      { key: 'recruiter', name: '招生代理', icon: '📋' },
      { key: 'instructor', name: '培训讲师', icon: '🎓' },
      { key: 'customer', name: '客户', icon: '🏠' },
      { key: 'training_supervisor', name: '培训主管', icon: '✅' },
      { key: 'worker_operator', name: '阿姨运营', icon: '👥' }
    ]
  },

  onLoad() {
    this.checkLoginStatus()
  },

  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo')
    const token = wx.getStorageSync('token')
    
    if (userInfo && token) {
      this.setData({ isLoggedIn: true, userInfo: userInfo, loading: false })
    } else {
      // 自动获取code登录
      this.autoLogin()
    }
  },

  autoLogin() {
    wx.login({
      success: (res) => {
        if (res.code) {
          this.loginWithCode(res.code)
        } else {
          this.setData({ loading: false })
        }
      },
      fail: () => {
        this.setData({ loading: false })
      }
    })
  },

  loginWithCode(code) {
    this.setData({ logging: true })

    wx.request({
      url: app.globalData.h5BaseUrl + '/api/auth/wechat-login',
      method: 'POST',
      data: { code: code },
      success: (res) => {
        if (res.data && res.data.success && res.data.user) {
          // 登录成功
          app.globalData.isLoggedIn = true
          app.globalData.userInfo = res.data.user
          wx.setStorageSync('userInfo', res.data.user)
          wx.setStorageSync('token', res.data.token)
          
          this.setData({
            isLoggedIn: true,
            userInfo: res.data.user,
            logging: false,
            loading: false
          })
        } else if (res.data && res.data.isNewUser) {
          // 新用户
          this.setData({
            isNewUser: true,
            openid: res.data.openid,
            loading: false,
            logging: false
          })
        } else {
          this.setData({ loading: false, logging: false })
          wx.showToast({ title: res.data?.error || '登录失败', icon: 'none' })
        }
      },
      fail: () => {
        this.setData({ loading: false, logging: false })
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  // 选择角色注册
  onSelectRole(e) {
    this.setData({ selectedRole: e.currentTarget.dataset.role })
  },

  onInputName(e) {
    this.setData({ registerName: e.detail.value })
  },

  onInputPhone(e) {
    this.setData({ registerPhone: e.detail.value })
  },

  // 注册
  onRegister() {
    if (!this.data.selectedRole) {
      wx.showToast({ title: '请选择角色', icon: 'none' })
      return
    }

    this.setData({ logging: true })

    wx.request({
      url: app.globalData.h5BaseUrl + '/api/auth/wechat-register',
      method: 'POST',
      data: {
        openid: this.data.openid,
        role: this.data.selectedRole,
        name: this.data.registerName || undefined,
        phone: this.data.registerPhone || undefined
      },
      success: (res) => {
        if (res.data && res.data.success && res.data.user) {
          app.globalData.isLoggedIn = true
          app.globalData.userInfo = res.data.user
          wx.setStorageSync('userInfo', res.data.user)
          wx.setStorageSync('token', res.data.token)
          
          this.setData({
            isLoggedIn: true,
            userInfo: res.data.user,
            isNewUser: false,
            logging: false
          })
        } else {
          this.setData({ logging: false })
          wx.showToast({ title: res.data?.error || '注册失败', icon: 'none' })
        }
      },
      fail: () => {
        this.setData({ logging: false })
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  // 进入工作台
  onEnterWorkspace() {
    const userInfo = this.data.userInfo
    if (userInfo && userInfo.role) {
      const url = app.getH5Url('/m/' + userInfo.role)
      wx.navigateTo({
        url: '/pages/webview/webview?url=' + encodeURIComponent(url) + '&title=工作台'
      })
    }
  },

  // 退出登录
  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出当前账号吗？',
      success: (res) => {
        if (res.confirm) {
          app.globalData.isLoggedIn = false
          app.globalData.userInfo = null
          wx.removeStorageSync('userInfo')
          wx.removeStorageSync('token')
          this.setData({ isLoggedIn: false, userInfo: null, isNewUser: false })
        }
      }
    })
  }
})
