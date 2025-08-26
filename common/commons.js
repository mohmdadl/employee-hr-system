// commons.js — Core business logic for Attendance, Permissions, Tasks, Payroll
// Pure functions over plain objects to work in browser (no external deps).

/* ========= Time & Utils ========= */
export function parseTimeToMinutes(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return (h * 60) + m;
}

export function dailyWage(monthlySalary) { return monthlySalary / 30; }
export function hourlyRate(monthlySalary) { return dailyWage(monthlySalary) / 8; }

export function isWeekend(dateISO, config) {
  const d = new Date(dateISO + "T00:00:00");
  const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
  return (config.workweek?.weekendDays || ["Friday"]).includes(dayName);
}

export function getYearMonth(dateISO) {
  const d = new Date(dateISO + "T00:00:00");
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function weekIndexOf(dateISO) {
  const d = new Date(dateISO + "T00:00:00");
  const onejan = new Date(d.getFullYear(), 0, 1);
  const millisInDay = 86400000;
  const days = Math.floor((d - onejan) / millisInDay) + onejan.getDay();
  return Math.floor(days / 7) + 1;
}

/* ========= Attendance Status ========= */
export function computeDailyStatus(record, config) {
  const startMins = parseTimeToMinutes(config.workHours.start);
  const checkInMins = record.checkIn ? parseTimeToMinutes(record.checkIn) : null;

  if (record.isLeave) return { status: "Leave", minutesLate: 0 };
  if (record.isWFH) return { status: "Present(WFH)", minutesLate: 0 };
  if (!checkInMins) return { status: "Absent", minutesLate: null };

  const diff = checkInMins - startMins;
  if (diff <= 0) return { status: "Present", minutesLate: 0 };
  if (diff > 0 && diff <= 120) return { status: "Late", minutesLate: diff };
  return { status: "Absent", minutesLate: diff };
}

/* ========= Late Penalty ========= */
export function latePenalty(minutesLate, employee, config, hasApprovedLatePermissionToday) {
  if (hasApprovedLatePermissionToday && minutesLate !== null && minutesLate <= 15) return 0;

  const tiers = config.penalties.late || [];
  const dw = dailyWage(employee.monthlySalary);
  for (const t of tiers) {
    if (minutesLate >= t.min && minutesLate <= t.max) return t.pctDailyWage * dw;
  }
  return 0;
}

/* ========= Absence Penalty ========= */
export function absencePenalty(employee, config) {
  const pct = config.penalties?.absenceDailyPct ?? 1.0;
  return dailyWage(employee.monthlySalary) * pct;
}

/* ========= Quotas ========= */
export function countApprovedRequests(requests, employeeId, type, yearMonthOrWeek) {
  return requests.filter(r => r.employeeId === employeeId && r.type === type && r.status === "Approved")
    .filter(r => {
      const d = r.payload?.requestedDate;
      if (!d) return false;
      if (typeof yearMonthOrWeek === "string") return getYearMonth(d) === yearMonthOrWeek;
      if (typeof yearMonthOrWeek === "number") {
        const w = r.payload?.weekIndex ?? weekIndexOf(d);
        return w === yearMonthOrWeek;
      }
      return false;
    }).length;
}

export function canApproveLatePermission(requests, employeeId, requestedDate, config) {
  const yyyymm = getYearMonth(requestedDate);
  const used = countApprovedRequests(requests, employeeId, "Late", yyyymm);
  return used < (config.latePermissionsPerMonth ?? 2);
}

export function canApproveWFH(requests, employeeId, requestedDate, config) {
  const week = weekIndexOf(requestedDate);
  const used = countApprovedRequests(requests, employeeId, "WFH", week);
  return used < (config.wfhPerWeekLimit ?? 2);
}

/* ========= Overtime ========= */
export function overtimePay(hours, dateISO, employee, config) {
  const rate = hourlyRate(employee.monthlySalary);
  const isWknd = isWeekend(dateISO, config);
  const mult = isWknd ? (config.overtime?.weekendMultiplier ?? 1.5) : (config.overtime?.weekdayMultiplier ?? 1.25);
  return hours * rate * mult;
}

/* ========= Tasks Penalties ========= */
export function taskPenaltyForPriority(priority, employee, config) {
  const dw = dailyWage(employee.monthlySalary);
  const map = { Low: 0.05, Medium: 0.08, High: 0.12, Critical: 0.15 };
  return (map[priority] || 0) * dw;
}

export function isTaskOverdue(task, nowISO = null) {
  const now = nowISO ? new Date(nowISO) : new Date();
  const deadline = new Date(task.deadline);
  return task.status !== "Completed" && now > deadline;
}

/* ========= Monthly Payroll Aggregation ========= */
export function computeMonthlyPayrollImpact(store, month, config) {
  const { employees, attendanceRecords, permissionRequests, tasks } = store;
  const byEmp = {};
  const empMap = Object.fromEntries(employees.map(e => [e.id, e]));
  const ensure = (id) => (byEmp[id] ||= { latePenalty: 0, absencePenalty: 0, taskPenalty: 0, overtimePay: 0, bonus: 0 });

  // Attendance penalties
  attendanceRecords.filter(r => r.date.startsWith(month)).forEach(r => {
    const emp = empMap[r.employeeId];
    const statusObj = computeDailyStatus(r, config);
    const lpApproved = permissionRequests.some(pr =>
      pr.employeeId === r.employeeId && pr.type === "Late" && pr.status === "Approved" && pr.payload?.requestedDate === r.date
    );
    const bucket = ensure(r.employeeId);
    if (statusObj.status === "Late") {
      bucket.latePenalty += latePenalty(statusObj.minutesLate, emp, config, lpApproved);
    } else if (statusObj.status === "Absent") {
      bucket.absencePenalty += absencePenalty(emp, config);
    }
  });

  // Task penalties
  tasks.forEach(t => {
    const dYM = t.deadline.slice(0, 7);
    if (dYM === month && isTaskOverdue(t, month + "-31T23:59:59")) {
      t.assignees.forEach(empId => {
        const emp = empMap[empId];
        ensure(empId).taskPenalty += taskPenaltyForPriority(t.priority, emp, config);
      });
    }
  });

  // Overtime pay (approved)
  permissionRequests.filter(r => r.type === "Overtime" && r.status === "Approved").forEach(r => {
    const dYM = (r.payload?.requestedDate || "").slice(0, 7);
    if (dYM === month) {
      const emp = empMap[r.employeeId];
      const hrs = Number(r.payload?.overtimeHours || 0);
      ensure(r.employeeId).overtimePay += overtimePay(hrs, r.payload.requestedDate, emp, config);
    }
  });

  // Cap 25%
  return employees.map(emp => {
    const acc = ensure(emp.id);
    const totalDeduction = acc.latePenalty + acc.absencePenalty + acc.taskPenalty;
    const cap = emp.monthlySalary * (config.caps?.monthlyDeductionPctOfSalary ?? 0.25);
    const capApplied = totalDeduction > cap;
    const factor = capApplied ? (cap / totalDeduction) : 1;
    return {
      employeeId: emp.id, month,
      latePenalty: acc.latePenalty * factor,
      absencePenalty: acc.absencePenalty * factor,
      taskPenalty: acc.taskPenalty * factor,
      overtimePay: acc.overtimePay,
      bonus: acc.bonus,
      capApplied
    };
  });
}

/* ========= Ideal Employee ========= */
export function isIdealEmployee(employeeId, month, store, config) {
  const { attendanceRecords, tasks, permissionRequests } = store;

  // check late
  const hasLate = attendanceRecords.some(r => {
    if (!r.date.startsWith(month)) return false;
    const statusObj = computeDailyStatus(r, config);
    return statusObj.status === "Late";
  });
  if (hasLate) return false;

  // check used late permission
  const usedLatePermission = permissionRequests.some(r =>
    r.employeeId === employeeId && r.type === "Late" && r.status === "Approved" &&
    (r.payload?.requestedDate || "").startsWith(month)
  );
  if (usedLatePermission) return false;

  // check overdue tasks
  const hasMissedTask = tasks.some(t =>
    t.assignees.includes(employeeId) &&
    t.deadline.startsWith(month) &&
    isTaskOverdue(t, month + "-31T23:59:59")
  );
  if (hasMissedTask) return false;

  return true;
}

/* ========= Validation Helpers ========= */
export function validatePermissionRequest(request, allRequests, config) {
  const { type, employeeId, payload } = request;
  const dateISO = payload?.requestedDate;
  if (!dateISO) return { ok: false, reason: "Missing requestedDate" };

  if (type === "WFH") {
    return canApproveWFH(allRequests, employeeId, dateISO, config)
      ? { ok: true } : { ok: false, reason: "WFH weekly quota exceeded" };
  }
  if (type === "Late") {
    return canApproveLatePermission(allRequests, employeeId, dateISO, config)
      ? { ok: true } : { ok: false, reason: "Late permission monthly quota exceeded" };
  }
  if (type === "Overtime") {
    const hrs = Number(payload?.overtimeHours || 0);
    return hrs > 0 ? { ok: true } : { ok: false, reason: "Overtime hours must be > 0" };
  }
  if (type === "DeadlineExtension") {
    return payload?.taskId
      ? { ok: true }
      : { ok: false, reason: "Missing taskId for deadline extension" };
  }
  if (type === "Absence") {
    return { ok: true };
  }
  return { ok: true };
}

/* ========= Apply Approval ========= */
export function applyApproval(store, request) {
  const emp = store.employees.find(e => e.id === request.employeeId);
  if (!emp) return;

  const date = request.payload?.requestedDate;

  switch (request.type) {
    case "Late": {
      const rec = store.attendanceRecords.find(r => r.employeeId === emp.id && r.date === date);
      if (rec) {
        rec.status = "Present";
        rec.minutesLate = 0;
        rec.isLeave = false;
        rec.isWFH = false;
      } else {
        store.attendanceRecords.push({
          id: Date.now(),
          employeeId: emp.id,
          date,
          checkIn: "09:00",
          checkOut: "17:00",
          status: "Present",
          minutesLate: 0,
          isLeave: false,
          isWFH: false,
          notes: "Approved late permission"
        });
      }
      break;
    }

    case "WFH": {
      const existing = store.attendanceRecords.find(r => r.employeeId === emp.id && r.date === date);
      if (existing) {
        existing.status = "Present(WFH)";
        existing.isWFH = true;
        existing.isLeave = false;
      } else {
        store.attendanceRecords.push({
          id: Date.now(),
          employeeId: emp.id,
          date,
          checkIn: null,
          checkOut: null,
          status: "Present(WFH)",
          minutesLate: 0,
          isLeave: false,
          isWFH: true,
          notes: "Approved WFH"
        });
      }
      break;
    }

    case "Absence": {
      const existing = store.attendanceRecords.find(r => r.employeeId === emp.id && r.date === date);
      if (existing) {
        existing.status = "Leave";
        existing.isLeave = true;
      } else {
        store.attendanceRecords.push({
          id: Date.now(),
          employeeId: emp.id,
          date,
          checkIn: null,
          checkOut: null,
          status: "Leave",
          minutesLate: null,
          isLeave: true,
          isWFH: false,
          notes: "Approved absence"
        });
      }
      break;
    }

    case "Overtime": {
      // payroll handled separately
      break;
    }

    case "DeadlineExtension": {
      const task = store.tasks.find(t => t.taskId === request.payload.taskId);
      if (task) {
        task.deadline = request.payload.newDeadline || task.deadline;
        task.updatedAt = new Date().toISOString();
        task.comments = task.comments || [];
        task.comments.push({
          by: "Manager",
          text: "Deadline extended by approval",
          at: new Date().toISOString()
        });
      }
      break;
    }
  }
}
