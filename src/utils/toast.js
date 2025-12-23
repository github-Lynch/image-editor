export const toast = {
    show(text, type = 'info') {
        const div = document.createElement('div');
        div.className = 'ie-toast';
        div.innerText = text;
        // 简单区分颜色
        if (type === 'error') div.style.background = 'rgba(255, 77, 79, 0.9)';
        if (type === 'success') div.style.background = 'rgba(82, 196, 26, 0.9)';

        document.body.appendChild(div);
        setTimeout(() => {
            div.style.transition = 'opacity 0.3s';
            div.style.opacity = '0';
            setTimeout(() => div.remove(), 300);
        }, 2000);
    },
    success(text) { this.show(text, 'success'); },
    warning(text) { this.show(text, 'warning'); },
    error(text) { this.show(text, 'error'); },
    info(text) { this.show(text, 'info'); }
};