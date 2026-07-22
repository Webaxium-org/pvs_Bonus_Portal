// @desc    Bulk approve all eligible employees for an approver
// @route   POST /api/v2/employees/approvals/bulk-approve
// @access  Private (Approver only)
export const bulkApproveAll = async (req, res, next) => {
  try {
    const Employee = getEmployeeModel();
    const approverId =
      req.user?.userId ||
      req.user?.id ||
      req.body?.approverId ||
      req.query?.approverId;
    const { comments } = req.body || {};
    const company = req.query?.company || req.body?.company;
    const supervisorName = req.query?.supervisorName || req.body?.supervisorName;

    if (!approverId || approverId === "undefined" || approverId === "null") {
      return next(new AppError("Approver ID is required", 400));
    }

    // Build where clause with optional company filter
    const whereClause = {
      isActive: true,
      [Op.or]: [
        { level1ApproverId: approverId },
        { level2ApproverId: approverId },
        { level3ApproverId: approverId },
        { level4ApproverId: approverId },
        { level5ApproverId: approverId },
      ],
    };

    // Add company filter if provided
    if (company) {
      whereClause.company = company;
    }

    // Add supervisor filter if provided
    if (supervisorName) {
      whereClause.supervisorName = supervisorName;
    }

    // Get all employees where this user is an approver at any level
    const allEmployees = await Employee.findAll({
      where: whereClause,
    });

    // Filter to those where this user is the NEXT pending approver
    const eligibleEmployees = allEmployees.filter((emp) => {
      const nextLevel = getNextApprovalLevel(emp);
      return (
        nextLevel && nextLevel.approverId.toString() === approverId.toString()
      );
    });

    if (eligibleEmployees.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No employees found awaiting your approval",
        count: 0,
      });
    }

    // Get approver details for history logging
    const approverDetails = await Employee.findByPk(approverId, {
      attributes: ["id", "fullName", "employeeId"],
    });

    let approvedCount = 0;
    for (const employee of eligibleEmployees) {
      const nextLevel = getNextApprovalLevel(employee);
      if (nextLevel) {
        // Convert to plain object to avoid circular references
        const existingStatus = employee.approvalStatus
          ? JSON.parse(JSON.stringify(employee.approvalStatus))
          : {};

        const levelKey = `level${nextLevel.level}`;
        existingStatus[levelKey] = {
          ...(existingStatus[levelKey] || {}),
          status: "approved",
          approvedBy: approverId,
          approvedAt: new Date(),
          comments: comments || existingStatus[levelKey]?.comments,
        };

        // Add to merit history
        const history = employee.meritHistory || [];
        const meritValue = employee.salaryType === "Hourly"
          ? employee.meritIncreaseDollar
          : employee.meritIncreasePercentage;

        history.push({
          timestamp: new Date(),
          action: "approved",
          level: nextLevel.level,
          actor: {
            id: approverId,
            name: approverDetails?.fullName || "Unknown",
            employeeId: approverDetails?.employeeId || "N/A",
          },
          meritValue: meritValue,
          salaryType: employee.salaryType,
          comments: comments || null,
          bulkApproval: true,
        });

        // Update employee instance and save (use .save() to trigger setters properly)
        employee.approvalStatus = existingStatus;
        employee.meritHistory = history;
        await employee.save();
        approvedCount++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Successfully approved merits for ${approvedCount} employees`,
      approvedCount: approvedCount,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check if all approvals are completed for UKG export
// @route   GET /api/v2/employees/ukg/approvals-status
// @access  Private (HR/Admin only)
export const checkAllApprovalsCompleted = async (req, res, next) => {
  try {
    const Employee = getEmployeeModel();

    const allActiveEmployees = await Employee.findAll({
      where: { isActive: true },
    });

    const employeesWithMerits = allActiveEmployees.filter(
      (emp) =>
        emp.approvalStatus?.enteredBy ||
        parseFloat(emp.meritIncreasePercentage) > 0 ||
        parseFloat(emp.meritIncreaseDollar) > 0
    );

    if (employeesWithMerits.length === 0) {
      return res.status(200).json({
        success: true,
        allApprovalsCompleted: false,
        readyCount: 0,
        totalWithMerits: 0,
        message: "No employees with merits found. Please add merits before exporting.",
      });
    }

    let readyCount = 0;

    for (const employee of employeesWithMerits) {
      const approvalStatus = employee.approvalStatus || {};

      if (!approvalStatus.submittedForApproval) continue;

      let fullyApproved = true;
      for (let level = 1; level <= 5; level++) {
        const levelKey = `level${level}`;
        const approverIdField = `${levelKey}ApproverId`;

        if (employee[approverIdField]) {
          if (approvalStatus[levelKey]?.status !== "approved") {
            fullyApproved = false;
            break;
          }
        }
      }

      if (fullyApproved) readyCount++;
    }

    res.status(200).json({
      success: true,
      allApprovalsCompleted: readyCount > 0,
      readyCount,
      totalWithMerits: employeesWithMerits.length,
      message:
        readyCount > 0
          ? `${readyCount} employee(s) ready for export.`
          : "No employees have completed all approval levels yet.",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resubmit merit with revised amount AND auto-approve the recipient's own level
// @route   POST /api/v2/employees/:id/resubmit-and-approve
// @access  Public (uses actorId query/body param)
export const resubmitAndApprove = async (req, res, next) => {
  try {
    const Employee = getEmployeeModel();
    const { id } = req.params;
    const { meritIncreasePercentage, meritIncreaseDollar, comments, notificationId } = req.body || {};
    const actorId =
      req.user?.userId ||
      req.user?.id ||
      req.body?.actorId ||
      req.query?.actorId;

    if (!actorId || actorId === "undefined" || actorId === "null") {
      return next(new AppError("Actor ID is required", 400));
    }

    // Validate that at least one merit value is provided
    if (
      (meritIncreasePercentage === undefined || meritIncreasePercentage === null) &&
      (meritIncreaseDollar === undefined || meritIncreaseDollar === null)
    ) {
      return next(new AppError("Merit increase (percentage or dollar amount) is required", 400));
    }

    // Validate non-negative values
    if (
      (meritIncreasePercentage !== undefined &&
        meritIncreasePercentage !== null &&
        parseFloat(meritIncreasePercentage) < 0) ||
      (meritIncreaseDollar !== undefined &&
        meritIncreaseDollar !== null &&
        parseFloat(meritIncreaseDollar) < 0)
    ) {
      return next(new AppError("Merit increase cannot be negative", 400));
    }

    const employee = await Employee.findByPk(id);
    if (!employee) {
      return next(new AppError("Employee not found", 404));
    }

    // Determine the actor's role for this employee:
    // They may be the supervisor (level 0) or a level 1-5 approver
    let actorLevel = null; // null = supervisor role

    // Check if actor is a level approver for this employee
    for (let level = 1; level <= 5; level++) {
      if (employee[`level${level}ApproverId`]?.toString() === actorId.toString()) {
        actorLevel = level;
        break;
      }
    }

    // If not an approver, check if they are the supervisor
    const isSupervisor =
      employee.supervisorId?.toString() === actorId.toString();

    if (actorLevel === null && !isSupervisor) {
      return next(
        new AppError("You are not authorized to resubmit for this employee", 403)
      );
    }

    // â”€â”€ Step 1: Calculate and update the merit amount â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let newAnnualSalary = 0;
    let newHourlyRate = 0;
    let finalMeritPercentage = 0;
    let finalMeritDollar = 0;

    // Determine employee type and calculate accordingly
    if (employee.salaryType === "Hourly") {
      // For hourly employees, use dollar increase
      if (meritIncreaseDollar !== undefined && meritIncreaseDollar !== null) {
        finalMeritDollar = parseFloat(meritIncreaseDollar);
        newHourlyRate = (parseFloat(employee.hourlyPayRate) || 0) + finalMeritDollar;
      }
    } else {
      // For salaried employees (Salary or Salaried), use percentage increase
      if (meritIncreasePercentage !== undefined && meritIncreasePercentage !== null) {
        finalMeritPercentage = parseFloat(meritIncreasePercentage);
        const currentSalary = parseFloat(employee.annualSalary) || 0;
        newAnnualSalary = currentSalary * (1 + finalMeritPercentage / 100);
      }
    }

    // Get actor details for history logging
    const actorDetails = await Employee.findByPk(actorId, {
      attributes: ["id", "fullName", "employeeId"],
    });

    // Store old values for history
    const oldMeritPercentage = employee.meritIncreasePercentage;
    const oldMeritDollar = employee.meritIncreaseDollar;

    // Build fresh approval status: submitted=true, all levels reset to pending
    const newStatus = {
      submittedForApproval: true,
      submittedAt: new Date(),
      enteredBy: actorId,
      enteredAt: new Date(),
    };

    if (employee.level1ApproverId)
      newStatus.level1 = { status: "pending", approvedBy: null, approvedAt: null, comments: null };
    if (employee.level2ApproverId)
      newStatus.level2 = { status: "pending", approvedBy: null, approvedAt: null, comments: null };
    if (employee.level3ApproverId)
      newStatus.level3 = { status: "pending", approvedBy: null, approvedAt: null, comments: null };
    if (employee.level4ApproverId)
      newStatus.level4 = { status: "pending", approvedBy: null, approvedAt: null, comments: null };
    if (employee.level5ApproverId)
      newStatus.level5 = { status: "pending", approvedBy: null, approvedAt: null, comments: null };

    // â”€â”€ Step 2: If actor is a level approver, auto-approve their level â”€â”€â”€â”€â”€â”€â”€â”€
    // (Supervisor at level 0 just submits â€” Level 1 will need to approve)
    if (actorLevel !== null) {
      // Auto-approve all levels BEFORE the actor's level (they would have already approved these)
      // Then auto-approve the actor's own level
      for (let lvl = 1; lvl <= actorLevel; lvl++) {
        const lk = `level${lvl}`;
        if (newStatus[lk]) {
          if (lvl < actorLevel) {
            // Previous levels: mark as approved by actor (they resubmitted = endorsing up to their level)
            newStatus[lk] = {
              status: "approved",
              approvedBy: actorId,
              approvedAt: new Date(),
              comments: lvl === actorLevel ? (comments || null) : null,
            };
          } else {
            // Actor's own level: approved with their comments
            newStatus[lk] = {
              status: "approved",
              approvedBy: actorId,
              approvedAt: new Date(),
              comments: comments || null,
            };
          }
        }
      }
    }

    // Add to merit history
    const history = employee.meritHistory || [];
    const oldValue = employee.salaryType === "Hourly" ? oldMeritDollar : oldMeritPercentage;
    const newValue = employee.salaryType === "Hourly" ? finalMeritDollar : finalMeritPercentage;

    history.push({
      timestamp: new Date(),
      action: "resubmitted_and_approved",
      level: actorLevel === null ? 0 : actorLevel,
      actor: {
        id: actorId,
        name: actorDetails?.fullName || "Unknown",
        employeeId: actorDetails?.employeeId || "N/A",
      },
      oldValue: oldValue,
      newValue: newValue,
      salaryType: employee.salaryType,
      comments: comments || null,
    });

    // Update employee instance and save (use .save() to trigger setters properly)
    employee.meritIncreasePercentage = finalMeritPercentage;
    employee.meritIncreaseDollar = finalMeritDollar;
    employee.newAnnualSalary = newAnnualSalary;
    employee.newHourlyRate = newHourlyRate;
    employee.approvalStatus = newStatus;
    employee.meritHistory = history;
    await employee.save();

    // â”€â”€ Step 3: Mark notification as read â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (notificationId) {
      await markNotificationRead(notificationId);
    }

    // â”€â”€ Step 4: Notify next approver â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const nextApprover = getNextApprovalLevel(employee);
    if (nextApprover) {
      const nextApproverDetails = await Employee.findByPk(nextApprover.approverId);
      if (nextApproverDetails?.email) {
        // Format merit display
        const meritDisplay = employee.salaryType === 'Hourly'
          ? `$${finalMeritDollar}/hr`
          : `${finalMeritPercentage}%`;

        // Send notification
        try {
          await createNotification({
            recipientId: nextApprover.approverId,
            type: 'merit_resubmitted',
            title: `Merit Resubmitted - Review Required`,
            message: `Merit for ${employee.fullName} has been resubmitted. Please review.`,
            payload: {
              employeeDbId: employee.id,
              employeeId: employee.employeeId,
              employeeName: employee.fullName,
              meritAmount: meritDisplay,
              level: nextApprover.level
            }
          });
          console.log('âœ… Sent resubmitted notification to:', nextApproverDetails.fullName);
        } catch (notifError) {
          console.error('âŒ Failed to create resubmitted notification:', notifError);
        }

        // Send email
        try {
          await sendMeritResubmittedEmail({
            toEmail: nextApproverDetails.email,
            toName: nextApproverDetails.fullName,
            employeeName: employee.fullName,
            employeeId: employee.employeeId,
            newMeritAmount: meritDisplay,
            resubmittedBy: actorDetails?.fullName || 'Unknown',
            approverLevel: nextApprover.level
          });
          console.log('âœ… Sent resubmitted email to:', nextApproverDetails.email);
        } catch (emailError) {
          console.error('âŒ Failed to send resubmitted email:', emailError);
        }
      }
    }

    // Build label for response message
    const levelLabel =
      actorLevel === null
        ? "Supervisor"
        : `Level ${actorLevel} Approver`;

    const nextPendingLevel = actorLevel === null ? 1 : actorLevel + 1;
    const hasNextLevel = !!employee[`level${nextPendingLevel}ApproverId`];

    // Determine the merit value for response
    const newMerit = employee.salaryType === "Hourly" ? finalMeritDollar : finalMeritPercentage;

    res.status(200).json({
      success: true,
      message: hasNextLevel
        ? `Merit updated and approved at ${levelLabel} level. Now awaiting Level ${nextPendingLevel} approval.`
        : `Merit updated and approved by ${levelLabel}. All approvals complete!`,
      data: { employeeId: employee.employeeId, newMerit, actorLevel, levelLabel },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export all employee data to UKG Excel format
// @route   GET /api/v2/employees/ukg/export
// @access  Private (HR/Admin only)
export const exportToUKG = async (req, res, next) => {
  try {
    const XLSX = await import("xlsx");
    const Employee = getEmployeeModel();

    const allEmployees = await Employee.findAll({
      where: { isActive: true },
      order: [["employeeId", "ASC"]],
    });

    // Only include employees who have merit entered and all assigned approval levels approved
    const employees = allEmployees.filter((emp) => {
      const approvalStatus = emp.approvalStatus || {};

      const hasMerit =
        approvalStatus.enteredBy ||
        parseFloat(emp.meritIncreasePercentage) > 0 ||
        parseFloat(emp.meritIncreaseDollar) > 0;

      if (!hasMerit || !approvalStatus.submittedForApproval) return false;

      for (let level = 1; level <= 5; level++) {
        const levelKey = `level${level}`;
        const approverIdField = `${levelKey}ApproverId`;
        if (emp[approverIdField] && approvalStatus[levelKey]?.status !== "approved") {
          return false;
        }
      }

      return true;
    });

    if (employees.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No employees have completed all approval levels yet.",
      });
    }

    // Map employees to UKG template format
    const excelData = employees.map((emp) => ({
      "Employee Name": emp.fullName || "",
      "Work Email": emp.email || "",
      SSN: emp.ssn || "",
      Company: emp.company || "",
      "Company Code": emp.companyCode || "",
      "Supervisor Name": emp.supervisorName || "",
      Location: emp.location || "",
      "1st Reporting": emp.level1ApproverName || "",
      "2nd Reporting": emp.level2ApproverName || "",
      "3rd Reporting": emp.level3ApproverName || "",
      "4th Reporting": emp.level4ApproverName || "",
      "5th Reporting": emp.level5ApproverName || "",
      "State/Province": emp.addressState || "",
      "Last Hire Date": emp.lastHireDate || "",
      "Employee Type": emp.employeeType || "",
      "Job Title": emp.jobTitle || "",
      "Salary or Hourly": emp.salaryType || "",
      "Annual Salary": emp.annualSalary || 0,
      "Hourly Pay Rate": emp.hourlyPayRate || 0,
      "Merit Increase %": emp.meritIncreasePercentage || 0,
      "Merit Increase $": emp.meritIncreaseDollar || 0,
      "New Annual Salary": emp.newAnnualSalary || 0,
      "New Hourly Rate": emp.newHourlyRate || 0,
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Employees");

    // Generate buffer
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    // Set headers for file download
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=UKG_Export_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

// @desc    Modify merit and approve at current level (keeps higher-level approvals intact)
// @route   POST /api/v2/employees/:employeeId/modify-and-approve
// @access  Private (Approver only)
export const modifyAndApproveMerit = async (req, res, next) => {
  try {
    const Employee = getEmployeeModel();
    const { employeeId } = req.params;
    const { meritIncreasePercentage, meritIncreaseDollar, comments, approverId: bodyApproverId, level } = req.body || {};
    const approverId =
      req.user?.userId ||
      req.user?.id ||
      bodyApproverId ||
      req.query?.approverId;

    if (!approverId || approverId === "undefined" || approverId === "null") {
      return next(new AppError("Approver ID is required", 400));
    }

    // Validate that at least one merit value is provided
    if (
      (meritIncreasePercentage === undefined || meritIncreasePercentage === null) &&
      (meritIncreaseDollar === undefined || meritIncreaseDollar === null)
    ) {
      return next(
        new AppError("Merit increase (percentage or dollar amount) is required", 400)
      );
    }

    const employee = await Employee.findByPk(employeeId, {
      include: [
        { model: Employee, as: "level1Approver", attributes: ["id", "fullName", "employeeId", "email"] },
        { model: Employee, as: "level2Approver", attributes: ["id", "fullName", "employeeId", "email"] },
        { model: Employee, as: "level3Approver", attributes: ["id", "fullName", "employeeId", "email"] },
        { model: Employee, as: "level4Approver", attributes: ["id", "fullName", "employeeId", "email"] },
        { model: Employee, as: "level5Approver", attributes: ["id", "fullName", "employeeId", "email"] },
        { model: Employee, as: "supervisor", attributes: ["id", "fullName", "employeeId", "email"] },
      ],
    });

    if (!employee) {
      return next(new AppError("Employee not found", 404));
    }

    // Get approver details for history logging
    const approverDetails = await Employee.findByPk(approverId, {
      attributes: ["id", "fullName", "employeeId"],
    });

    // Determine approver level
    let approverLevel = level;
    if (!approverLevel) {
      for (let lvl = 1; lvl <= 5; lvl++) {
        if (employee[`level${lvl}ApproverId`]?.toString() === approverId.toString()) {
          approverLevel = lvl;
          break;
        }
      }
    }

    if (!approverLevel) {
      return next(
        new AppError("You are not authorized to modify merit for this employee", 403)
      );
    }

    // Store old values for history
    const oldMeritPercentage = employee.meritIncreasePercentage;
    const oldMeritDollar = employee.meritIncreaseDollar;

    // Calculate new merit values
    let newAnnualSalary = 0;
    let newHourlyRate = 0;
    let finalMeritPercentage = 0;
    let finalMeritDollar = 0;

    if (employee.salaryType === "Hourly") {
      if (meritIncreaseDollar !== undefined && meritIncreaseDollar !== null) {
        finalMeritDollar = parseFloat(meritIncreaseDollar);
        newHourlyRate = (parseFloat(employee.hourlyPayRate) || 0) + finalMeritDollar;
      }
    } else {
      if (meritIncreasePercentage !== undefined && meritIncreasePercentage !== null) {
        finalMeritPercentage = parseFloat(meritIncreasePercentage);
        const currentSalary = parseFloat(employee.annualSalary) || 0;
        newAnnualSalary = currentSalary * (1 + finalMeritPercentage / 100);
      }
    }

    // Check if the merit value is the same as the current value (prevent modifying with same value)
    if (employee.salaryType === "Hourly") {
      if (oldMeritDollar !== null && oldMeritDollar !== undefined && parseFloat(oldMeritDollar) === finalMeritDollar) {
        return next(
          new AppError(
            `Merit value is already $${finalMeritDollar}/hr. Please enter a different value to modify.`,
            400
          )
        );
      }
    } else {
      if (oldMeritPercentage !== null && oldMeritPercentage !== undefined && parseFloat(oldMeritPercentage) === finalMeritPercentage) {
        return next(
          new AppError(
            `Merit value is already ${finalMeritPercentage}%. Please enter a different value to modify.`,
            400
          )
        );
      }
    }

    // Update approval status - keep higher-level approvals intact
    const existingStatus = employee.approvalStatus
      ? JSON.parse(JSON.stringify(employee.approvalStatus))
      : {};

    const levelKey = `level${approverLevel}`;
    existingStatus[levelKey] = {
      ...(existingStatus[levelKey] || {}),
      status: "approved",
      approvedBy: approverId,
      approvedAt: new Date(),
      comments: comments || null,
      modified: true,
      modifiedAt: new Date(),
    };

    // Add to merit history
    const history = employee.meritHistory || [];

    console.log('ðŸ” [MODIFY-AND-APPROVE DEBUG] Employee:', employee.employeeId, employee.fullName);
    console.log('ðŸ” [MODIFY-AND-APPROVE DEBUG] Approver Level:', approverLevel);
    console.log('ðŸ” [MODIFY-AND-APPROVE DEBUG] Merit history BEFORE push:', JSON.stringify(history, null, 2));

    history.push({
      timestamp: new Date(),
      action: "modified_and_approved",
      level: approverLevel,
      actor: {
        id: approverId,
        name: approverDetails?.fullName || "Unknown",
        employeeId: approverDetails?.employeeId || "N/A",
      },
      oldValue: employee.salaryType === "Hourly" ? oldMeritDollar : oldMeritPercentage,
      newValue: employee.salaryType === "Hourly" ? finalMeritDollar : finalMeritPercentage,
      salaryType: employee.salaryType,
      comments: comments || null,
    });

    console.log('ðŸ” [MODIFY-AND-APPROVE DEBUG] Merit history AFTER push:', JSON.stringify(history, null, 2));

    // Update employee instance and save (use .save() to trigger setters properly)
    employee.meritIncreasePercentage = finalMeritPercentage;
    employee.meritIncreaseDollar = finalMeritDollar;
    employee.newAnnualSalary = newAnnualSalary;
    employee.newHourlyRate = newHourlyRate;
    employee.approvalStatus = existingStatus;
    employee.meritHistory = history;

    console.log('ðŸ” [MODIFY-AND-APPROVE DEBUG] About to save employee...');
    await employee.save();
    console.log('âœ… [MODIFY-AND-APPROVE DEBUG] Employee saved successfully!');

    // â”€â”€ Notify next approver about modification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const meritDisplay = employee.salaryType === 'Hourly'
      ? `$${finalMeritDollar}/hr`
      : `${finalMeritPercentage}%`;

    const nextApprover = getNextApprovalLevel(employee);
    if (nextApprover) {
      const nextApproverDetails = await Employee.findByPk(nextApprover.approverId);
      if (nextApproverDetails?.email) {
        // Send notification (in-app only, email removed as per user request)
        try {
          await createNotification({
            recipientId: nextApprover.approverId,
            type: 'merit_modified',
            title: `Merit Modified - Review Required`,
            message: `Merit for ${employee.fullName} has been modified by Level ${approverLevel}. Please review.`,
            payload: {
              employeeDbId: employee.id,
              employeeId: employee.employeeId,
              employeeName: employee.fullName,
              meritAmount: meritDisplay,
              modifiedBy: approverDetails?.fullName || 'Unknown',
              level: nextApprover.level
            }
          });
          console.log('âœ… Sent modified in-app notification to:', nextApproverDetails.fullName);
        } catch (notifError) {
          console.error('âŒ Failed to create modified notification:', notifError);
        }
      }
    }

    // â”€â”€ Notify PREVIOUS approver (Downstream) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // If Level 1 modifies, notify supervisor. If Level 2 modifies, notify Level 1, etc.
    let previousActor = null;
    if (approverLevel === 1) {
      previousActor = employee.supervisor;
    } else if (approverLevel > 1) {
      previousActor = employee[`level${approverLevel - 1}Approver`];
    }

    if (previousActor && previousActor.email) {
      try {
        await sendMeritModifiedDownstreamEmail({
          toEmail: previousActor.email,
          toName: previousActor.fullName,
          employeeName: employee.fullName,
          employeeId: employee.employeeId,
          modifiedAmount: meritDisplay,
          modifiedBy: approverDetails?.fullName || 'Unknown'
        });
        console.log(`âœ… Sent downstream modification email to ${previousActor.fullName} (${previousActor.email})`);
      } catch (emailError) {
        console.error('âŒ Failed to send downstream modification email:', emailError);
      }
    }

    const updatedEmployee = await Employee.findByPk(employeeId, {
      attributes: { exclude: ["password"] },
      include: [
        { model: Employee, as: "level1Approver", attributes: ["id", "fullName", "employeeId"] },
        { model: Employee, as: "level2Approver", attributes: ["id", "fullName", "employeeId"] },
        { model: Employee, as: "level3Approver", attributes: ["id", "fullName", "employeeId"] },
        { model: Employee, as: "level4Approver", attributes: ["id", "fullName", "employeeId"] },
        { model: Employee, as: "level5Approver", attributes: ["id", "fullName", "employeeId"] },
      ],
    });

    console.log('ðŸ” [MODIFY-AND-APPROVE DEBUG] Updated employee from DB - merit history:', JSON.stringify(updatedEmployee.meritHistory, null, 2));

    res.status(200).json({
      success: true,
      message: `Merit modified and approved successfully at level ${approverLevel}`,
      data: updatedEmployee,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete all employees except hr@pvschemicals.com
// @route   DELETE /api/v2/employees/delete-all
// @access  Private (HR Admin only - hr@pvschemicals.com)
export const deleteAllEmployees = async (req, res, next) => {
  try {
    const Employee = getEmployeeModel();
    const Notification = getNotification();

    // Get IDs of employees to be deleted (for notification cleanup)
    const employeesToDelete = await Employee.findAll({
      where: {
        role: { [Op.ne]: "hr" },
        email: { [Op.notIn]: PROTECTED_EMAILS },
      },
      attributes: ['id'],
    });

    const employeeIds = employeesToDelete.map(emp => emp.id);

    // Delete all employees except HR role users and protected accounts
    const deletedCount = await Employee.destroy({
      where: {
        role: { [Op.ne]: "hr" },
        email: { [Op.notIn]: PROTECTED_EMAILS },
      },
    });

    // Delete all notifications related to deleted employees
    let deletedNotificationCount = 0;
    if (employeeIds.length > 0) {
      // Build OR conditions for each employeeDbId in payload
      const payloadConditions = employeeIds.map(id => ({
        payload: { [Op.like]: `%"employeeDbId":${id}%` }
      }));

      deletedNotificationCount = await Notification.destroy({
        where: {
          [Op.or]: [
            { recipientId: { [Op.in]: employeeIds } }, // Notifications sent to deleted employees
            ...payloadConditions, // Notifications about deleted employees
          ],
        },
      });
    }

    res.status(200).json({
      success: true,
      message: `Successfully deleted ${deletedCount} employees and ${deletedNotificationCount} related notifications`,
      deletedCount,
      deletedNotificationCount,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset all merit data to upload state (clear all merits, approvals, and history)
// @route   POST /api/v2/employees/reset-merits
// @access  Private (HR Admin only)
export const resetMeritData = async (req, res, next) => {
  try {
    const Employee = getEmployeeModel();

    // Reset all merit-related fields to their initial state (skip HR role users)
    const [updateCount] = await Employee.update(
      {
        meritIncreasePercentage: 0,
        meritIncreaseDollar: 0,
        newAnnualSalary: 0,
        newHourlyRate: 0,
        approvalStatus: null,
        meritHistory: null,
      },
      {
        where: { role: { [Op.ne]: "hr" } },
      },
    );

    res.status(200).json({
      success: true,
      message: `Successfully reset merit data for ${updateCount} employees. All merit increases, approvals, and history have been cleared.`,
      resetCount: updateCount,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset supervisor's employees merit data (clear merits, approvals, and history only for their team)
// @route   POST /api/v2/employees/supervisor/reset-merits
// @access  Private (Supervisor)
export const resetSupervisorMeritData = async (req, res, next) => {
  try {
    const Employee = getEmployeeModel();
    const supervisorId =
      req.user?.userId ||
      req.user?.id ||
      req.body?.supervisorId ||
      req.query?.supervisorId;

    if (!supervisorId || supervisorId === "undefined" || supervisorId === "null") {
      return next(new AppError("Supervisor ID is required", 400));
    }

    const [updateCount] = await Employee.update(
      {
        meritIncreasePercentage: 0,
        meritIncreaseDollar: 0,
        newAnnualSalary: 0,
        newHourlyRate: 0,
        approvalStatus: null,
        meritHistory: null,
      },
      {
        where: {
          supervisorId: supervisorId,
          isActive: true,
          id: { [Op.ne]: supervisorId }, // Exclude themselves
        },
      }
    );

    res.status(200).json({
      success: true,
      message: `Successfully reset merit data for ${updateCount} employees.`,
      resetCount: updateCount,
    });
  } catch (error) {
    next(error);
  }
};
