// document.addEventListener("DOMContentLoaded", () => {
//   const currentUser = JSON.parse(localStorage.getItem("currentUser"));
//   if (!currentUser || currentUser.role !== "HR") return;

//   let settings = DataService.getSettings();
//   let allEmployees = DataService.getEmployees();
//   let lastReportData = [];

//   const generateReportBtn = document.getElementById("generateReportBtn");
//   const reportMonthInput = document.getElementById("reportMonth");
//   const reportOutputDiv = document.getElementById("reportOutput");
//   const exportCsvBtn = document.getElementById("exportCsvBtn");

//   function renderKPIs() {
//     const attendance = DataService.getAttendance();
//     const requests = DataService.getRequests();
//     const today = getISODate();
//     const todayAttendance = attendance.filter((r) => r.date === today);

//     document.getElementById("presentKpi").textContent = todayAttendance.filter(
//       (r) => r.status === "Present" || r.isWFH
//     ).length;
//     document.getElementById("lateKpi").textContent = todayAttendance.filter(
//       (r) => r.status === "Late"
//     ).length;

//     const totalEmployees = allEmployees.filter(
//       (e) => e.role === "Employee"
//     ).length;
//     const onLeave = todayAttendance.filter((r) => r.status === "Leave").length;
//     const attended = todayAttendance.filter(
//       (r) => r.status === "Present" || r.status === "Late" || r.isWFH
//     ).length;
//     document.getElementById("absentKpi").textContent =
//       totalEmployees - attended - onLeave;

//     document.getElementById("pendingKpi").textContent = requests.filter(
//       (r) => r.status === "Pending"
//     ).length;
//   }

//   function loadSettings() {
//     document.getElementById("deductionCap").value = settings.deductionCap;
//     document.getElementById("idealBonus").value = settings.idealEmployeeBonus;
//     document.getElementById("overtimeWeekday").value =
//       settings.overtimeMultiplier.weekday;
//     document.getElementById("overtimeWeekend").value =
//       settings.overtimeMultiplier.weekend;
//   }

//   function renderReportTable(reportData) {
//     if (
//       !reportData ||
//       reportData.length === 0 ||
//       reportData.every((r) => r === null)
//     ) {
//       reportOutputDiv.innerHTML = `<p class="text-center text-warning p-3">No employee data available for the selected month.</p>`;
//       exportCsvBtn.disabled = true;
//       return;
//     }

//     const tableHTML = `
//             <table class="table table-sm table-hover">
//                 <thead>
//                     <tr>
//                         <th>Employee</th>
//                         <th>Late Penalty</th>
//                         <th>Absence Penalty</th>
//                         <th>Task Penalty</th>
//                         <th>Total Deductions</th>
//                         <th>Bonuses/OT</th>
//                         <th>Final Impact</th>
//                     </tr>
//                 </thead>
//                 <tbody>
//                     ${reportData
//                       .filter((impact) => impact !== null)
//                       .map(
//                         (impact) => `
//                         <tr>
//                             <td>${
//                               allEmployees.find(
//                                 (e) => e.id === impact.employeeId
//                               ).name
//                             }</td>
//                             <td class="text-danger">${impact.latePenalty.toFixed(
//                               2
//                             )}</td>
//                             <td class="text-danger">${impact.absencePenalty.toFixed(
//                               2
//                             )}</td>
//                             <td class="text-danger">${impact.taskPenalty.toFixed(
//                               2
//                             )}</td>
//                             <td class="text-danger fw-bold">${impact.totalDeductions.toFixed(
//                               2
//                             )} ${
//                           impact.capApplied
//                             ? '<span class="badge bg-secondary">Capped</span>'
//                             : ""
//                         }</td>
//                             <td class="text-success">${(
//                               impact.overtimePay + impact.bonus
//                             ).toFixed(2)}</td>
//                             <td class="fw-bold ${
//                               impact.finalImpact >= 0
//                                 ? "text-success"
//                                 : "text-danger"
//                             }">${impact.finalImpact.toFixed(2)}</td>
//                         </tr>
//                     `
//                       )
//                       .join("")}
//                 </tbody>
//             </table>
//         `;
//     reportOutputDiv.innerHTML = tableHTML;
//     exportCsvBtn.disabled = false;
//   }

