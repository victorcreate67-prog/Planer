// --- State Management ---
const getTodayStr = () => new Date().toISOString().split('T')[0];
const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
};
const getMonthYearStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let monthlyGoals = JSON.parse(localStorage.getItem('monthlyGoals')) || [];
let stats = JSON.parse(localStorage.getItem('stats')) || {
    history: [65, 45, 80, 55, 90, 70, 0],
    distractions: [
        { name: 'Instagram', time: '45м' },
        { name: 'Genshin Impact', time: '1ч 20м' },
        { name: 'TikTok', time: '30м' }
    ]
};
let settings = JSON.parse(localStorage.getItem('settings')) || {
    dailyPlanEnabled: true,
    dailyPlanTime: "08:00",
    theme: 'default'
};

let currentViewDate = getTodayStr();
let currentViewType = 'today'; // 'today', 'tomorrow', 'monthly'

// --- DOM Elements ---
const taskList = document.getElementById('task-list');
const taskInput = document.getElementById('task-input');
const taskTime = document.getElementById('task-time');
const addTaskBtn = document.getElementById('add-task-btn');
const taskModal = document.getElementById('task-modal');
const saveTaskBtn = document.getElementById('save-task');
const cancelTaskBtn = document.getElementById('cancel-task');

const monthlyGoalModal = document.getElementById('monthly-goal-modal');
const goalInput = document.getElementById('goal-input');
const goalTarget = document.getElementById('goal-target');
const goalUnit = document.getElementById('goal-unit');
const saveGoalBtn = document.getElementById('save-monthly-goal');
const cancelGoalBtn = document.getElementById('cancel-monthly-goal');

const showReportBtn = document.getElementById('show-report-btn');
const backToTasksBtn = document.getElementById('back-to-tasks');
const showSettingsBtn = document.getElementById('show-settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings');

const tasksView = document.getElementById('tasks-view');
const reportView = document.getElementById('report-view');
const currentDateEl = document.getElementById('current-date');
const taskSummaryEl = document.getElementById('task-summary');

const dayTabs = document.querySelectorAll('.day-tab');
const settingDailyPlanBox = document.getElementById('setting-daily-plan');
const settingDailyTimeInput = document.getElementById('setting-daily-time');

// --- Initialization ---
function init() {
    migrateTasks();
    applySettings();
    applyTheme(settings.theme);
    checkDailyPlan();
    renderMain();
    updateDateDisplay();
    setupEventListeners();
    updateWeeklyStats();
    updateNotificationUI();
    
    // Reminder Check Interval
    setInterval(checkReminders, 30000);
}

function migrateTasks() {
    let changed = false;
    tasks = tasks.map(t => {
        if (!t.date) {
            t.date = getTodayStr();
            changed = true;
        }
        return t;
    });
    if (changed) saveData();
}

function applySettings() {
    settingDailyPlanBox.checked = settings.dailyPlanEnabled;
    settingDailyTimeInput.value = settings.dailyPlanTime;
}

function applyTheme(themeName) {
    document.body.className = themeName === 'default' ? '' : `theme-${themeName}`;
    document.querySelectorAll('.theme-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.theme === themeName);
    });
}

function checkDailyPlan() {
    if (!settings.dailyPlanEnabled) return;
    const today = getTodayStr();
    const hasDailyTask = tasks.find(t => t.text === "Составить план на день" && t.date === today);
    if (!hasDailyTask) {
        tasks.unshift({ text: "Составить план на день", completed: false, reminderTime: settings.dailyPlanTime, notified: false, date: today, isAuto: true });
        saveData();
    }
}

function updateDateDisplay() {
    if (currentViewType === 'monthly') {
        const options = { month: 'long', year: 'numeric' };
        currentDateEl.innerText = new Date().toLocaleDateString('ru-RU', options);
        return;
    }
    const dateObj = new Date(currentViewDate);
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    const dateStr = dateObj.toLocaleDateString('ru-RU', options);
    if (currentViewDate === getTodayStr()) currentDateEl.innerText = 'Сегодня';
    else if (currentViewDate === getTomorrowStr()) currentDateEl.innerText = 'Завтра';
    else currentDateEl.innerText = dateStr;
}

// --- Main Render Logic ---
function renderMain() {
    if (currentViewType === 'monthly') {
        renderMonthlyGoals();
    } else {
        renderTasks();
    }
}

