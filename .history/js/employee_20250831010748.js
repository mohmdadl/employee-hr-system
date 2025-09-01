// js/employee.js




document.addEventListener('DOMContentLoaded', () => {
    console.log("employee.js script has loaded!");
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    let payrollImpact = null;
    if (!currentUser || currentUser.role !== 'Employee') {
        // Optional: redirect to login if not an employee, though main.js should handle it.
        // window.location.href = 'index.html';
        return;
    }
    console.log("Data from DataService:", DataService.getAttendance(), DataService.getTasks());
    const taskDetailsModal = new bootstrap.Modal(document.getElementById('taskDetailsModal'));


    // --- Global State ---
    let myAttendance = DataService.getAttendance().filter(r => r.employeeId === currentUser.id);
    let myTasks = DataService.getTasks().filter(t => t.assignees.includes(currentUser.id));
    let myRequests = DataService.getRequests().filter(r => r.employeeId === currentUser.id);

    // --- Render Functions ---

    function renderKPIs() {

        // New deduction KPI logic
        if (payrollImpact) {
            const deductionsKpi = document.getElementById('deductionsKpi');
            deductionsKpi.textContent = `EGP ${payrollImpact.totalDeductions.toFixed(2)}`;
            if (payrollImpact.capApplied) {
                deductionsKpi.innerHTML += ` <span class="badge bg-light text-dark">Capped</span>`;
            }
        }
    }

    function renderPayrollImpact() {
        const container = document.getElementById('payrollImpactDetails');
        container.innerHTML = '';

        if (!payrollImpact || payrollImpact.details.length === 0) {
            container.innerHTML = `<div class="alert alert-success">No deductions or bonuses recorded for this month. Keep up the great work!</div>`;
            return;
        }

        const detailsTable = `
        <table class="table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Amount (EGP)</th>
                    <th>Reason</th>
                </tr>
            </thead>
            <tbody>
                ${payrollImpact.details.map(item => `
                    <tr>
                        <td>${item.date}</td>
                        <td><span class="badge text-bg-${item.amount > 0 ? 'success' : 'danger'}">${item.type}</span></td>
                        <td class="${item.amount > 0 ? 'text-success' : 'text-danger'}">${item.amount.toFixed(2)}</td>
                        <td>${item.reason}</td>
                    </tr>
                `).join('')}
            </tbody>
            <tfoot>
                <tr class="table-group-divider">
                    <td colspan="2" class="text-end"><strong>Total Deductions:</strong></td>
                    <td class="text-danger"><strong>- ${payrollImpact.totalDeductions.toFixed(2)}</strong></td>
                    <td>${payrollImpact.capApplied ? '(Capped at 25%)' : ''}</td>
                </tr>
                <tr>
                    <td colspan="2" class="text-end"><strong>Total Bonuses/Pay:</strong></td>
                    <td class="text-success"><strong>+ ${(payrollImpact.overtimePay + payrollImpact.bonus).toFixed(2)}</strong></td>
                    <td></td>
                </tr>
                <tr class="fw-bold fs-5">
                    <td colspan="2" class="text-end"><strong>Final Net Impact:</strong></td>
                    <td class="${payrollImpact.finalImpact >= 0 ? 'text-success' : 'text-danger'}">${payrollImpact.finalImpact.toFixed(2)}</td>
                    <td></td>
                </tr>
            </tfoot>
        </table>
    `;
        container.innerHTML = detailsTable;
    }

    function renderAttendance() {
        const tableBody = document.getElementById('attendanceTableBody');
        tableBody.innerHTML = '';
        if (myAttendance.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center">No attendance records found.</td></tr>`;
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
            listContainer.innerHTML = `<p class="text-center">You have no assigned tasks.</p>`;
            return;
        }
        myTasks.forEach(task => {
            const card = document.createElement('div');
            card.className = 'col-md-6 mb-3';
            card.innerHTML = `
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">${task.title}</h5>
                        <h6 class="card-subtitle mb-2 text-body-secondary">Priority: ${task.priority}</h6>
                        <p class="card-text"><strong>Deadline:</strong> ${new Date(task.deadline).toLocaleString()}</p>
                        <p><strong>Status:</strong> ${task.status}</p>
                           <button class="btn btn-sm btn-outline-info view-task-btn" data-task-id="${task.taskId}">View Details</button>
                    </div>
                </div>
            `;
            listContainer.appendChild(card);
        });
    }

    function renderRequestForm() {
        const requestTypeSelect = document.getElementById('requestType');
        const dynamicFieldsContainer = document.getElementById('dynamicFieldsContainer');
        const submitBtn = document.getElementById('submitRequestBtn');

        requestTypeSelect.addEventListener('change', () => {
            const type = requestTypeSelect.value;
            dynamicFieldsContainer.innerHTML = '';
            submitBtn.disabled = false;

            let fieldsHTML = `
                <div class="mb-3">
                    <label for="requestDate" class="form-label">Date</label>
                    <input type="date" class="form-control" id="requestDate" required min="${getISODate()}">
                </div>
            `;

            if (type === 'Late') {
                fieldsHTML += `
                    <div class="mb-3">
                        <label for="lateMinutes" class="form-label">Minutes Expected Late</label>
                        <input type="number" class="form-control" id="lateMinutes" placeholder="e.g., 30" required>
                    </div>`;
            }

            fieldsHTML += `
                <div class="mb-3">
                    <label for="requestReason" class="form-label">Reason</label>
                    <textarea class="form-control" id="requestReason" rows="2" required></textarea>
                </div>
            `;
            dynamicFieldsContainer.innerHTML = fieldsHTML;

            
            const requestDateInput = document.getElementById('requestDate');
            requestDateInput.addEventListener('change', () => {
                const selectedDate = new Date(requestDateInput.value);
                if (type === 'WFH') {
                    const week = getWeekNumber(selectedDate);
                    const year = selectedDate.getFullYear();
                    const wfhThisWeek = myRequests.filter(r => r.type === 'WFH' && r.status === 'Approved' && getWeekNumber(new Date(r.payload.requestedDate)) === week && new Date(r.payload.requestedDate).getFullYear() === year).length;
                    if (wfhThisWeek >= AppConfig.WFH_QUOTA_PER_WEEK) {
                        showToast(`WFH quota (${AppConfig.WFH_QUOTA_PER_WEEK}/week) exceeded for the selected week.`, 'danger');
                        submitBtn.disabled = true;
                    } else {
                        submitBtn.disabled = false;
                    }
                }
            });
        });
    }

    function renderRequestsHistory() {
        const historyList = document.getElementById('requestsHistoryList');
        historyList.innerHTML = '';
        if (myRequests.length === 0) {
            historyList.innerHTML = `<li class="list-group-item">You have not submitted any requests.</li>`;
            return;
        }
        const statusBadges = {
            Pending: 'text-bg-warning',
            Approved: 'text-bg-success',
            Rejected: 'text-bg-danger'
        };
        myRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach(req => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-start';
            li.innerHTML = `
                <div class="ms-2 me-auto">
                    <div class="fw-bold">${req.type} - ${req.payload.requestedDate}</div>
                    <small>Submitted: ${req.createdAt}</small>
                    ${req.status === 'Rejected' ? `<div class="text-danger small fst-italic">Reason: ${req.managerComment}</div>` : ''}
                </div>
                <span class="badge ${statusBadges[req.status]} rounded-pill">${req.status}</span>
            `;
            historyList.appendChild(li);
        });
    }

   
    function showTaskDetails(task) {
        document.getElementById('taskDetailsModalLabel').textContent = task.title;
        const body = document.getElementById('taskDetailsModalBody');
        body.innerHTML = `
        <p><strong>Description:</strong> ${task.description || 'No description provided.'}</p>
        <p><strong>Priority:</strong> ${task.priority}</p>
        <p><strong>Deadline:</strong> ${new Date(task.deadline).toLocaleString()}</p>
        <p><strong>Status:</strong> ${task.status}</p>
        <hr>
        <label for="taskStatusUpdate" class="form-label">Update Status:</label>
        <select class="form-select" id="taskStatusUpdate">
            <option value="Not Started" ${task.status === 'Not Started' ? 'selected' : ''}>Not Started</option>
            <option value="In Progress" ${task.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
            <option value="Blocked" ${task.status === 'Blocked' ? 'selected' : ''}>Blocked</option>
            <option value="Completed" ${task.status === 'Completed' ? 'selected' : ''}>Completed</option>
        </select>
    `;
        const footer = document.getElementById('taskDetailsModalFooter');
        footer.innerHTML = `
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
        <button type="button" class="btn btn-primary" id="saveTaskStatusBtn" data-task-id="${task.taskId}">Save Changes</button>
    `;
        taskDetailsModal.show();
    }


    document.getElementById('taskDetailsModalFooter').addEventListener('click', (e) => {
        if (e.target.id === 'saveTaskStatusBtn') {
            const taskId = parseInt(e.target.dataset.taskId);
            const newStatus = document.getElementById('taskStatusUpdate').value;

            let allTasks = DataService.getTasks();
            const taskIndex = allTasks.findIndex(t => t.taskId === taskId);

            if (taskIndex !== -1) {
                allTasks[taskIndex].status = newStatus;
                DataService.saveTasks(allTasks);

               
                myTasks = allTasks.filter(t => t.assignees.includes(currentUser.id));
                renderTasks();

                taskDetailsModal.hide();
                showToast('Task status updated!', 'success');
            }
        }
    });


    document.getElementById('tasksList').addEventListener('click', (e) => {
        if (e.target.classList.contains('view-task-btn')) {
            const taskId = parseInt(e.target.dataset.taskId);
            const task = myTasks.find(t => t.taskId === taskId);
            if (task) {
                showTaskDetails(task);
            }
        }
    });
    document.getElementById('requestForm').addEventListener('submit', (e) => {
        e.preventDefault();

        const allRequests = DataService.getRequests();
        const type = document.getElementById('requestType').value;
        const requestedDate = document.getElementById('requestDate').value;
        const reason = document.getElementById('requestReason').value;

        if (!type || !requestedDate || !reason) {
            showToast('Please fill all required fields.', 'danger');
            return;
        }

        const newRequest = {
            id: Date.now(),
            employeeId: currentUser.id,
            type: type,
            payload: {
                requestedDate: requestedDate,
                reason: reason,
            },
            status: 'Pending',
            managerComment: '',
            createdAt: getISODate()
        };

        if (type === 'Late') {
            newRequest.payload.minutesExpectedLate = parseInt(document.getElementById('lateMinutes').value);
        }

        allRequests.push(newRequest);
        DataService.saveRequests(allRequests);

  
        myRequests = allRequests.filter(r => r.employeeId === currentUser.id);
        renderRequestsHistory();
        renderKPIs();

        showToast('Your request has been submitted successfully!', 'success');
        document.getElementById('requestForm').reset();
        document.getElementById('dynamicFieldsContainer').innerHTML = '';
    });


   

    function init() {
     
        const allData = {
            employees: DataService.getEmployees(),
            attendance: DataService.getAttendance(),
            tasks: DataService.getTasks(),
            requests: DataService.getRequests(),
            settings: DataService.getSettings()
        };
        const today = new Date();

       
        payrollImpact = SalaryCalculator.calculateMonthlyImpact(currentUser.id, today.getFullYear(), today.getMonth(), allData);

       
        renderKPIs();
        renderAttendance();
        renderTasks();
        renderRequestForm();
        renderRequestsHistory();
        renderPayrollImpact(); 
    }

    init();
});