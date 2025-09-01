// // js/security.js

// document.addEventListener("DOMContentLoaded", () => {
//   const today = getISODate();
//   document.getElementById("todayDate").textContent = today;
//   const searchInput = document.getElementById("searchInput");

//   let allEmployees = DataService.getEmployees().filter(
//     (e) => e.role === "Employee"
//   );
//   let attendance = DataService.getAttendance();

//   // ✅ Set Status & Notes based on check-in
//   function autoUpdateStatus(record) {
//     record.minutesLate = 0; // reset default
//     record.notes = record.notes || "";

//     if (!record.checkIn && !record.checkOut) {
//       record.notes = "Absent (no check-in)";
//       return "Absent";
//     }

//     if (record.checkIn) {
//       const [h, m] = record.checkIn.split(":").map(Number);
//       const checkInMinutes = h * 60 + m;
//       const nineAM = 9 * 60;
//       const elevenAM = 11 * 60;

//       if (checkInMinutes <= nineAM) {
//         record.notes = `On time (arrived at ${record.checkIn})`;
//         return "Present";
//       } else {
//         record.minutesLate = checkInMinutes - nineAM;
//         record.notes = `Late by ${record.minutesLate} minutes (arrived at ${record.checkIn})`;
//         return "Late";
//       }
//     }

//     return record.status || "Absent";
//   }

//   // ✅ Auto-Checkout at 5:00 PM
//   function autoCheckoutEmployees() {
//     const now = new Date();
//     const currentMinutes = now.getHours() * 60 + now.getMinutes();
//     const fivePM = 17 * 60;

//     if (currentMinutes >= fivePM) {
//       allEmployees.forEach((emp) => {
//         let record = attendance.find(
//           (r) => r.employeeId === emp.id && r.date === today
//         );

//         if (record && record.checkIn && !record.checkOut) {
//           record.checkOut = "17:00";
//           record.notes += ` | Checked out at 17:00`;
//           DataService.saveAttendance(attendance);
//         }
//       });
//       renderBoard(searchInput.value);
//     }
//   }

//   // ✅ Attendance Board
//   function renderBoard(searchTerm = "") {
//     const boardBody = document.getElementById("attendanceBoardBody");
//     boardBody.innerHTML = `<tr><td colspan="7" class="text-center">Loading...</td></tr>`;

//     const filteredEmployees = allEmployees.filter((emp) =>
//       emp.name.toLowerCase().includes(searchTerm.toLowerCase())
//     );

//     if (filteredEmployees.length === 0) {
//       boardBody.innerHTML = `<tr><td colspan="7" class="text-center">No employees found.</td></tr>`;
//       return;
//     }

//     boardBody.innerHTML = "";

//     filteredEmployees.forEach((emp) => {
//       let record = attendance.find(
//         (r) => r.employeeId === emp.id && r.date === today
//       );
//       if (!record) {
//         record = {
//           id: Date.now() + emp.id,
//           employeeId: emp.id,
//           date: today,
//           checkIn: null,
//           checkOut: null,
//           status: "Absent",
//           minutesLate: 0,
//           notes: "",
//         };
//         attendance.push(record);
//       }

//       record.status = autoUpdateStatus(record);

//       const tr = document.createElement("tr");
//       tr.dataset.employeeId = emp.id;

//       if (record.checkIn && !record.checkOut) {
//         tr.classList.add("table-info");
//       }

//       tr.innerHTML = `
//         <td>${emp.name} <br> <small class="text-muted">${emp.department || ""
//         }</small></td>
//         <td>
//             <input type="time" class="form-control form-control-sm check-in-input" value="${record.checkIn || ""
//         }">
//         </td>
//         <td>
//             <input type="time" class="form-control form-control-sm check-out-input" value="${record.checkOut || ""
//         }">
//         </td>
//         <td>
//             <span class="badge ${record.status === "Leave"
//           ? "bg-info"
//           : record.status.startsWith("Absent")
//             ? "bg-danger"
//             : record.status.startsWith("Late")
//               ? "bg-warning text-dark"
//               : record.status.startsWith("Present")
//                 ? "bg-success"
//                 : "bg-secondary"
//         }">${record.status}</span>
//         </td>
//         <td class="text-center">
//             ${record.minutesLate > 0 ? record.minutesLate : "-"}
//         </td>
//         <td>
//             <input type="text" class="form-control form-control-sm notes-input" value="${record.notes || ""
//         }" readonly>
//         </td>
//         <td class="text-end">
//             <button class="btn btn-sm btn-success save-btn" title="Save Record">
//                 <i class="bi bi-check-lg"></i>
//             </button>
//         </td>
//       `;

//       boardBody.appendChild(tr);

//       // Update status when check-in changes
//       const checkInInput = tr.querySelector(".check-in-input");
//       checkInInput.addEventListener('input', () => {
//         record.checkIn = checkInInput.value;
//         record.status = autoUpdateStatus(record);
//         // Update badge
//         const badge = tr.querySelector("td:nth-child(4) .badge");
//         badge.className = `badge ${record.status === "Leave" ? "bg-info" : record.status.startsWith("Absent") ? "bg-danger" : record.status.startsWith("Late") ? "bg-warning text-dark" : record.status.startsWith("Present") ? "bg-success" : "bg-secondary"}`;
//         badge.textContent = record.status;
//         // Update minutesLate
//         const minutesTd = tr.querySelector("td:nth-child(5)");
//         minutesTd.textContent = record.minutesLate > 0 ? record.minutesLate : "-";
//         // Update notes
//         const notesInput = tr.querySelector(".notes-input");
//         notesInput.value = record.notes;
//       });
//     });
//   }

//   const boardBody = document.getElementById("attendanceBoardBody");

//   // 🟢 Save record manually
//   boardBody.addEventListener("click", (e) => {
//     const saveButton = e.target.closest(".save-btn");
//     if (!saveButton) return;

//     const tr = saveButton.closest("tr");
//     const employeeId = parseInt(tr.dataset.employeeId);
//     const employeeName = tr.querySelector("td").firstChild.textContent.trim();

//     const recordIndex = attendance.findIndex(
//       (r) => r.employeeId === employeeId && r.date === today
//     );
//     if (recordIndex === -1) {
//       console.error("Critical error: Record not found on save.");
//       return;
//     }

//     const checkInTime = tr.querySelector(".check-in-input").value || null;
//     const checkOutTime = tr.querySelector(".check-out-input").value || null;

//     let record = attendance[recordIndex];
//     record.checkIn = checkInTime;
//     record.checkOut = checkOutTime;

//     if (record.checkOut) {
//       if (!record.notes.includes("Checked out")) {
//         record.notes += ` | Checked out at ${record.checkOut}`;
//       }
//     } else {
//       record.status = autoUpdateStatus(record);
//     }

//     if (record.checkIn && !record.checkOut) {
//       record.status = autoUpdateStatus(record);
//     }

//     attendance[recordIndex] = record;
//     DataService.saveAttendance(attendance);

//     showToast(`Record for ${employeeName} saved successfully.`, "success");
//     renderBoard(searchInput.value);
//   });

//   searchInput.addEventListener("input", () => {
//     renderBoard(searchInput.value);
//   });

//   renderBoard();

//   // ✅ Auto-checkout on page load if after 17:00
//   autoCheckoutEmployees();
// });