// js/manager.js (The Final Merged Version with ALL Features)

document.addEventListener('DOMContentLoaded', () => {
    // =================================================================
    // --- 1. SCRIPT INITIALIZATION & STATE ---
    // =================================================================
    console.log("DOM ready. Initializing Manager Dashboard script...");

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || currentUser.role !== 'Manager') {
        console.error("Authentication Error: Not a manager or no user logged in. Stopping script.");
        return;
    }

    // Modal & Element References
    const createTaskModal = new bootstrap.Modal(document.getElementById('createTaskModal'));
    const rejectionModal = new bootstrap.Modal(document.getElementById('rejectionModal'));
    const approvalsTableBody = document.getElementById('approvalsTableBody');
    const confirmRejectionBtn = document.getElementById('confirmRejectionBtn');
    const createTaskForm = document.getElementById('createTaskForm');
    const taskDeadlineInput = document.getElementById('taskDeadline');
    const saveTaskBtn = createTaskForm.querySelector('button[type="submit"]');
    const teamTasksListContainer = document.getElementById("teamTasksList");

    // Application State
    let allEmployees = DataService.getEmployees();
    let allRequests = DataService.getRequests();
    let allTasks = DataService.getTasks();
    const myTeamIds = allEmployees.filter(e => e.managerId === currentUser.id).map(e => e.id);
    let myTeamRequests = allRequests.filter(r => myTeamIds.includes(r.employeeId));
    let myTeamTasks = allTasks.filter(t => t.assignees.some(id => myTeamIds.includes(id)));


    // =================================================================
    // --- 2. RENDER FUNCTIONS ---
    // =================================================================

    /** Renders the Key Performance Indicator (KPI) cards. */
    function renderKPIs() {
        document.getElementById('pendingApprovalsKpi').textContent = myTeamRequests.filter(r => r.status === 'Pending').length;
        document.getElementById('overdueTasksKpi').textContent = myTeamTasks.filter(t => t.status !== 'Completed' && new Date(t.deadline) < new Date()).length;
    }

    /** Renders the approvals queue table with pending requests. */
    function renderApprovalsQueue() {
        approvalsTableBody.innerHTML = '<tr><td colspan="6" class="text-center">Loading...</td></tr>';
        setTimeout(() => {
            const pending = myTeamRequests.filter(r => r.status === 'Pending');
            if (pending.length === 0) {
                approvalsTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No pending requests.</td></tr>';
                return;
            }
            approvalsTableBody.innerHTML = '';
            pending.forEach(req => {
                const emp = allEmployees.find(e => e.id === req.employeeId);
                const tr = document.createElement('tr');
                tr.dataset.requestId = req.id;
                tr.innerHTML = `
                    <td>${emp.name}</td>
                    <td><span class="badge text-bg-info">${req.type}</span></td>
                    <td>${req.payload.requestedDate}</td>
                    <td class="text-truncate" style="max-width: 250px;">${req.payload.reason || '--'}</td>
                    <td>${req.createdAt}</td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-success approve-btn" title="Approve"><i class="bi bi-check-circle-fill"></i> Approve</button>
                        <button class="btn btn-sm btn-danger reject-btn" title="Reject"><i class="bi bi-x-circle-fill"></i> Reject</button>
                    </td>`;
                approvalsTableBody.appendChild(tr);
            });
        }, 250);
    }

    /** Renders the team's tasks as cards, including a delete button. */
    function renderTeamTasks() {
        const container = teamTasksListContainer;
        container.innerHTML = "";
        if (myTeamTasks.length === 0) {
            container.innerHTML = '<div class="text-center text-muted p-3">No tasks assigned.</div>';
            return;
        }
        myTeamTasks.forEach(task => {
            const assignees = task.assignees.map(id => allEmployees.find(e => e.id === id)?.name).join(", ");
            const isOverdue = new Date(task.deadline) < new Date() && task.status !== "Completed";
            const card = document.createElement("div");
            card.className = "col-md-6 col-lg-4 mb-3";
            card.innerHTML = `
                <div class="card h-100 shadow-sm ${isOverdue ? "border-danger" : ""}">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">${task.title}</h5>
                        <h6 class="card-subtitle mb-2 text-body-secondary">Priority: ${task.priority}</h6>
                        <p class="card-text mb-1"><strong>Assignees:</strong> ${assignees}</p>
                        <p class="card-text"><strong>Deadline:</strong> <span class="${isOverdue ? "text-danger" : ""}">${new Date(task.deadline).toLocaleString()}</span></p>
                        <p><strong>Status:</strong> ${task.status}</p>
                        <div class="mt-auto text-end">
                            <button class="btn btn-sm btn-outline-danger delete-task-btn" data-task-id="${task.taskId}">
                                <i class="bi bi-trash-fill"></i> Delete
                            </button>
                        </div>
                    </div>
                </div>`;
            container.appendChild(card);
        });
    }

    /** Populates the employee checkboxes in the "Create Task" modal. */
    function populateCreateTaskForm() {
        const container = document.getElementById("taskAssignees");
        const teamMembers = allEmployees.filter(e => myTeamIds.includes(e.id));
        container.innerHTML = "";
        teamMembers.forEach(m => {
            container.innerHTML += `
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" value="${m.id}" id="assignee-${m.id}">
                    <label class="form-check-label" for="assignee-${m.id}">${m.name}</label>
                </div>`;
        });
    }


    // =================================================================
    // --- 3. HANDLER FUNCTIONS (Handle all user actions) ---
    // =================================================================

    /** Handles the logic for approving a request. */
    function handleApproval(requestId) {
        const requestIndex = allRequests.findIndex(r => r.id === requestId);
        if (requestIndex === -1) return;

        allRequests[requestIndex].status = 'Approved';
        allRequests[requestIndex].managerComment = 'Approved';
        allRequests[requestIndex].decidedAt = getISODate();
        DataService.saveRequests(allRequests);
        
        myTeamRequests = allRequests.filter(r => myTeamIds.includes(r.employeeId)); // Refresh state
        renderKPIs();
        renderApprovalsQueue();
        showToast('Request approved successfully!', 'success');
    }

    /** Handles the logic for rejecting a request. */
    function handleRejection(requestId, reason) {
        if (!reason) {
            showToast('Rejection reason is mandatory.', 'danger');
            return;
        }
        const requestIndex = allRequests.findIndex(r => r.id === requestId);
        if (requestIndex === -1) return;

        allRequests[requestIndex].status = 'Rejected';
        allRequests[requestIndex].managerComment = reason;
        allRequests[requestIndex].decidedAt = getISODate();
        DataService.saveRequests(allRequests);

        myTeamRequests = allRequests.filter(r => myTeamIds.includes(r.employeeId)); // Refresh state
        renderKPIs();
        renderApprovalsQueue();
        rejectionModal.hide();
        showToast('Request rejected.', 'info');
    }

    /** Handles the logic for deleting a task. */
    function handleTaskDeletion(taskId) {
        if (!confirm("Are you sure you want to permanently delete this task?")) {
            return;
        }
        
        const index = allTasks.findIndex(t => t.taskId === taskId);
        if (index === -1) return;
        
        allTasks.splice(index, 1);
        DataService.saveTasks(allTasks);
        
        myTeamTasks = allTasks.filter(t => t.assignees.some(id => myTeamIds.includes(id)));
        renderTeamTasks();
        renderKPIs(); // The overdue count might change
        showToast("Task deleted successfully.", "info");
    }

    /** Handles the submission of the new task form. */
    function handleTaskCreation(e) {
        e.preventDefault();
        const title = document.getElementById("taskTitle").value;
        const description = document.getElementById("taskDescription").value;
        const priority = document.getElementById("taskPriority").value;
        const deadline = document.getElementById("taskDeadline").value;
        const selectedAssignees = Array.from(document.querySelectorAll("#taskAssignees input:checked")).map(input => parseInt(input.value));

        if (selectedAssignees.length === 0) {
            showToast("You must assign the task to at least one employee.", "danger");
            return;
        }

        const newTask = { taskId: Date.now(), title, description, priority