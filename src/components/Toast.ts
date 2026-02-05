// Toast Notification System
// Simple, lightweight toast notifications for admin pages

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  type?: ToastType;
  duration?: number;
  position?: 'top-right' | 'top-center' | 'bottom-right' | 'bottom-center';
}

class ToastManager {
  private container: HTMLDivElement | null = null;
  private toastCount = 0;

  private ensureContainer() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 400px;
      `;
      document.body.appendChild(this.container);
    }
    return this.container;
  }

  show(message: string, options: ToastOptions = {}) {
    const {
      type = 'info',
      duration = 4000,
      position = 'top-right',
    } = options;

    const container = this.ensureContainer();
    const toast = document.createElement('div');
    const toastId = `toast-${++this.toastCount}`;
    toast.id = toastId;

    // Set position based on options
    if (position === 'top-center') {
      container.style.top = '20px';
      container.style.left = '50%';
      container.style.right = 'auto';
      container.style.transform = 'translateX(-50%)';
    } else if (position === 'bottom-right') {
      container.style.top = 'auto';
      container.style.bottom = '20px';
      container.style.right = '20px';
    } else if (position === 'bottom-center') {
      container.style.top = 'auto';
      container.style.bottom = '20px';
      container.style.left = '50%';
      container.style.right = 'auto';
      container.style.transform = 'translateX(-50%)';
    }

    // Toast colors based on type
    const colors = {
      success: { bg: '#d1fae5', border: '#34d399', text: '#065f46', icon: '✓' },
      error: { bg: '#fee2e2', border: '#f87171', text: '#991b1b', icon: '✕' },
      warning: { bg: '#fef3c7', border: '#fbbf24', text: '#92400e', icon: '⚠' },
      info: { bg: '#dbeafe', border: '#60a5fa', text: '#1e40af', icon: 'ℹ' },
    };

    const color = colors[type];

    toast.style.cssText = `
      background: ${color.bg};
      border-left: 4px solid ${color.border};
      color: ${color.text};
      padding: 16px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: flex-start;
      gap: 12px;
      min-width: 300px;
      max-width: 400px;
      font-size: 14px;
      font-weight: 500;
      animation: slideIn 0.3s ease-out;
      cursor: pointer;
      transition: opacity 0.2s, transform 0.2s;
    `;

    toast.innerHTML = `
      <span style="
        font-size: 18px;
        font-weight: 700;
        flex-shrink: 0;
      ">${color.icon}</span>
      <span style="flex: 1; line-height: 1.5;">${message}</span>
      <button style="
        background: none;
        border: none;
        color: ${color.text};
        font-size: 18px;
        cursor: pointer;
        padding: 0;
        margin-left: 8px;
        opacity: 0.6;
        flex-shrink: 0;
      " aria-label="Close">×</button>
    `;

    // Add animation styles if not already present
    if (!document.getElementById('toast-styles')) {
      const style = document.createElement('style');
      style.id = 'toast-styles';
      style.textContent = `
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }

    // Close functionality
    const closeToast = () => {
      toast.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        toast.remove();
        // Remove container if empty
        if (container.children.length === 0) {
          container.remove();
          this.container = null;
        }
      }, 300);
    };

    // Close button click
    const closeBtn = toast.querySelector('button');
    closeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      closeToast();
    });

    // Click toast to close
    toast.addEventListener('click', closeToast);

    // Auto close after duration
    if (duration > 0) {
      setTimeout(closeToast, duration);
    }

    // Hover to pause auto-close
    let timeout: number | null = null;
    if (duration > 0) {
      timeout = window.setTimeout(closeToast, duration);
      toast.addEventListener('mouseenter', () => {
        if (timeout) clearTimeout(timeout);
      });
      toast.addEventListener('mouseleave', () => {
        timeout = window.setTimeout(closeToast, 2000);
      });
    }

    container.appendChild(toast);
  }

  success(message: string, duration?: number) {
    this.show(message, { type: 'success', duration });
  }

  error(message: string, duration?: number) {
    this.show(message, { type: 'error', duration: duration || 6000 });
  }

  warning(message: string, duration?: number) {
    this.show(message, { type: 'warning', duration });
  }

  info(message: string, duration?: number) {
    this.show(message, { type: 'info', duration });
  }
}

// Export singleton instance
export const toast = new ToastManager();

// Make it globally available
if (typeof window !== 'undefined') {
  (window as any).toast = toast;
}
