// src/api/ai.js

// 默认地址 (作为兜底，防止调用时传空)
const DEFAULT_BASE_URL = 'http://localhost:3000/ai';

export const aiApi = {
  /**
   * 移除背景
   * @param {File} file - 图片文件
   * @param {string} [baseUrl] - 后端 API 基础地址
   * @returns {Promise<string>} - Blob URL
   */
  async removeBackground(file, baseUrl = DEFAULT_BASE_URL) {
    const formData = new FormData();
    formData.append('image', file);

    // 拼接完整的 URL，移除末尾可能多余的斜杠
    const cleanBaseUrl = baseUrl.replace(/\/+$/, '');

    try {
      const response = await fetch(`${cleanBaseUrl}/rembg`, {
        method: 'POST',
        body: formData,
        // fetch 自动处理 multipart/form-data 的 Content-Type，无需手动设置
      });

      if (!response.ok) {
        throw new Error(`请求失败: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('AI API Error:', error);
      throw error;
    }
  },

  /**
   * 图像修复 (Inpaint)
   * @param {Blob} imageBlob 
   * @param {Blob} maskBlob 
   * @param {string} [baseUrl] 
   */
  async inpaint(imageBlob, maskBlob, baseUrl = DEFAULT_BASE_URL) {
    const formData = new FormData();
    formData.append('image', imageBlob);
    formData.append('mask', maskBlob);

    const cleanBaseUrl = baseUrl.replace(/\/+$/, '');

    try {
      const response = await fetch(`${cleanBaseUrl}/inpaint`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`请求失败: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('AI API Error:', error);
      throw error;
    }
  }
};