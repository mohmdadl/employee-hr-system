// js/security.js (النسخة النهائية الكاملة)

document.addEventListener("DOMContentLoaded", () => {
  const today = getISODate();
  document.getElementById("todayDate").textContent = today;
  const searchInput = document.getElementById("searchInput");

  let allEmployees = DataService.getEmployees().filter(
    (e) => e.role === "Employee"
  );
  let attendance = DataService.getAttendance();
  let approvedLeaves = DataService.getApprovedLeaves
    ? DataService.getApprovedLeaves()
    : [];

  function autoUpdateStatus(record) {
    // 1. Approved Leave موجودة
    const hasLeave = approvedLeaves.some(
      (leave) => leave.employeeId === record.employeeId && leave.date === today
    );
    if (hasLeave || record.status === "Leave") return "Leave";

    // 2. Absent
    if (!record.checkIn && !record.checkOut) return "Absent";

    // 3. Present (No Checkout)
    if (record.checkIn && !record.checkOut) return "Present (No Checkout)";

    // 4. Present
    if (record.checkIn && record.checkOut) return "Present";

    return record.status || "Absent";
  }

  function renderBoard(searchTerm = "") {
    const boardBody = document.getElementById("attendanceBoardBody");
    boardBody.innerHTML = `<tr><td colspan="6" class="text-center">Loading...</td></tr>`;

    const filteredEmployees = allEmployees.filter((emp) =>
      emp.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filteredEmployees.length === 0) {
      boardBody.innerHTML = `<tr><td colspan="6" class="text-center">No employees found.</td></tr>`;
      return;
    }

    boardBody.innerHTML = "";

    filteredEmployees.forEach((emp) => {
      let record = attendance.find(
        (r) => r.employeeId === emp.id && r.date === today
      );
      if (!record) {
        record = {
          id: Date.now() + emp.id,
          employeeId: emp.id,
          date: today,
          checkIn: null,
          checkOut: null,
          status: "Absent",
          minutesLate: 0,
          notes: "",
        };
        attendance.push(record);
      }

      // 👇 تحديث الحالة أوتوماتيك
      record.status = autoUpdateStatus(record);

      const tr = document.createElement("tr");
      tr.dataset.employeeId = emp.id;

      if (record.checkIn && !record.checkOut) {
        tr.classList.add("table-info");
      }

      tr.innerHTML = `
                <td>${emp.name} <br> <small class="text-muted">${
        emp.department || ""
      }</small></td>
                <td>
                    <input type="time" class="form-control form-control-sm check-in-input" value="${
                      record.checkIn || ""
                    }">
                </td>
                <td>
                    <input type="time" class="form-control form-control-sm check-out-input" value="${
                      record.checkOut || ""
                    }">
                </td>
                <td>
                    <span class="badge ${
                      record.status === "Leave"
                        ? "bg-info"
                        : record.status.startsWith("Absent")
                        ? "bg-danger"
                        : record.status.startsWith("Present")
                        ? "bg-success"
                        : "bg-secondary"
                    }">${record.status}</span>
                </td>
                <td>
                    <input type="text" class="form-control form-control-sm notes-input" value="${
                      record.notes || ""
                    }" placeholder="Add note...">
                </td>
                <td class="text-end">
                    <button class="btn btn-sm btn-success save-btn" title="Save Record">
                        <i class="bi bi-check-lg"></i>
                    </button>
                </td>
            `;

      boardBody.appendChild(tr);
    });
  }

  const boardBody = document.getElementById("attendanceBoardBody");

  // 🟡 Update row on change
  boardBody.addEventListener("change", (e) => {
    const target = e.target;
    const tr = target.closest("tr");
    if (!tr) return;

    tr.classList.add("table-warning");
  });

  // 🟢 Save record
  boardBody.addEventListener("click", (e) => {
    const saveButton = e.target.closest(".save-btn");
    if (!saveButton) return;

    const tr = saveButton.closest("tr");
    const employeeId = parseInt(tr.dataset.employeeId);
    const employeeName = tr.querySelector("td").firstChild.textContent.trim();

    const recordIndex = attendance.findIndex(
      (r) => r.employeeId === employeeId && r.date === today
    );
    if (recordIndex === -1) {
      console.error(
        "Critical error: Record not found in attendance array on save."
      );
      return;
    }

    const checkInTime = tr.querySelector(".check-in-input").value || null;
    const checkOutTime = tr.querySelector(".check-out-input").value || null;
    const currentNotes = tr.querySelector(".notes-input").value;

    let record = attendance[recordIndex];
    record.checkIn = checkInTime;
    record.checkOut = checkOutTime;
    record.notes = currentNotes;

    // 👇 تحديث الحالة أوتوماتيك
    record.status = autoUpdateStatus(record);

    // 🔴 لو Leave من غير Approval
    if (record.status === "Leave") {
      const isApproved = approvedLeaves.some(
        (leave) => leave.employeeId === employeeId && leave.date === today
      );
      if (!isApproved) {
        record.notes = `[FLAG] Leave marked without HR approval. ${currentNotes.replace(
          "[FLAG] Leave marked without HR approval. ",
          ""
        )}`;
        showToast(
          `Warning: Leave for ${employeeName} is not approved by HR.`,
          "warning"
        );
      }
    }

    attendance[recordIndex] = record;
    DataService.saveAttendance(attendance);
    tr.classList.remove("table-warning");
    showToast(`Record for ${employeeName} saved successfully.`, "success");

    // rerender row to refresh status badge
    renderBoard(searchInput.value);
  });

  searchInput.addEventListener("input", () => {
    renderBoard(searchInput.value);
  });

  // Initial render
  renderBoard();
});
//   شوف كدة يا بدر ده جزء ال security.js بعد التعديل شوفوا كدة شغال ولا لا