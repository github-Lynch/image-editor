<template>
  <div class="tool-group">
    <div class="tool-item" @click="handleRembg">
      <div class="left">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          style="margin-right: 8px"
        >
          <circle cx="6" cy="6" r="3" />
          <path d="M8.12 8.12 12 12" />
          <path d="M20 4 8.12 15.88" />
          <circle cx="6" cy="18" r="3" />
          <path d="M14.8 14.8 20 20" />
        </svg>
        <span>一键抠图</span>
      </div>

      <div class="right-icon">
        <svg
          v-if="loading"
          class="loading-icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject } from "vue";
import { fabric } from "fabric";
import { removeBg, switchRemoveBgModel } from "@/api/removeBgFetch";
import { toast } from "@/utils/toast";
import { useEditorState } from "@/composables/useEditorState";

const canvasAPI = inject("canvasAPI");
const loading = ref(false);
const { setLoading } = useEditorState();

// --- Logic from provided example ---
const availableModels = [
  "briaai/RMBG-1.4",
  "briaai/RMBG-2.0",
  "u2net",
  "u2netp",
  "u2net_human_seg",
  "u2net_cloth_seg",
  "silueta",
  "isnet-general-use",
  "birefnet-general",
  "birefnet-general-lite",
  "birefnet-portrait",
  "birefnet-dis",
  "birefnet-hrsod",
  "birefnet-cod",
  "birefnet-massive",
];
const selectedModel = ref("birefnet-general");
const showModelSelector = false; // Keep hidden as per example, can be enabled later
// -------------------------------------

/**
 * Exports a fabric.Image object to a Blob, preserving filters.
 * This is a robust way to get a file-like object for API uploads.
 * @param {fabric.Image} imageObject The fabric image to export.
 * @returns {Promise<Blob>}
 */
const exportImageBlob = async (imageObject) => {
  if (!imageObject || imageObject.type !== "image") {
    throw new Error("A valid image object must be selected.");
  }
  const src = imageObject.getSrc();

  return new Promise((resolve, reject) => {
    fabric.Image.fromURL(
      src,
      (img, isError) => {
        if (isError || !img) {
          return reject(
            new Error(
              `Failed to load image from src: ${src.substring(0, 100)}...`
            )
          );
        }

        const tempCanvas = new fabric.StaticCanvas(null, {
          width: img.width,
          height: img.height,
        });

        if (imageObject.filters && imageObject.filters.length > 0) {
          img.filters = imageObject.filters.map((f) => f); // Clone filters
          img.applyFilters();
        }

        tempCanvas.add(img);
        tempCanvas.renderAll();

        tempCanvas.getElement().toBlob((blob) => {
          tempCanvas.dispose();
          if (!blob) {
            return reject(new Error("Failed to convert canvas to blob."));
          }
          resolve(blob);
        }, "image/png");
      },
      { crossOrigin: "anonymous" }
    );
  });
};

const handleRembg = async () => {
  if (loading.value) return;

  let activeObj = canvasAPI?.canvas.value?.getActiveObject();

  // 1. If no image is selected, find and select the main image automatically.
  if (!activeObj || activeObj.type !== "image") {
    const mainImage = canvasAPI?.canvas.value
      ?.getObjects()
      .find((o) => o.id === "main-image");
    if (mainImage) {
      canvasAPI.canvas.value.setActiveObject(mainImage);
      activeObj = mainImage;
    } else {
      return toast.warning("请先选中一张图片，或确保画布中有主图");
    }
  }

  loading.value = true;
  setLoading(true, "正在抠图...");
  try {
    // 2. Export active image to Blob, then create a File object for the API.
    const imageBlob = await exportImageBlob(activeObj);
    const imageFile = new File([imageBlob], "image-for-rembg.png", {
      type: "image/png",
    });

    // 2. (Optional) Switch model if the selector is enabled in the future.
    if (showModelSelector) {
      await switchRemoveBgModel(selectedModel.value);
    }

    // 3. Call the new background removal API.
    const { url: newUrl } = await removeBg(imageFile);

    // 4. Replace the image on the canvas with the result.
    canvasAPI.replaceActiveImage(newUrl);
    toast.success("抠图完成");
  } catch (e) {
    console.error("RemoveBG Error:", e);
    toast.error(`抠图失败: ${e.message || "未知错误"}`);
  } finally {
    loading.value = false;
    setLoading(false);
  }
};
</script>

<style scoped>
.loading-icon {
  animation: rotating 1s linear infinite;
  color: var(--ie-primary-color);
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.tool-item:hover .arrow {
  transform: translateX(2px);
  transition: transform 0.2s;
}
</style>
