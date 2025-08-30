// js/mock-data.js

const employees = [

    { id: 1, name: 'Amr Ahmed', department: 'IT', role: 'Employee', managerId: 2, monthlySalary: 5000, annualVacationDays: 21, email: 'employee@demo.com', password: '123' },
    { id: 5, name: 'Noha Adel', department: 'IT', role: 'Employee', managerId: 2, monthlySalary: 5200, annualVacationDays: 21, email: 'noha@demo.com', password: '123' },


    { id: 2, name: 'Fatima Ali', department: 'IT', role: 'Manager', monthlySalary: 9000, annualVacationDays: 21, email: 'manager@demo.com', password: '123' },
    { id: 3, name: 'Sayed Ibrahim', department: 'Operations', role: 'Security', email: 'security@demo.com', password: '123' },
    { id: 4, name: 'Ali Hassan', department: 'HR', role: 'HR', email: 'hr@demo.com', password: '123' }
];


const attendanceRecords = [
    { id: 1, employeeId: 1, date: '2025-08-25', checkIn: '09:35', checkOut: '17:05', status: 'Late', minutesLate: 35, isWFH: false, isLeave: false, notes: '' },
];

const tasks = [
    { taskId: 1, title: 'Deploy new server', description: 'Deploy the new staging server for project X', priority: 'High', deadline: '2025-08-29T17:00:00', assignees: [1, 5], status: 'In Progress' },
    { taskId: 2, title: 'Update documentation', description: 'Update the user guide for the new release', priority: 'Medium', deadline: '2025-09-05T17:00:00', assignees: [1], status: 'Not Started' },
    { taskId: 3, title: 'Review quarterly budget', description: 'Review and approve the Q3 budget proposal', priority: 'Critical', deadline: '2025-08-27T12:00:00', assignees: [2], status: 'Not Started' }
];

const permissionRequests = [
    { id: 1, employeeId: 5, type: 'WFH', payload: { requestedDate: '2025-08-28', reason: 'Plumber appointment in the morning' }, status: 'Pending', managerComment: '', createdAt: '2025-08-26' },
    { id: 2, employeeId: 1, type: 'Late', payload: { requestedDate: '2025-08-27', minutesExpectedLate: 30, reason: 'Heavy traffic expected' }, status: 'Pending', managerComment: '', createdAt: '2025-08-26' },
];


const approvedLeaves = [
    { employeeId: 5, date: '2025-08-29', type: 'Annual Leave' }
];

const hrSettings = {
    latePenaltyTiers: {
        tier1: { from: 16, to: 30, penalty: 5 },   // 5% of daily wage
        tier2: { from: 31, to: 60, penalty: 10 },  // 10%
        tier3: { from: 61, to: 120, penalty: 20 }  // 20%
    },
    overtimeMultiplier: {
        weekday: 1.25,
        weekend: 1.5
    },
    taskPenalty: {
        Low: 5, Medium: 8, High: 12, Critical: 15
    },
    deductionCap: 25,
    idealEmployeeBonus: 10
};