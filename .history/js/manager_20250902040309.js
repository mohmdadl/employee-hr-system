// js/manager.js (FINAL AND COMPLETE VERSION)

document.addEventListener("app-ready", () => {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser || currentUser.role !== "Manager") return;

  // --- 1. STATE & ELEMENT REFERENCES ---
  let allEmployees = DataService.getEmployees();
  let allRequests = DataService.getRequests();
  let allTasks = DataService.getTasks();
  const createTaskModal = new bootstrap.Modal(document.getElementById("createTaskModal"));
  const rejectionModal = new bootstrap.Modal(document.getElementById("rejectionModal"));
  const approvalsTableBody = document.getElementById("approvalsTableBody");
  const confirmRejectionBtn = document.getElementById("confirmRejectionBtn");
  const createTaskForm = document.getElementById("createTaskForm");
  const taskDeadlineInput = document.getElementById("taskDeadline");
  const saveTaskBtn = createTaskForm.querySelector('button[type="submit"]');
  const myTeamIds = allEmployees.filter((e) => e.managerId === currentUser.id).map((e) => e.id);
  let myTeamRequests = allRequests.filter((r) => myTeamIds.includes(r.employeeId));
  let myTeamTasks = allTasks.filter((t) => t.assignees.some((assigneeId) => myTeamIds.includes(assigneeId)));

  // --- 2. RENDER FUNCTIONS ---
  function renderKPIs() { /* ... your existing, correct code ... */ }
  function renderApprovalsQueue() { /* ... your existing, correct code ... */ }
  function renderTeamTasks() { /* ... your existing, correct code ... */ }
  function populateCreateTaskForm() { /* ... your existing, correct code ... */ }

  // =================================================================
  // --- 3. HANDLER FUNCTIONS (THIS BLOCK WAS MISSING) ---
  // =================================================================
  /** Handles the logic for approving a request. */
  function handleApproval(requestId) {
    const requestIndex = allRequests.findIndex((r) => r.id === requestId);
    if (requestIndex === -1) return;

    allRequests[requestIndex].status = "Approved";
    allRequests[requestIndex].managerComment = "Approved";
    allRequests[requestIndex].decidedAt = getISODate();
    DataService.saveRequests(allRequests);

    myTeamRequests = allRequests.filter((r) => myTeamIds.includes(r.employeeId));
    renderKPIs();
    renderApprovalsQueue();
    showToast("Request approved successfully!", "success");
  }

  /** Handles the logic for rejecting a request. */
  function handleRejection(requestId, reason) {
    if (!reason) {
      showToast("Rejection reason is mandatory.", "danger");
      return;
    }
    const requestIndex = allRequests.findIndex((r) => r.id === requestId);
    if (requestIndex === -1) return;

    allRequests[requestIndex].status = "Rejected";
    allRequests[requestIndex].managerComment = reason;
    allRequests[requestIndex].decidedAt = getISODate();
    DataService.saveRequests(allRequests);

    myTeamRequests = allRequests.filter((r) => myTeamIds.includes(r.employeeId));
    renderKPIs();
    renderApprovalsQueue();
    rejectionModal.hide();
    showToast("Request rejected.", "info");
  }

  // =================================================================
  // --- 4. EVENT LISTENERS (FILLING IN THE EMPTY LISTENERS) ---
  // =================================================================
  
  // Activate KPI card links
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

  // Listen for clicks on the approvals table (for approve/reject buttons)
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

  // Listen for clicks on the "Confirm Rejection" button in the modal
  confirmRejectionBtn.addEventListener("click", () => {
      const requestId = parseInt(confirmRejectionBtn.dataset.requestId);
      const reason = document.getElementById('rejectionReason').value.trim();
      handleRejection(requestId, reason);
  });

  // Listen for the submission of the new task form
  createTaskForm.addEventListener("submit", (e) => {
      e.preventDefault();
      // ... your existing, correct task creation logic
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

  // Listen for input on the task deadline field to validate it
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

  // --- 5. INITIALIZATION ---
  function init() {
    renderKPIs();
    renderApprovalsQueue();
    renderTeamTasks();
    populateCreateTaskForm();
  }

  init();
});