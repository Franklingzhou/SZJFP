// pages/chat/chat.js
// 智能对话页面 - 使用 CloudBase AI (hunyuan-v3)
const app = getApp();

// 系统提示词 - 家政共创平台 AI 助手
const SYSTEM_PROMPT = `你是"家政共创平台"的AI智能助手，帮助用户解答家政服务相关问题。

你的能力包括：
1. 解答阿姨（家政服务人员）、经纪人、客户等各类角色的疑问
2. 提供平台功能使用指引（订单、佣金、诚信分、积分等）
3. 介绍家政服务流程和注意事项
4. 帮助用户了解平台规则

请保持友好、专业、耐心的态度，用简洁明了的语言回复。
如果遇到无法回答的问题，请引导用户联系平台客服。`;

Page({
  data: {
    // 消息列表
    messages: [],
    // 输入框内容
    inputText: '',
    // 是否正在生成回复
    generating: false,
    // 是否滚动到底部
    scrollToView: '',
    // 欢迎语是否已显示
    welcomeShown: false,
    // AI 模型状态
    aiReady: false,
    aiError: ''
  },

  onLoad() {
    this.checkAIReady();
  },

  onShow() {
    // 首次进入显示欢迎语
    if (!this.data.welcomeShown) {
      this.showWelcome();
    }
  },

  // 检查 AI 模型是否就绪
  checkAIReady() {
    try {
      if (!wx.cloud || !wx.cloud.extend || !wx.cloud.extend.AI) {
        this.setData({
          aiError: '当前基础库版本过低，不支持 AI 功能。请升级微信至最新版本。'
        });
        return;
      }

      // 使用 hunyuan-v3 组（hy3-preview 模型）
      const model = wx.cloud.extend.AI.createModel('hunyuan-v3');
      this._aiModel = model;
      this.setData({ aiReady: true });
      console.log('[chat] AI 模型就绪: hunyuan-v3');
    } catch (err) {
      console.error('[chat] AI 模型初始化失败:', err);
      this.setData({
        aiError: 'AI 模型初始化失败，请稍后重试。'
      });
    }
  },

  // 显示欢迎消息
  showWelcome() {
    const welcomeMsg = {
      role: 'assistant',
      content: '你好！我是家政共创平台的AI智能助手 🤖\n\n我可以帮你解答以下问题：\n• 平台功能使用指引\n• 家政服务流程咨询\n• 订单、佣金、积分等规则说明\n• 各类角色操作指南\n\n有什么我可以帮你的吗？',
      timestamp: Date.now()
    };
    this.setData({
      messages: [welcomeMsg],
      welcomeShown: true,
      scrollToView: 'msg-0'
    });
  },

  // 输入框内容变化
  onInputChange(e) {
    this.setData({ inputText: e.detail.value });
  },

  // 发送消息
  onSend() {
    const text = this.data.inputText.trim();
    if (!text || this.data.generating) return;

    if (!this.data.aiReady) {
      wx.showToast({ title: 'AI 模型未就绪', icon: 'none' });
      return;
    }

    // 添加用户消息
    const userMsg = {
      role: 'user',
      content: text,
      timestamp: Date.now()
    };

    const messages = [...this.data.messages, userMsg];
    const msgIndex = messages.length;

    this.setData({
      messages,
      inputText: '',
      generating: true,
      scrollToView: 'msg-' + (msgIndex - 1)
    });

    // 调用 AI 生成回复
    this.generateReply(messages, msgIndex);
  },

  // 调用 CloudBase AI 流式生成回复
  async generateReply(allMessages, msgIndex) {
    // 构建对话历史（最近 20 轮）
    const recentMessages = allMessages.slice(-20);
    const apiMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...recentMessages.map(m => ({
        role: m.role,
        content: m.content
      }))
    ];

    // 添加占位 AI 消息
    const aiMsg = {
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true
    };

    this.setData({
      messages: [...this.data.messages, aiMsg],
      scrollToView: 'msg-' + msgIndex
    });

    try {
      const model = this._aiModel;
      let fullText = '';

      const res = await model.streamText({
        data: {
          model: 'hy3-preview',
          messages: apiMessages
        },
        onText: (text) => {
          // 增量更新文本
          fullText += text;
          this.updateLastMessage(fullText, true);
        },
        onFinish: (finalText) => {
          // 流式完成
          this.updateLastMessage(finalText || fullText, false);
          this.setData({
            generating: false,
            scrollToView: 'msg-' + (msgIndex)
          });
        }
      });

      // 如果 onFinish 未被触发（兜底）
      if (fullText) {
        this.updateLastMessage(fullText, false);
      }

      this.setData({ generating: false });

    } catch (err) {
      console.error('[chat] AI 调用失败:', err);

      // 更新为错误消息
      const errorContent = '抱歉，AI 服务暂时不可用，请稍后重试。\n\n' +
        (err.errMsg || err.message || '未知错误');

      this.updateLastMessage(errorContent, false);
      this.setData({ generating: false });
    }
  },

  // 更新最后一条消息内容
  updateLastMessage(content, isStreaming) {
    const messages = this.data.messages;
    if (messages.length === 0) return;

    const lastMsg = { ...messages[messages.length - 1] };
    lastMsg.content = content;
    lastMsg.isStreaming = isStreaming;

    const updated = [...messages.slice(0, -1), lastMsg];
    this.setData({ messages: updated });
  },

  // 清空对话
  onClearChat() {
    wx.showModal({
      title: '清空对话',
      content: '确定要清空所有对话记录吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            messages: [],
            generating: false,
            welcomeShown: false
          });
          this.showWelcome();
        }
      }
    });
  },

  // 重新生成最后一条回复
  onRegenerate() {
    if (this.data.generating) return;

    const messages = this.data.messages;
    if (messages.length < 2) return;

    // 移除最后一条 AI 回复
    const trimmed = messages.slice(0, -1);
    this.setData({ messages: trimmed });

    // 重新生成
    this.generateReply(trimmed, trimmed.length);
  },

  // 滚动到底部
  onScrollToBottom() {
    const messages = this.data.messages;
    if (messages.length > 0) {
      this.setData({
        scrollToView: 'msg-' + (messages.length - 1)
      });
    }
  },

  onShareAppMessage() {
    return {
      title: '家政共创平台 - AI 智能助手',
      path: '/pages/chat/chat'
    };
  }
});
