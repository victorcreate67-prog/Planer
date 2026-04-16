// --- State Management ---
const getTodayStr = () => new Date().toISOString().split('T')[0];
const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
};
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
let routineTasks = JSON.parse(localStorage.getItem('routineTasks')) || [];
let projects = JSON.parse(localStorage.getItem('projects')) || [
    { id: 'p1', name: 'Работа', icon: '💼', tasks: [] },
    { id: 'p2', name: 'Здоровье', icon: '🧘', tasks: [] }
];
let stats = JSON.parse(localStorage.getItem('stats')) || {
    history: [65, 45, 80, 55, 90, 70, 0]
};
let settings = JSON.parse(localStorage.getItem('settings')) || {
    dailyPlanEnabled: true,
    dailyPlanTime: "08:00",
    theme: 'default'
};

let currentViewDate = getTodayStr();
let currentViewType = 'today'; 
let currentActiveView = 'tasks-view';
let selectedProject = null;

// --- DOM Elements ---
const taskList = document.getElementById('task-list');
const taskInput = document.getElementById('task-input');
const taskTime = document.getElementById('task-time');
const taskReward = document.getElementById('task-reward');
const taskRewardField = document.getElementById('task-reward-field');
const addTaskBtn = document.getElementById('add-task-btn');
const taskModal = document.getElementById('task-modal');
const saveTaskBtn = document.getElementById('save-task');
const cancelTaskBtn = document.getElementById('cancel-task');

const routineList = document.getElementById('routine-list');
const routineModal = document.getElementById('routine-modal');
const routineInput = document.getElementById('routine-input');
const routineTime = document.getElementById('routine-time');
const saveRoutineBtn = document.getElementById('save-routine');
const cancelRoutineBtn = document.getElementById('cancel-routine');
const addRoutineBtn = document.getElementById('add-routine-btn');

const projectList = document.getElementById('project-list');
const projectModal = document.getElementById('project-modal');
const projectNameInput = document.getElementById('project-name');
const saveProjectBtn = document.getElementById('save-project');
const cancelProjectBtn = document.getElementById('cancel-project');
const addProjectBtn = document.getElementById('add-project-btn');

const monthlyGoalModal = document.getElementById('monthly-goal-modal');
const goalInput = document.getElementById('goal-input');
const goalTarget = document.getElementById('goal-target');
const goalUnit = document.getElementById('goal-unit');
const saveGoalBtn = document.getElementById('save-monthly-goal');
const cancelGoalBtn = document.getElementById('cancel-monthly-goal');

const showSettingsBtn = document.getElementById('show-settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings');

const currentDateEl = document.getElementById('current-date');
const taskSummaryEl = document.getElementById('task-summary');

const dayTabs = document.querySelectorAll('.day-tab');
const settingDailyPlanBox = document.getElementById('setting-daily-plan');
const settingDailyTimeInput = document.getElementById('setting-daily-time');

// Scanner Elements
const scannerModal = document.getElementById('scanner-modal');
const scannerDropZone = document.getElementById('scanner-drop-zone');
const scannerFileInput = document.getElementById('scanner-file-input');
const scannerPreview = document.getElementById('scanner-preview');
const scannerPreviewContainer = document.getElementById('scanner-preview-container');
const scannerProgressContainer = document.getElementById('scanner-progress-container');
const scannerResults = document.getElementById('scanner-results');
const scannerResultsList = document.getElementById('scanner-results-list');
const aiScanBtn = document.getElementById('ai-scan-btn');
const closeScannerBtn = document.getElementById('close-scanner');
const confirmImportBtn = document.getElementById('confirm-import');
const cancelImportBtn = document.getElementById('cancel-import');

let detectedTasks = [];