function renderTasks() {
    taskList.innerHTML = '';
    const filteredTasks = tasks.filter(t => t.date === currentViewDate);
    
    filteredTasks.forEach((task) => {
        const realIndex = tasks.indexOf(task);
        const card = document.createElement('div');
        card.className = `task-card ${task.completed ? 'completed' : ''}`;
        
        let reminderHTML = '';
        if (task.reminderTime && !task.completed) {
            reminderHTML = `<div class="task-reminder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg> Напомнить в ${task.reminderTime}</div>`;
        }

        card.innerHTML = `
            <div class="checkbox" onclick="toggleTask(${realIndex})"></div>
            <div class="task-info"><div class="task-text">${task.text}</div>${reminderHTML}</div>
            <button class="icon-btn delete-btn" onclick="deleteTask(${realIndex})" style="width: 32px; height: 32px; background: none; border: none;"><svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>
        `;
        taskList.appendChild(card);
    });
    
    const completedCount = filteredTasks.filter(t => t.completed).length;
    taskSummaryEl.innerText = `${completedCount} из ${filteredTasks.length} задач выполнено`;
    
    if (currentViewDate === getTodayStr() && filteredTasks.length > 0) {
        stats.history[6] = Math.round((completedCount / filteredTasks.length) * 100);
    }
    saveData();
}

function renderMonthlyGoals() {
    taskList.innerHTML = '';
    const currentMonth = getMonthYearStr();
    const filteredGoals = monthlyGoals.filter(g => g.monthYear === currentMonth);

    filteredGoals.forEach((goal) => {
        const realIndex = monthlyGoals.indexOf(goal);
        const progress = Math.min(100, Math.round((goal.current / goal.target) * 100));
        
        const card = document.createElement('div');
        card.className = 'goal-card';
        card.innerHTML = `
            <div class="goal-header">
                <div class="goal-title">${goal.text}</div>
                <div class="goal-progress-text"><span>${goal.current}</span> / ${goal.target} ${goal.unit}</div>
            </div>
            <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${progress}%"></div>
            </div>
            <div class="goal-controls">
                <button class="control-btn" onclick="updateGoalProgress(${realIndex}, -1)">–</button>
                <button class="control-btn" onclick="updateGoalProgress(${realIndex}, 1)">+</button>
                <button class="icon-btn goal-delete" onclick="deleteGoal(${realIndex})">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg>
                </button>
            </div>
        `;
        taskList.appendChild(card);
    });

    taskSummaryEl.innerText = `${filteredGoals.length} целей на месяц`;
}

// --- Interaction Logic ---
window.toggleTask = function(index) {
    tasks[index].completed = !tasks[index].completed;
    if (tasks[index].completed && navigator.vibrate) {
        navigator.vibrate(20);
        triggerReward();
    }
    renderTasks();
};

window.deleteTask = function(index) {
    tasks.splice(index, 1);
    renderTasks();
};

window.updateGoalProgress = function(index, delta) {
    const goal = monthlyGoals[index];
    goal.current = Math.max(0, goal.current + delta);
    if (goal.current >= goal.target && delta > 0) {
        triggerReward();
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }
    saveData();
    renderMonthlyGoals();
};

window.deleteGoal = function(index) {
    monthlyGoals.splice(index, 1);
    saveData();
    renderMonthlyGoals();
};

function saveTask() {
    const text = taskInput.value.trim();
    const time = taskTime.value;
    if (text) {
        tasks.push({ text, completed: false, reminderTime: time || null, notified: false, date: currentViewDate });
        taskInput.value = ''; taskTime.value = '';
        taskModal.classList.remove('active');
        if (time && Notification.permission !== 'granted') {
            Notification.requestPermission().then(updateNotificationUI);
        }
        renderTasks();
    }
}

function saveMonthlyGoal() {
    const text = goalInput.value.trim();
    const targetValue = parseInt(goalTarget.value);
    const unit = goalUnit.value.trim() || 'ед.';
    
    if (text && targetValue > 0) {
        monthlyGoals.push({
            text,
            target: targetValue,
            current: 0,
            unit,
            monthYear: getMonthYearStr()
        });
        goalInput.value = ''; goalTarget.value = ''; goalUnit.value = '';
        monthlyGoalModal.classList.remove('active');
        saveData();
        renderMonthlyGoals();
    }
}

