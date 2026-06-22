// 角色配置
const roles = [
  { key: 'worker', name: '阿姨', desc: '接单、简历管理', icon: '👩' },
  { key: 'agent', name: '经纪人', desc: '发单、阿姨管理', icon: '💼' },
  { key: 'recruiter', name: '招生代理', desc: '录入、培训推荐', icon: '📋' },
  { key: 'instructor', name: '培训讲师', desc: '课程、学员管理', icon: '🎓' },
  { key: 'customer', name: '客户', desc: '下单、评价', icon: '🏠' },
  { key: 'training_supervisor', name: '培训主管', desc: '审批、招生团队', icon: '✅' },
  { key: 'worker_operator', name: '阿姨运营', desc: '简历、合单管理', icon: '👥' }
]

const app = getApp()

Page({
  data: {
    roles: roles,
    isLoggedIn: false,
    userInfo: null
  },

  onLoad() {
    // 检查是否已自动登录
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({ 
        isLoggedIn: true, 
        userInfo: userInfo 
      });
    }
  },

  onShow() {
    // 每次显示时检查登录状态
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({ 
        isLoggedIn: true, 
        userInfo: userInfo 
      });
    }
  },

  // 已登录时直接进入对应角色页面
  onEnterWorkspace() {
    const userInfo = this.data.userInfo || wx.getStorageSync('userInfo');
    if (userInfo && userInfo.role) {
      const url = app.getH5Url('/m/' + userInfo.role);
      wx.navigateTo({
        url: '/pages/webview/webview?url=' + encodeURIComponent(url) + '&title=' + (roles.find(r => r.key === userInfo.role)?.name || '工作台')
      });
    }
  },

  // 选择角色进入（带微信code）
  onSelectRole(e) {
    const role = e.currentTarget.dataset.role;
    // 使用getH5Url自动带上wxcode参数
    const url = app.getH5Url('/m/login?role=' + role);
    wx.navigateTo({
      url: '/pages/webview/webview?url=' + encodeURIComponent(url) + '&title=' + roles.find(r => r.key === role).name
    });
  },

  // 一键登录（微信自动登录）
  onWechatLogin() {
    // 重新获取code并登录
    wx.login({
      success: (res) => {
        if (res.code) {
          this.attemptLogin(res.code);
        }
      }
    });
  },

  attemptLogin(code) {
    wx.showLoading({ title: '登录中...' });
    
    wx.request({
      url: app.globalData.h5BaseUrl + '/api/auth/wechat-login',
      method: 'POST',
      data: { code: code },
      success: (res) => {
        wx.hideLoading();
        if (res.data && res.data.success && res.data.user) {
          // 登录成功
          app.globalData.isLoggedIn = true;
          app.globalData.userInfo = res.data.user;
          wx.setStorageSync('userInfo', res.data.user);
          wx.setStorageSync('token', res.data.token);
          
          this.setData({
            isLoggedIn: true,
            userInfo: res.data.user
          });

          // 直接跳转到工作台
          this.onEnterWorkspace();
        } else if (res.data && res.data.isNewUser) {
          // 新用户，跳转到注册页面
          const url = app.globalData.h5BaseUrl + '/m/login?openid=' + encodeURIComponent(res.data.openid) + '&new=true&wxcode=' + code;
          wx.navigateTo({
            url: '/pages/webview/webview?url=' + encodeURIComponent(url) + '&title=注册'
          });
        } else {
          wx.showToast({ title: res.data?.error || '登录失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
    });
  },

  // 退出登录
  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出当前账号吗？',
      success: (res) => {
        if (res.confirm) {
          app.globalData.isLoggedIn = false;
          app.globalData.userInfo = null;
          wx.removeStorageSync('userInfo');
          wx.removeStorageSync('token');
          this.setData({ isLoggedIn: false, userInfo: null });
        }
      }
    });
  },

  // 打开 AI 智能助手
  onOpenChat() {
    wx.navigateTo({
      url: '/pages/chat/chat'
    });
  },

  onOpenAdmin() {
    const url = app.globalData.h5BaseUrl + '/admin/dashboard';
    wx.navigateTo({
      url: '/pages/webview/webview?url=' + encodeURIComponent(url) + '&title=管理后台'
    });
  }
});
