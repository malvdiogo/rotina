// ===================================
// Data Models & Storage
// ===================================

class TaskManager {
    constructor() {
        this.storageAvailable = this.isStorageAvailable();
        if (!this.storageAvailable) {
            console.error('LocalStorage não disponível ao inicializar');
        }
        this.tasks = this.loadTasks();
        this.settings = this.loadSettings();
        this.currentDate = new Date();
        this.selectedDate = new Date();
        this.currentView = 'agenda';
        this.calendarView = 'month';
        this.notificationInterval = null;
    }

    // LocalStorage operations
    isStorageAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            console.error('LocalStorage não disponível:', e);
            return false;
        }
    }

    loadTasks() {
        if (!this.isStorageAvailable()) {
            console.warn('LocalStorage não disponível, usando memória temporária');
            return [];
        }
        
        try {
            const stored = localStorage.getItem('tasks');
            if (stored) {
                const tasks = JSON.parse(stored);
                console.log('Tarefas carregadas:', tasks.length);
                return tasks;
            }
        } catch (e) {
            console.error('Erro ao carregar tarefas:', e);
        }
        return [];
    }

    saveTasks() {
        if (!this.isStorageAvailable()) {
            console.error('LocalStorage não disponível - dados não serão salvos!');
            this.showStorageError();
            return false;
        }
        
        try {
            localStorage.setItem('tasks', JSON.stringify(this.tasks));
            this.updateSummary();
            console.log('Tarefas salvas:', this.tasks.length);
            return true;
        } catch (e) {
            console.error('Erro ao salvar tarefas:', e);
            this.showStorageError();
            return false;
        }
    }

    loadSettings() {
        if (!this.isStorageAvailable()) {
            return {
                theme: 'light',
                notificationsEnabled: false,
                soundEnabled: true
            };
        }
        
        try {
            const stored = localStorage.getItem('settings');
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('Erro ao carregar configurações:', e);
        }
        return {
            theme: 'light',
            notificationsEnabled: false,
            soundEnabled: true
        };
    }

    saveSettings() {
        if (!this.isStorageAvailable()) {
            console.error('LocalStorage não disponível - configurações não serão salvas!');
            return false;
        }
        
        try {
            localStorage.setItem('settings', JSON.stringify(this.settings));
            console.log('Configurações salvas');
            return true;
        } catch (e) {
            console.error('Erro ao salvar configurações:', e);
            return false;
        }
    }

    showStorageError() {
        const existingError = document.querySelector('.storage-error');
        if (existingError) return;
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'storage-error';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #EF4444;
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            font-size: 14px;
            max-width: 400px;
            text-align: center;
        `;
        errorDiv.innerHTML = `
            <strong>⚠️ Erro de Armazenamento</strong><br>
            O LocalStorage não está disponível. Verifique se você está em modo privado ou se as configurações do navegador bloqueiam cookies.
        `;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => errorDiv.remove(), 10000);
    }

    showSuccessNotification(message) {
        const existingNotification = document.querySelector('.success-notification');
        if (existingNotification) existingNotification.remove();
        
        const notificationDiv = document.createElement('div');
        notificationDiv.className = 'success-notification';
        notificationDiv.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #10B981;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
            animation: slideIn 0.3s ease-out;
        `;
        notificationDiv.innerHTML = `
            <span>✓</span>
            <span>${message}</span>
        `;
        document.body.appendChild(notificationDiv);
        
        setTimeout(() => {
            notificationDiv.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notificationDiv.remove(), 300);
        }, 2000);
    }

    // Task CRUD operations
    addTask(task) {
        const newTask = {
            id: Date.now().toString(),
            title: task.title,
            description: task.description || '',
            date: task.date,
            time: task.time,
            repeat: task.repeat,
            customDays: task.customDays || [],
            category: task.category || '',
            color: task.color || '#3B82F6',
            completed: false,
            completedAt: null,
            notified: false,
            lastReminder: null,
            createdAt: new Date().toISOString()
        };
        this.tasks.push(newTask);
        if (this.saveTasks()) {
            this.showSuccessNotification('Tarefa criada com sucesso!');
        }
        return newTask;
    }

    updateTask(id, updates) {
        const index = this.tasks.findIndex(t => t.id === id);
        if (index !== -1) {
            this.tasks[index] = { ...this.tasks[index], ...updates };
            if (this.saveTasks()) {
                this.showSuccessNotification('Tarefa atualizada com sucesso!');
            }
            return this.tasks[index];
        }
        return null;
    }

    deleteTask(id) {
        this.tasks = this.tasks.filter(t => t.id !== id);
        if (this.saveTasks()) {
            this.showSuccessNotification('Tarefa excluída com sucesso!');
        }
    }

    completeTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = true;
            task.completedAt = new Date().toISOString();
            
            // Handle recurring tasks
            if (task.repeat !== 'none') {
                const nextOccurrence = this.getNextOccurrence(task);
                if (nextOccurrence) {
                    const newTask = { ...task, id: Date.now().toString(), date: nextOccurrence.date, completed: false, completedAt: null, notified: false, lastReminder: null };
                    this.tasks.push(newTask);
                }
            }
            
            if (this.saveTasks()) {
                this.showSuccessNotification('Tarefa concluída com sucesso!');
            }
        }
    }

    uncompleteTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = false;
            task.completedAt = null;
            if (this.saveTasks()) {
                this.showSuccessNotification('Tarefa reaberta com sucesso!');
            }
        }
    }

    rescheduleTask(id, newDate, newTime) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.date = newDate;
            task.time = newTime;
            task.notified = false;
            task.lastReminder = null;
            if (this.saveTasks()) {
                this.showSuccessNotification('Tarefa reagendada com sucesso!');
            }
        }
    }

    // Get tasks for a specific date
    getTasksForDate(date) {
        const dateStr = this.formatDate(date);
        return this.tasks.filter(task => {
            if (task.completed && task.completedAt) {
                const completedDate = new Date(task.completedAt).toISOString().split('T')[0];
                return completedDate === dateStr;
            }
            return task.date === dateStr;
        });
    }

    // Get tasks for a date range
    getTasksForDateRange(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return this.tasks.filter(task => {
            const taskDate = new Date(task.date);
            return taskDate >= start && taskDate <= end;
        });
    }

    // Get task status
    getTaskStatus(task) {
        if (task.completed) return 'completed';
        
        const now = new Date();
        const taskDateTime = new Date(`${task.date}T${task.time}`);
        
        if (taskDateTime < now) return 'overdue';
        if (this.isToday(task.date)) return 'today';
        return 'pending';
    }

    // Check if date is today
    isToday(dateStr) {
        const today = new Date();
        const date = new Date(dateStr);
        return date.toDateString() === today.toDateString();
    }

    // Format date for display
    formatDate(date) {
        return new Date(date).toISOString().split('T')[0];
    }

    // Format date for display (Brazilian format)
    formatDateDisplay(date) {
        const d = new Date(date);
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    // Format time for display
    formatTime(time) {
        const [hours, minutes] = time.split(':');
        return `${hours}:${minutes}`;
    }

    // Get next occurrence for recurring tasks
    getNextOccurrence(task) {
        const taskDate = new Date(`${task.date}T${task.time}`);
        const now = new Date();
        
        if (task.repeat === 'daily') {
            const next = new Date(taskDate);
            next.setDate(next.getDate() + 1);
            if (next > now) {
                return { date: next.toISOString().split('T')[0] };
            }
        } else if (task.repeat === 'weekly') {
            const next = new Date(taskDate);
            next.setDate(next.getDate() + 7);
            if (next > now) {
                return { date: next.toISOString().split('T')[0] };
            }
        } else if (task.repeat === 'custom' && task.customDays.length > 0) {
            const next = new Date(taskDate);
            const currentDay = next.getDay();
            const daysToAdd = this.getNextCustomDay(currentDay, task.customDays);
            next.setDate(next.getDate() + daysToAdd);
            if (next > now) {
                return { date: next.toISOString().split('T')[0] };
            }
        }
        
        return null;
    }

    getNextCustomDay(currentDay, customDays) {
        const sortedDays = customDays.map(Number).sort((a, b) => a - b);
        for (const day of sortedDays) {
            if (day > currentDay) {
                return day - currentDay;
            }
        }
        // Wrap around to next week
        return 7 - currentDay + sortedDays[0];
    }

    // Summary statistics
    getSummary() {
        const today = this.formatDate(new Date());
        const now = new Date();
        
        const todayTasks = this.tasks.filter(t => t.date === today && !t.completed);
        const pendingTasks = this.tasks.filter(t => !t.completed && new Date(`${t.date}T${t.time}`) > now);
        const overdueTasks = this.tasks.filter(t => {
            if (t.completed) return false;
            const taskDateTime = new Date(`${t.date}T${t.time}`);
            return taskDateTime < now;
        });
        const completedTasks = this.tasks.filter(t => t.completed);
        
        return {
            today: todayTasks.length,
            pending: pendingTasks.length,
            overdue: overdueTasks.length,
            completed: completedTasks.length
        };
    }

    // Backup and restore
    backupData() {
        const data = {
            tasks: this.tasks,
            settings: this.settings,
            backupDate: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `minha-rotina-backup-${this.formatDate(new Date())}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    restoreData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (data.tasks) {
                        this.tasks = data.tasks;
                        this.saveTasks();
                    }
                    if (data.settings) {
                        this.settings = data.settings;
                        this.saveSettings();
                    }
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
}

// ===================================
// Brazilian Holidays Calculator
// ===================================

class HolidayCalculator {
    static getEasterDate(year) {
        const a = year % 19;
        const b = Math.floor(year / 100);
        const c = year % 100;
        const d = Math.floor(b / 4);
        const e = b % 4;
        const f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3);
        const h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4);
        const k = c % 4;
        const l = (2 * e + 2 * i - h - k + 32) % 7;
        const m = Math.floor((a + 11 * h + 22 * l) / 451);
        
        const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
        const day = ((h + l - 7 * m + 114) % 31) + 1;
        
        return new Date(year, month, day);
    }

    static getHolidays(year) {
        const easter = this.getEasterDate(year);
        const holidays = [];
        
        // Fixed holidays
        holidays.push({ date: `${year}-01-01`, name: 'Ano Novo' });
        holidays.push({ date: `${year}-04-21`, name: 'Tiradentes' });
        holidays.push({ date: `${year}-05-01`, name: 'Dia do Trabalho' });
        holidays.push({ date: `${year}-09-07`, name: 'Independência do Brasil' });
        holidays.push({ date: `${year}-10-12`, name: 'Nossa Senhora Aparecida' });
        holidays.push({ date: `${year}-11-02`, name: 'Finados' });
        holidays.push({ date: `${year}-11-15`, name: 'Proclamação da República' });
        holidays.push({ date: `${year}-12-25`, name: 'Natal' });
        
        // Movable holidays (based on Easter)
        const carnival = new Date(easter);
        carnival.setDate(carnival.getDate() - 47);
        holidays.push({ date: this.formatDate(carnival), name: 'Carnaval' });
        
        const goodFriday = new Date(easter);
        goodFriday.setDate(goodFriday.getDate() - 2);
        holidays.push({ date: this.formatDate(goodFriday), name: 'Sexta-feira Santa' });
        
        const corpusChristi = new Date(easter);
        corpusChristi.setDate(corpusChristi.getDate() + 60);
        holidays.push({ date: this.formatDate(corpusChristi), name: 'Corpus Christi' });
        
        return holidays;
    }

    static formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    static getHolidayForDate(dateStr) {
        const year = new Date(dateStr).getFullYear();
        const holidays = this.getHolidays(year);
        return holidays.find(h => h.date === dateStr);
    }
}

// ===================================
// Notification System
// ===================================

class NotificationSystem {
    constructor(taskManager) {
        this.taskManager = taskManager;
        this.soundEnabled = true;
    }

    async requestPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            this.taskManager.settings.notificationsEnabled = permission === 'granted';
            this.taskManager.saveSettings();
            return permission === 'granted';
        }
        return false;
    }

    checkPermission() {
        if ('Notification' in window) {
            return Notification.permission === 'granted';
        }
        return false;
    }

    showNotification(title, body, taskId) {
        if (!this.checkPermission()) return;
        
        const notification = new Notification(title, {
            body: body,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📋</text></svg>',
            tag: taskId,
            requireInteraction: false
        });
        
        notification.onclick = () => {
            window.focus();
            notification.close();
        };
        
        if (this.soundEnabled && this.taskManager.settings.soundEnabled) {
            this.playSound();
        }
    }

    playSound() {
        // Simple beep sound using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.value = 0.1;
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (e) {
            console.log('Audio not supported');
        }
    }

    startNotificationCheck() {
        // Check every minute for task notifications
        this.taskManager.notificationInterval = setInterval(() => {
            this.checkNotifications();
        }, 60000); // 1 minute
    }

    stopNotificationCheck() {
        if (this.taskManager.notificationInterval) {
            clearInterval(this.taskManager.notificationInterval);
            this.taskManager.notificationInterval = null;
        }
    }

    checkNotifications() {
        const now = new Date();
        const currentHour = now.getHours().toString().padStart(2, '0');
        const currentMinute = now.getMinutes().toString().padStart(2, '0');
        const currentTime = `${currentHour}:${currentMinute}`;
        const currentDate = now.toISOString().split('T')[0];

        this.taskManager.tasks.forEach(task => {
            if (task.completed) return;

            const taskDateTime = new Date(`${task.date}T${task.time}`);
            
            // Check if it's time for the task
            if (task.date === currentDate && task.time === currentTime && !task.notified) {
                this.showNotification(task.title, `Hora de: ${task.title}`, task.id);
                task.notified = true;
                this.taskManager.saveTasks();
            }
            
            // Check for overdue reminders (every 30 minutes after due time)
            if (taskDateTime < now && !task.completed) {
                const minutesOverdue = Math.floor((now - taskDateTime) / (1000 * 60));
                const lastReminder = task.lastReminder ? new Date(task.lastReminder) : null;
                const timeSinceReminder = lastReminder ? Math.floor((now - lastReminder) / (1000 * 60)) : Infinity;
                
                if (minutesOverdue >= 30 && timeSinceReminder >= 30) {
                    this.showNotification(
                        `Tarefa atrasada: ${task.title}`,
                        `Esta tarefa estava prevista para ${task.time}`,
                        task.id
                    );
                    task.lastReminder = now.toISOString();
                    this.taskManager.saveTasks();
                }
            }
        });
    }
}

// ===================================
// UI Controller
// ===================================

class UIController {
    constructor(taskManager, notificationSystem) {
        this.taskManager = taskManager;
        this.notificationSystem = notificationSystem;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.applyTheme();
        this.checkStorageStatus();
        this.render();
        this.checkNotificationPermission();
        this.notificationSystem.startNotificationCheck();
    }

    checkStorageStatus() {
        if (!this.taskManager.storageAvailable) {
            this.taskManager.showStorageError();
        } else {
            console.log('LocalStorage está disponível e funcionando');
        }
    }

    setupEventListeners() {
        // Theme toggle
        document.getElementById('theme-toggle').addEventListener('click', () => this.toggleTheme());
        
        // View navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchView(e.target.dataset.view));
        });
        
        // Calendar view toggle
        document.querySelectorAll('.calendar-view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchCalendarView(e.target.dataset.calendarView));
        });
        
        // Add task button
        document.getElementById('add-task-btn').addEventListener('click', () => this.openTaskModal());
        
        // Task form
        document.getElementById('task-form').addEventListener('submit', (e) => this.handleTaskSubmit(e));
        document.getElementById('close-modal').addEventListener('click', () => this.closeTaskModal());
        document.getElementById('cancel-modal').addEventListener('click', () => this.closeTaskModal());
        
        // Reschedule form
        document.getElementById('reschedule-form').addEventListener('submit', (e) => this.handleRescheduleSubmit(e));
        document.getElementById('close-reschedule-modal').addEventListener('click', () => this.closeRescheduleModal());
        document.getElementById('cancel-reschedule').addEventListener('click', () => this.closeRescheduleModal());
        
        // Repeat selection
        document.getElementById('task-repeat').addEventListener('change', (e) => {
            const customDaysContainer = document.getElementById('custom-days-container');
            if (e.target.value === 'custom') {
                customDaysContainer.classList.remove('hidden');
            } else {
                customDaysContainer.classList.add('hidden');
            }
        });
        
        // Date navigation in agenda
        document.getElementById('prev-day').addEventListener('click', () => this.navigateDay(-1));
        document.getElementById('next-day').addEventListener('click', () => this.navigateDay(1));
        
        // Month navigation in calendar
        document.getElementById('prev-month').addEventListener('click', () => this.navigateMonth(-1));
        document.getElementById('next-month').addEventListener('click', () => this.navigateMonth(1));
        
        // Filters
        document.getElementById('category-filter').addEventListener('change', () => this.render());
        document.getElementById('status-filter').addEventListener('change', () => this.render());
        
        // Notification banner
        document.getElementById('enable-notifications').addEventListener('click', () => this.enableNotifications());
        document.getElementById('dismiss-banner').addEventListener('click', () => this.dismissNotificationBanner());
        
        // Backup and restore
        document.getElementById('backup-btn').addEventListener('click', () => this.taskManager.backupData());
        document.getElementById('restore-btn').addEventListener('click', () => this.restoreData());
        
        // Close modals on outside click
        document.getElementById('task-modal').addEventListener('click', (e) => {
            if (e.target.id === 'task-modal') this.closeTaskModal();
        });
        document.getElementById('reschedule-modal').addEventListener('click', (e) => {
            if (e.target.id === 'reschedule-modal') this.closeRescheduleModal();
        });
    }

    applyTheme() {
        const theme = this.taskManager.settings.theme;
        document.documentElement.setAttribute('data-theme', theme);
        const themeToggle = document.getElementById('theme-toggle');
        themeToggle.textContent = theme === 'light' ? '☀️' : '🌙';
    }

    toggleTheme() {
        const currentTheme = this.taskManager.settings.theme;
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.taskManager.settings.theme = newTheme;
        this.taskManager.saveSettings();
        this.applyTheme();
    }

    switchView(view) {
        this.taskManager.currentView = view;
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        document.querySelectorAll('.view').forEach(v => {
            v.classList.toggle('active', v.id === `${view}-view`);
        });
        this.render();
    }

    switchCalendarView(view) {
        this.taskManager.calendarView = view;
        document.querySelectorAll('.calendar-view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.calendarView === view);
        });
        this.renderCalendar();
    }

    navigateDay(direction) {
        this.taskManager.selectedDate.setDate(this.taskManager.selectedDate.getDate() + direction);
        this.render();
    }

    navigateMonth(direction) {
        this.taskManager.selectedDate.setMonth(this.taskManager.selectedDate.getMonth() + direction);
        this.renderCalendar();
    }

    checkNotificationPermission() {
        if ('Notification' in window) {
            if (Notification.permission === 'default' && !this.taskManager.settings.notificationsEnabled) {
                document.getElementById('notification-banner').classList.remove('hidden');
            }
        }
    }

    async enableNotifications() {
        const granted = await this.notificationSystem.requestPermission();
        if (granted) {
            this.dismissNotificationBanner();
        }
    }

    dismissNotificationBanner() {
        document.getElementById('notification-banner').classList.add('hidden');
    }

    restoreData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                this.taskManager.restoreData(file)
                    .then(() => {
                        alert('Dados restaurados com sucesso!');
                        this.render();
                    })
                    .catch(() => alert('Erro ao restaurar dados'));
            }
        };
        input.click();
    }

    openTaskModal(task = null) {
        const modal = document.getElementById('task-modal');
        const form = document.getElementById('task-form');
        const modalTitle = document.getElementById('modal-title');
        
        form.reset();
        document.getElementById('custom-days-container').classList.add('hidden');
        
        if (task) {
            modalTitle.textContent = 'Editar Tarefa';
            document.getElementById('task-id').value = task.id;
            document.getElementById('task-title').value = task.title;
            document.getElementById('task-description').value = task.description;
            document.getElementById('task-date').value = task.date;
            document.getElementById('task-time').value = task.time;
            document.getElementById('task-repeat').value = task.repeat;
            document.getElementById('task-category').value = task.category;
            
            // Set color
            const colorRadio = document.querySelector(`input[name="task-color"][value="${task.color}"]`);
            if (colorRadio) colorRadio.checked = true;
            
            // Set custom days
            if (task.repeat === 'custom') {
                document.getElementById('custom-days-container').classList.remove('hidden');
                task.customDays.forEach(day => {
                    const checkbox = document.querySelector(`#custom-days-container input[value="${day}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }
        } else {
            modalTitle.textContent = 'Nova Tarefa';
            document.getElementById('task-id').value = '';
            // Set default date to today
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('task-date').value = today;
            // Set default time to next hour
            const nextHour = new Date();
            nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
            const timeStr = nextHour.toTimeString().slice(0, 5);
            document.getElementById('task-time').value = timeStr;
        }
        
        modal.classList.remove('hidden');
    }

    closeTaskModal() {
        document.getElementById('task-modal').classList.add('hidden');
    }

    handleTaskSubmit(e) {
        e.preventDefault();
        
        const taskId = document.getElementById('task-id').value;
        const customDaysContainer = document.getElementById('custom-days-container');
        const customDays = [];
        
        if (!customDaysContainer.classList.contains('hidden')) {
            customDaysContainer.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
                customDays.push(cb.value);
            });
        }
        
        const selectedColor = document.querySelector('input[name="task-color"]:checked');
        
        const taskData = {
            title: document.getElementById('task-title').value,
            description: document.getElementById('task-description').value,
            date: document.getElementById('task-date').value,
            time: document.getElementById('task-time').value,
            repeat: document.getElementById('task-repeat').value,
            customDays: customDays,
            category: document.getElementById('task-category').value,
            color: selectedColor ? selectedColor.value : '#3B82F6'
        };
        
        if (taskId) {
            this.taskManager.updateTask(taskId, taskData);
        } else {
            this.taskManager.addTask(taskData);
        }
        
        this.closeTaskModal();
        this.render();
    }

    openRescheduleModal(taskId) {
        const task = this.taskManager.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        document.getElementById('reschedule-task-id').value = taskId;
        document.getElementById('reschedule-date').value = task.date;
        document.getElementById('reschedule-time').value = task.time;
        
        document.getElementById('reschedule-modal').classList.remove('hidden');
    }

    closeRescheduleModal() {
        document.getElementById('reschedule-modal').classList.add('hidden');
    }

    handleRescheduleSubmit(e) {
        e.preventDefault();
        
        const taskId = document.getElementById('reschedule-task-id').value;
        const newDate = document.getElementById('reschedule-date').value;
        const newTime = document.getElementById('reschedule-time').value;
        
        this.taskManager.rescheduleTask(taskId, newDate, newTime);
        this.closeRescheduleModal();
        this.render();
    }

    getFilteredTasks() {
        const categoryFilter = document.getElementById('category-filter').value;
        const statusFilter = document.getElementById('status-filter').value;
        
        let tasks = [...this.taskManager.tasks];
        
        if (categoryFilter) {
            tasks = tasks.filter(t => t.category === categoryFilter);
        }
        
        if (statusFilter) {
            tasks = tasks.filter(t => this.taskManager.getTaskStatus(t) === statusFilter);
        }
        
        return tasks;
    }

    render() {
        this.updateSummary();
        this.renderCurrentView();
    }

    updateSummary() {
        const summary = this.taskManager.getSummary();
        document.getElementById('today-count').textContent = summary.today;
        document.getElementById('pending-count').textContent = summary.pending;
        document.getElementById('overdue-count').textContent = summary.overdue;
        document.getElementById('completed-count').textContent = summary.completed;
    }

    renderCurrentView() {
        const view = this.taskManager.currentView;
        
        if (view === 'agenda') {
            this.renderAgenda();
        } else if (view === 'calendar') {
            this.renderCalendar();
        } else if (view === 'history') {
            this.renderHistory();
        }
    }

    renderAgenda() {
        const dateDisplay = document.getElementById('current-date-display');
        const taskList = document.getElementById('agenda-tasks');
        
        const selectedDate = this.taskManager.selectedDate;
        dateDisplay.textContent = this.taskManager.formatDateDisplay(selectedDate);
        
        const tasks = this.taskManager.getTasksForDate(selectedDate);
        const filteredTasks = this.getFilteredTasks().filter(t => tasks.includes(t));
        
        taskList.innerHTML = '';
        
        if (filteredTasks.length === 0) {
            taskList.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">Nenhuma tarefa para este dia</p>';
            return;
        }
        
        // Sort by time
        filteredTasks.sort((a, b) => a.time.localeCompare(b.time));
        
        filteredTasks.forEach(task => {
            const taskElement = this.createTaskElement(task);
            taskList.appendChild(taskElement);
        });
    }

    renderCalendar() {
        const container = document.getElementById('calendar-container');
        const monthDisplay = document.getElementById('calendar-month-display');
        
        if (!container || !monthDisplay) return;
        
        const selectedDate = this.taskManager.selectedDate;
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        
        // Capitalize first letter of month
        const monthName = selectedDate.toLocaleDateString('pt-BR', { month: 'long' });
        const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        monthDisplay.textContent = `${capitalizedMonth} ${year}`;
        
        if (this.taskManager.calendarView === 'month') {
            this.renderMonthlyCalendar(container, year, month);
        } else {
            this.renderWeeklyCalendar(container, selectedDate);
        }
    }

    renderMonthlyCalendar(container, year, month) {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDay = firstDay.getDay();
        const totalDays = lastDay.getDate();
        
        const holidays = HolidayCalculator.getHolidays(year);
        const tasks = this.getFilteredTasks();
        const selectedDate = this.taskManager.selectedDate;
        const today = new Date();
        
        let html = '<div class="calendar">';
        html += '<div class="calendar-weekdays">';
        const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
        weekDays.forEach(day => {
            html += `<div class="calendar-weekday">${day}</div>`;
        });
        html += '</div>';
        html += '<div class="calendar-days">';
        
        // Previous month days
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startDay - 1; i >= 0; i--) {
            html += `<div class="calendar-day other-month">${prevMonthLastDay - i}</div>`;
        }
        
        // Current month days
        for (let day = 1; day <= totalDays; day++) {
            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
            const isSelected = selectedDate.getFullYear() === year && selectedDate.getMonth() === month && selectedDate.getDate() === day;
            const holiday = holidays.find(h => h.date === dateStr);
            const dayTasks = tasks.filter(t => t.date === dateStr && !t.completed);
            
            let classes = 'calendar-day';
            if (isToday) classes += ' today';
            if (isSelected) classes += ' selected';
            if (dayTasks.length > 0) classes += ' has-task';
            if (holiday) classes += ' holiday';
            
            html += `<div class="${classes}" data-date="${dateStr}" title="${holiday ? holiday.name : ''}">${day}</div>`;
        }
        
        // Next month days
        const remainingDays = 42 - (startDay + totalDays);
        for (let i = 1; i <= remainingDays; i++) {
            html += `<div class="calendar-day other-month">${i}</div>`;
        }
        
        html += '</div></div>';
        container.innerHTML = html;
        
        // Add click handlers for days
        container.querySelectorAll('.calendar-day:not(.other-month)').forEach(dayEl => {
            dayEl.addEventListener('click', () => {
                const dateStr = dayEl.dataset.date;
                this.taskManager.selectedDate = new Date(dateStr);
                this.switchView('agenda');
            });
            
            // Holiday tooltip
            if (dayEl.classList.contains('holiday')) {
                dayEl.addEventListener('mouseenter', (e) => this.showHolidayTooltip(e, dayEl.title));
                dayEl.addEventListener('mouseleave', () => this.hideHolidayTooltip());
            }
        });
    }

    renderWeeklyCalendar(container, selectedDate) {
        const startOfWeek = new Date(selectedDate);
        startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
        
        const holidays = HolidayCalculator.getHolidays(selectedDate.getFullYear());
        const tasks = this.getFilteredTasks();
        
        let html = '<div class="weekly-calendar">';
        
        for (let i = 0; i < 7; i++) {
            const currentDate = new Date(startOfWeek);
            currentDate.setDate(startOfWeek.getDate() + i);
            
            const dateStr = currentDate.toISOString().split('T')[0];
            const isToday = this.taskManager.isToday(dateStr);
            const holiday = holidays.find(h => h.date === dateStr);
            const dayTasks = tasks.filter(t => t.date === dateStr && !t.completed).sort((a, b) => a.time.localeCompare(b.time));
            
            html += '<div class="week-day">';
            html += '<div class="week-day-header">';
            html += `<div class="week-day-name">${currentDate.toLocaleDateString('pt-BR', { weekday: 'short' })}</div>`;
            html += `<div class="week-day-date">${currentDate.getDate()}</div>`;
            if (holiday) {
                html += `<div class="week-day-holiday" style="font-size: 10px; color: var(--error);">${holiday.name}</div>`;
            }
            html += '</div>';
            html += '<div class="week-day-tasks">';
            
            dayTasks.forEach(task => {
                const status = this.taskManager.getTaskStatus(task);
                html += `<div class="week-task ${status}">${task.time} - ${task.title}</div>`;
            });
            
            html += '</div></div>';
        }
        
        html += '</div>';
        container.innerHTML = html;
    }

    showHolidayTooltip(e, text) {
        const tooltip = document.getElementById('holiday-tooltip');
        tooltip.textContent = text;
        tooltip.style.left = `${e.pageX + 10}px`;
        tooltip.style.top = `${e.pageY + 10}px`;
        tooltip.classList.remove('hidden');
    }

    hideHolidayTooltip() {
        document.getElementById('holiday-tooltip').classList.add('hidden');
    }

    renderHistory() {
        const taskList = document.getElementById('history-tasks');
        const tasks = this.getFilteredTasks();
        
        // Get tasks from last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const historyTasks = tasks.filter(t => {
            const taskDate = new Date(t.date);
            return taskDate >= sevenDaysAgo && t.completed;
        });
        
        taskList.innerHTML = '';
        
        if (historyTasks.length === 0) {
            taskList.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">Nenhuma tarefa concluída nos últimos 7 dias</p>';
            return;
        }
        
        // Sort by completion date
        historyTasks.sort((a, b) => {
            const dateA = new Date(a.completedAt);
            const dateB = new Date(b.completedAt);
            return dateB - dateA;
        });
        
        historyTasks.forEach(task => {
            const taskElement = this.createTaskElement(task);
            taskList.appendChild(taskElement);
        });
    }

    createTaskElement(task) {
        const status = this.taskManager.getTaskStatus(task);
        const div = document.createElement('div');
        div.className = `task-item ${status}`;
        div.dataset.id = task.id;
        
        div.innerHTML = `
            <div class="task-header">
                <span class="task-title">${task.title}</span>
                <span class="task-time">${task.time}</span>
            </div>
            ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
            <div class="task-meta">
                ${task.category ? `<span class="task-category" style="background-color: ${task.color}">${task.category}</span>` : ''}
                ${task.repeat !== 'none' ? `<span class="task-repeat">${this.getRepeatText(task.repeat)}</span>` : ''}
            </div>
            <div class="task-actions">
                <button class="task-action-btn complete" data-action="complete" title="Concluir">✅</button>
                <button class="task-action-btn" data-action="edit" title="Editar">✏️</button>
                <button class="task-action-btn" data-action="reschedule" title="Reagendar">🔁</button>
                <button class="task-action-btn delete" data-action="delete" title="Excluir">🗑️</button>
            </div>
        `;
        
        // Add event listeners
        div.querySelectorAll('.task-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                this.handleTaskAction(task.id, action);
            });
        });
        
        return div;
    }

    getRepeatText(repeat) {
        const texts = {
            'daily': 'Diária',
            'weekly': 'Semanal',
            'custom': 'Dias específicos'
        };
        return texts[repeat] || '';
    }

    handleTaskAction(taskId, action) {
        switch (action) {
            case 'complete':
                if (confirm('Marcar tarefa como concluída?')) {
                    this.taskManager.completeTask(taskId);
                    this.render();
                }
                break;
            case 'edit':
                const task = this.taskManager.tasks.find(t => t.id === taskId);
                if (task) this.openTaskModal(task);
                break;
            case 'reschedule':
                this.openRescheduleModal(taskId);
                break;
            case 'delete':
                if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
                    this.taskManager.deleteTask(taskId);
                    this.render();
                }
                break;
        }
    }
}

// ===================================
// Initialize App
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    const taskManager = new TaskManager();
    const notificationSystem = new NotificationSystem(taskManager);
    const uiController = new UIController(taskManager, notificationSystem);
});
