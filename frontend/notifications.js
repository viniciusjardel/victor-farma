/**
 * Sistema de Notificações e Toast Message
 * Substitui alert() por notificações elegantes com animações
 */

class NotificationManager {
  constructor() {
    this.notifications = [];
    this.maxNotifications = 5;
    this.initContainer();
  }

  // Inicializar container de notificações
  initContainer() {
    let container = document.getElementById('notification-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notification-container';
      container.className = 'notification-container';
      document.body.appendChild(container);
    }
    this.container = container;
  }

  /**
   * Mostrar notificação
   * @param {string} message - Mensagem a exibir
   * @param {string} type - Tipo: 'success' | 'error' | 'warning' | 'info'
   * @param {number} duration - Tempo em ms para auto-dismiss (0 = never)
   * @param {function} onClose - Callback ao fechar
   */
  show(message, type = 'info', duration = 4000, onClose = null) {
    // Limitar notificações simultâneas
    if (this.notifications.length >= this.maxNotifications) {
      const oldest = this.notifications.shift();
      oldest.element?.remove();
    }

    const id = `notification-${Date.now()}-${Math.random()}`;
    const notification = {
      id,
      message,
      type,
      element: null,
      timeout: null,
      onClose
    };

    // Criar elemento
    const element = this.createNotificationElement(notification);
    notification.element = element;
    this.container.appendChild(element);
    this.notifications.push(notification);

    // Animar entrada
    requestAnimationFrame(() => {
      element.classList.add('notification-show');
    });

    // Auto-dismiss
    if (duration > 0) {
      notification.timeout = setTimeout(() => {
        this.close(id);
      }, duration);
    }

    return id;
  }

  // Criar elemento HTML da notificação
  createNotificationElement(notification) {
    const div = document.createElement('div');
    div.id = notification.id;
    div.className = `notification notification-${notification.type}`;

    // Ícones por tipo
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    const icon = icons[notification.type] || '•';

    div.innerHTML = `
      <div class="notification-content">
        <span class="notification-icon">${icon}</span>
        <span class="notification-message">${this.escapeHtml(notification.message)}</span>
      </div>
      <button class="notification-close" aria-label="Fechar notificação">×</button>
    `;

    // Event listeners
    const closeBtn = div.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
      this.close(notification.id);
    });

    // Fechar ao clicar na notificação (para error/warning)
    if (['error', 'warning'].includes(notification.type)) {
      div.style.cursor = 'pointer';
      div.addEventListener('click', (e) => {
        if (e.target !== closeBtn) {
          this.close(notification.id);
        }
      });
    }

    return div;
  }

  // Fechar notificação
  close(id) {
    const notification = this.notifications.find(n => n.id === id);
    if (!notification) return;

    // Limpar timeout
    if (notification.timeout) clearTimeout(notification.timeout);

    // Animar saída
    notification.element.classList.remove('notification-show');
    notification.element.classList.add('notification-hide');

    // Remover após animação
    setTimeout(() => {
      notification.element?.remove();
      this.notifications = this.notifications.filter(n => n.id !== id);
      
      // Callback
      if (notification.onClose) {
        notification.onClose();
      }
    }, 300);
  }

  // Helpers para diferentes tipos
  success(message, duration = 3000, onClose = null) {
    return this.show(message, 'success', duration, onClose);
  }

  error(message, duration = 5000, onClose = null) {
    return this.show(message, 'error', duration, onClose);
  }

  warning(message, duration = 4000, onClose = null) {
    return this.show(message, 'warning', duration, onClose);
  }

  info(message, duration = 3000, onClose = null) {
    return this.show(message, 'info', duration, onClose);
  }

  // Fechar tudo
  closeAll() {
    const ids = this.notifications.map(n => n.id);
    ids.forEach(id => this.close(id));
  }

  // Limpar HTML (XSS prevention)
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}

// Instância global
const notify = new NotificationManager();

// Fazer disponível globalmente
window.notify = notify;
