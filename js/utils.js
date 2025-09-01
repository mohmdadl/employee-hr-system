
// js/utils.js

const AppConfig = {
    WORK_START_TIME: '09:00',
    LATE_THRESHOLD_TIME: '11:00',
    WORK_END_TIME: '17:00',
    LATE_PERMISSION_QUOTA_PER_MONTH: 2,
    WFH_QUOTA_PER_WEEK: 2,
};


/**
 * @param {Date} d - كائن التاريخ
 * @returns {number}
 */
function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
}

/**
 * @param {Date} date - كائن التاريخ
 * @returns {string}
 */
function getISODate(date = new Date()) {
    return date.toISOString().split('T')[0];
}


/**
 * @param {string | null} checkInTime - وقت الحضور بصيغة "HH:MM"
 * @returns {object} - { status: string, minutesLate: number }
 */
function calculateAttendanceDetails(checkInTime, recordDate = getISODate()) {
    if (!checkInTime) {
        return { status: 'Absent', minutesLate: 0 };
    }

    const startTime = new Date(`${recordDate}T${AppConfig.WORK_START_TIME}`);
    const lateThreshold = new Date(`${recordDate}T${AppConfig.LATE_THRESHOLD_TIME}`);
    const checkInDateTime = new Date(`${recordDate}T${checkInTime}`);

    if (checkInDateTime <= startTime) {
        return { status: 'Present', minutesLate: 0 };
    }

    const minutesLate = Math.round((checkInDateTime - startTime) / 60000);

    if (checkInDateTime > startTime && checkInDateTime <= lateThreshold) {
        return { status: 'Late', minutesLate };
    }

    return { status: 'Absent', minutesLate };
}



