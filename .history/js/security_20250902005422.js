// js/security.js (The True Final "Golden" Version)

document.addEventListener('DOMContentLoaded', () => {
    // =================================================================
    // --- 1. SCRIPT INITIALIZATION & STATE ---
    // =================================================================
    const today = getISODate(); // Assumes getISODate is in utils.js
    const todayDateEl = document.getElementById("todayDate");
    if (todayDateEl) {
        todayDateEl.textContent = today;
    }
    const searchInput = document.getElementById("searchInput");
    const boardBody = document.getElementById("attendanceBoardBody");

    // Fetch all necessary data at the start
    let allEmployees = DataService.getEmployees().filter(e => e.role === 'Employee');
    let attendance = DataService.getAttendance();
    let allRequests = DataService.getRequests();


    // =================================================================
    // --- 2. RENDER FUNCTION ---
    // =================================================================

    function renderBoard(searchTerm = "") {
        boardBody.innerHTML = `<tr><td colspan="6" class="text-center">Loading...</td></tr>`;

        const filteredEmployees = allEmployees.filter(emp => emp.name.toLowerCase().includes(searchTerm.toLowerCase()));
        if (filteredEmployees.length === 0) {
            boardBody.innerHTML = `<tr><td colspan="6" class="text-center">No employees found.</td></tr>`;
            return;
        }

        boardBody.innerHTML = "";
        filteredEmployees.forEach(emp => {
            let record = attendance.find(r => r.employeeId === emp.id && r.date === today);

            // Check for an approved request for today BEFORE creating a default record
            const approvedRequest = allRequests.find(r =>
                r.employeeId === emp.id &&
                r.payload.requestedDate === today &&
                r.status === 'Approved'
            );

            // If no record exists yet, but there IS an approved request, create one based on it.
            if (!record && approvedRequest) {
                let newStatus = 'Absent';
                let newNotes = '';
                if (approvedRequest.type === 'Absence') {
                    newStatus = 'Leave';
                    newNotes = 'Approved Absence';
                } else if (approvedRequest.type === 'WFH') {
                    newStatus = 'Present';
                    newNotes = 'WFH (Approved)';
                }
                record = { id: Date.now(), employeeId: emp.id, date: today, checkIn: null, checkOut: null, status: newStatus, minutesLate: 0, notes: newNotes };
                attendance.push(record);
            }

            // If still no record, create the default 'Absent' one
            if (!record) {
                record = { id: Date.now(), employeeId: emp.id, date: today, checkIn: null, checkOut: null, status: 'Absent', minutesLate: 0, notes: '' };
                attendance.push(record);
            }

            const tr = document.createElement("tr");
            tr.dataset.employeeId = emp.id;
            const isPreSet = record.status === 'Leave' || (record.notes && record.notes.includes('WFH'));

            if (record.checkIn && !record.checkOut) {
                tr.classList.add("table-info"); // Visual flag for missed checkout
            }

            tr.innerHTML = `
                <td>${emp.name} <br> <small class="text-muted">${emp.department || ''}</small></td>
                <td><input type="time" class="form-control form-control-sm check-in-input" value="${record.checkIn || ''}" ${isPreSet ? 'disabled' : ''}></td>
                <td><input type="time" class="form-control form-control-sm check-out-input" value="${record.checkOut || ''}" ${isPreSet ? 'disabled' : ''}></td>
                <td>
                    <select class="form-select form-select-sm status-select" ${isPreSet ? 'disabled' : ''}>
                        <option value="Present" ${record.status === 'Present' ? 'selected' : ''}>Present</option>
                        <option value="Late" ${record.status === 'Late' ? 'selected' : ''}>Late</option>
                        <option value="Absent" ${record.status === 'Absent' ? 'selected' : ''}>Absent</option>
                        <option value="Leave" ${record.status === 'Leave' ? 'selected' : ''}>Leave</option>
                    </select>
                </td>
                <td><input type="text" class="form-control form-control-sm notes-input" value="${record.notes || ''}" placeholder="Add optional note..."></td>
                <td class="text-end">
                    <button class="btn btn-sm btn-success save-btn" title="Save Record" ${isPreSet ? 'disabled' : ''}><i class="bi bi-check-lg"></i></button>
                </td>
            `;
            boardBody.appendChild(tr);
        });
    }


    // =================================================================
    // --- 3. EVENT LISTENERS ---
    // =================================================================

    // Handles automatic status update when check-in time changes
    boardBody.addEventListener('change', (e) => {
        const tr = e.target.closest('tr');
        if (!tr) return;

        if (e.target.classList.contains('check-in-input')) {
            const checkInTime = e.target.value;
            // Use the universal function from utils.js
            const { status } = calculateAttendanceDetails(checkInTime);
            tr.querySelector('.status-select').value = status;
        }
        tr.classList.add('table-warning'); // Mark row as having unsaved changes
    });

    // Handles the final save action for a record
    boardBody.addEventListener('click', (e) => {
        const saveButton = e.target.closest('.save-btn');
        if (!saveButton) return;
        
        const tr = saveButton.closest('tr');
        const employeeId = parseInt(tr.dataset.employeeId);
        const employeeName = tr.querySelector("td").firstChild.textContent.trim();
        const recordIndex = attendance.findIndex(r => r.employeeId === employeeId && r.date === today);

        if (recordIndex === -1) {
            console.error("Critical error: Record not found on save.");
            return;
        }
        
        const checkInTime = tr.querySelector('.check-in-input').value || null;
        const { minutesLate } = calculateAttendanceDetails(checkInTime); // Recalculate from final time
        
        // Update the record in the main attendance array
        attendance[recordIndex] = {
            ...attendance[recordIndex],
            checkIn: checkInTime,
            checkOut: tr.querySelector('.check-out-input').value || null,
            status: tr.querySelector('.status-select').value,
            notes: tr.querySelector('.notes-input').value,
            minutesLate: minutesLate
        };
        
        DataService.saveAttendance(attendance);

        tr.classList.remove('table-warning');
        showToast(`Record for ${employeeName} saved successfully.`, 'success');
        
        // Optionally, re-render to ensure UI is perfectly consistent after save
        renderBoard(searchInput.value);
    });

    // Handles the search input
    searchInput.addEventListener("input", (e) => renderBoard(e.target.value));


    // =================================================================
    // --- 4. INITIALIZATION ---
    // =================================================================
    renderBoard();

}); // End of DOMContentLoaded