import * as commons from '../../common/commons.js';

/**
 * demo.js — UI layer that uses commons.js for business logic.
 * - Loads/saves hrData to localStorage (key: "hrData")
 * - Renders Attendance, Approvals, Tasks, Workload, Reports
 * - Uses commons.* functions for calculations & validations
 */

const STORAGE_KEY = "hrData";
let store = null; // will hold the object loaded from storage or json

/* ---------- Data load/save ---------- */
async function loadData() {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
        try { return JSON.parse(local); } catch (e) { console.error("Invalid JSON in localStorage, clearing.", e); localStorage.removeItem(STORAGE_KEY); }
    }

    // fetch initial JSON (first run)
    try {
        const res = await fetch('../../data/hr_app_data.json');
        const json = await res.json();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(json));
        return json;
    } catch (err) {
        console.error("Failed to fetch hr_app_data.json:", err);
        // fallback skeleton
        const fallback = {
            employees: [],
            attendanceRecords: [],
            permissionRequests: [],
            tasks: [],
            config: {
                workHours: { start: "09:00", end: "17:00" },
                penalties: { late: [{ min: 16, max: 30, pctDailyWage: 0.05 }, { min: 31, max: 60, pctDailyWage: 0.10 }, { min: 61, max: 120, pctDailyWage: 0.20 }], absenceDailyPct: 1.0 },
                overtime: { weekdayMultiplier: 1.25, weekendMultiplier: 1.5 },
                caps: { monthlyDeductionPctOfSalary: 0.25 },
                workweek: { weekendDays: ["Friday"] },
                latePermissionsPerMonth: 2,
                wfhPerWeekLimit: 2
            }
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
        return fallback;
    }
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

/* ---------- Renderers ---------- */

function renderAttendance() {
    const tbody = document.querySelector("#attendanceTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    store.attendanceRecords.forEach(rec => {
        const emp = store.employees.find(e => e.id === rec.employeeId);
        const statusObj = commons.computeDailyStatus(rec, store.config || {});
        const tr = document.createElement("tr");
        tr.innerHTML = `
      <td>${emp?.name || rec.employeeId}</td>
      <td>${statusObj.status}</td>
      <td>${rec.checkIn || 'N/A'}</td>
      <td>${rec.checkOut || 'N/A'}</td>
      <td>${statusObj.minutesLate ?? (rec.minutesLate ?? 0)}</td>
      <td>${rec.notes || ''}</td>
    `;
        tbody.appendChild(tr);
    });
}