// Achievement Milestones
const MILESTONES = [
    { streak: 3, name: 'Бронза', icon: '🥉' },
    { streak: 5, name: 'Серебро', icon: '🥈' },
    { streak: 7, name: 'Золото', icon: '🥇' },
    { streak: 10, name: 'Щит', icon: '🛡️' },
    { streak: 20, name: 'Пламя', icon: '🔥' },
    { streak: 30, name: 'Алмаз', icon: '💎' },
    { streak: 40, name: 'Корона', icon: '👑' },
    { streak: 50, name: 'Ракета', icon: '🚀' },
    { streak: 100, name: 'Солнце', icon: '☀️', class: 'solar' }
];

// --- Initialization ---
function init() {
    migrateData();
    applySettings();
    applyTheme(settings.theme);
    checkAutoTasks();
    renderMain();
    updateDateDisplay();
    setupEventListeners();
    updateWeeklyStats();
    updateNotificationUI();
    
    setInterval(checkReminders, 30000);
}

function migrateData() {
    let changed = false;
    // Migrate tasks
    tasks = tasks.map(t => {
        if (!t.date) { t.date = getTodayStr(); changed = true; }
        return t;
    });
    // Migrate routine tasks for stats
    routineTasks = routineTasks.map(rt => {
        if (rt.streak === undefined) {
            rt.streak = 0;
            rt.maxStreak = 0;
            rt.totalCompletions = 0;
            rt.lastCompletedDate = null;
            rt.milestones = [];
            changed = true;
        }
        return rt;
    });
    // Cleanup old distractions if any
    if (stats.distractions) {
        delete stats.distractions;
        changed = true;
    }
    if (changed) saveData();
}

function applySettings() {
    if(settingDailyPlanBox) settingDailyPlanBox.checked = settings.dailyPlanEnabled;
    if(settingDailyTimeInput) settingDailyTimeInput.value = settings.dailyPlanTime;
}

function applyTheme(themeName) {
    document.body.className = themeName === 'default' ? '' : `theme-${themeName}`;
    document.querySelectorAll('.theme-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.theme === themeName);
    });
}

function checkAutoTasks() {
    const todayStr = getTodayStr();
    const todayDay = new Date().getDay(); // 0-6

    // 1. Daily Plan Task
    if (settings.dailyPlanEnabled) {
        const hasDailyTask = tasks.find(t => t.text === "Составить план на день" && t.date === todayStr);
        if (!hasDailyTask) {
            tasks.unshift({ 
                text: "Составить план на день", 
                completed: false, 
                reminderTime: settings.dailyPlanTime, 
                notified: false, 
                date: todayStr, 
                isAuto: true,
                priority: 'high'
            });
        }
    }

    // 2. Routine Injection
    routineTasks.forEach(rt => {
        if (rt.days.includes(todayDay)) {
            const hasTask = tasks.find(t => t.text === rt.text && t.date === todayStr);
            if (!hasTask) {
                tasks.push({ 
                    text: rt.text, 
                    completed: false, 
                    reminderTime: rt.time || null, 
                    notified: false, 
                    date: todayStr, 
                    isRoutine: true,
                    priority: rt.priority || 'none'
                });
            }
        }
    });

    saveData();
}

function updateDateDisplay() {
    if (!currentDateEl) return;
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
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(currentActiveView).classList.add('active');

    document.querySelectorAll('.nav-item').forEach(n => {
        n.classList.toggle('active', n.dataset.view === currentActiveView);
    });

    if (currentActiveView === 'tasks-view') {
        if (currentViewType === 'monthly') renderMonthlyGoals();
        else renderTasks();
    } else if (currentActiveView === 'routine-view') {
        renderRoutine();
    } else if (currentActiveView === 'projects-view') {
        renderProjects();
    } else if (currentActiveView === 'report-view') {
        updateWeeklyStats();
    }
}

