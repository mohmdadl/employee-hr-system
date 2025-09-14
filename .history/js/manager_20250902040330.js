
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM ready. Initializing Manager Dashboard script...");

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || currentUser.role !== 'Manager') {
        console.error("Authentication Error: Not a manager or no user logged in. Stopping script.");
        return;
    }

    const createTaskModal = new bootstrap.Modal(document.getElementById('createTaskModal'));
    const rejectionModal = new bootstrap.Modal(document.getElementById('rejectionModal'));
    const approvalsTableBody = document.getElementById('approvalsTableBody');
    const confirmRejectionBtn = document.getElementById('confirmRejectionBtn');
    const createTaskForm = document.getElementById('createTaskForm');
    const taskDeadlineInput = document.getElementById('taskDeadline');
    const saveTaskBtn = createTaskForm.querySelector('button[type="submit"]');

    let allEmployees = DataService.getEmployees();
    let allRequests = DataService.getRequests();
    let allTasks = DataService.getTasks();
    const myTeamIds = allEmployees.filter(e => e.managerId === currentUser.id).map(e => e.id);
    let myTeamRequests = allRequests.filter(r => myTeamIds.includes(r.employeeId));
    let myTeamTasks = allTasks.filter(t => t.assignees.some(id => myTeamIds.includes(id)));

    function renderKPIs() {
        document.getElementById('pendingApprovalsKpi').textContent = myTeamRequests.filter(r => r.status === 'Pending').length;
        document.getElementById('overdueTasksKpi').textContent = myTeamTasks.filter(t => t.status !== 'Completed' && new Date(t.deadline) < new Date()).length;
    }

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
                        <button class="btn btn-sm btn-success approve-btn"><i class="bi bi-check-circle-fill"></i></button>
                        <button class="btn btn-sm btn-danger reject-btn"><i class="bi bi-x-circle-fill"></i></button>
                    </td>`;
                approvalsTableBody.appendChild(tr);
            });
        }, 250);
    }

    function renderTeamTasks() {
        const container = document.getElementById('teamTasksList');
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
                    <div class="card-body">
                        <h5 class="card-title">${task.title}</h5>
                        <h6 class="card-subtitle mb-2 text-body-secondary">Priority: ${task.priority}</h6>
                        <p class="card-text mb-1"><strong>Assignees:</strong> ${assignees}</p>
                        <p class="card-text"><strong>Deadline:</strong> <span class="${isOverdue ? "text-danger" : ""}">${new Date(task.deadline).toLocaleString()}</span></p>
                        <p><strong>Status:</strong> ${task.status}</p>
                        <p class="text-end">
                            <button class="btn btn-sm btn-outline-danger delete-task-btn" data-task-id="${task.taskId}">
                                <i class="bi bi-trash-fill"></i> Delete
                            </button>
                        </p>
                    </div>
                </div>`;
            container.appendChild(card);
        });
    }

    function handleTaskDeletion(taskId) {
        const index = allTasks.findIndex(t => t.taskId === taskId);
        if (index === -1) return;
        allTasks.splice(index, 1);
        DataService.saveTasks(allTasks);
        myTeamTasks = allTasks.filter(t => t.assignees.some(id => myTeamIds.includes(id)));
        renderTeamTasks();
        renderKPIs();
        showToast("Task deleted successfully", "info");
    }

    document.getElementById("teamTasksList").addEventListener("click", (e) => {
        if (e.target.closest(".delete-task-btn")) {
            const taskId = parseInt(e.target.closest(".delete-task-btn").dataset.taskId);
            handleTaskDeletion(taskId);
        }
    });

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

    createTaskForm.addEventListener("submit", e => {
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
        myTeamTasks = allTasks.filter(t => t.assignees.some(id => myTeamIds.includes(id)));
        renderTeamTasks();
        renderKPIs();
        createTaskModal.hide();
        createTaskForm.reset();
        taskDeadlineInput.classList.remove("is-invalid");
        saveTaskBtn.disabled = false;
        showToast("Task created successfully!", "success");
    });

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

    function init() {
        renderKPIs();
        renderApprovalsQueue();
        renderTeamTasks();
        populateCreateTaskForm();
    }

    init();
});