function renderApprovals() {
    const tbody = document.querySelector("#approvalsTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    let pending = store.permissionRequests.filter(r => r.status === "Pending");
    // filter by currentFilter (tabs)
    // active tab is tracked by UI classes; find active
    const activeTab = document.querySelector("#approvalTabs .nav-link.active");
    const filter = activeTab?.dataset?.type || "All";
    if (filter !== "All") pending = pending.filter(r => r.type === filter);

    document.getElementById("pendingCount").textContent = pending.length;

    pending.forEach(r => {
        const emp = store.employees.find(e => e.id === r.employeeId);
        const tr = document.createElement("tr");
        let rowClass = "";
        switch (r.type) {
            case "Absence": rowClass = "table-danger"; break;
            case "WFH": rowClass = "table-primary"; break;
            case "Late": rowClass = "table-warning"; break;
            case "Overtime": rowClass = "table-success"; break;
            case "DeadlineExtension": rowClass = "table-info"; break;
        }
        tr.className = rowClass;
        tr.dataset.id = r.id;
        tr.innerHTML = `
      <td>${emp?.name || r.employeeId}</td>
      <td>${r.type}</td>
      <td>${r.payload?.requestedDate || '-'}</td>
      <td>${r.status}</td>
      <td>
        <button class="btn btn-sm btn-success approve-btn me-1">Approve</button>
        <button class="btn btn-sm btn-danger reject-btn">Reject</button>
      </td>
    `;
        tbody.appendChild(tr);
    });

    // attach event handlers
    tbody.querySelectorAll(".approve-btn").forEach(btn => {
        btn.addEventListener("click", e => {
            const id = parseInt(e.target.closest("tr").dataset.id);
            const req = store.permissionRequests.find(r => r.id === id);
            if (!req) return;
            // validate via commons.validatePermissionRequest
            const v = commons.validatePermissionRequest(req, store.permissionRequests, store.config || {});
            if (!v.ok) {
                alert("Cannot approve: " + v.reason);
                return;
            }
            req.status = "Approved";
            req.managerComment = "Approved by manager";
            req.decidedAt = new Date().toISOString();
            // business action
            commons.applyApproval(store, req);
            saveData();
            rerenderAll();
            alert("✅ Request Approved");
        });
    });

    tbody.querySelectorAll(".reject-btn").forEach(btn => {
        btn.addEventListener("click", e => {
            const id = parseInt(e.target.closest("tr").dataset.id);
            const req = store.permissionRequests.find(r => r.id === id);
            if (!req) return;
            const reason = prompt("Enter rejection reason:", "Rejected by manager");
            req.status = "Rejected";
            req.managerComment = reason || "Rejected";
            req.decidedAt = new Date().toISOString();
            saveData();
            rerenderAll();
            alert("❌ Request Rejected");
        });
    });
}

function renderOverdueTasks() {
    const tbody = document.querySelector("#overdueTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const overdue = store.tasks.filter(t => commons.isTaskOverdue(t));

    overdue.forEach(task => {
        const assignees = (task.assignees || [])
            .map(id => store.employees.find(e => e.id === id)?.name || id)
            .join(", ");
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${task.title}</td>
            <td>${assignees}</td>
            <td>${task.priority}</td>
            <td>${task.deadline}</td>
            <td>${task.status}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary edit-task-btn" data-id="${task.taskId || task.id}">
                    <i class="bi bi-pencil-square"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // attach edit handlers
    tbody.querySelectorAll(".edit-task-btn").forEach(btn => {
        btn.addEventListener("click", e => {
            const taskId = e.target.closest("button").dataset.id;
            openEditTaskModal(taskId);
        });
    });
}


function renderWorkload() {
    const tbody = document.querySelector("#workloadTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    store.employees.forEach(emp => {
        const empTasks = store.tasks.filter(t => (t.assignees || []).includes(emp.id));
        const total = empTasks.length;
        const inProgress = empTasks.filter(t => ["InProgress", "In Progress"].includes(t.status)).length;
        const overdue = empTasks.filter(t => commons.isTaskOverdue(t)).length;
        const completed = empTasks.filter(t => t.status === "Completed").length;
        const tr = document.createElement("tr");
        tr.innerHTML = `
      <td>${emp.name}</td>
      <td>${total}</td>
      <td>${inProgress}</td>
      <td>${overdue}</td>
      <td>${completed}</td>
    `;
        tbody.appendChild(tr);
    });

    // update small badges
    const teamSizeBadge = document.getElementById("teamSizeBadge");
    if (teamSizeBadge) teamSizeBadge.textContent = `${store.employees.length} members`;
}

function renderTasksTable() {
    const tasksTBody = document.querySelector("#tasksTable tbody");
    if (!tasksTBody) return;

    tasksTBody.innerHTML = "";
    store.tasks.forEach(task => {
        const assignees = (task.assignees || [])
            .map(id => store.employees.find(e => e.id === id)?.name || id)
            .join(", ");
        const tr = document.createElement("tr");
        tr.dataset.taskId = task.taskId || task.id || ""; // camelCase مهم

        tr.innerHTML = `
      <td>${task.title}</td>
      <td>${assignees}</td>
      <td>${task.priority}</td>
      <td>${task.deadline}</td>
      <td>${task.status}</td>
      <td><button class="btn btn-sm btn-outline-primary edit-task-btn">Edit</button></td>
    `;
        tasksTBody.appendChild(tr);
    });

    // attach edit handlers
    tasksTBody.querySelectorAll(".edit-task-btn").forEach(btn => {
        btn.addEventListener("click", e => {
            const row = e.target.closest("tr");
            const tid = row.dataset.taskId; // camelCase corrected
            openEditTaskModal(tid);
        });
    });
}




/* ---------- Tasks: create & edit ---------- */

function populateAssignees(selectEl) {
    if (!selectEl) return;
    selectEl.innerHTML = "";
    store.employees.forEach(emp => {
        const opt = document.createElement("option");
        opt.value = emp.id;
        opt.textContent = emp.name;
        selectEl.appendChild(opt);
    });
}

function setupCreateTaskForm() {
    const form = document.getElementById("createTaskForm");
    if (!form) return;
    populateAssignees(document.getElementById("taskAssignees"));
    form.addEventListener("submit", e => {
        e.preventDefault();
        const title = document.getElementById("taskTitle")?.value?.trim();
        const priority = document.getElementById("taskPriority")?.value;
        const deadline = document.getElementById("taskDeadline")?.value;
        const assignees = Array.from(
            document.getElementById("taskAssignees")?.selectedOptions || []
        ).map(o => parseInt(o.value));

        if (!title || !priority || !deadline || assignees.length === 0) {
            alert("⚠️ Please fill all fields.");
            return;
        }

        const newTask = {
            taskId: Date.now().toString(),
            title,
            description: "",
            priority,
            deadline,
            assignees,
            status: "InProgress",
            createdBy: "Manager",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            comments: []
        };

        store.tasks.push(newTask);
        saveData();
        rerenderAll();
        form.reset();
        alert("✅ Task created");
    });
}

function openEditTaskModal(taskId) {
    const task = store.tasks.find(t => (t.taskId || t.id || "").toString() === taskId.toString());
    if (!task) return;
    // fill modal fields
    document.getElementById("editTaskId").value = task.taskId || task.id;
    document.getElementById("editTaskTitle").value = task.title || "";
    document.getElementById("editTaskPriority").value = task.priority || "Medium";
    // ensure datetime-local value format: convert existing ISO to input's expected format
    const dtInput = document.getElementById("editTaskDeadline");
    if (task.deadline) {
        // attempt to format to yyyy-mm-ddThh:mm
        const d = new Date(task.deadline);
        if (!isNaN(d)) {
            const isoLocal = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            dtInput.value = isoLocal;
        } else {
            dtInput.value = "";
        }
    } else dtInput.value = "";

    document.getElementById("editTaskStatus").value = task.status || "InProgress";
    document.getElementById("editTaskDescription").value = task.description || "";

    populateAssignees(document.getElementById("editTaskAssignees"));
    // select assignees
    const select = document.getElementById("editTaskAssignees");
    Array.from(select.options).forEach(opt => {
        opt.selected = (task.assignees || []).includes(opt.value);
    });

    // show modal
    const modalEl = document.getElementById("editTaskModal");
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}

function setupEditTaskForm() {
    const form = document.getElementById("editTaskForm");
    if (!form) return;
    form.addEventListener("submit", e => {
        e.preventDefault();
        const taskId = document.getElementById("editTaskId").value;
        const task = store.tasks.find(t => (t.taskId || t.id || "").toString() === taskId.toString());
        if (!task) return;

        task.title = document.getElementById("editTaskTitle").value.trim();
        task.priority = document.getElementById("editTaskPriority").value;
        // read datetime-local and convert to ISO (browser gives local)
        const dl = document.getElementById("editTaskDeadline").value;
        if (dl) {
            // dl is like "2025-08-27T14:30"
            task.deadline = new Date(dl).toISOString();
        }
        task.status = document.getElementById("editTaskStatus").value;
        task.description = document.getElementById("editTaskDescription").value;
        task.assignees = Array.from(document.getElementById("editTaskAssignees").selectedOptions).map(o => o.value);
        task.updatedAt = new Date().toISOString();

        saveData();
        rerenderAll();

        // hide modal
        const modalEl = document.getElementById("editTaskModal");
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        alert("✅ Task updated");
    });
}

/* ---------- Reports ---------- */

function defaultReportMonthISO() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
}

function renderTeamReports() {
    const monthInput = document.getElementById("reportMonth");
    const month = monthInput?.value || defaultReportMonthISO();

    // attendance KPI
    const aTbody = document.querySelector("#teamReportsTable tbody");
    if (aTbody) {
        aTbody.innerHTML = "";
        store.employees.forEach(emp => {
            const empAttendance = store.attendanceRecords.filter(a => a.employeeId === emp.id && a.date.startsWith(month));
            const present = empAttendance.filter(a => {
                const s = commons.computeDailyStatus(a, store.config || {});
                return s.status === "Present" || s.status === "Present(WFH)";
            }).length;
            const late = empAttendance.filter(a => commons.computeDailyStatus(a, store.config || {}).status === "Late").length;
            const absent = empAttendance.filter(a => commons.computeDailyStatus(a, store.config || {}).status === "Absent").length;
            const wfh = empAttendance.filter(a => commons.computeDailyStatus(a, store.config || {}).status === "Present(WFH)").length;

            const tr = document.createElement("tr");
            tr.innerHTML = `<td>${emp.name}</td><td>${present}</td><td>${late}</td><td>${absent}</td><td>${wfh}</td>`;
            aTbody.appendChild(tr);
        });
    }

    // payroll impact
    const pTbody = document.querySelector("#payrollImpactTable tbody");
    if (pTbody) {
        pTbody.innerHTML = "";
        const impacts = commons.computeMonthlyPayrollImpact(store, month, store.config || {});
        impacts.forEach(row => {
            const emp = store.employees.find(e => e.id === row.employeeId);
            const tr = document.createElement("tr");
            tr.innerHTML = `
        <td>${emp?.name || row.employeeId}</td>
        <td>${(row.latePenalty || 0).toFixed(2)}</td>
        <td>${(row.absencePenalty || 0).toFixed(2)}</td>
        <td>${(row.taskPenalty || 0).toFixed(2)}</td>
        <td>${(row.overtimePay || 0).toFixed(2)}</td>
        <td>${(row.bonus || 0).toFixed(2)}</td>
        <td>${row.capApplied ? "Yes" : "No"}</td>
      `;
            pTbody.appendChild(tr);
        });
    }

    // update badge for current month
    const monthBadge = document.getElementById("currentMonthBadge");
    if (monthBadge) monthBadge.textContent = month;
}

/* ---------- UI wiring & tabs ---------- */

function setupApprovalTabs() {
    document.querySelectorAll("#approvalTabs .nav-link").forEach(tab => {
        tab.addEventListener("click", e => {
            document.querySelectorAll("#approvalTabs .nav-link").forEach(t => t.classList.remove("active"));
            e.target.classList.add("active");
            renderApprovals();
        });
    });
}

function setupReportControls() {
    const monthInput = document.getElementById("reportMonth");
    if (monthInput) monthInput.value = defaultReportMonthISO();
    const refreshBtn = document.getElementById("refreshReports");
    if (refreshBtn) refreshBtn.addEventListener("click", () => renderTeamReports());
    if (monthInput) monthInput.addEventListener("change", () => renderTeamReports());
}

/* ---------- Rerender convenience ---------- */
function rerenderAll() {
    renderAttendance();
    renderApprovals();
    renderOverdueTasks();
    renderWorkload();
    renderTasksTable();
    renderTeamReports();
}

/* ---------- Init ---------- */
(async function init() {
    store = await loadData();

    // ensure store.config exists
    store.config = store.config || {
        workHours: { start: "09:00", end: "17:00" },
        penalties: { late: [{ min: 16, max: 30, pctDailyWage: 0.05 }, { min: 31, max: 60, pctDailyWage: 0.10 }, { min: 61, max: 120, pctDailyWage: 0.20 }], absenceDailyPct: 1.0 },
        overtime: { weekdayMultiplier: 1.25, weekendMultiplier: 1.5 },
        caps: { monthlyDeductionPctOfSalary: 0.25 },
        workweek: { weekendDays: ["Friday"] },
        latePermissionsPerMonth: 2,
        wfhPerWeekLimit: 2
    };

    // render everything
    renderAttendance();
    renderApprovals();
    renderOverdueTasks();
    renderWorkload();
    renderTasksTable();
    setupCreateTaskForm();
    setupEditTaskForm();
    setupApprovalTabs();
    setupReportControls();
    renderTeamReports();
})();
