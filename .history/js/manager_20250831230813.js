// js/manager.js (Final, Clean, and Blocked-Out Version)

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

    // Modal Instances
    const createTaskModal = new bootstrap.Modal(document.getElementById('createTaskModal'));
    const rejectionModal = new bootstrap.Modal(document.getElementById('rejectionModal'));

    // Element References
    const approvalsTableBody = document.getElementById('approvalsTableBody');
    const confirmRejectionBtn = document.getElementById('confirmRejectionBtn');
    const createTaskForm = document.getElementById('createTaskForm');
    const taskDeadlineInput = document.getElementById('taskDeadline');
    const saveTaskBtn = createTaskForm.querySelector('button[type="submit"]');

    // Application State
    let allEmployees = DataService.getEmployees();
    let allRequests = DataService.getRequests();
    let allTasks = DataService.getTasks();
    const myTeamIds = allEmployees.filter(e => e.managerId === currentUser.id).map(e => e.id);
    let myTeamRequests = allRequests.filter(r => myTeamIds.includes(r.employeeId));
    let myTeamTasks = allTasks.filter(t => t.assignees.some(assigneeId => myTeamIds.includes(assigneeId)));


    // =================================================================
    // --- 2. RENDER FUNCTIONS (Update the UI) ---
    // =================================================================

    /** Renders the Key Performance Indicator (KPI) cards. */
    function renderKPIs() {
        const pendingRequestsCount = myTeamRequests.filter(r => r.status === 'Pending').length;
        document.getElementById('pendingApprovalsKpi').textContent = pendingRequestsCount;

        const overdueTasksCount = myTeamTasks.filter(t => t.status !== 'Completed' && new Date(t.deadline) < new Date()).length;
        document.getElementById('overdueTasksKpi').textContent = overdueTasksCount;
    }

    /** Renders the approvals queue table with pending requests. */
    function renderApprovalsQueue() {
        approvalsTableBody.innerHTML = `<tr><td colspan="6" class="text-center">Loading...</td></tr>`;

        setTimeout(() => {
            const pendingRequests = myTeamRequests.filter(r => r.status === 'Pending');
            if (pendingRequests.length === 0) {
                approvalsTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No pending requests. Great job!</td></tr>`;
                return;
            }
            approvalsTableBody.innerHTML = '';
            pendingRequests.forEach(req => {
                const employee = allEmployees.find(e => e.id === req.employeeId);
                const tr = document.createElement('tr');
                tr.dataset.requestId = req.id;
                tr.innerHTML = `
                    <td>${employee.name}</td>
                    <td><span class="badge text-bg-info">${req.type}</span></td>
                    <td>${req.payload.requestedDate}</td>
                    <td class="text-truncate" style="max-width: 250px;">${req.payload.reason || '--'}</td>
                    <td>${req.createdAt}</td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-success approve-btn" title="Approve"><i class="bi bi-check-circle-fill"></i> Approve</button>
                        <button class="btn btn-sm btn-danger reject-btn" title="Reject"><i class="bi bi-x-circle-fill"></i> Reject</button>
                    </td>
                `;
                approvalsTableBody.appendChild(tr);
            });
        }, 250);
    }

    /** Renders the team's tasks as cards. */
    function renderTeamTasks() {
        const container = document.getElementById('teamTasksList');
        container.innerHTML = "";
        if (myTeamTasks.length === 0) {
            container.innerHTML = `<div class="text-center text-muted p-3">No tasks assigned to your team yet. Click "Create New Task" to get started.</div>`;
            return;
        }
        myTeamTasks.forEach(task => {
            const assignees = task.assignees.map(id => allEmployees.find(e => e.id === id).name).join(", ");
            const isOverdue = new Date(task.deadline) < new Date() && task.status !== "Completed";
            const card = document.createElement("div");
            card.className = "col-md-6 col-lg-4 mb-3";
            card.innerHTML = `
                <div class="card h-100 shadow-sm ${isOverdue ? "border-danger" : ""}">
                    <div class="card-body">
                        <h5 class="card-title">${task.title}</h5>
                        <h6 class="card-subtitle mb-2 text-body-secondary">Priority: ${task.priority}</h6>
                        <p class="card-text mb-1"><strong>Assignees:</strong> ${assignees}</p>
                        <p class="card-text"><strong>Deadline:</strong> <span class="${isOverdue ? "text-danger" : ""}">${new Date(task.deadline).toLocaleString()}</span></p>
                        <p><strong>Status:</strong> ${task.status}</p>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    }

    /** Populates the employee checkboxes in the "Create Task" modal. */
    function populateCreateTaskForm() {
        const assigneesContainer = document.getElementById("taskAssignees");
        const teamMembers = allEmployees.filter(e => myTeamIds.includes(e.id));
        assigneesContainer.innerHTML = "";
        teamMembers.forEach(member => {
            assigneesContainer.innerHTML += `
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" value="${member.id}" id="assignee-${member.id}">
                    <label class="form-check-label" for="assignee-${member.id}">${member.name}</label>
                </div>
            `;
        });
    }


    // =================================================================
    // --- 3. HANDLER FUNCTIONS (Handle user actions) ---
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

        const newTask = { taskId: Date.now(), title, description, priority, deadline, assignees: selectedAssignees, status: "Not Started", createdBy: currentUser.id, createdAt: getISODate() };
        allTasks.push(newTask);
        DataService.saveTasks(allTasks);

        myTeamTasks = allTasks.filter(t => t.assignees.some(id => myTeamIds.includes(id))); // Refresh state
        renderTeamTasks();
        renderKPIs();
        
        createTaskModal.hide();
        createTaskForm.reset();
        taskDeadlineInput.classList.remove("is-invalid");
        saveTaskBtn.disabled = false;
        showToast("Task created successfully!", "success");
    }

    // =================================================================
    // --- 4. EVENT LISTENERS (Wire up the UI) ---
    // =================================================================

    document.querySelectorAll('.card-link[href^="#"]').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const tabPaneId = e.currentTarget.getAttribute('href');
            const tabToActivate = document.querySelector(`.nav-tabs button[data-bs-target="${tabPaneId}"]`);
            if (tabToActivate) {
                new bootstrap.Tab(tabToActivate).show();
            }
        });
    });

    approvalsTableBody.addEventListener("click", (e) => {
        const tr = e.target.closest('tr');
        if (!tr || !tr.dataset.requestId) return;
        const requestId = parseInt(tr.dataset.requestId);
        if (e.target.closest('.approve-btn')) {
            handleApproval(requestId);
        } else if (e.target.closest('.reject-btn')) {
            confirmRejectionBtn.dataset.requestId = requestId;
            document.getElementById('rejectionReason').value = '';
            rejectionModal.show();
        }
    });

    confirmRejectionBtn.addEventListener("click", () => {
        const requestId = parseInt(confirmRejectionBtn.dataset.requestId);
        const reason = document.getElementById('rejectionReason').value.trim();
        handleRejection(requestId, reason);
    });

    createTaskForm.addEventListener("submit", handleTaskCreation);

    taskDeadlineInput.addEventListener("input", () => {
        const selectedDate = new Date(taskDeadlineInput.value);
        const now = new Date();
        now.setSeconds(0, 0);
        if (selectedDate < now) {
            taskDeadlineInput.classList.add("is-invalid");
            saveTaskBtn.disabled = true;
        } else {
            taskDeadlineInput.classList.remove("is-invalid");
            saveTaskBtn.disabled = false;
        }
    });


    // =================================================================
    // --- 5. INITIALIZATION ---
    // =================================================================

    function init() {
        renderKPIs();
        renderApprovalsQueue();
        renderTeamTasks();
        populateCreateTaskForm();
    }

    init();
});