//   function renderIdealEmployee() {
//     const outputDiv = document.getElementById("idealEmployeeOutput");
//     const today = new Date();
//     const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
//     const year = lastMonth.getFullYear();
//     const month = lastMonth.getMonth();

//     const allData = {
//       employees,
//       attendance: DataService.getAttendance(),
//       tasks: DataService.getTasks(),
//       requests: DataService.getRequests(),
//       settings,
//     };
//     const winners = findIdealEmployee(year, month, allData);
//     const monthName = lastMonth.toLocaleString("default", { month: "long" });

//     if (winners.length === 0) {
//       outputDiv.innerHTML = `<h5 class="card-title">No employees met the strict criteria for ${monthName} ${year}.</h5>`;
//     } else {
//       const winnerNames = winners.map((w) => w.name).join(", ");
//       outputDiv.innerHTML = `
//             <h5 class="card-title">Congratulations to our Ideal Employee(s) for ${monthName} ${year}!</h5>
//             <p class="card-text fs-4 fw-bold text-success">${winnerNames}</p>
//             <p class="text-muted">They will receive a ${settings.idealEmployeeBonus}% bonus on their next paycheck.</p>`;
//     }
//   }

//   // --- Event Listeners ---
//   generateReportBtn.addEventListener("click", () => {
//     const [year, month] = reportMonthInput.value.split("-").map(Number);
//     const monthIndex = month - 1;

//     const allData = {
//       employees,
//       attendance: DataService.getAttendance(),
//       tasks: DataService.getTasks(),
//       requests: DataService.getRequests(),
//       settings,
//     };
//     const reportData = allData.employees
//       .filter((emp) => emp.role === "Employee")
//       .map((emp) =>
//         SalaryCalculator.calculateMonthlyImpact(
//           emp.id,
//           year,
//           monthIndex,
//           allData
//         )
//       );

//     lastReportData = reportData;
//     renderReportTable(reportData);
//   });

//   exportCsvBtn.addEventListener("click", () => {
//     if (lastReportData && lastReportData.length > 0) {
//       const month = document.getElementById("reportMonth").value;
//       const exportData = lastReportData
//         .filter((impact) => impact !== null)
//         .map((impact) => ({
//           employee_name: allEmployees.find((e) => e.id === impact.employeeId)
//             .name,
//           month: impact.month,
//           late_penalty: impact.latePenalty.toFixed(2),
//           absence_penalty: impact.absencePenalty.toFixed(2),
//           task_penalty: impact.taskPenalty.toFixed(2),
//           total_deductions: impact.totalDeductions.toFixed(2),
//           cap_applied: impact.capApplied,
//           overtime_and_bonus: (impact.overtimePay + impact.bonus).toFixed(2),
//           final_impact: impact.finalImpact.toFixed(2),
//         }));
//       exportToCsv(exportData, `payroll_impact_report_${month}.csv`);
//     } else {
//       showToast("Please generate a report before exporting.", "warning");
//     }
//   });

//   document.getElementById("settingsForm").addEventListener("submit", (e) => {
//     e.preventDefault();
//   });

//   function init() {
//     reportMonthInput.value = new Date().toISOString().slice(0, 7);

//     loadSettings();
//     renderKPIs();
//     renderIdealEmployee();
//     generateReportBtn.click();
//   }

//   init();
// });

