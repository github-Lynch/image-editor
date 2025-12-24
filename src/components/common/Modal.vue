<template>
    <Teleport to="body">
        <Transition name="fade">
            <div v-if="modelValue" class="modal-mask" @click.self="$emit('cancel')">
                <div class="modal-container">
                    <button class="modal-close" title="关闭" @click="$emit('cancel')">×</button>

                    <div class="modal-header">
                        <h3>{{ title }}</h3>
                    </div>
                    <div class="modal-body">
                        <slot>{{ content }}</slot>
                    </div>
                    <div class="modal-footer">
                        <button class="ie-btn btn-secondary" @click="$emit('discard')">{{ cancelText }}</button>
                        <button class="ie-btn btn-primary" @click="$emit('confirm')">{{ confirmText }}</button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup>
defineProps({
    modelValue: Boolean,
    title: { type: String, default: '保存?' },
    content: { type: String, default: '注意: 使用拼图后会覆盖原图所有内容' },
    cancelText: { type: String, default: '取消' },
    confirmText: { type: String, default: '确认' },
});
defineEmits(['update:modelValue', 'confirm', 'discard', 'cancel']);
</script>

<style scoped>
.modal-mask {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
}

.modal-container {
    position: relative;
    background: white;
    border-radius: 12px;
    width: 320px;
    padding: 24px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.modal-header h3 {
    margin: 0 0 16px;
    font-size: 18px;
    color: #333;
}

.modal-close {
    position: absolute;
    top: 4px;
    right: 4px;
    background: none;
    border: none;
    font-size: 32px;
    color: #909399;
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    line-height: 1;
}

.modal-close:hover {
    color: #606266;
}

.modal-body {
    font-size: 14px;
    color: #666;
    margin-bottom: 24px;
    line-height: 1.5;
}

.modal-footer {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
}

.ie-btn {
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    border: none;
    font-size: 14px;
}

.btn-primary {
    background: var(--ie-primary-color);
    color: white;
}

.btn-secondary {
    background: #f4f4f5;
    color: #606266;
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>