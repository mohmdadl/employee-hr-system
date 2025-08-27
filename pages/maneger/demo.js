import * as commons from '../../common/commons.js';

let currentFilter = "All";

// load data from local storage or fetch from JSon file 
async function loadData() {
    const localData = localStorage.getItem("hrData");
    if (localData) return JSON.parse(localData);

    const res = await fetch('../../data/hr_app_data.json');
    const json = await res.json();
    localStorage.setItem("hrData", JSON.stringify(json));
    return json;
}

// save updates 
function saveData(store) {
    localStorage.setItem("hrData", JSON.stringify(store));
}

// Render Attendance
function renderAttendance(store) {
    const tbody = document.querySelector("#attendanceTable tbody");
    tbody.innerHTML = "";
    store.attendanceRecords.forEach(rec => {
        const emp = store.employees.find(e => e.id === rec.employeeId);
        tbody.innerHTML += `
      <tr>
        <td>${emp?.name || "Unknown"}</td>
        <td>${rec.status}</td>
        <td>${rec.checkIn || 'N/A'}</td>
        <td>${rec.checkOut || 'N/A'}</td>
        <td>${rec.minutesLate || 0}</td>
      </tr>`;
    });
}

// Render Approvals with color coding
function renderApprovals(store) {
    const tbody = document.querySelector("#approvalsTable tbody");
    tbody.innerHTML = "";

    let pending = store.permissionRequests.filter(r => r.status === "Pending");
    if (currentFilter !== "All") {
        pending = pending.filter(r => r.type === currentFilter);
    }

    pending.forEach(r => {
        const emp = store.employees.find(e => e.id === r.employeeId);

        // different color for different types of requests
        let rowClass = "";
        switch (r.type) {
            case "Absence": rowClass = "table-danger"; break;
            case "WFH": rowClass = "table-primary"; break;
            case "Late": rowClass = "table-warning"; break;
            case "Overtime": rowClass = "table-success"; break;
            case "DeadlineExtension": rowClass = "table-info"; break;
        }

        tbody.innerHTML += `
      <tr data-id="${r.id}" class="${rowClass}">
        <td>${emp?.name || "Unknown"}</td>
        <td>${r.type}</td>
        <td>${r.payload.requestedDate || '-'}</td>
        <td>${r.status}</td>
        <td>
          <button class="btn btn-sm btn-success approve-btn">Approve</button>
          <button class="btn btn-sm btn-danger reject-btn">Reject</button>
        </td>
      </tr>`;
    });

    // Attach events
    tbody.querySelectorAll(".approve-btn").forEach(btn => {
        btn.addEventListener("click", e => {
            const id = parseInt(e.target.closest("tr").dataset.id);
            if (!checkBeforeApprove(store, id)) return;
            updateRequestStatus(store, id, "Approved", "Approved by manager");
        });
    });

    tbody.querySelectorAll(".reject-btn").forEach(btn => {
        btn.addEventListener("click", e => {
            const id = parseInt(e.target.closest("tr").dataset.id);
            const comment = prompt("Enter rejection reason:");
            updateRequestStatus(store, id, "Rejected", comment || "No reason");
        });
    });
}

// Checks before approval
function checkBeforeApprove(store, id) {
    const req = store.permissionRequests.find(r => r.id === id);
    if (!req) return false;

    const config = store.config || {
        latePermissionsPerMonth: 2,
        wfhPerWeekLimit: 2
    };

    // --- Late Permission ---
    if (req.type === "Late" && !commons.canApproveLatePermission(store.permissionRequests, req.employeeId, req.payload.requestedDate, config)) {
        alert("❌ Late permission quota exceeded (2 per month).");
        return false;
    }

    // --- Work From Home ---
    if (req.type === "WFH" && !commons.canApproveWFH(store.permissionRequests, req.employeeId, req.payload.requestedDate, config)) {
        alert("❌ Work From Home quota exceeded (2 per week).");
        return false;
    }

    // --- Overtime ---
    if (req.type === "Overtime" && (!req.payload.overtimeHours || req.payload.overtimeHours <= 0)) {
        alert("❌ Overtime request must include valid hours.");
        return false;
    }

    // --- Deadline Extension ---
    if (req.type === "DeadlineExtension" && !req.payload.taskId) {
        alert("❌ Missing taskId for deadline extension.");
        return false;
    }

    return true;
}

// update request status
function updateRequestStatus(store, id, status, comment) {
    const req = store.permissionRequests.find(r => r.id === id);
    if (req) {
        req.status = status;
        req.managerComment = comment;
        req.decidedAt = new Date().toISOString();

        if (status === "Approved") {
            commons.applyApproval(store, req);
        }

        saveData(store);

        // update all tables after approve 
        renderApprovals(store);
        renderAttendance(store);
        renderOverdueTasks(store);
        renderWorkload(store);

        alert(`✅ Request ${status}`);
    }
}

// Render Overdue Tasks
function renderOverdueTasks(store) {
    const tbody = document.querySelector("#overdueTable tbody");
    tbody.innerHTML = "";
    const overdue = store.tasks.filter(t => commons.isTaskOverdue(t));
    overdue.forEach(task => {
        const assignees = task.assignees
            .map(id => store.employees.find(e => e.id === id)?.name)
            .join(", ");
        tbody.innerHTML += `
      <tr>
        <td>${task.title}</td>
        <td>${assignees}</td>
        <td>${task.priority}</td>
        <td>${task.deadline}</td>
        <td>${task.status}</td>
      </tr>`;
    });
}

// Render Team Tasks Workload
function renderWorkload(store) {
    const tbody = document.querySelector("#workloadTable tbody");
    tbody.innerHTML = "";
    store.employees.forEach(emp => {
        const empTasks = store.tasks.filter(t => t.assignees.includes(emp.id));
        const total = empTasks.length;
        const inProgress = empTasks.filter(t => t.status === "InProgress").length;
        const overdue = empTasks.filter(t => commons.isTaskOverdue(t)).length;
        const completed = empTasks.filter(t => t.status === "Completed").length;
        tbody.innerHTML += `
      <tr>
        <td>${emp.name}</td>
        <td>${total}</td>
        <td>${inProgress}</td>
        <td>${overdue}</td>
        <td>${completed}</td>
      </tr>`;
    });
}

// Tabs filter setup
function setupApprovalTabs(store) {
    document.querySelectorAll("#approvalTabs .nav-link").forEach(tab => {
        tab.addEventListener("click", e => {
            document.querySelectorAll("#approvalTabs .nav-link").forEach(t => t.classList.remove("active"));
            e.target.classList.add("active");
            currentFilter = e.target.dataset.type;
            renderApprovals(store);
        });
    });
}

// Init
loadData().then(store => {
    renderAttendance(store);
    renderApprovals(store);
    renderOverdueTasks(store);
    renderWorkload(store);
    setupApprovalTabs(store);
});