// --- Reward Engine ---
const praiseMessages = ["Отличная работа! 🌟", "Цель становится ближе! 🎯", "Мега-мозг! 🧠", "Ты машина! 🤖", "Так держать! 🚀", "Продуктивность зашкаливает! ⚡️", "Минус еще одно дело! ✅", "Браво! 👏"];
function triggerReward() {
    if (typeof confetti === 'function') {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#8b5cf6', '#06b6d4', '#ffffff'] });
    }
    const container = document.getElementById('praise-container');
    const msg = praiseMessages[Math.floor(Math.random() * praiseMessages.length)];
    const banner = document.createElement('div');
    banner.className = 'praise-message'; banner.innerText = msg;
    container.innerHTML = ''; container.appendChild(banner);
    setTimeout(() => {
        banner.classList.add('fade-out');
        setTimeout(() => { if (banner.parentNode === container) container.innerHTML = ''; }, 500);
    }, 2500);
}

// --- Reminders Engine ---
function checkReminders() {
    const now = new Date();
    const today = getTodayStr();
    
    // Calculate time 5 minutes from now for the "early" notification
    const futureDate = new Date(now.getTime() + 5 * 60000); 
    const futureTime = `${String(futureDate.getHours()).padStart(2, '0')}:${String(futureDate.getMinutes()).padStart(2, '0')}`;
    
    tasks.forEach((task) => {
        if (!task.completed && task.date === today && task.reminderTime === futureTime && !task.notified) {
            showNotification('FocusPlanner', `Через 5 минут: ${task.text}`);
            task.notified = true; 
            saveData();
        }
    });
}

async function showNotification(title, body) {
    if (Notification.permission === 'granted') {
        if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.ready;
            reg.showNotification(title, {
                body,
                icon: 'icon.png',
                vibrate: [200, 100, 200],
                badge: 'icon.png',
                tag: 'task-reminder-' + Date.now()
            });
        } else {
            new Notification(title, { body, icon: 'icon.png' });
        }
    }
}

function updateNotificationUI() {
    const statusIcon = document.getElementById('notif-status-icon');
    const statusText = document.getElementById('notif-status-text');
    const requestBtn = document.getElementById('request-notif-btn');
    
    if (!statusIcon || !statusText) return;

    const permission = Notification.permission;
    statusIcon.className = 'status-dot ' + permission;
    
    if (permission === 'granted') {
        statusText.innerText = 'Разрешено';
        requestBtn.style.display = 'none';
    } else if (permission === 'denied') {
        statusText.innerText = 'Заблокировано';
        requestBtn.style.display = 'inline-block';
        requestBtn.innerText = 'Как исправить?';
        requestBtn.onclick = () => alert('Пожалуйста, разрешите уведомления в настройках вашего браузера/телефона для этого сайта.');
    } else {
        statusText.innerText = 'Требуется разрешение';
        requestBtn.style.display = 'inline-block';
        requestBtn.innerText = 'Разрешить';
        requestBtn.onclick = () => {
            Notification.requestPermission().then(updateNotificationUI);
        };
    }
}

function sendTestNotification() {
    if (Notification.permission !== 'granted') {
        alert('Сначала разрешите уведомления!');
        return;
    }
    showNotification('FocusPlanner', 'Это тестовое уведомление. Если вы его видите, значит всё работает! 🚀');
}

// --- Stats & Reporting ---
function updateWeeklyStats() {
    const avg = Math.round(stats.history.reduce((a, b) => a + b, 0) / 7);
    const ring = document.getElementById('productivity-ring');
    if (ring) {
        ring.style.background = `conic-gradient(var(--primary) ${avg}%, rgba(255,255,255,0.1) 0%)`;
        ring.querySelector('.chart-value').innerText = `${avg}%`;
    }

    const distList = document.getElementById('distraction-list');
    if (distList) {
        distList.innerHTML = stats.distractions.map(d => `<div class="distraction-item"><span class="distraction-name">${d.name}</span><span class="distraction-time">${d.time}</span></div>`).join('');
    }

    const barChart = document.getElementById('weekly-bar-chart');
    if (barChart) {
        barChart.innerHTML = '';
        const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
        stats.history.forEach((val, i) => {
            const container = document.createElement('div');
            container.className = 'bar-container';
            container.innerHTML = `<div class="bar ${i === 6 ? 'highlight' : ''}" style="height: ${val}%"></div><span class="day-label">${days[i]}</span>`;
            barChart.appendChild(container);
        });
    }
}