/**
 * @param {string} message - الرسالة المراد عرضها
 * @param {string} type - 'success', 'danger', 'info', 'warning'
 */
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        console.error('Toast container not found!');
        return;
    }

    const toastId = 'toast-' + Math.random().toString(36).substr(2, 9);
    const toastHTML = `
        <div id="${toastId}" class="toast align-items-center text-bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;
    toastContainer.insertAdjacentHTML('beforeend', toastHTML);

    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: 4000 });
    toast.show();
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}


// js/utils.js (append this code)

// =================================================================
// --- Salary Impact Calculation Module ---
// =================================================================

const SalaryCalculator = {
    /**
     * Calculates the penalty for a single late attendance record.
     * @param {number} minutesLate - The number of minutes the employee was late.
     * @param {number} dailyWage - The employee's daily wage.
     * @param {object} settings - The HR settings object containing penalty tiers.
     * @returns {number} - The calculated penalty amount.
     */
    getLatePenalty: function (minutesLate, dailyWage, settings) {
        if (minutesLate <= 0) return 0; // No penalty for on time or early

        // Dynamic penalty: 5% of daily wage for any late arrival
        return dailyWage * (5 / 100);
    },

    /**
     * Calculates all financial impacts for a single employee for a given month.
     * @param {number} employeeId - The ID of the employee.
     * @param {number} year - The year (e.g., 2025).
     * @param {number} month - The month (0-11, where 0 is January).
     * @param {object} data - An object containing all necessary data: { employees, attendance, tasks, requests, settings }.
     * @returns {object} - A MonthlyPayrollImpact object.
     */
    calculateMonthlyImpact: function (employeeId, year, month, data) {
        const employee = data.employees.find(e => e.id === employeeId);
        if (!employee) return null;

        const monthlySalary = employee.monthlySalary;
        const dailyWage = monthlySalary / 22; // Dynamic calculation based on working days
        const hourlyRate = dailyWage / 8;

        const impact = {
            employeeId,
            month: `${year}-${String(month + 1).padStart(2, '0')}`,
            totalDeductions: 0,
            latePenalty: 0,
            absencePenalty: 0,
            taskPenalty: 0,
            overtimePay: 0,
            bonus: 0,
            capApplied: false,
            finalImpact: 0,
            details: [] // To store detailed breakdown of each deduction/bonus
        };

        // --- Filter records for the specified month ---
        const employeeAttendance = data.attendance.filter(r =>
            r.employeeId === employeeId &&
            new Date(r.date).getFullYear() === year &&
            new Date(r.date).getMonth() === month
        );
        const employeeRequests = data.requests.filter(r =>
            r.employeeId === employeeId &&
            new Date(r.payload.requestedDate).getFullYear() === year &&
            new Date(r.payload.requestedDate).getMonth() === month
        );
        const employeeTasks = data.tasks.filter(t =>
            t.assignees.includes(employeeId) &&
            new Date(t.deadline).getFullYear() === year &&
            new Date(t.deadline).getMonth() === month
        );

        // 1. Calculate Late Penalties
        const approvedLatePermissionDates = employeeRequests
            .filter(r => r.type === 'Late' && r.status === 'Approved')
            .map(r => r.payload.requestedDate);

        employeeAttendance.forEach(rec => {
            if (rec.status === 'Late' && !approvedLatePermissionDates.includes(rec.date)) {
                const penalty = this.getLatePenalty(rec.minutesLate, dailyWage, data.settings);
                impact.details.push({ date: rec.date, type: 'Late', amount: -penalty, reason: `${rec.minutesLate} minutes late.` });
                if (penalty > 0) {
                    impact.latePenalty += penalty;
                }
            }
        });

        // 2. Calculate Absence Penalties
        employeeAttendance.forEach(rec => {
            if (rec.status === 'Absent') {
                const approvedAbsence = employeeRequests.some(r => r.type === 'Absence' && r.status === 'Approved' && r.payload.requestedDate === rec.date);
                if (!approvedAbsence) {
                    impact.absencePenalty += dailyWage;
                    impact.details.push({ date: rec.date, type: 'Absence', amount: -dailyWage, reason: `Unapproved absence.` });
                }
            }
        });

        // --- Add a new check for missed checkouts within the attendance loop ---
        employeeAttendance.forEach(rec => {
            if (rec.checkIn && !rec.checkOut) {
                // This record has a missed checkout. Add a note for HR reports.
                impact.details.push({ date: rec.date, type: 'Flag', amount: 0, reason: `Missed checkout. Assumed 17:00 for calculations.` });
            }
        });

        // 3. Calculate Missed Deadline Task Penalties
        employeeTasks.forEach(task => {
            if (task.status !== 'Completed' && new Date(task.deadline) < new Date()) {
                const penaltyPercent = data.settings.taskPenalty[task.priority];
                const penalty = dailyWage * (penaltyPercent / 100);
                impact.taskPenalty += penalty;
                impact.details.push({ date: task.deadline.split('T')[0], type: 'Task Penalty', amount: -penalty, reason: `Missed deadline for "${task.title}"` });
            }
        });


        // 4. Calculate Overtime Pay
        const approvedOvertimeRequests = employeeRequests
            .filter(r => r.type === 'Overtime' && r.status === 'Approved');

        approvedOvertimeRequests.forEach(req => {
            const overtimeHours = req.payload.overtimeHours;
            const isWeekend = [0, 6].includes(new Date(req.payload.requestedDate).getDay());
            const multiplier = isWeekend ? data.settings.overtimeMultiplier.weekend : data.settings.overtimeMultiplier.weekday;
            const pay = overtimeHours * hourlyRate * multiplier;
            impact.overtimePay += pay;
            impact.details.push({ date: req.payload.requestedDate, type: 'Overtime', amount: pay, reason: `${overtimeHours} hours at ${multiplier}x rate.` });
        });


        // 4. TODO: Calculate Overtime Pay
        // This would be similar, filtering for approved Overtime requests.

        // 5. TODO: Calculate Ideal Employee Bonus

        // --- Apply Monthly Cap ---
        impact.totalDeductions = impact.latePenalty + impact.absencePenalty + impact.taskPenalty;
        const capAmount = monthlySalary * (data.settings.deductionCap / 100);
        if (impact.totalDeductions > capAmount) {
            impact.totalDeductions = capAmount;
            impact.capApplied = true;
        }

        impact.finalImpact = (impact.overtimePay + impact.bonus) - impact.totalDeductions;

        return impact;
    }
};


// js/utils.js (append this code)

// =================================================================
// --- Ideal Employee Calculation ---
// =================================================================

/**
 * Determines the Ideal Employee(s) of the Month based on strict criteria.
 * @param {number} year - The year (e.g., 2025).
 * @param {number} month - The month (0-11).
 * @param {object} data - An object containing all necessary data.
 * @returns {Array<object>} - An array of winning employee objects.
 */
function findIdealEmployee(year, month, data) {
    const candidates = data.employees.filter(e => e.role === 'Employee');
    const winners = [];

    candidates.forEach(candidate => {
        // --- Filter data for this candidate and this month ---
        const attendance = data.attendance.filter(r =>
            r.employeeId === candidate.id &&
            new Date(r.date).getFullYear() === year &&
            new Date(r.date).getMonth() === month
        );
        const tasks = data.tasks.filter(t =>
            t.assignees.includes(candidate.id) &&
            new Date(t.deadline).getFullYear() === year &&
            new Date(t.deadline).getMonth() === month
        );
        const requests = data.requests.filter(r =>
            r.employeeId === candidate.id &&
            new Date(r.payload.requestedDate).getFullYear() === year &&
            new Date(r.payload.requestedDate).getMonth() === month
        );

        // --- CRITERIA 1: Zero late arrivals ---
        // Also checks that they didn't use an approved late permission
        const hasUsedLatePermission = requests.some(r => r.type === 'Late' && r.status === 'Approved');
        const hasLateArrivals = attendance.some(r => r.status === 'Late');
        if (hasLateArrivals || hasUsedLatePermission) {
            return; // Disqualified
        }

        // --- CRITERIA 2: Zero missed task deadlines ---
        const hasMissedDeadlines = tasks.some(t =>
            t.status !== 'Completed' && new Date(t.deadline) < new Date()
        );
        if (hasMissedDeadlines) {
            return; // Disqualified
        }

        // If all checks pass, they are a winner
        winners.push(candidate);
    });

    // TODO: Implement Tie-Breakers if needed
    return winners;
}
/**
 * Updates payroll impact for a given employee immediately when attendance changes.
 * @param {number} employeeId
 * @param {object} details - attendance details from calculateAttendanceDetails
 */
function updatePayrollImpact(employeeId, details) {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    const data = {
        employees: DataService.getEmployees(),
        attendance: DataService.getAttendance(),
        tasks: DataService.getTasks(),
        requests: DataService.getRequests(),
        settings: DataService.getSettings(),
    };

    const impact = SalaryCalculator.calculateMonthlyImpact(employeeId, year, month, data);

    // تخزين النتيجة في localStorage عشان HR أو payroll page تقدر تعرضها
    localStorage.setItem("payrollImpact_" + employeeId, JSON.stringify(impact));

    return impact;
}



/**
 * Converts an array of objects to a CSV string and triggers a download.
 * @param {Array<object>} data - The data to export.
 * @param {string} filename - The desired filename for the downloaded file.
 */
function exportToCsv(data, filename = 'report.csv') {
    if (data.length === 0) {
        console.error("No data to export.");
        return;
    }
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')]; // Header row

    data.forEach(row => {
        const values = headers.map(header => {
            const escaped = ('' + row[header]).replace(/"/g, '""'); // Escape double quotes
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}