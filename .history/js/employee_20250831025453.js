// js/employee.js (Final, Clean, and Blocked-Out Version)

document.addEventListener('DOMContentLoaded', () => {
    // =================================================================
    // --- 1. SCRIPT INITIALIZATION & STATE ---
    // =================================================================
    console.log("DOM ready. Initializing Employee Dashboard script...");

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || currentUser.role !== 'Employee') {
        console.error("Authentication Error: Not an employee or no user logged in. Stopping script.");
        return; // Stop execution if not a valid employee
    }

    // Modal Instance
    const taskDetailsModal = new bootstrap.Modal(document.getElementById('taskDetailsModal'));

    // Application State (The single source of truth for this page)
    let myAttendance = DataService.getAttendance().filter(r => r.employeeId === currentUser.id);
    let myTasks = DataService.getTasks().filter(t => t.assignees.includes(currentUser.id));
    let myRequests = DataService.getRequests().filter(r => r.employeeId === currentUser.id);
    let payrollImpact = null; // To be used on Day 5/6

    console.log(`Initialized with ${myAttendance.length} attendance records, ${myTasks.length} tasks, and ${myRequests.length} requests for ${currentUser.name}.`);


    // =================================================================
    // --- 2. RENDER FUNCTIONS (Update the UI) ---
    // =================================================================

    /** Renders all the Key Performance Indicator (KPI) cards. */
    function renderKPIs() {
        const thisMonth = new Date().getMonth();
        const thisYear = new Date().getFullYear();
        const thisWeek = getWeekNumber(new Date());

        const latePermissionsThisMonth = myRequests.filter(r => r.type === 'Late' && r.status === 'Approved' && new Date(r.payload.requestedDate).getMonth() === thisMonth).length;
        document.getElementById('latePermissionsKpi').textContent = `${latePermissionsThisMonth} / ${AppConfig.LATE_PERMISSION_QUOTA_PER_MONTH}`;

        const wfhThisWeek = myRequests.filter(r => r.type === 'WFH' && r.status === 'Approved' && getWeekNumber(new Date(r.payload.requestedDate)) === thisWeek).length;
        document.getElementById('wfhKpi').textContent = `${wfhThisWeek} / ${AppConfig.WFH_QUOTA_PER_WEEK}`;
        
        const pendingRequestsCount = myRequests.filter(r => r.status === 'Pending').length;
        document.getElementById('pendingRequestsKpi').textContent = pendingRequestsCount;

        // Note: Payroll KPI is intentionally left out for Day 2. It will be added on Day 5/6.
    }

    /** Renders the user's attendance history table. */
    function renderAttendance() {
        const tableBody = document.getElementById('attendanceTableBody');
        tableBody.innerHTML = '';
        if (myAttendance.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No attendance records found.</td></tr>`;
            return;
        }
        myAttendance.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(rec => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${rec.date}</td>
                <td><span class="badge text-bg-${rec.status === 'Present' ? 'success' : rec.status === 'Late' ? 'warning' : 'danger'}">${rec.status}</span></td>
                <td>${rec.checkIn || '--'}</td>
                <td>${rec.checkOut || '--'}</td>
                <td>${rec.minutesLate > 0 ? rec.minutesLate : '--'}</td>
            `;
            tableBody.appendChild(tr);
        });
    }

    /** Renders the user's assigned tasks as cards. */
    function renderTasks() {
        const listContainer = document.getElementById('tasksList');
        listContainer.innerHTML = '';
        if (myTasks.length === 0) {
            listContainer.innerHTML = `<div class="text-center text-muted p-3">You have no assigned tasks. Great job!</div>`;
            return;
        }
        myTasks.forEach(task => {
            const card = document.createElement('div');
            card.className = 'col-md-6 mb-3';
            card.innerHTML = `
                <div class="card h-100 shadow-sm">
                    <div class="card-body">
                        <h5 class="card-title">${task.title}</h5>
                        <h6 class="card-subtitle mb-2 text-body-secondary">Priority: ${task.priority}</h6>
                        <p class="card-text mb-1"><strong>Deadline:</strong> ${new Date(task.deadline).toLocaleString()}</p>
                        <p class="mb-2"><strong>Status:</strong> ${task.status}</p>
                        <button class="btn btn-sm btn-outline-primary view-task-btn" data-task-id="${task.taskId}">View Details</button>
                    </div>
                </div>
            `;
            listContainer.appendChild(card);
        });
    }

    /** Renders the dynamic form for creating new requests. */
    function renderRequestForm() {
        // This function will be called once to set up the initial event listener.
        const requestTypeSelect = document.getElementById('requestType');
        requestTypeSelect.addEventListener('change', handleRequestTypeChange);
    }

    /** Renders the user's request history list. */
    function renderRequestsHistory() {
        const historyList = document.getElementById('requestsHistoryList');
        historyList.innerHTML = '';
        if (myRequests.length === 0) {
            historyList.innerHTML = `<li class="list-group-item text-muted">You have not submitted any requests.</li>`;
            return;
        }
        const statusBadges = { Pending: 'text-bg-warning', Approved: 'text-bg-success', Rejected: 'text-bg-danger' };
        myRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach(req => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.innerHTML = `
                <div class="ms-2 me-auto">
                    <div class="fw-bold">${req.type} - ${req.payload.requestedDate}</div>
                    <small class="text-muted">Submitted: ${req.createdAt}</small>
                    ${req.status === 'Rejected' ? `<div class="text-danger small fst-italic mt-1">Reason: ${req.managerComment}</div>` : ''}
                </div>
                <div>
                    ${req.status === 'Pending' ? `<button class="btn btn-sm btn-outline-danger delete-request-btn me-2" data-request-id="${req.id}" title="Cancel Request"><i class="bi bi-trash"></i></button>` : ''}
                    <span class="badge ${statusBadges[req.status]} rounded-pill">${req.status}</span>
                </div>
            `;
            historyList.appendChild(li);
        });
    }


    // =================================================================
    // --- 3. HANDLER FUNCTIONS (Handle user actions) ---
    // =================================================================

    /** Handles the submission of the new request form. */
    function handleRequestSubmit(e) {
        e.preventDefault();
        const allRequests = DataService.getRequests();
        const type = document.getElementById('requestType').value;
        const requestedDate = document.getElementById('requestDate').value;
        const reason = document.getElementById('requestReason').value;

        if (!type || !requestedDate || !reason) {
            showToast('Please fill all required fields.', 'danger');
            return;
        }

        const newRequest = { id: Date.now(), employeeId: currentUser.id, type, payload: { requestedDate, reason }, status: 'Pending', managerComment: '', createdAt: getISODate() };
        if (type === 'Late') {
            newRequest.payload.minutesExpectedLate = parseInt(document.getElementById('lateMinutes').value);
        }

        allRequests.push(newRequest);
        DataService.saveRequests(allRequests);
        myRequests = allRequests.filter(r => r.employeeId === currentUser.id); // Refresh state
        
        renderRequestsHistory(); // Re-render UI
        renderKPIs();
        showToast('Request submitted successfully!', 'success');
        
        e.target.reset(); // Reset the form
        document.getElementById('dynamicFieldsContainer').innerHTML = '';
    }

    /** Handles changes in the request type dropdown to show correct fields. */
    function handleRequestTypeChange() {
        const requestTypeSelect = document.getElementById('requestType');
        const dynamicFieldsContainer = document.getElementById('dynamicFieldsContainer');
        const submitBtn = document.getElementById('submitRequestBtn');
        const type = requestTypeSelect.value;
        
        dynamicFieldsContainer.innerHTML = '';
        submitBtn.disabled = false;

        let fieldsHTML = `<div class="mb-3"><label for="requestDate" class="form-label">Date</label><input type="date" class="form-control" id="requestDate" required min="${getISODate()}"></div>`;
        if (type === 'Late') {
            fieldsHTML += `<div class="mb-3"><label for="lateMinutes" class="form-label">Minutes Expected Late</label><input type="number" class="form-control" id="lateMinutes" placeholder="e.g., 30" required></div>`;
        }
        fieldsHTML += `<div class="mb-3"><label for="requestReason" class="form-label">Reason</label><textarea class="form-control" id="requestReason" rows="2" required></textarea></div>`;
        dynamicFieldsContainer.innerHTML = fieldsHTML;
        
        document.getElementById('requestDate').addEventListener('change', handleRequestDateChange);
    }

    /** Handles changes in the request date to check for quotas. */
    function handleRequestDateChange() {
        const type = document.getElementById('requestType').value;
        const selectedDate = new Date(this.value);
        const submitBtn = document.getElementById('submitRequestBtn');

        if (type === 'WFH') {
            const week = getWeekNumber(selectedDate);
            const wfhThisWeek = myRequests.filter(r => r.type === 'WFH' && r.status === 'Approved' && getWeekNumber(new Date(r.payload.requestedDate)) === week).length;
            if (wfhThisWeek >= AppConfig.WFH_QUOTA_PER_WEEK) {
                showToast(`WFH quota (${AppConfig.WFH_QUOTA_PER_WEEK}/week) exceeded for the selected week.`, 'danger');
                submitBtn.disabled = true;
            } else {
                submitBtn.disabled = false;
            }
        }
    }


    // =================================================================
    // --- 4. EVENT LISTENERS (Wire up the UI) ---
    // =================================================================

    document.getElementById('requestForm').addEventListener('submit', handleRequestSubmit);

    // Note: Other event listeners for tasks, deleting requests, etc., will be added here in later tasks.


    // =================================================================
    // --- 5. INITIALIZATION ---
    // =================================================================

    /** The main function for this page. Called once when the script starts. */
    function init() {
        // For Day 2, we are not calculating payroll. This will be activated on Day 5/6.
        // payrollImpact = SalaryCalculator.calculateMonthlyImpact(...);
        
        renderKPIs();
        renderAttendance();
        renderTasks();
        renderRequestForm();
        renderRequestsHistory();
    }

    // Run the app!
    init();

}); // End of DOMContentLoaded