document.addEventListener("DOMContentLoaded", () => {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser || currentUser.role !== "HR") return;

  let settings = DataService.getSettings();
  let allEmployees = DataService.getEmployees();
  let lastReportData = [];

  const generateReportBtn = document.getElementById("generateReportBtn");
  const reportMonthInput = document.getElementById("reportMonth");
  const reportOutputDiv = document.getElementById("reportOutput");
  const exportCsvBtn = document.getElementById("exportCsvBtn");

  function renderKPIs() {
    const attendance = DataService.getAttendance();
    const requests = DataService.getRequests();
    const today = getISODate();
    const todayAttendance = attendance.filter((r) => r.date === today);

    document.getElementById("presentKpi").textContent = todayAttendance.filter(
      (r) => r.status === "Present" || r.isWFH
    ).length;
    document.getElementById("lateKpi").textContent = todayAttendance.filter(
      (r) => r.status === "Late"
    ).length;

    const totalEmployees = allEmployees.filter(
      (e) => e.role === "Employee"
    ).length;
    const onLeave = todayAttendance.filter((r) => r.status === "Leave").length;
    const attended = todayAttendance.filter(
      (r) => r.status === "Present" || r.status === "Late" || r.isWFH
    ).length;
    document.getElementById("absentKpi").textContent =
      totalEmployees - attended - onLeave;

    document.getElementById("pendingKpi").textContent = requests.filter(
      (r) => r.status === "Pending"
    ).length;
  }

  function loadSettings() {
    document.getElementById("deductionCap").value = settings.deductionCap;
    document.getElementById("idealBonus").value = settings.idealEmployeeBonus;
    document.getElementById("overtimeWeekday").value =
      settings.overtimeMultiplier.weekday;
    document.getElementById("overtimeWeekend").value =
      settings.overtimeMultiplier.weekend;
  }

  function renderReportTable(reportData) {
    if (
      !reportData ||
      reportData.length === 0 ||
      reportData.every((r) => r === null)
    ) {
      reportOutputDiv.innerHTML = `<p class="text-center text-warning p-3">No employee data available for the selected month.</p>`;
      exportCsvBtn.disabled = true;
      return;
    }

    const tableHTML = `
            <table class="table table-sm table-hover">
                <thead>
                    <tr>
                        <th>Employee</th>
                        <th>Late Penalty</th>
                        <th>Absence Penalty</th>
                        <th>Task Penalty</th>
                        <th>Total Deductions</th>
                        <th>Bonuses/OT</th>
                        <th>Final Impact</th>
                    </tr>
                </thead>
                <tbody>
                    ${reportData
                      .filter((impact) => impact !== null)
                      .map(
                        (impact) => `
                        <tr>
                            <td>${
                              allEmployees.find(
                                (e) => e.id === impact.employeeId
                              ).name
                            }</td>
                            <td class="text-danger">${impact.latePenalty.toFixed(
                              2
                            )}</td>
                            <td class="text-danger">${impact.absencePenalty.toFixed(
                              2
                            )}</td>
                            <td class="text-danger">${impact.taskPenalty.toFixed(
                              2
                            )}</td>
                            <td class="text-danger fw-bold">${impact.totalDeductions.toFixed(
                              2
                            )} ${
                          impact.capApplied
                            ? '<span class="badge bg-secondary">Capped</span>'
                            : ""
                        }</td>
                            <td class="text-success">${(
                              impact.overtimePay + impact.bonus
                            ).toFixed(2)}</td>
                            <td class="fw-bold ${
                              impact.finalImpact >= 0
                                ? "text-success"
                                : "text-danger"
                            }">${impact.finalImpact.toFixed(2)}</td>
                        </tr>
                    `
                      )
                      .join("")}
                </tbody>
            </table>
        `;
    reportOutputDiv.innerHTML = tableHTML;
    exportCsvBtn.disabled = false;
  }

  function renderIdealEmployee() {
    const outputDiv = document.getElementById("idealEmployeeOutput");
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const year = lastMonth.getFullYear();
    const month = lastMonth.getMonth();

    const allData = {
      employees: DataService.getEmployees(),
      attendance: DataService.getAttendance(),
      tasks: DataService.getTasks(),
      requests: DataService.getRequests(),
      settings,
    };
    const winners = findIdealEmployee(year, month, allData);
    const monthName = lastMonth.toLocaleString("default", { month: "long" });

    if (winners.length === 0) {
      outputDiv.innerHTML = `<h5 class="card-title">No employees met the strict criteria for ${monthName} ${year}.</h5>`;
    } else {
      const winnerNames = winners.map((w) => w.name).join(", ");
      outputDiv.innerHTML = `
            <h5 class="card-title">Congratulations to our Ideal Employee(s) for ${monthName} ${year}!</h5>
            <p class="card-text fs-4 fw-bold text-success">${winnerNames}</p>
            <p class="text-muted">They will receive a ${settings.idealEmployeeBonus}% bonus on their next paycheck.</p>`;
    }
  }

  // --- New Function: Render Attendance Board (Read-Only) ---
  function renderAttendanceBoard(monthInput = null) {
    const attendanceOutputDiv = document.getElementById("attendanceOutput"); // Assume there's a div with id="attendanceOutput" in hr.html for this
    if (!attendanceOutputDiv) return; // If no div, skip

    const attendance = DataService.getAttendance();
    const filteredAttendance = monthInput
      ? attendance.filter((r) => r.date.startsWith(monthInput))
      : attendance.filter((r) => r.date === getISODate()); // Default to today if no month

    if (filteredAttendance.length === 0) {
      attendanceOutputDiv.innerHTML = `<p class="text-center text-warning p-3">No attendance data available for the selected period.</p>`;
      return;
    }

    const tableHTML = `
      <table class="table table-sm table-hover">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Date</th>
            <th>Check-In</th>
            <th>Check-Out</th>
            <th>Status</th>
            <th>Minutes Late</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${filteredAttendance
            .map((rec) => {
              const employee = allEmployees.find(
                (e) => e.id === rec.employeeId
              );
              return `
                <tr>
                  <td>${employee ? employee.name : "Unknown"}</td>
                  <td>${rec.date}</td>
                  <td>${rec.checkIn || "--"}</td>
                  <td>${rec.checkOut || "--"}</td>
                  <td><span class="badge text-bg-${
                    rec.status === "Present"
                      ? "success"
                      : rec.status === "Late"
                      ? "warning"
                      : "danger"
                  }">${rec.status}</span></td>
                  <td>${rec.minutesLate > 0 ? rec.minutesLate : "--"}</td>
                  <td>${rec.notes || "--"}</td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    `;
    attendanceOutputDiv.innerHTML = tableHTML;
  }

  // --- Event Listeners ---
  generateReportBtn.addEventListener("click", () => {
    const [year, month] = reportMonthInput.value.split("-").map(Number);
    const monthIndex = month - 1;

    const allData = {
      employees: DataService.getEmployees(),
      attendance: DataService.getAttendance(),
      tasks: DataService.getTasks(),
      requests: DataService.getRequests(),
      settings,
    };
    const reportData = allData.employees
      .filter((emp) => emp.role === "Employee")
      .map((emp) =>
        SalaryCalculator.calculateMonthlyImpact(
          emp.id,
          year,
          monthIndex,
          allData
        )
      );

    lastReportData = reportData;
    renderReportTable(reportData);
    renderAttendanceBoard(reportMonthInput.value); // Render attendance for the selected month
  });

  exportCsvBtn.addEventListener("click", () => {
    if (lastReportData && lastReportData.length > 0) {
      const month = document.getElementById("reportMonth").value;
      const exportData = lastReportData
        .filter((impact) => impact !== null)
        .map((impact) => ({
          employee_name: allEmployees.find((e) => e.id === impact.employeeId)
            .name,
          month: impact.month,
          late_penalty: impact.latePenalty.toFixed(2),
          absence_penalty: impact.absencePenalty.toFixed(2),
          task_penalty: impact.taskPenalty.toFixed(2),
          total_deductions: impact.totalDeductions.toFixed(2),
          cap_applied: impact.capApplied,
          overtime_and_bonus: (impact.overtimePay + impact.bonus).toFixed(2),
          final_impact: impact.finalImpact.toFixed(2),
        }));
      exportToCsv(exportData, `payroll_impact_report_${month}.csv`);
    } else {
      showToast("Please generate a report before exporting.", "warning");
    }
  });

  document.getElementById("settingsForm").addEventListener("submit", (e) => {
    e.preventDefault();
  });

  function init() {
    reportMonthInput.value = new Date().toISOString().slice(0, 7);

    loadSettings();
    renderKPIs();
    renderIdealEmployee();
    generateReportBtn.click(); // Auto-generate report and attendance on load
  }

  init();
});