// --- Event Listeners ---
function setupEventListeners() {
    addTaskBtn.onclick = () => {
        if (currentViewType === 'monthly') {
            monthlyGoalModal.classList.add('active');
        } else {
            taskModal.classList.add('active');
        }
    };
    
    cancelTaskBtn.onclick = () => taskModal.classList.remove('active');
    saveTaskBtn.onclick = saveTask;
    
    cancelGoalBtn.onclick = () => monthlyGoalModal.classList.remove('active');
    saveGoalBtn.onclick = saveMonthlyGoal;
    
    showReportBtn.onclick = () => {
        tasksView.classList.remove('active');
        reportView.classList.add('active');
        updateWeeklyStats();
    };
    backToTasksBtn.onclick = () => {
        reportView.classList.remove('active');
        tasksView.classList.add('active');
    };

    showSettingsBtn.onclick = () => settingsModal.classList.add('active');
    closeSettingsBtn.onclick = () => settingsModal.classList.remove('active');
    
    settingDailyPlanBox.onchange = (e) => {
        settings.dailyPlanEnabled = e.target.checked;
        saveData();
        if (settings.dailyPlanEnabled) checkDailyPlan();
        renderMain();
    };
    
    settingDailyTimeInput.onchange = (e) => {
        settings.dailyPlanTime = e.target.value;
        saveData();
        const today = getTodayStr();
        const autoTask = tasks.find(t => t.isAuto && t.date === today && !t.completed);
        if (autoTask) autoTask.reminderTime = settings.dailyPlanTime;
        renderMain();
    };

    dayTabs.forEach(tab => {
        tab.onclick = () => {
            dayTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentViewType = tab.dataset.day;
            if (currentViewType === 'today') currentViewDate = getTodayStr();
            else if (currentViewType === 'tomorrow') currentViewDate = getTomorrowStr();
            updateDateDisplay();
            renderMain();
        };
    });

    [taskModal, settingsModal, monthlyGoalModal].forEach(m => {
        if (m) m.onclick = (e) => { if (e.target === m) m.classList.remove('active'); };
    });

    const testNotifBtn = document.getElementById('test-notif-btn');
    if (testNotifBtn) testNotifBtn.onclick = sendTestNotification;
    
    const requestNotifBtn = document.getElementById('request-notif-btn');
    if (requestNotifBtn) {
        // requestNotifBtn click is already handled in updateNotificationUI 
        // but we'll ensure it's re-checked when settings open
        showSettingsBtn.addEventListener('click', updateNotificationUI);
    }

    document.querySelectorAll('.theme-option').forEach(opt => {
        opt.onclick = () => {
            const theme = opt.dataset.theme;
            settings.theme = theme;
            applyTheme(theme);
            saveData();
        };
    });

    const checkUpdateBtn = document.getElementById('check-update-btn');
    if (checkUpdateBtn) {
        checkUpdateBtn.onclick = () => {
            if (window.swReg) {
                checkUpdateBtn.innerText = 'Проверка...';
                window.swReg.update().then(reg => {
                    if (reg && reg.waiting) {
                        if (confirm('Доступно обновление! Перезагрузить приложение сейчас?')) {
                            window.location.reload();
                        }
                    } else {
                        alert('У вас установлена последняя версия или обновление загружается в фоне. Попробуйте перезапустить приложение через минуту.');
                        checkUpdateBtn.innerText = 'Проверить обновления';
                    }
                }).catch(() => {
                    alert('Ошибка при проверке. Проверьте интернет-соединение.');
                    checkUpdateBtn.innerText = 'Проверить обновления';
                });
            } else {
                alert('Service Worker не найден. Попробуйте обновить страницу вручную.');
            }
        };
    }
}

function saveData() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    localStorage.setItem('monthlyGoals', JSON.stringify(monthlyGoals));
    localStorage.setItem('stats', JSON.stringify(stats));
    localStorage.setItem('settings', JSON.stringify(settings));
}

init();
