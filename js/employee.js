// js/employee.js (Final with Cancel Request Feature)

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM ready. Initializing Employee Dashboard script...");

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || currentUser.role !== 'Employee') {
        console.error("Authentication Error: Not an employee or no user logged in. Stopping script.");
        return;
    }

    const taskDetailsModal = new bootstrap.Modal(document.getElementById('taskDetailsModal'));

    let myAttendance = DataService.getAttendance().filter(r => r.employeeId === currentUser.id);
    let myTasks = DataService.getTasks().filter(t => t.assignees.includes(currentUser.id));
    let myRequests = DataService.getRequests().filter(r => r.employeeId === currentUser.id);
    let payrollImpact = null;

    console.log(`Initialized with ${myAttendance.length} attendance records, ${myTasks.length} tasks, and ${myRequests.length} requests for ${currentUser.name}.`);

    // --- RENDER FUNCTIONS ---
    function renderKPIs() {
        const thisMonth = new Date().getMonth();
        const thisWeek = getWeekNumber(new Date());

        // --- Late Permissions Used ---
        const latePermissionsThisMonth = myRequests.filter(r => r.type === 'Late' && r.status === 'Approved' && new Date(r.payload.requestedDate).getMonth() === thisMonth).length;
        document.getElementById('latePermissionsKpi').textContent = `${latePermissionsThisMonth} / ${AppConfig.LATE_PERMISSION_QUOTA_PER_MONTH}`;

        // --- WFH This Week ---
        const wfhThisWeek = myRequests.filter(r => r.type === 'WFH' && r.status === 'Approved' && getWeekNumber(new Date(r.payload.requestedDate)) === thisWeek).length;
        document.getElementById('wfhKpi').textContent = `${wfhThisWeek} / ${AppConfig.WFH_QUOTA_PER_WEEK}`;

        // --- Pending Requests ---
        const pendingRequestsCount = myRequests.filter(r => r.status === 'Pending').length;
        document.getElementById('pendingRequestsKpi').textContent = pendingRequestsCount;

        // --- Est. Deductions (Salary Impact) ---
        if (!payrollImpact) payrollImpact = calculatePayrollImpact();
        const monthlySalary = currentUser.monthlySalary || 5000; // افتراضي لو مش معرف
        const totalPenaltyPercentage = payrollImpact.latePenalty + payrollImpact.taskPenalty;
        const estimatedDeductions = (totalPenaltyPercentage / 100) * monthlySalary;

        document.getElementById('deductionsKpi').textContent = `EGP ${estimatedDeductions.toFixed(2)}`;
    }


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

    function renderRequestForm() {
        const requestTypeSelect = document.getElementById('requestType');
        requestTypeSelect.addEventListener('change', handleRequestTypeChange);
    }

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

    // --- HANDLER FUNCTIONS ---
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
        myRequests = allRequests.filter(r => r.employeeId === currentUser.id);

        renderRequestsHistory();
        renderKPIs();
        showToast('Request submitted successfully!', 'success');

        e.target.reset();
        document.getElementById('dynamicFieldsContainer').innerHTML = '';
    }

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

    function handleRequestDateChange() {
        const type = document.getElementById('requestType').value;
        const selectedDate = new Date(this.value);
        const submitBtn = document.getElementById('submitRequestBtn');

        if (type === 'WFH') {
            const week = getWeekNumber(selectedDate);
            const wfhThisWeek = myRequests.filter(r => r.type === 'WFH' && r.status === 'Approved' && getWeekNumber(new Date(r.payload.requestedDate)) === week).length;
            submitBtn.disabled = wfhThisWeek >= AppConfig.WFH_QUOTA_PER_WEEK;
            if (wfhThisWeek >= AppConfig.WFH_QUOTA_PER_WEEK) showToast(`WFH quota exceeded for this week.`, 'danger');
        }
    }

    // --- EVENT LISTENERS ---
    document.getElementById('requestForm').addEventListener('submit', handleRequestSubmit);

    const taskDetailsModalElement = document.getElementById('taskDetailsModal');
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('view-task-btn')) {
            const taskId = e.target.getAttribute('data-task-id');
            const task = myTasks.find(t => t.taskId == taskId);
            if (task && taskDetailsModalElement) {
                document.getElementById('taskDetailTitle').textContent = task.title;
                document.getElementById('taskDetailDescription').textContent = task.description || 'No description provided.';
                document.getElementById('taskDetailPriority').textContent = task.priority;
                document.getElementById('taskDetailDeadline').textContent = new Date(task.deadline).toLocaleString();
                document.getElementById('taskDetailStatus').textContent = task.status;
                taskDetailsModal.show();
            }
        }
    });

    // --- Cancel Request Handler ---
    document.addEventListener('click', function (e) {
        if (e.target.closest('.delete-request-btn')) {
            const btn = e.target.closest('.delete-request-btn');
            const requestId = Number(btn.dataset.requestId);
            if (!requestId) return;

            myRequests = myRequests.filter(r => r.id !== requestId);
            const allRequests = DataService.getRequests().filter(r => r.id !== requestId);
            DataService.saveRequests(allRequests);

            renderRequestsHistory();
            renderKPIs();
            showToast('Request canceled successfully!', 'success');
        }
    });
    // --- Payroll Impact Calculation ---
    function calculatePayrollImpact() {
        const today = new Date();
        const thisMonth = today.getMonth();
        let latePenalty = 0;
        let taskPenalty = 0;

        myAttendance.forEach(rec => {
            if (new Date(rec.date).getMonth() === thisMonth && rec.minutesLate > 0) {
                const tiers = DataService.getSettings().latePenaltyTiers || { tier1: { from: 1, to: 15, penalty: 1 }, tier2: { from: 16, to: 30, penalty: 2 }, tier3: { from: 31, to: 1000, penalty: 5 } };
                if (rec.minutesLate >= tiers.tier1.from && rec.minutesLate <= tiers.tier1.to) latePenalty += tiers.tier1.penalty;
                else if (rec.minutesLate >= tiers.tier2.from && rec.minutesLate <= tiers.tier2.to) latePenalty += tiers.tier2.penalty;
                else if (rec.minutesLate >= tiers.tier3.from && rec.minutesLate <= tiers.tier3.to) latePenalty += tiers.tier3.penalty;
            }
        });

        myTasks.forEach(task => {
            const deadline = new Date(task.deadline);
            if (deadline.getMonth() === thisMonth && task.status !== 'Completed') {
                const taskPenalties = DataService.getSettings().taskPenalty || { High: 2, Medium: 1, Low: 0.5, Critical: 3 };
                taskPenalty += taskPenalties[task.priority] || 0;
            }
        });

        return { latePenalty, taskPenalty };
    }

    function renderPayrollImpact() {
        const container = document.getElementById('payrollImpactDetails');
        if (!container) return;

        if (!payrollImpact) {
            payrollImpact = calculatePayrollImpact();
        }

        const settings = DataService.getSettings();
        const monthlySalary = settings.monthlySalary || 5000;
        const lateAmount = ((payrollImpact.latePenalty / 100) * monthlySalary).toFixed(2);
        const taskAmount = ((payrollImpact.taskPenalty / 100) * monthlySalary).toFixed(2);

        container.innerHTML = `
        <div class="mb-3">
            <strong>Total Late Penalty:</strong> ${payrollImpact.latePenalty}% (~$${lateAmount})
            <div class="progress">
                <div class="progress-bar bg-warning" role="progressbar" style="width: ${payrollImpact.latePenalty}%;" aria-valuenow="${payrollImpact.latePenalty}" aria-valuemin="0" aria-valuemax="100"></div>
            </div>
        </div>
        <div class="mb-3">
            <strong>Total Task Penalty:</strong> ${payrollImpact.taskPenalty}% (~$${taskAmount})
            <div class="progress">
                <div class="progress-bar bg-danger" role="progressbar" style="width: ${payrollImpact.taskPenalty}%;" aria-valuenow="${payrollImpact.taskPenalty}" aria-valuemin="0" aria-valuemax="100"></div>
            </div>
        </div>
    `;
    }



    // --- INITIALIZATION ---
    function init() {
        renderKPIs();
        renderAttendance();
        renderTasks();
        renderRequestForm();
        renderRequestsHistory();
        renderPayrollImpact();

    }

    init();
});