function renderTasks() {
    taskList.innerHTML = '';
    
    // Sort tasks: High > Medium > Low > None. Completed tasks go to the bottom.
    const priorityWeight = { 'high': 3, 'medium': 2, 'low': 1, 'none': 0, undefined: 0 };
    
    const filteredTasks = tasks
        .map((t, index) => ({...t, originalIndex: index})) // keep track of real index
        .filter(t => t.date === currentViewDate)
        .sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            const pA = priorityWeight[a.priority] || 0;
            const pB = priorityWeight[b.priority] || 0;
            return pB - pA;
        });
    
    filteredTasks.forEach((task) => {
        const realIndex = task.originalIndex;
        const card = document.createElement('div');
        const prioClass = (task.priority && task.priority !== 'none') ? `priority-${task.priority}` : '';
        card.className = `task-card ${task.completed ? 'completed' : ''} ${prioClass}`;
        
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

function renderRoutine() {
    routineList.innerHTML = '';
    const daysArr = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    
    routineTasks.forEach((rt, index) => {
        const card = document.createElement('div');
        card.className = 'task-card';
        const activeDays = rt.days.map(d => daysArr[d]).join(', ');
        const prioClass = (rt.priority && rt.priority !== 'none') ? `priority-${rt.priority}` : '';
        card.className = `task-card ${prioClass}`;
        
        card.innerHTML = `
            <div class="task-info">
                <div class="task-text">${rt.text}</div>
                <div class="task-reminder">${activeDays} ${rt.time ? 'в ' + rt.time : ''}</div>
                <div class="routine-streak-badge">🔥 ${rt.streak} дн.</div>
                <div class="routine-total-count">Всего: ${rt.totalCompletions} раз</div>
            </div>
            <button class="icon-btn delete-btn" onclick="deleteRoutine(${index})" style="width: 32px; height: 32px; background: none; border: none;"><svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>
        `;
        routineList.appendChild(card);
    });
}

function renderProjects() {
    if (selectedProject) {
        renderProjectDetail(selectedProject);
        return;
    }
    projectList.innerHTML = '';
    projectList.className = 'project-grid';
    
    projects.forEach((p) => {
        const completed = p.tasks.filter(t => t.completed).length;
        const total = p.tasks.length;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        const card = document.createElement('div');
        card.className = 'project-card';
        card.onclick = () => { selectedProject = p; renderMain(); };
        card.innerHTML = `
            <div class="project-icon">${p.icon || '📁'}</div>
            <div class="project-name">${p.name}</div>
            <div class="project-stats">${completed}/${total} задач (${percent}%)</div>
        `;
        projectList.appendChild(card);
    });
}

function renderProjectDetail(project) {
    projectList.innerHTML = '';
    projectList.className = 'task-container';
    
    const header = document.createElement('div');
    header.className = 'project-detail-header';
    header.innerHTML = `
        <button class="icon-btn back-btn" onclick="selectedProject=null; renderMain();">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div>
            <h2>${project.icon} ${project.name}</h2>
            <p class="project-stats">${project.tasks.length} задач в сфере</p>
        </div>
        <button class="icon-btn delete-btn" onclick="deleteProject('${project.id}')" style="margin-left:auto"><svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg></button>
    `;
    projectList.appendChild(header);

    project.tasks.forEach((task, tIndex) => {
        const prioClass = (task.priority && task.priority !== 'none') ? `priority-${task.priority}` : '';
        const taskCard = document.createElement('div');
        taskCard.className = `task-card ${task.completed ? 'completed' : ''} ${prioClass}`;
        taskCard.innerHTML = `
            <div class="checkbox" onclick="toggleProjectTask('${project.id}', ${tIndex})"></div>
            <div class="task-info">
                <div class="task-text">${task.text}</div>
                ${task.reward ? `<div class="task-reward-badge" title="Ваша награда за выполнение">🎁 ${task.reward}</div>` : ''}
            </div>
            <button class="icon-btn add-sub-btn" onclick="openSubtaskModal('${project.id}', ${tIndex})" style="color:var(--accent)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg></button>
            <button class="icon-btn delete-btn" onclick="deleteProjectTask('${project.id}', ${tIndex})"><svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg></button>
        `;
        projectList.appendChild(taskCard);

        if (task.subtasks) {
            task.subtasks.forEach((sub, sIndex) => {
                const subCard = document.createElement('div');
                subCard.className = `task-card subtask-item ${sub.completed ? 'completed' : ''}`;
                subCard.innerHTML = `
                    <div class="checkbox" onclick="toggleSubtask('${project.id}', ${tIndex}, ${sIndex})"></div>
                    <div class="task-text">${sub.text}</div>
                    <button class="icon-btn delete-btn" onclick="deleteSubtask('${project.id}', ${tIndex}, ${sIndex})"><svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg></button>
                `;
                projectList.appendChild(subCard);
            });
        }
    });

    const fab = document.querySelector('#projects-view .fab');
    fab.onclick = () => { openProjectTaskModal(project.id); };
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

// --- Interactions ---
window.toggleTask = function(index) {
    const task = tasks[index];
    task.completed = !task.completed;
    
    if (task.completed) {
        triggerReward();
        if (task.isRoutine) updateRoutineStats(task.text, true);
    } else {
        if (task.isRoutine) updateRoutineStats(task.text, false);
    }
    
    renderTasks();
};

function updateRoutineStats(text, completed) {
    const rt = routineTasks.find(r => r.text === text);
    if (!rt) return;

    if (completed) {
        rt.totalCompletions++;
        const today = getTodayStr();
        
        // Calculate Streak
        if (rt.lastCompletedDate) {
            const lastDate = new Date(rt.lastCompletedDate);
            const todayDate = new Date(today);
            const diffDays = Math.round((todayDate - lastDate) / (1000 * 60 * 60 * 24));
            
            // Logic: if diffDays fits the schedule (e.g. daily = 1, Mon/Wed = 2)
            // Simpler: if last completion was the last *scheduled* day
            const prevScheduled = getPreviousScheduledDay(rt);
            if (rt.lastCompletedDate === prevScheduled || rt.lastCompletedDate === today) {
                if (rt.lastCompletedDate !== today) rt.streak++;
            } else {
                rt.streak = 1;
            }
        } else {
            rt.streak = 1;
        }
        
        rt.lastCompletedDate = today;
        if (rt.streak > rt.maxStreak) rt.maxStreak = rt.streak;
        
        checkMilestones(rt);
    } else {
        // Unchecked logic
        rt.totalCompletions = Math.max(0, rt.totalCompletions - 1);
        // For simplicity, we just reset the streak if they uncheck today's task
        // But better: revert to previous day's state if we stored it. 
        // Here we'll just decrement or reset if it was the only one today.
        if (rt.lastCompletedDate === getTodayStr()) {
            rt.streak = Math.max(0, rt.streak - 1);
            rt.lastCompletedDate = null; // Ideally this should be the PREVIOUS completion date, but we don't store history
        }
    }
    saveData();
}

function getPreviousScheduledDay(rt) {
    const d = new Date();
    for (let i = 1; i <= 7; i++) {
        d.setDate(d.getDate() - 1);
        if (rt.days.includes(d.getDay())) return d.toISOString().split('T')[0];
    }
    return null;
}

function checkMilestones(rt) {
    MILESTONES.forEach(m => {
        if (rt.streak === m.streak && !rt.milestones.includes(m.streak)) {
            rt.milestones.push(m.streak);
            showAchievementToast(m);
            triggerReward();
            // Bonus fireworks for 100 days
            if (m.streak === 100) {
                setTimeout(triggerReward, 500);
                setTimeout(triggerReward, 1000);
            }
        }
    });
}

function showAchievementToast(milestone) {
    const container = document.getElementById('praise-container');
    const banner = document.createElement('div');
    banner.className = 'praise-message';
    banner.style.background = 'linear-gradient(90deg, #fbbf24, #f59e0b)';
    banner.style.webkitTextFillColor = 'white';
    banner.innerHTML = `НОВОЕ ДОСТИЖЕНИЕ: ${milestone.icon} ${milestone.name} (${milestone.streak} дней!)`;
    container.innerHTML = ''; container.appendChild(banner);
    setTimeout(() => {
        banner.classList.add('fade-out');
        setTimeout(() => { if (banner.parentNode === container) container.innerHTML = ''; }, 500);
    }, 4000);
}

window.deleteTask = function(index) {
    tasks.splice(index, 1);
    renderTasks();
};

window.deleteRoutine = function(index) {
    routineTasks.splice(index, 1);
    saveData();
    renderRoutine();
};

window.deleteProject = function(id) {
    if (confirm('Удалить всю сферу жизни со всеми задачами?')) {
        projects = projects.filter(p => p.id !== id);
        selectedProject = null;
        saveData();
        renderMain();
    }
};

window.toggleProjectTask = function(pId, tIndex) {
    const p = projects.find(p => p.id === pId);
    const task = p.tasks[tIndex];
    task.completed = !task.completed;
    
    if (task.completed) {
        triggerReward();
        if (task.reward) showRewardCelebration(task.reward);
    }
    saveData();
    renderMain();
};

function showRewardCelebration(rewardText) {
    const container = document.getElementById('praise-container');
    const banner = document.createElement('div');
    banner.className = 'praise-message reward-popup';
    banner.innerHTML = `🏆 ВРЕМЯ НАГРАДЫ: ${rewardText}`;
    container.innerHTML = ''; container.appendChild(banner);
    setTimeout(() => {
        banner.classList.add('fade-out');
        setTimeout(() => { if (banner.parentNode === container) container.innerHTML = ''; }, 500);
    }, 5000);
}

window.deleteProjectTask = function(pId, tIndex) {
    const p = projects.find(p => p.id === pId);
    p.tasks.splice(tIndex, 1);
    saveData();
    renderMain();
};

window.toggleSubtask = function(pId, tIndex, sIndex) {
    const p = projects.find(p => p.id === pId);
    p.tasks[tIndex].subtasks[sIndex].completed = !p.tasks[tIndex].subtasks[sIndex].completed;
    if (p.tasks[tIndex].subtasks[sIndex].completed) triggerReward();
    saveData();
    renderMain();
};

window.deleteSubtask = function(pId, tIndex, sIndex) {
    const p = projects.find(p => p.id === pId);
    p.tasks[tIndex].subtasks.splice(sIndex, 1);
    saveData();
    renderMain();
};

function saveTask() {
    const text = taskInput.value.trim();
    if (!text) return;

    const priorityOpt = document.querySelector('#task-priority .priority-opt.active');
    const priority = priorityOpt ? priorityOpt.dataset.priority : 'none';

    if (taskModal.dataset.mode === 'project-task') {
        const pId = taskModal.dataset.projectId;
        const p = projects.find(p => p.id === pId);
        p.tasks.push({ 
            text, 
            completed: false, 
            subtasks: [],
            reward: taskReward.value.trim() || null,
            priority 
        });
    } else if (taskModal.dataset.mode === 'subtask') {
        const pId = taskModal.dataset.projectId;
        const tIdx = parseInt(taskModal.dataset.taskIndex);
        const p = projects.find(p => p.id === pId);
        if (!p.tasks[tIdx].subtasks) p.tasks[tIdx].subtasks = [];
        p.tasks[tIdx].subtasks.push({ text, completed: false });
    } else {
        tasks.push({ 
            text, 
            completed: false, 
            reminderTime: taskTime.value || null, 
            notified: false, 
            date: currentViewDate,
            priority 
        });
    }

    saveData();
    taskInput.value = ''; taskTime.value = '';
    taskModal.classList.remove('active');
    renderMain();
}

function openProjectTaskModal(pId) {
    resetPriority('#task-priority');
    taskModal.dataset.mode = 'project-task';
    taskModal.dataset.projectId = pId;
    document.getElementById('task-modal-title').innerText = 'Задача проекта';
    document.getElementById('task-priority-field').style.display = 'block';
    document.getElementById('task-time-field').style.display = 'none';
    taskRewardField.style.display = 'block';
    taskReward.value = '';
    taskModal.classList.add('active');
}

function openSubtaskModal(pId, tIdx) {
    resetPriority('#task-priority');
    taskModal.dataset.mode = 'subtask';
    taskModal.dataset.projectId = pId;
    taskModal.dataset.taskIndex = tIdx;
    document.getElementById('task-priority-field').style.display = 'none';
    document.getElementById('task-modal-title').innerText = 'Подзадача';
    document.getElementById('task-time-field').style.display = 'none';
    taskModal.classList.add('active');
}

function saveRoutine() {
    const text = routineInput.value.trim();
    const activeDays = Array.from(document.querySelectorAll('.day-pill.active')).map(p => parseInt(p.dataset.day));
    
    const priorityOpt = document.querySelector('#routine-priority .priority-opt.active');
    const priority = priorityOpt ? priorityOpt.dataset.priority : 'none';

    if (text && activeDays.length > 0) {
        routineTasks.push({ 
            text, 
            days: activeDays, 
            time: routineTime.value || null,
            priority,
            streak: 0,
            maxStreak: 0,
            totalCompletions: 0,
            lastCompletedDate: null,
            milestones: []
        });
        saveData();
        routineInput.value = ''; routineTime.value = '';
        document.querySelectorAll('.day-pill').forEach(p => p.classList.remove('active'));
        routineModal.classList.remove('active');
        renderRoutine();
    }
}

function saveProject() {
    const name = projectNameInput.value.trim();
    const icon = document.querySelector('.icon-opt.active').dataset.icon;
    if (name) {
        projects.push({ id: 'p' + Date.now(), name, icon, tasks: [] });
        saveData();
        projectNameInput.value = '';
        projectModal.classList.remove('active');
        renderMain();
    }
}

// --- AI Scanner Logic ---
async function startOCR(imageSource) {
    scannerDropZone.style.display = 'none';
    scannerPreviewContainer.style.display = 'block';
    scannerProgressContainer.style.display = 'block';
    scannerResults.style.display = 'none';
    scannerPreview.src = imageSource;

    const progressFill = document.getElementById('scanner-progress-fill');
    const percentEl = document.getElementById('scanner-percent');
    const statusEl = document.getElementById('scanner-status');

    try {
        const worker = await Tesseract.createWorker(['rus', 'eng'], 1, {
            logger: m => {
                if (m.status === 'recognizing text') {
                    const progress = Math.round(m.progress * 100);
                    progressFill.style.width = `${progress}%`;
                    percentEl.innerText = `${progress}%`;
                }
                statusEl.innerText = m.status === 'recognizing text' ? 'Распознавание...' : 'Загрузка движка...';
            }
        });

        const { data: { text } } = await worker.recognize(imageSource);
        await worker.terminate();

        processOCRResults(text);
    } catch (error) {
        console.error('OCR Error:', error);
        alert('Ошибка при распознавании. Попробуйте другое изображение.');
        resetScanner();
    }
}

function processOCRResults(text) {
    const lines = text.split('\n');
    detectedTasks = [];
    
    // Simple parsing logic
    lines.forEach(line => {
        let cleanText = line.trim()
            .replace(/^[-•*○●☐☑☐0-9.]+\s*/, '') 
            .trim();
        
        if (cleanText.length > 2) {
            const timeMatch = cleanText.match(/(\d{1,2}[:.]\d{2})|(\d{1,2}\s*(am|pm))/i);
            let time = null;
            if (timeMatch) {
                time = timeMatch[0].replace('.', ':');
                cleanText = cleanText.replace(timeMatch[0], '').trim();
            }
            
            detectedTasks.push({ text: cleanText, time: time, selected: true });
        }
    });

    renderScannerResults();
}

function renderScannerResults() {
    scannerProgressContainer.style.display = 'none';
    scannerResults.style.display = 'block';
    scannerResultsList.innerHTML = '';

    if (detectedTasks.length === 0) {
        scannerResultsList.innerHTML = '<p style="text-align:center; padding: 20px; color: var(--text-muted);">Задачи не обнаружены. Попробуйте еще раз.</p>';
        return;
    }

    detectedTasks.forEach((task, index) => {
        const item = document.createElement('div');
        item.className = 'detected-task-item';
        item.innerHTML = `
            <input type="checkbox" ${task.selected ? 'checked' : ''} onchange="detectedTasks[${index}].selected = this.checked">
            <input type="text" value="${task.text}" oninput="detectedTasks[${index}].text = this.value">
            <span style="font-size: 10px; color: var(--accent);">${task.time || ''}</span>
        `;
        scannerResultsList.appendChild(item);
    });
}

function resetScanner() {
    scannerDropZone.style.display = 'block';
    scannerPreviewContainer.style.display = 'none';
    scannerProgressContainer.style.display = 'none';
    scannerResults.style.display = 'none';
    scannerPreview.src = '';
    scannerFileInput.value = '';
    detectedTasks = [];
}

function handleImageFile(file) {
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => startOCR(e.target.result);
        reader.readAsDataURL(file);
    }
}

// --- Utils ---
function triggerReward() {
    if (typeof confetti === 'function') {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#fbbf24', '#8b5cf6', '#ffffff'] });
    }
}

function checkReminders() {
    const now = new Date();
    const today = getTodayStr();
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
        const reg = await navigator.serviceWorker.ready;
        reg.showNotification(title, { body, icon: 'icon.png'} );
    }
}

// --- Reporting ---
function updateWeeklyStats() {
    const avg = Math.round(stats.history.reduce((a, b) => a + b, 0) / 7);
    const ring = document.getElementById('productivity-ring');
    if (ring) {
        ring.style.background = `conic-gradient(var(--primary) ${avg}%, rgba(255,255,255,0.1) 0%)`;
        ring.querySelector('.chart-value').innerText = `${avg}%`;
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

    // Render Medals
    const medalsList = document.getElementById('medals-list');
    if (medalsList) {
        medalsList.innerHTML = '';
        // Collect all unlocked milestones from all routines
        const allUnlocked = [];
        routineTasks.forEach(rt => {
            rt.milestones.forEach(mStr => {
                const milestone = MILESTONES.find(m => m.streak === parseInt(mStr));
                if (milestone) allUnlocked.push({ ...milestone, routineName: rt.text });
            });
        });

        // Show all possible medals, highlighting unlocked ones
        MILESTONES.forEach(m => {
            const isUnlocked = allUnlocked.some(u => u.streak === m.streak);
            const medalEl = document.createElement('div');
            medalEl.className = `medal-item ${m.class || ''} ${isUnlocked ? 'unlocked' : ''}`;
            medalEl.innerHTML = `
                <div class="medal-icon">${m.icon}</div>
                <div class="medal-name">${m.streak} дн.</div>
            `;
            if (isUnlocked) {
                 const count = allUnlocked.filter(u => u.streak === m.streak).length;
                 if (count > 1) {
                     const badge = document.createElement('span');
                     badge.className = 'count-badge';
                     badge.style.position = 'absolute';
                     badge.style.top = '-5px';
                     badge.style.right = '-5px';
                     badge.style.background = 'var(--primary)';
                     badge.style.fontSize = '10px';
                     badge.style.padding = '2px 5px';
                     badge.style.borderRadius = '10px';
                     badge.innerText = `x${count}`;
                     medalEl.querySelector('.medal-icon').appendChild(badge);
                 }
            }
            medalsList.appendChild(medalEl);
        });
    }
}

function updateNotificationUI() {
    const statusText = document.getElementById('notif-status-text');
    if (statusText) statusText.innerText = Notification.permission === 'granted' ? 'Разрешено' : 'Требуется разрешение';
}

function saveData() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    localStorage.setItem('monthlyGoals', JSON.stringify(monthlyGoals));
    localStorage.setItem('routineTasks', JSON.stringify(routineTasks));
    localStorage.setItem('projects', JSON.stringify(projects));
    localStorage.setItem('stats', JSON.stringify(stats));
    localStorage.setItem('settings', JSON.stringify(settings));
}

// --- Events ---
function setupEventListeners() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.onclick = () => {
            currentActiveView = item.dataset.view;
            selectedProject = null;
            renderMain();
        };
    });

    if (aiScanBtn) aiScanBtn.onclick = () => {
        taskModal.classList.remove('active');
        scannerModal.classList.add('active');
        resetScanner();
    };

    if (closeScannerBtn) closeScannerBtn.onclick = () => scannerModal.classList.remove('active');
    
    if (scannerDropZone) {
        scannerDropZone.onclick = () => scannerFileInput.click();
        scannerDropZone.ondragover = (e) => {
            e.preventDefault();
            scannerDropZone.classList.add('dragover');
        };
        scannerDropZone.ondragleave = () => scannerDropZone.classList.remove('dragover');
        scannerDropZone.ondrop = (e) => {
            e.preventDefault();
            scannerDropZone.classList.remove('dragover');
            handleImageFile(e.dataTransfer.files[0]);
        };
    }

    if (scannerFileInput) {
        scannerFileInput.onchange = (e) => handleImageFile(e.target.files[0]);
    }

    window.addEventListener('paste', (e) => {
        if (scannerModal.classList.contains('active')) {
            const items = e.clipboardData.items;
            for (let item of items) {
                if (item.type.startsWith('image/')) {
                    handleImageFile(item.getAsFile());
                }
            }
        }
    });

    if (confirmImportBtn) confirmImportBtn.onclick = () => {
        const selected = detectedTasks.filter(t => t.selected);
        selected.forEach(t => {
            tasks.push({ 
                text: t.text, 
                completed: false, 
                reminderTime: t.time || null, 
                notified: false, 
                date: getTodayStr() 
            });
        });
        saveData();
        renderMain();
        scannerModal.classList.remove('active');
        triggerReward();
    };

    if (cancelImportBtn) cancelImportBtn.onclick = resetScanner;

    function resetPriority(selector) {
        document.querySelectorAll(`${selector} .priority-opt`).forEach(o => o.classList.remove('active'));
        document.querySelector(`${selector} .priority-opt[data-priority="none"]`).classList.add('active');
    }

    document.querySelectorAll('.priority-opt').forEach(opt => {
        opt.onclick = (e) => {
            const parentId = e.target.closest('.priority-selector').id;
            document.querySelectorAll(`#${parentId} .priority-opt`).forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
        };
    });

    addTaskBtn.onclick = () => {
        if (currentViewType === 'monthly') monthlyGoalModal.classList.add('active');
        else {
            resetPriority('#task-priority');
            taskModal.dataset.mode = 'task';
            document.getElementById('task-modal-title').innerText = 'Новая задача';
            document.getElementById('task-priority-field').style.display = 'block';
            document.getElementById('task-time-field').style.display = 'block';
            taskRewardField.style.display = 'none';
            taskModal.classList.add('active');
        }
    };
    addRoutineBtn.onclick = () => {
        resetPriority('#routine-priority');
        routineModal.classList.add('active');
    };
    addProjectBtn.onclick = () => projectModal.classList.add('active');

    cancelTaskBtn.onclick = () => taskModal.classList.remove('active');
    saveTaskBtn.onclick = saveTask;
    cancelRoutineBtn.onclick = () => routineModal.classList.remove('active');
    saveRoutineBtn.onclick = saveRoutine;
    cancelProjectBtn.onclick = () => projectModal.classList.remove('active');
    saveProjectBtn.onclick = saveProject;

    document.querySelectorAll('.day-pill').forEach(pill => {
        pill.onclick = () => pill.classList.toggle('active');
    });

    document.querySelectorAll('.icon-opt').forEach(opt => {
        opt.onclick = () => {
            document.querySelectorAll('.icon-opt').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
        };
    });

    showSettingsBtn.onclick = () => settingsModal.classList.add('active');
    closeSettingsBtn.onclick = () => settingsModal.classList.remove('active');

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

    document.querySelectorAll('.theme-option').forEach(opt => {
        opt.onclick = () => {
            settings.theme = opt.dataset.theme;
            applyTheme(settings.theme);
            saveData();
        };
    });

    [taskModal, routineModal, projectModal, settingsModal, monthlyGoalModal].forEach(m => {
        if (m) m.onclick = (e) => { if (e.target === m) m.classList.remove('active'); };
    });
}

init();
