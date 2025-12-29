function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result) // data:image/...;base64,...
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }
  
  /**
   * 一键抠图：返回透明背景 PNG
   * @param {File} imageFile 用户上传的图片
   * @returns {Promise<{blob: Blob, url: string}>}
   */
  export async function removeBg(imageFile) {
    const baseURL = import.meta.env.VITE_BACKEND
    const image = await fileToDataURL(imageFile)
    
    const res = await fetch(`${baseURL}/api/v1/run_plugin_gen_image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "RemoveBG",
        image,
        scale: 1.0,
      }),
    })
  
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`RemoveBG failed: ${res.status} ${text}`)
    }
  
    const blob = await res.blob()
    return { 
      blob, 
      url: URL.createObjectURL(blob) 
    }
  }
  
  /**
   * 切换抠图模型（可选）
   * @param {string} modelName 模型名称，如 "briaai/RMBG-2.0"
   */
  export async function switchRemoveBgModel(modelName) {
    const baseURL = import.meta.env.VITE_BACKEND
    const res = await fetch(`${baseURL}/api/v1/switch_plugin_model`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plugin_name: "RemoveBG",
        model_name: modelName
      }),
    })
    if (!res.ok) {
      throw new Error(`Switch model failed: ${res.status} ${await res.text()}`)
    }
  }