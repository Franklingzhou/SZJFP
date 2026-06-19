// pages/webview/webview.js
Page({
  data: {
    url: '',
    title: '',
    loading: true,
    error: false,
    errorMsg: ''
  },

  onLoad(options) {
    const url = decodeURIComponent(options.url || '')
    const title = decodeURIComponent(options.title || '家政共创')
    
    if (!url) {
      this.setData({ 
        loading: false, 
        error: true, 
        errorMsg: '页面地址为空' 
      })
      return
    }
    
    this.setData({ url, title })
    wx.setNavigationBarTitle({ title })
  },

  onMessage(e) {
    const data = e.detail.data
    if (data && data.length > 0) {
      try {
        const msg = JSON.parse(data[data.length - 1])
        if (msg.action === 'login') {
          wx.setStorageSync('userInfo', msg.data)
        }
      } catch (e) {
        // 忽略非JSON消息
      }
    }
  },

  onLoadDone() {
    this.setData({ loading: false })
  },

  onLoadError() {
    this.setData({ 
      loading: false, 
      error: true, 
      errorMsg: '页面加载失败，请检查网络连接' 
    })
  },

  // 复制链接在浏览器打开
  onCopyLink() {
    wx.setClipboardData({
      data: this.data.url,
      success: () => {
        wx.showToast({ title: '链接已复制', icon: 'success' })
      }
    })
  },

  // 返回重试
  onRetry() {
    this.setData({ loading: true, error: false })
    // 强制刷新 web-view
    const url = this.data.url
    this.setData({ url: '' })
    setTimeout(() => {
      this.setData({ url })
    }, 100)
  },

  // 返回首页
  onBackHome() {
    wx.navigateBack({
      fail: () => {
        wx.reLaunch({ url: '/pages/index/index' })
      }
    })
  }
})
