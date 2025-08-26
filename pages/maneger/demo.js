import * as commons from '../../common/commons.js';

async function loadData() {
    const res = await fetch('../../data/hr_app_data.json');
    return await res.json();
}

// Render Team Attendance
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

// Render Pending Approvals
function renderApprovals(store) {
    const tbody = document.querySelector("#approvalsTable tbody");
    tbody.innerHTML = "";
    const pending = store.permissionRequests.filter(r => r.status === "Pending");
    pending.forEach(r => {
        const emp = store.employees.find(e => e.id === r.employeeId);
        tbody.innerHTML += `
      <tr>
        <td>${emp?.name || "Unknown"}</td>
        <td>${r.type}</td>
        <td>${r.payload.requestedDate}</td>
        <td>${r.status}</td>
        <td>
          <button class="btn btn-sm btn-success">Approve</button>
          <button class="btn btn-sm btn-danger">Reject</button>
        </td>
      </tr>`;
    });
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

// Render Team Tasks Workload View
function renderWorkload(store) {
    const tbody = document.querySelector("#workloadTable tbody");
    tbody.innerHTML = "";
    store.employees.forEach(emp => {
        const empTasks = store.tasks.filter(t => t.assignees.includes(emp.id));
        const total = empTasks.length;
        const inProgress = empTasks.filter(t => t.status === "In Progress").length;
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

// Init
loadData().then(store => {
    renderAttendance(store);
    renderApprovals(store);
    renderOverdueTasks(store);
    renderWorkload(store);

    // Handle Assign Task Save
    document.getElementById("saveTaskBtn").addEventListener("click", (e) => {
        e.preventDefault(); // prevent page reload

        const title = document.getElementById("taskTitle").value.trim();
        const desc = document.getElementById("taskDesc").value.trim();
        const priority = document.getElementById("taskPriority").value;
        const deadline = document.getElementById("taskDeadline").value;
        const assignees = document.getElementById("taskAssignees").value
            .split(",")
            .map(id => parseInt(id.trim()))
            .filter(id => !isNaN(id));

        if (!title || !deadline || assignees.length === 0) {
            alert("⚠️ Please fill all required fields correctly.");
            return;
        }

        const newTask = {
            taskId: store.tasks.length + 1,
            title,
            description: desc,
            priority,
            deadline,
            assignees,
            status: "Not Started",
            attachments: [],
            comments: [],
            createdBy: 1, // Manager mock
            createdAt: new Date().toISOString(),
            updatedAt: null,
            dependencyTaskIds: []
        };

        // Add task in memory
        store.tasks.push(newTask);

        // Re-render
        renderOverdueTasks(store);
        renderWorkload(store);

        alert("✅ Task assigned successfully!");
        document.getElementById("taskForm").reset();

        // Close modal
        const modalEl = document.getElementById('assignTaskModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();
    });
});
