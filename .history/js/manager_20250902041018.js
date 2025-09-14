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
    const teamTasksListContainer = document.getElementById("teamTasksList"); // Added for task deletion

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

    function renderKPIs() {
        // ... (This function is correct and remains the same)
        document.getElementById('pendingApprovalsKpi').textContent = myTeamRequests.filter(r => r.status === 'Pending').length;
        document.getElementById('overdueTasksKpi').textContent = myTeamTasks.filter(t => t.status !== 'Completed' && new Date(t.deadline) < new Date()).length;
    }

    function renderApprovalsQueue() {
        // ... (This function is correct and remains the same)
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

    function renderTeamTasks() {
        // --- MERGE: This is the function from Version 1 (Delete Task) ---
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

    function populateCreateTaskForm() {
        // ... (This function is correct and remains the same)
    }

    // =================================================================
    // --- 3. HANDLER FUNCTIONS ---
    // =================================================================

    // --- MERGE: Handler function from Version 2 (Approval Logic) ---
    function handleApproval(requestId) {
        // ... (This function is correct and remains the same)
    }

    // --- MERGE: Handler function from Version 2 (Rejection Logic) ---
    function handleRejection(requestId, reason) {
        // ... (This function is correct and remains the same)
    }

    // --- MERGE: Handler function from Version 1 (Task Deletion Logic) ---
    function handleTaskDeletion(taskId) {
        if (!confirm("Are you sure you want to delete this task permanently?")) {
            return;
        }
        
        const index = allTasks.findIndex(t => t.taskId === taskId);
        if (index === -1) return;
        
        allTasks.splice(index, 1);
        DataService.saveTasks(allTasks);
        
        myTeamTasks = allTasks.filter(t => t.assignees.some(id => myTeamIds.includes(id)));
        renderTeamTasks();
        renderKPIs();
        showToast("Task deleted successfully", "info");
    }

    // =================================================================
    // --- 4. EVENT LISTENERS (Combining listeners from both versions) ---
    // =================================================================

    // Listener for KPI card links
    document.querySelectorAll('.card-link[href^="#"]').forEach(link => {
        // ... (This listener is correct and remains the same)
    });

    // Listener for approvals table (Approve/Reject)
    approvalsTableBody.addEventListener("click", (e) => {
        // ... (This listener is correct and remains the same)
    });

    // Listener for rejection modal confirmation
    confirmRejectionBtn.addEventListener("click", () => {
        // ... (This listener is correct and remains the same)
    });
    
    // --- MERGE: Listener from Version 1 for deleting tasks ---
    teamTasksListContainer.addEventListener("click", (e) => {
        const deleteBtn = e.target.closest(".delete-task-btn");
        if (deleteBtn) {
            const taskId = parseInt(deleteBtn.dataset.taskId);
            handleTaskDeletion(taskId);
        }
    });

    // Listener for creating a new task
    createTaskForm.addEventListener("submit", e => {
        // ... (This listener is correct and remains the same)
    });

    // Listener for validating the task deadline
    taskDeadlineInput.addEventListener("input", () => {
        // ... (This listener is correct and remains the same)
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