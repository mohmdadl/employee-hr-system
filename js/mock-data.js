// js/mock-data.js

const employees = [

    { id: 1, name: 'Amr Ahmed', department: 'IT', role: 'Employee', managerId: 2, monthlySalary: 5000, annualVacationDays: 21, email: 'employee@demo.com', password: '123' },
    { id: 5, name: 'Noha Adel', department: 'IT', role: 'Employee', managerId: 2, monthlySalary: 6000, annualVacationDays: 21, email: 'noha@demo.com', password: '123' },


    { id: 2, name: 'Fatima Ali', department: 'IT', role: 'Manager', monthlySalary: 9000, annualVacationDays: 21, email: 'manager@demo.com', password: '123' },
    { id: 3, name: 'Sayed Ibrahim', department: 'Operations', role: 'Security', email: 'security@demo.com', password: '123' },
    { id: 4, name: 'Ali Hassan', department: 'HR', role: 'HR', email: 'hr@demo.com', password: '123' }
];


const attendanceRecords = [
    // Employee 1
    { id: 1, employeeId: 1, date: '2025-08-25', checkIn: '09:35', checkOut: '17:05', status: 'Late', minutesLate: 35, isWFH: false, isLeave: false, notes: 'Traffic jam' },
    { id: 2, employeeId: 1, date: '2025-08-26', checkIn: '09:05', checkOut: '17:00', status: 'On Time', minutesLate: 0, isWFH: true, isLeave: false, notes: 'WFH approved' },
    { id: 3, employeeId: 1, date: '2025-08-27', checkIn: '08:55', checkOut: '17:10', status: 'On Time', minutesLate: 0, isWFH: false, isLeave: false, notes: '' },

    // Employee 5
    { id: 4, employeeId: 5, date: '2025-08-25', checkIn: '09:10', checkOut: '17:00', status: 'Late', minutesLate: 10, isWFH: false, isLeave: false, notes: 'Late permission approved' },
    { id: 5, employeeId: 5, date: '2025-08-26', checkIn: '09:00', checkOut: '17:00', status: 'On Time', minutesLate: 0, isWFH: true, isLeave: false, notes: 'Working from home' },
    { id: 6, employeeId: 5, date: '2025-08-27', checkIn: '09:15', checkOut: '17:05', status: 'Late', minutesLate: 15, isWFH: false, isLeave: false, notes: 'Traffic jam' },

    // Employee 5 additional WFH and Late
    { id: 7, employeeId: 5, date: '2025-08-28', checkIn: '08:00', checkOut: '16:00', status: 'On Time', minutesLate: 0, isWFH: true, isLeave: false, notes: 'WFH approved' },
    { id: 8, employeeId: 5, date: '2025-08-29', checkIn: '09:20', checkOut: '17:10', status: 'Late', minutesLate: 20, isWFH: false, isLeave: false, notes: 'Doctor appointment' }
];



const tasks = [
    { taskId: 1, title: 'Deploy new server', description: 'Deploy the new staging server for project X', priority: 'High', deadline: '2025-08-29T17:00:00', assignees: [1, 5], status: 'In Progress' },
    { taskId: 2, title: 'Update documentation', description: 'Update the user guide for the new release', priority: 'Medium', deadline: '2025-09-05T17:00:00', assignees: [1], status: 'Not Started' },
    { taskId: 3, title: 'Review quarterly budget', description: 'Review and approve the Q3 budget proposal', priority: 'Critical', deadline: '2025-08-27T12:00:00', assignees: [2], status: 'Not Started' },
    { taskId: 4, title: 'Client meeting preparation', description: 'Prepare slides and notes for client presentation', priority: 'High', deadline: '2025-08-30T10:00:00', assignees: [1], status: 'Not Started' },
    { taskId: 5, title: 'Code review', description: 'Review pull requests from team members', priority: 'Medium', deadline: '2025-08-31T15:00:00', assignees: [1, 3], status: 'In Progress' },
    { taskId: 6, title: 'Team training session', description: 'Conduct internal training for new tools', priority: 'Low', deadline: '2025-09-02T14:00:00', assignees: [1], status: 'Not Started' },
    { taskId: 7, title: 'Bug fixes', description: 'Fix reported issues from QA team', priority: 'Critical', deadline: '2025-08-29T18:00:00', assignees: [1, 4], status: 'In Progress' },
    { taskId: 8, title: 'Bug fixes', description: 'Fix reported issues from QA team', priority: 'Critical', deadline: '2025-08-29T18:00:00', assignees: [1, 4], status: 'In Progress' },

    { taskId: 9, title: 'Update IT inventory', description: 'Update and categorize IT department equipment', priority: 'Medium', deadline: '2025-09-03T12:00:00', assignees: [5], status: 'Not Started' },
    { taskId: 10, title: 'Prepare monthly report', description: 'Prepare monthly IT activity report', priority: 'High', deadline: '2025-09-04T16:00:00', assignees: [5], status: 'Not Started' },
    { taskId: 11, title: 'Server maintenance', description: 'Perform regular server maintenance', priority: 'Critical', deadline: '2025-08-30T14:00:00', assignees: [5], status: 'In Progress' }
];


const permissionRequests = [
    { id: 1, employeeId: 5, type: 'WFH', payload: { requestedDate: '2025-08-28', reason: 'Plumber appointment' }, status: 'Approved', managerComment: '', createdAt: '2025-08-26' },
    { id: 2, employeeId: 1, type: 'Late', payload: { requestedDate: '2025-08-27', minutesExpectedLate: 30, reason: 'Traffic jam' }, status: 'Approved', managerComment: '', createdAt: '2025-08-26' },
    { id: 3, employeeId: 5, type: 'Late', payload: { requestedDate: '2025-08-29', minutesExpectedLate: 20, reason: 'Doctor appointment' }, status: 'Pending', managerComment: '', createdAt: '2025-08-28' }
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