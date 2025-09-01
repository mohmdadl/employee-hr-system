function getISODate(date = new Date()) {
  return date.toISOString().split("T")[0];
}



function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return weekNo;
}



/**
 * يعيد التاريخ بصيغة YYYY-MM-DD
 * @param {Date} date - كائن التاريخ
 * @returns {string}
 */
function getISODate(date = new Date()) {
  return date.toISOString().split("T")[0];
}

function showToast(message, type = "success") {
  const toastContainer = document.getElementById("toastContainer");
  if (!toastContainer) {
    console.error("Toast container not found!");
    return;
  }

  const toastId = "toast-" + Math.random().toString(36).substr(2, 9);
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
  toastContainer.insertAdjacentHTML("beforeend", toastHTML);

  const toastElement = document.getElementById(toastId);
  const toast = new bootstrap.Toast(toastElement, { delay: 4000 });
  toast.show();
  toastElement.addEventListener("hidden.bs.toast", () => {
    toastElement.remove();
  });
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
