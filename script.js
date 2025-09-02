// Enhanced To-Do App JavaScript

class TaskManager {
    constructor() {
        this.tasks = this.loadTasks();
        this.currentFilter = 'all';
        this.currentCategory = 'all';
        this.currentView = 'list';
        this.currentEditingTask = null;
        this.currentInputMode = 'quick';
        this.calendarDate = new Date();
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateStats();
        this.renderTasks();
        this.updateUI();
        this.setupVoiceRecognition(); // Initialize voice recognition
    }

    // Data Management
    loadTasks() {
        try {
            const saved = JSON.parse(window.localStorage?.getItem('enhanced-tasks') || '[]');
            return saved.map(task => ({
                id: task.id || Date.now() + Math.random(),
                title: task.title || task.text || '',
                description: task.description || '',
                completed: task.completed || false,
                priority: task.priority || 'medium',
                category: task.category || 'personal',
                dueDate: task.dueDate || task.date || '',
                dueTime: task.dueTime || task.time || '',
                tags: Array.isArray(task.tags) ? task.tags : (task.tags ? task.tags.split(',').map(t => t.trim()) : []),
                createdAt: task.createdAt || Date.now(),
                completedAt: task.completedAt || null
            }));
        } catch (e) {
            console.error('Failed to load tasks from localStorage', e);
            return [];
        }
    }

    saveTasks() {
        try {
            window.localStorage?.setItem('enhanced-tasks', JSON.stringify(this.tasks));
        } catch (e) {
            console.warn('Could not save tasks to localStorage');
        }
    }

    // Task Operations
    addTask(taskData) {
        const task = {
            id: Date.now() + Math.random(),
            title: taskData.title.trim(),
            description: taskData.description?.trim() || '',
            completed: false,
            priority: taskData.priority || 'medium',
            category: taskData.category || 'personal',
            dueDate: taskData.dueDate || '',
            dueTime: taskData.dueTime || '',
            tags: taskData.tags || [],
            createdAt: Date.now(),
            completedAt: null
        };

        if (!task.title) {
            this.showToast('Task title cannot be empty.', 'error');
            return false;
        }

        this.tasks.push(task);
        this.saveTasks();
        this.updateStats();
        this.renderTasks();
        this.showToast('Task added successfully! 🎉', 'success');
        this.clearInputFields();
        return true;
    }

    updateTask(id, updates) {
        const taskIndex = this.tasks.findIndex(t => t.id === parseFloat(id));
        if (taskIndex === -1) return false;

        this.tasks[taskIndex] = { ...this.tasks[taskIndex], ...updates };
        this.saveTasks();
        this.updateStats();
        this.renderTasks();
        this.showToast('Task updated successfully!', 'success');
        this.closeModal();
        return true;
    }

    deleteTask(id) {
        const confirmed = window.confirm('Are you sure you want to delete this task?');
        if (!confirmed) return false;

        const taskIndex = this.tasks.findIndex(t => t.id === parseFloat(id));
        if (taskIndex === -1) return false;

        this.tasks.splice(taskIndex, 1);
        this.saveTasks();
        this.updateStats();
        this.renderTasks();
        this.showToast('Task deleted!', 'success');
        this.closeModal();
        return true;
    }

    toggleTaskComplete(id) {
        const task = this.tasks.find(t => t.id === parseFloat(id));
        if (!task) return false;

        task.completed = !task.completed;
        task.completedAt = task.completed ? Date.now() : null;

        this.saveTasks();
        this.updateStats();
        this.renderTasks();

        const message = task.completed ? 'Task completed! 🎉' : 'Task marked as pending';
        this.showToast(message, 'success');
        return true;
    }

    // Filtering and Sorting
    getFilteredTasks() {
        let filtered = [...this.tasks];
        const searchTerm = document.querySelector('.search-input').value.toLowerCase();
        
        // Category filter
        if (this.currentCategory !== 'all') {
            filtered = filtered.filter(task => task.category === this.currentCategory);
        }
        
        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(task =>
                task.title.toLowerCase().includes(searchTerm) ||
                task.description.toLowerCase().includes(searchTerm) ||
                (task.tags && task.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
            );
        }
        
        // Sort tasks
        const sortBy = document.querySelector('.sort-select').value;
        filtered.sort((a, b) => {
            if (a.completed && !b.completed) return 1;
            if (!a.completed && b.completed) return -1;
            
            switch (sortBy) {
                case 'priority':
                    const priorityOrder = { high: 3, medium: 2, low: 1 };
                    return priorityOrder[b.priority] - priorityOrder[a.priority];
                case 'created':
                    return b.createdAt - a.createdAt;
                case 'alphabetical':
                    return a.title.localeCompare(b.title);
                case 'date':
                default:
                    const dateA = a.dueDate ? new Date(a.dueDate) : new Date(8640000000000000);
                    const dateB = b.dueDate ? new Date(b.dueDate) : new Date(8640000000000000);
                    return dateA - dateB;
            }
        });

        return filtered;
    }

