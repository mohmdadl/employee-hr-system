
const DataService = {
   
    //   Initializes the database in localStorage.
    //   If data doesnt exist, it copies the initial data from mock-data.js.
    //   This should be called once when the application starts.
     
    init: function() {
        if (!localStorage.getItem('employees')) {
            console.log('DataService: Initializing data in localStorage from mock-data.js...');
            localStorage.setItem('employees', JSON.stringify(employees || []));
            localStorage.setItem('attendanceRecords', JSON.stringify(attendanceRecords || []));
            localStorage.setItem('tasks', JSON.stringify(tasks || []));
            localStorage.setItem('permissionRequests', JSON.stringify(permissionRequests || []));
            localStorage.setItem('hrSettings', JSON.stringify(hrSettings || {}));
            localStorage.setItem('approvedLeaves', JSON.stringify(approvedLeaves || []));
            console.log('DataService: Initialization complete.');
        }
    },


    // --- GETTERS (Functions to read data) ---

    getEmployees: () => JSON.parse(localStorage.getItem('employees')),
    getAttendance: () => JSON.parse(localStorage.getItem('attendanceRecords')),
    getTasks: () => JSON.parse(localStorage.getItem('tasks')),
    getRequests: () => JSON.parse(localStorage.getItem('permissionRequests')),
    getSettings: () => JSON.parse(localStorage.getItem('hrSettings')),
    getApprovedLeaves: () => JSON.parse(localStorage.getItem('approvedLeaves')),



    // --- SETTERS (Functions to write/update data) ---

    /**
     * Saves the entire attendance records array to localStorage.
     * @param {Array<object>} data - The updated array of attendance records.
     */
    saveAttendance: (data) => localStorage.setItem('attendanceRecords', JSON.stringify(data)),

    /**
     * Saves the entire tasks array to localStorage.
     * @param {Array<object>} data - The updated array of tasks.
     */
    saveTasks: (data) => localStorage.setItem('tasks', JSON.stringify(data)),

    /**
     * Saves the entire permission requests array to localStorage.
     * @param {Array<object>} data - The updated array of permission requests.
     */
    saveRequests: (data) => localStorage.setItem('permissionRequests', JSON.stringify(data)),

    /**
     * Saves the HR settings object to localStorage.
     * @param {object} data - The updated settings object.
     
    saveSettings: (data) => localStorage.setItem('hrSettings', JSON.stringify(data)),

    /**
     * Saves the entire approved leaves array to localStorage.
     * @param {Array<object>} data - The updated array of approved leaves.
     */
    saveApprovedLeaves: (data) => localStorage.setItem('approvedLeaves', JSON.stringify(data))
};

// --- IMPORTANT: Initialize the DataService as soon as the script loads ---
DataService.init();


// =================================================================
// --- The rest of your main.js file (Authentication, Navbar, etc.) ---
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    // ... your existing code for currentUser and renderNavbar ...
});

function renderNavbar(user) {
    // ... your existing renderNavbar function ...
}