// js/security.js (Final, Corrected Version)

document.addEventListener('DOMContentLoaded', () => {
    const today = getISODate();
    document.getElementById('todayDate').textContent = today;
    const searchInput = document.getElementById('searchInput');

    let allEmployees = DataService.getEmployees().filter(e => e.role === 'Employee');
    let attendance = DataService.getAttendance();
    let approvedLeaves = DataService.getApprovedLeaves ? DataService.getApprovedLeaves() : [];

    // --- RENDER FUNCTION ---
    function renderBoard(searchTerm = '') {
        const boardBody = document.getElementById('attendanceBoardBody');
        boardBody.innerHTML = `<tr><td colspan="6" class="text-center">Loading...</td></tr>`;

        const filteredEmployees = allEmployees.filter(emp => emp.name.toLowerCase().includes(searchTerm.toLowerCase()));
        if (filteredEmployees.length === 0) {
            boardBody.innerHTML = `<tr><td colspan="6" class="text-center">No employees found.</td></tr>`;
            return;
        }

        boardBody.innerHTML = '';
        filteredEmployees.forEach(emp => {
            let record = attendance.find(r => r.employeeId === emp.id && r.date === today);
            if (!record) {
                record = { id: Date.now(), employeeId: emp.id, date: today, checkIn: null, checkOut: null, status: 'Absent', minutesLate: 0, notes: '' };
                attendance.push(record);
            }

            const tr = document.createElement('tr');
            tr.dataset.employeeId = emp.id;

            if (record.checkIn && !record.checkOut) {
                tr.classList.add('table-info'); // Flag for missed checkout
            }

            tr.innerHTML = `
                <td>${emp.name} <br> <small class="text-muted">${emp.department || ''}</small></td>
                <td><input type="time" class="form-control form-control-sm check-in-input" value="${record.checkIn || ''}"></td>
                <td><input type="time" class="form-control form-control-sm check-out-input" value="${record.checkOut || ''}"></td>
                <td>
                    <select class="form-select form-select-sm status-select">
                        <option value="Present" ${record.status === 'Present' ? 'selected' : ''}>Present</option>
                        <option value="Late" ${record.status === 'Late' ? 'selected' : ''}>Late</option>
                        <option value="Absent" ${record.status === 'Absent' ? 'selected' : ''}>Absent</option>
                        <option value="Leave" ${record.status === 'Leave' ? 'selected' : ''}>Leave</option>
                    </select>
                </td>
                <td><input type="text" class="form-control form-control-sm notes-input" value="${record.notes || ''}" placeholder="Add optional note..."></td>
                <td class="text-end">
                    <button class="btn btn-sm btn-success save-btn" title="Save Record"><i class="bi bi-check-lg"></i></button>
                </td>
            `;
            boardBody.appendChild(tr);
        });
    }

    // --- EVENT LISTENERS ---
    const boardBody = document.getElementById('attendanceBoardBody');

    // Automatically update status when check-in time changes
    boardBody.addEventListener('change', (e) => {
        const tr = e.target.closest('tr');
        if (!tr) return;

        if (e.target.classList.contains('check-in-input')) {
            const checkInTime = e.target.value;
            // Use the universal `calculateAttendanceDetails` from utils.js
            const { status } = calculateAttendanceDetails(checkInTime); 
            tr.querySelector('.status-select').value = status;
        }
        tr.classList.add('table-warning'); // Mark as unsaved
    });

    // Handle the Save button click
    boardBody.addEventListener('click', (e) => {
        const saveButton = e.target.closest('.save-btn');
        if (!saveButton) return;

        const tr = saveButton.closest('tr');
        const employeeId = parseInt(tr.dataset.employeeId);
        const employeeName = tr.querySelector('td').firstChild.textContent.trim();

        const recordIndex = attendance.findIndex(r => r.employeeId === employeeId && r.date === today);
        if (recordIndex === -1) {
            console.error("Critical error: Record not found on save.");
            return;
        }

        const checkInTime = tr.querySelector('.check-in-input').value || null;
        const checkOutTime = tr.querySelector('.check-out-input').value || null;
        const status = tr.querySelector('.status-select').value;
        const notes = tr.querySelector('.notes-input').value;
        
        // Recalculate details based on final check-in time
        const { minutesLate } = calculateAttendanceDetails(checkInTime);

        // Update the record in our main `attendance` array
        attendance[recordIndex] = {
            ...attendance[recordIndex], // Keep old properties like id
            checkIn: checkInTime,
            checkOut: checkOutTime,
            status: status,
            notes: notes,
            minutesLate: minutesLate
        };
        
        // Save the entire updated array to localStorage
        DataService.saveAttendance(attendance);

        tr.classList.remove('table-warning', 'table-info'); // Remove unsaved and missed-checkout flags
        if (checkInTime && !checkOutTime) {
            tr.classList.add('table-info'); // Re-add flag if checkout is still missing
        }

        showToast(`Record for ${employeeName} saved successfully.`, 'success');
    });

    searchInput.addEventListener("input", (e) => renderBoard(e.target.value));

    // --- INITIALIZATION ---
    renderBoard();
});