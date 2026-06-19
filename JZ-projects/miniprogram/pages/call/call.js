Page({
  onLoad(options) {
    const phone = options.phone || '';
    if (phone) {
      wx.makePhoneCall({
        phoneNumber: decodeURIComponent(phone),
        fail: () => {
          wx.showToast({ title: '拨打失败', icon: 'none' });
          setTimeout(() => wx.navigateBack(), 1500);
        },
        complete: () => {
          // 拨打结束后返回
          setTimeout(() => wx.navigateBack(), 500);
        }
      });
    } else {
      wx.showToast({ title: '无电话号码', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  }
});
