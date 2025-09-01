// js/utils.js (FINAL, CLEAN VERSION)

// --- Application-wide Constants (DEFINED ONLY ONCE, HERE) ---
const AppConfig = {
    WORK_START_TIME: '09:00',
    LATE_THRESHOLD_TIME: '11:00',
    WORK_END_TIME: '17:00',
    LATE_PERMISSION_QUOTA_PER_MONTH: 2,
    WFH_QUOTA_PER_WEEK: 2,
};

// --- Helper Functions ---
function getISODate(date = new Date()) {
    return date.toISOString().split("T")[0];
}

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
}

function showToast(message, type = "success") {
    // ... your showToast function code ...
}

function calculateAttendanceDetails(checkInTime) {
    if (!checkInTime) {
        return { status: "Absent", minutesLate: 0 };
    }
    const today = getISODate();
    const startTime = new Date(`${today}T${AppConfig.WORK_START_TIME}`);
    const lateThreshold = new Date(`${today}T${AppConfig.LATE_THRESHOLD_TIME}`);
    const checkInDateTime = new Date(`${today}T${checkInTime}`);

    if (checkInDateTime <= startTime) {
        return { status: "Present", minutesLate: 0 };
    }
    const minutesLate = Math.round((checkInDateTime - startTime) / 60000);
    if (checkInDateTime > startTime && checkInDateTime <= lateThreshold) {
        return { status: "Late", minutesLate };
    }
    return { status: "Absent", minutesLate };
}

// --- Salary Calculator (Ready for Day 5) ---
const SalaryCalculator = {
    // ... The full SalaryCalculator object from our previous discussion ...
};