    // Helper Functions
    formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr + 'T00:00:00');
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        }
        if (date.toDateString() === tomorrow.toDateString()) {
            return 'Tomorrow';
        }

        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }

    escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return unsafe;
        return unsafe.replace(/&/g, "&amp;")
                     .replace(/</g, "&lt;")
                     .replace(/>/g, "&gt;")
                     .replace(/"/g, "&quot;")
                     .replace(/'/g, "&#039;");
    }

    // UI Rendering
    renderTasks() {
        const filteredTasks = this.getFilteredTasks();
        const tasksListView = document.getElementById('tasks-list');
        const tasksGridView = document.getElementById('tasks-grid');
        const tasksCalendarView = document.getElementById('tasks-calendar');

        tasksListView.style.display = 'none';
        tasksGridView.style.display = 'none';
        tasksCalendarView.style.display = 'none';

        if (this.currentView === 'list') {
            tasksListView.style.display = 'block';
            this.renderListView(filteredTasks);
        } else if (this.currentView === 'grid') {
            tasksGridView.style.display = 'block';
            this.renderGridView(filteredTasks);
        } else if (this.currentView === 'calendar') {
            tasksCalendarView.style.display = 'block';
            this.renderCalendarView();
        }

        const emptyState = document.getElementById('empty-state');
        if (emptyState) {
            emptyState.style.display = this.tasks.length === 0 ? 'flex' : 'none';
        }
    }

    renderListView(tasks) {
        const overdue = tasks.filter(t => this.isOverdue(t));
        const todayTasks = tasks.filter(t => this.isToday(t) && !t.completed);
        const upcoming = tasks.filter(t => this.isUpcoming(t) && !t.completed);
        const noDate = tasks.filter(t => !t.dueDate && !t.completed);
        const completed = tasks.filter(t => t.completed);

        this.renderTaskSection('overdue-tasks', overdue);
        this.renderTaskSection('today-tasks', todayTasks);
        this.renderTaskSection('upcoming-tasks', upcoming);
        this.renderTaskSection('no-date-tasks', noDate);
        this.renderTaskSection('completed-tasks', completed);
        
        this.updateSectionCount('overdue-tasks', overdue.length);
        this.updateSectionCount('today-tasks', todayTasks.length);
        this.updateSectionCount('upcoming-tasks', upcoming.length);
        this.updateSectionCount('no-date-tasks', noDate.length);
        this.updateSectionCount('completed-tasks', completed.length);

        document.getElementById('tasks-list').style.display = (overdue.length + todayTasks.length + upcoming.length + noDate.length + completed.length) > 0 ? 'block' : 'none';
    }

    renderTaskSection(sectionId, tasks) {
        const section = document.querySelector(`#${sectionId}`);
        if (!section) return;
        section.innerHTML = tasks.map(task => this.createTaskCard(task)).join('');
    }

    renderGridView(tasks) {
        const container = document.getElementById('grid-container');
        if (!container) return;
        container.innerHTML = tasks.map(task => this.createTaskCard(task, 'grid')).join('');
    }

    renderCalendarView() {
        const container = document.getElementById('calendar-container');
        const monthYearTitle = document.getElementById('calendar-month-year');
        if (!container || !monthYearTitle) return;

        container.innerHTML = '';
        const year = this.calendarDate.getFullYear();
        const month = this.calendarDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDayOfWeek = firstDay.getDay();

        monthYearTitle.textContent = this.calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayNames.forEach(day => {
            const dayNameEl = document.createElement('div');
            dayNameEl.className = 'calendar-day-name';
            dayNameEl.textContent = day;
            container.appendChild(dayNameEl);
        });

        for (let i = 0; i < startDayOfWeek; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day other-month';
            container.appendChild(emptyDay);
        }

        const tasksForMonth = this.tasks.filter(t => {
            if (!t.dueDate) return false;
            const taskDate = new Date(t.dueDate);
            return taskDate.getFullYear() === year && taskDate.getMonth() === month;
        });

        for (let day = 1; day <= lastDay.getDate(); day++) {
            const date = new Date(year, month, day);
            const dateStr = date.toISOString().split('T')[0];
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';
            dayEl.dataset.date = dateStr;
            dayEl.innerHTML = `<span class="day-number">${day}</span><div class="day-tasks"></div>`;

            if (date.toDateString() === new Date().toDateString()) {
                dayEl.classList.add('today');
            }

            const dayTasksContainer = dayEl.querySelector('.day-tasks');
            const tasksForDay = tasksForMonth.filter(t => t.dueDate === dateStr);

            tasksForDay.forEach(task => {
                const taskEl = document.createElement('div');
                taskEl.className = `day-task ${task.priority}`;
                taskEl.textContent = this.escapeHtml(task.title);
                taskEl.onclick = (e) => {
                    e.stopPropagation();
                    this.openEditTask(task.id);
                };
                dayTasksContainer.appendChild(taskEl);
            });

            container.appendChild(dayEl);
        }
    }

    createTaskCard(task, view = 'list') {
        const priorityClass = task.priority;
        const isOverdue = this.isOverdue(task);
        const overdueClass = isOverdue ? 'overdue' : '';
        const completedClass = task.completed ? 'completed' : '';
        const formattedDate = this.formatDate(task.dueDate);
        const timeDisplay = task.dueTime ? ` at ${task.dueTime}` : '';

        const tagsHtml = task.tags?.length > 0 ? `
            <div class="task-tags">
                ${task.tags.map(tag => `<span class="task-tag">${this.escapeHtml(tag)}</span>`).join('')}
            </div>
        ` : '';

        return `
            <div class="task-card ${priorityClass}-priority ${overdueClass} ${completedClass} ${view === 'grid' ? 'grid-task-card' : ''}" data-task-id="${task.id}">
                <div class="task-header">
                    <div class="task-checkbox ${task.completed ? 'checked' : ''}" data-id="${task.id}" onclick="taskManager.toggleTaskComplete('${task.id}')">
                        ${task.completed ? '<i class="fas fa-check"></i>' : ''}
                    </div>
                    <div class="task-content">
                        <div class="task-title">${this.escapeHtml(task.title)}</div>
                        ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
                        <div class="task-meta">
                            <div class="task-date">
                                <i class="fas fa-calendar"></i>
                                ${formattedDate}${timeDisplay}
                            </div>
                            <div class="task-category">
                                <i class="fas fa-folder"></i>
                                ${this.escapeHtml(task.category)}
                            </div>
                            <div class="task-priority ${task.priority}">
                                <i class="fas fa-flag"></i>
                                ${this.escapeHtml(task.priority)}
                            </div>
                        </div>
                        ${tagsHtml}
                    </div>
                    <div class="task-actions">
                        <button class="task-action-btn edit-btn" onclick="event.stopPropagation(); taskManager.openEditTask('${task.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="task-action-btn delete-btn" onclick="event.stopPropagation(); taskManager.deleteTask('${task.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Event Binding
    bindEvents() {
        document.getElementById('quick-add-btn').addEventListener('click', () => this.handleQuickAdd());
        document.getElementById('task-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleQuickAdd();
        });
        document.querySelector('.detailed-add-btn').addEventListener('click', () => this.handleDetailedAdd());
        document.getElementById('voice-btn').addEventListener('click', () => this.startVoiceRecognition());
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchInputMode(btn.dataset.mode));
        });
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => this.setFilter('status', btn.dataset.filter));
        });
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', () => this.setFilter('category', btn.dataset.category));
        });
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchView(btn.dataset.view));
        });
        document.querySelector('.search-input').addEventListener('input', () => this.renderTasks());
        document.querySelector('.sort-select').addEventListener('change', () => this.renderTasks());
        document.getElementById('close-modal').addEventListener('click', () => this.closeModal());
        document.getElementById('cancel-edit').addEventListener('click', () => this.closeModal());
        document.getElementById('save-task').addEventListener('click', () => this.handleSaveEdit());
        document.getElementById('delete-task').addEventListener('click', () => {
            if (this.currentEditingTask) {
                this.deleteTask(this.currentEditingTask.id);
            }
        });
        document.getElementById('prev-month').addEventListener('click', () => this.changeMonth(-1));
        document.getElementById('next-month').addEventListener('click', () => this.changeMonth(1));
        document.querySelectorAll('.suggestion-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                const input = document.getElementById('task-input');
                const chipText = e.target.textContent.trim();
                let existingValue = input.value.trim();
                let newValue = existingValue;
                if (chipText.includes('Today')) {
                    newValue += ' due today';
                } else if (chipText.includes('High Priority')) {
                    newValue += ' high priority';
                } else if (chipText.includes('Personal')) {
                    newValue += ' #personal';
                } else if (chipText.includes('Work')) {
                    newValue += ' #work';
                }
                input.value = newValue.trim();
            });
        });
    }

    // Event Handlers
    handleQuickAdd() {
        const input = document.getElementById('task-input');
        const text = input.value.trim();
        if (!text) return;
        const taskData = this.parseQuickTask(text);
        if (this.addTask(taskData)) {
            input.value = '';
        }
    }

    handleDetailedAdd() {
        const titleInput = document.querySelector('.detailed-mode input[type="text"]');
        const descTextarea = document.querySelector('.detailed-mode textarea');
        const dateInput = document.querySelector('.detailed-mode input[type="date"]');
        const timeInput = document.querySelector('.detailed-mode input[type="time"]');
        const prioritySelect = document.querySelector('.detailed-mode select.detail-select:nth-of-type(1)');
        const categorySelect = document.querySelector('.detailed-mode select.detail-select:nth-of-type(2)');
        const tagsInput = document.querySelector('.detailed-mode input[placeholder="Tags (comma-separated)"]');

        const taskData = {
            title: titleInput.value,
            description: descTextarea.value,
            dueDate: dateInput.value,
            dueTime: timeInput.value,
            priority: prioritySelect.value,
            category: categorySelect.value,
            tags: tagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag)
        };

        if (this.addTask(taskData)) {
            this.clearInputFields();
        }
    }

    handleSaveEdit() {
        if (!this.currentEditingTask) return;
        const modalTitle = document.getElementById('modal-title').value;
        const modalDesc = document.getElementById('modal-description').value;
        const modalDate = document.getElementById('modal-date').value;
        const modalTime = document.getElementById('modal-time').value;
        const modalPriority = document.getElementById('modal-priority').value;
        const modalCategory = document.getElementById('modal-category').value;
        const modalTags = document.getElementById('modal-tags').value.split(',').map(tag => tag.trim()).filter(tag => tag);

        this.updateTask(this.currentEditingTask.id, {
            title: modalTitle,
            description: modalDesc,
            dueDate: modalDate,
            dueTime: modalTime,
            priority: modalPriority,
            category: modalCategory,
            tags: modalTags
        });
    }

    parseQuickTask(text) {
        const today = new Date().toISOString().split('T')[0];
        let title = text;
        let priority = 'medium';
        let category = 'personal';
        let dueDate = '';
        let tags = [];

        const priorityMatch = text.match(/\b(high|medium|low) priority\b/i);
        if (priorityMatch) {
            priority = priorityMatch[1].toLowerCase();
            title = title.replace(priorityMatch[0], '').trim();
        }

        const categoryMatch = title.match(/#(\w+)/);
        if (categoryMatch) {
            category = categoryMatch[1].toLowerCase();
            title = title.replace(categoryMatch[0], '').trim();
        }
        
        const tagMatches = title.match(/#(\w+)/g) || [];
        tags = tagMatches.map(tag => tag.slice(1));
        title = title.replace(/#(\w+)/g, '').trim();

        if (title.toLowerCase().includes('today')) {
            dueDate = today;
            title = title.replace(/today/gi, '').trim();
        }
        if (title.toLowerCase().includes('tomorrow')) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            dueDate = tomorrow.toISOString().split('T')[0];
            title = title.replace(/tomorrow/gi, '').trim();
        }

        return { title, priority, category, dueDate, tags };
    }
    
    // Voice Recognition
    setupVoiceRecognition() {
        this.voiceRecognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        this.voiceRecognition.continuous = false;
        this.voiceRecognition.lang = 'en-US';
        
        const voiceStatus = document.querySelector('.voice-status');
        
        this.voiceRecognition.onstart = () => {
            voiceStatus.textContent = 'Listening...';
        };

        this.voiceRecognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const taskInput = document.getElementById('task-input');
            taskInput.value = transcript;
            voiceStatus.textContent = 'Ready to listen...';
            this.handleQuickAdd();
        };
        
        this.voiceRecognition.onerror = (event) => {
            console.error('Speech recognition error', event);
            voiceStatus.textContent = 'Error. Tap to try again.';
            this.showToast('Voice command failed. Please try again.', 'error');
        };

        this.voiceRecognition.onend = () => {
            voiceStatus.textContent = 'Ready to listen...';
        };
    }
    
    startVoiceRecognition() {
        try {
            this.voiceRecognition.start();
        } catch (e) {
            console.error('Voice recognition start failed:', e);
            document.querySelector('.voice-status').textContent = 'Voice recognition not supported or already running.';
            this.showToast('Voice recognition is not supported by your browser or already active.', 'warning');
        }
    }

    // UI Helpers
    updateStats() {
        const totalTasks = this.tasks.length;
        const completedTasks = this.tasks.filter(t => t.completed).length;
        const pendingTasks = totalTasks - completedTasks;
        const productivityScore = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        document.getElementById('total-tasks').textContent = totalTasks;
        document.getElementById('completed-tasks').textContent = completedTasks;
        document.getElementById('pending-tasks').textContent = pendingTasks;
        document.getElementById('productivity-score').textContent = `${productivityScore}%`;
    }

    updateUI() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === this.currentFilter);
        });
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === this.currentCategory);
        });
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === this.currentView);
        });
    }

    switchInputMode(mode) {
        this.currentInputMode = mode;
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        document.querySelectorAll('.input-mode').forEach(el => {
            el.classList.toggle('active', el.classList.contains(`${mode}-mode`));
        });
    }

    setFilter(type, value) {
        if (type === 'status') {
            this.currentFilter = value;
        } else if (type === 'category') {
            this.currentCategory = value;
        }
        this.updateUI();
        this.renderTasks();
    }

    switchView(view) {
        this.currentView = view;
        this.updateUI();
        this.renderTasks();
    }

    clearInputFields() {
        document.getElementById('task-input').value = '';
        const detailedInputs = document.querySelectorAll('.detailed-mode input, .detailed-mode textarea, .detailed-mode select');
        detailedInputs.forEach(input => {
            if (input.type === 'date' || input.type === 'time' || input.type === 'text' || input.tagName === 'TEXTAREA') {
                input.value = '';
            } else if (input.tagName === 'SELECT') {
                input.value = 'low'; // Set default for priority
            }
        });
        document.querySelector('.detailed-mode select.detail-select:nth-of-type(2)').value = 'personal'; // Set default for category
    }

    showToast(message, type) {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-icon">
                ${type === 'success' ? '<i class="fas fa-check-circle"></i>' : (type === 'error' ? '<i class="fas fa-exclamation-circle"></i>' : '<i class="fas fa-info-circle"></i>')}
            </div>
            <div class="toast-message">${message}</div>
            <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
        `;
        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => toast.classList.remove('show'), 3000);
        setTimeout(() => toast.remove(), 3500);
    }

    isOverdue(task) {
        const today = new Date().toISOString().split('T')[0];
        return task.dueDate && task.dueDate < today && !task.completed;
    }

    isToday(task) {
        const today = new Date().toISOString().split('T')[0];
        return task.dueDate === today;
    }

    isUpcoming(task) {
        const today = new Date().toISOString().split('T')[0];
        return task.dueDate > today;
    }

    updateSectionCount(id, count) {
        const sectionTitle = document.querySelector(`#tasks-list .tasks-section h4[id="${id}"]`);
        if (sectionTitle) {
            const countSpan = sectionTitle.querySelector('.task-count');
            if (countSpan) {
                countSpan.textContent = `(${count})`;
            }
        }
    }

    changeMonth(direction) {
        this.calendarDate.setMonth(this.calendarDate.getMonth() + direction);
        this.renderCalendarView();
    }

    openEditTask(id) {
        const task = this.tasks.find(t => t.id === parseFloat(id));
        if (!task) return;
        this.currentEditingTask = task;
        document.getElementById('modal-title').value = task.title;
        document.getElementById('modal-description').value = task.description;
        document.getElementById('modal-date').value = task.dueDate;
        document.getElementById('modal-time').value = task.dueTime;
        document.getElementById('modal-priority').value = task.priority;
        document.getElementById('modal-category').value = task.category;
        document.getElementById('modal-tags').value = task.tags.join(', ');
        document.getElementById('task-modal').classList.add('active');
    }

    closeModal() {
        document.getElementById('task-modal').classList.remove('active');
        this.currentEditingTask = null;
    }
}

// Initializing the app
document.addEventListener('DOMContentLoaded', () => {
    window.taskManager = new TaskManager();
});