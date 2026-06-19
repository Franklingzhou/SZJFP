// app.js
App({
  onLaunch() {
    // 小程序启动时自动获取微信登录code
    this.loginWechat();
  },
  
  globalData: {
    // H5首页地址 - 生产环境使用正式域名
    h5BaseUrl: 'https://cxjz.online',
    // 微信登录code
    wxLoginCode: '',
    // 用户信息
    userInfo: null,
    // 是否已登录
    isLoggedIn: false
  },

  // 微信登录获取code
  loginWechat() {
    wx.login({
      success: (res) => {
        if (res.code) {
          console.log('[app] wx.login成功, code:', res.code);
          this.globalData.wxLoginCode = res.code;
          
          // 用code尝试自动登录
          this.autoLoginWithCode(res.code);
        } else {
          console.log('[app] wx.login失败:', res.errMsg);
        }
      },
      fail: (err) => {
        console.log('[app] wx.login网络错误:', err);
      }
    });
  },

  // 用code自动登录
  autoLoginWithCode(code) {
    wx.request({
      url: this.globalData.h5BaseUrl + '/api/auth/wechat-login',
      method: 'POST',
      data: { code: code },
      success: (res) => {
        if (res.data && res.data.success && res.data.user) {
          // 自动登录成功
          console.log('[app] 自动登录成功, role:', res.data.user.role);
          this.globalData.isLoggedIn = true;
          this.globalData.userInfo = res.data.user;
          wx.setStorageSync('userInfo', res.data.user);
          wx.setStorageSync('token', res.data.token);
        } else if (res.data && res.data.isNewUser) {
          // 新用户，需要注册
          console.log('[app] 新用户，需要注册');
          this.globalData.isLoggedIn = false;
        } else {
          console.log('[app] 自动登录失败:', res.data?.error);
          this.globalData.isLoggedIn = false;
        }
      },
      fail: (err) => {
        console.log('[app] 自动登录请求失败:', err);
        this.globalData.isLoggedIn = false;
      }
    });
  },

  // 获取带微信code的H5 URL
  getH5Url(path) {
    const base = this.globalData.h5BaseUrl || '';
    const code = this.globalData.wxLoginCode || '';
    const separator = path.includes('?') ? '&' : '?';
    const url = base + path + (code ? separator + 'wxcode=' + code : '');
    return url;
  }
});
