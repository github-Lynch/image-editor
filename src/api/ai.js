import axios from 'axios';

// 假设后端运行在 3000 端口
const request = axios.create({ baseURL: 'http://localhost:3000/ai' });

export const aiApi = {
  // 调用本地抠图
  async removeBackground(file) {
    const formData = new FormData();
    formData.append('image', file);
    
    // 设置 responseType 为 blob 很重要
    const res = await request.post('/rembg', formData, { responseType: 'blob' });
    return URL.createObjectURL(res.data); // 返回 blob URL
  },

  // 调用云端消除
  async inpaint(imageBlob, maskBlob) {
    const formData = new FormData();
    formData.append('image', imageBlob);
    formData.append('mask', maskBlob);

    const res = await request.post('/inpaint', formData, { responseType: 'blob' });
    return URL.createObjectURL(res.data);
  }
};