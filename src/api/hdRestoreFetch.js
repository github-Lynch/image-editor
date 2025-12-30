function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result) // data:image/...;base64,...
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }
  
  /**
   * 高清修复/超分：RealESRGANUpscaler
   * @param {File|Blob} imageFile
   * @param {number} scale 常用 2 或 4
   * @returns {Promise<{blob: Blob, url: string}>}
   */
  export async function hdRestore(imageFile, scale = 2) {
    const baseURL = import.meta.env.VITE_BACKEND
    const apiV1 = `${baseURL}/api/v1`
  
    const image = await fileToDataURL(imageFile)
  
    const res = await fetch(`${apiV1}/run_plugin_gen_image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "RealESRGAN",
        image,
        scale, // 放大倍数
      }),
    })
  
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`HD restore failed: ${res.status} ${text}`)
    }
  
    const blob = await res.blob()
    return { blob, url: URL.createObjectURL(blob) }
  }