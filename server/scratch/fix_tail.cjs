const fs = require('fs');
const path = require('path');

const tailPath = path.join('f:', 'webaxium_org', 'PVS_Bonus_Portal', 'server', 'src', 'controllers', 'v2', 'tail.js');
let content = fs.readFileSync(tailPath, 'utf8');

// 1. bulkApproveAll
content = content.replace(/meritHistory/g, 'bonusHistory');
content = content.replace(/const meritValue = employee\.salaryType === "Hourly"[\s\S]*?employee\.meritIncreasePercentage;/g, 'const bonusValue = employee.bonus2025;');
content = content.replace(/meritValue: meritValue,/g, 'bonusValue: bonusValue,');
content = content.replace(/approved merits for/g, 'approved bonuses for');
// 2. checkAllApprovalsCompleted
content = content.replace(/employeesWithMerits/g, 'employeesWithBonuses');
content = content.replace(/parseFloat\(emp\.meritIncreasePercentage\) > 0 \|\|\s*parseFloat\(emp\.meritIncreaseDollar\) > 0/g, 'parseFloat(emp.bonus2025) > 0');
content = content.replace(/No employees with merits found\. Please add merits before exporting\./g, 'No employees with bonuses found. Please add bonuses before exporting.');
content = content.replace(/totalWithMerits/g, 'totalWithBonuses');
// 3. resubmitAndApprove
content = content.replace(/const { meritIncreasePercentage, meritIncreaseDollar, comments, notificationId } = req\.body || {};/g, 'const { bonus2025, comments, notificationId } = req.body || {};');
content = content.replace(/meritIncreasePercentage === undefined \|\| meritIncreasePercentage === null/g, 'bonus2025 === undefined || bonus2025 === null');
content = content.replace(/\&\&\s*\(meritIncreaseDollar === undefined \|\| meritIncreaseDollar === null\)/g, '');
content = content.replace(/Merit increase \(percentage or dollar amount\) is required/g, 'Bonus amount is required');
content = content.replace(/meritIncreasePercentage !== undefined[\s\S]*?parseFloat\(meritIncreaseDollar\) < 0\)/g, '(bonus2025 !== undefined && bonus2025 !== null && parseFloat(bonus2025) < 0)');
content = content.replace(/Merit increase cannot be negative/g, 'Bonus amount cannot be negative');
content = content.replace(/let newAnnualSalary = 0;[\s\S]*?oldMeritDollar = employee\.meritIncreaseDollar;/g, `let finalBonus = 0;\n    if (bonus2025 !== undefined && bonus2025 !== null) {\n      finalBonus = parseFloat(bonus2025);\n    }\n\n    // Get actor details for history logging\n    const actorDetails = await Employee.findByPk(actorId, {\n      attributes: ["id", "fullName", "employeeId"],\n    });\n\n    // Store old values for history\n    const oldBonus = employee.bonus2025;`);

content = content.replace(/const oldValue = employee\.salaryType === "Hourly" \? oldMeritDollar : oldMeritPercentage;\s*const newValue = employee\.salaryType === "Hourly" \? finalMeritDollar : finalMeritPercentage;/g, 'const oldValue = oldBonus;\n    const newValue = finalBonus;');

content = content.replace(/employee\.meritIncreasePercentage = finalMeritPercentage;\s*employee\.meritIncreaseDollar = finalMeritDollar;\s*employee\.newAnnualSalary = newAnnualSalary;\s*employee\.newHourlyRate = newHourlyRate;/g, 'employee.bonus2025 = finalBonus;');

content = content.replace(/type: 'merit_resubmitted'/g, "type: 'bonus_resubmitted'");
content = content.replace(/Merit Resubmitted - Review Required/g, 'Bonus Resubmitted - Review Required');
content = content.replace(/Merit for \$\{employee\.fullName\} has been resubmitted/g, 'Bonus for ${employee.fullName} has been resubmitted');
content = content.replace(/meritAmount: meritDisplay/g, 'bonusAmount: meritDisplay');
content = content.replace(/sendMeritResubmittedEmail/g, 'sendBonusResubmittedEmail');
content = content.replace(/newMeritAmount: meritDisplay/g, 'newBonusAmount: meritDisplay');
content = content.replace(/Merit updated and approved/g, 'Bonus updated and approved');
content = content.replace(/const newMerit = employee\.salaryType === "Hourly" \? finalMeritDollar : finalMeritPercentage;/g, 'const newBonus = finalBonus;');
content = content.replace(/newMerit, actorLevel/g, 'newBonus, actorLevel');

// Format merit display
content = content.replace(/const meritDisplay = employee\.salaryType === 'Hourly'[\s\S]*?`\$\{finalMeritPercentage\}%`;/g, 'const meritDisplay = `$${finalBonus}`;');

// 4. exportToUKG
content = content.replace(/const hasMerit =[\s\S]*?parseFloat\(emp\.meritIncreaseDollar\) > 0;/g, 'const hasMerit = approvalStatus.enteredBy || parseFloat(emp.bonus2025) > 0;');
content = content.replace(/"Merit Increase %": emp\.meritIncreasePercentage \|\| 0,\s*"Merit Increase \$": emp\.meritIncreaseDollar \|\| 0,\s*"New Annual Salary": emp\.newAnnualSalary \|\| 0,\s*"New Hourly Rate": emp\.newHourlyRate \|\| 0,/g, '"Bonus 2024": emp.bonus2024 || 0,\n      "Bonus 2025": emp.bonus2025 || 0,');

// 5. modifyAndApproveMerit
content = content.replace(/export const modifyAndApproveMerit =/g, 'export const modifyAndApproveBonus =');
content = content.replace(/const { meritIncreasePercentage, meritIncreaseDollar, comments, approverId: bodyApproverId, level } = req\.body \|\| {};/g, 'const { bonus2025, comments, approverId: bodyApproverId, level } = req.body || {};');

content = content.replace(/const oldMeritPercentage = employee\.meritIncreasePercentage;\s*const oldMeritDollar = employee\.meritIncreaseDollar;\s*\/\/ Calculate new merit values[\s\S]*?newHourlyRate = \(parseFloat\(employee\.hourlyPayRate\) \|\| 0\) \+ finalMeritDollar;\s*\}\s*\} else \{\s*if \(meritIncreasePercentage !== undefined && meritIncreasePercentage !== null\) \{\s*finalMeritPercentage = parseFloat\(meritIncreasePercentage\);\s*const currentSalary = parseFloat\(employee\.annualSalary\) \|\| 0;\s*newAnnualSalary = currentSalary \* \(1 \+ finalMeritPercentage \/ 100\);\s*\}\s*\}/g, 'const oldBonus = employee.bonus2025;\n    let finalBonus = 0;\n    if (bonus2025 !== undefined && bonus2025 !== null) {\n      finalBonus = parseFloat(bonus2025);\n    }');

content = content.replace(/if \(employee\.salaryType === "Hourly"\) \{\s*if \(oldMeritDollar !== null && oldMeritDollar !== undefined && parseFloat\(oldMeritDollar\) === finalMeritDollar\) \{\s*return next\([\s\S]*?\}\s*\} else \{\s*if \(oldMeritPercentage !== null && oldMeritPercentage !== undefined && parseFloat\(oldMeritPercentage\) === finalMeritPercentage\) \{\s*return next\([\s\S]*?\}\s*\}/g, 'if (oldBonus !== null && oldBonus !== undefined && parseFloat(oldBonus) === finalBonus) {\n      return next(\n        new AppError(`Bonus value is already $${finalBonus}. Please enter a different value to modify.`, 400)\n      );\n    }');

content = content.replace(/oldValue: employee\.salaryType === "Hourly" \? oldMeritDollar : oldMeritPercentage,/g, 'oldValue: oldBonus,');
content = content.replace(/newValue: employee\.salaryType === "Hourly" \? finalMeritDollar : finalMeritPercentage,/g, 'newValue: finalBonus,');

content = content.replace(/type: 'merit_modified'/g, "type: 'bonus_modified'");
content = content.replace(/Merit Modified - Review Required/g, 'Bonus Modified - Review Required');
content = content.replace(/Merit for \$\{employee\.fullName\} has been modified/g, 'Bonus for ${employee.fullName} has been modified');
content = content.replace(/sendMeritModifiedDownstreamEmail/g, 'sendBonusModifiedDownstreamEmail');

// 6. resetMeritData -> resetBonusData
content = content.replace(/export const resetMeritData/g, 'export const resetBonusData');
content = content.replace(/meritIncreasePercentage: 0,\s*meritIncreaseDollar: 0,\s*newAnnualSalary: 0,\s*newHourlyRate: 0,\s*approvalStatus: null,\s*meritHistory: null,/g, 'bonus2025: 0,\n        approvalStatus: null,\n        bonusHistory: null,');
content = content.replace(/reset merit data/g, 'reset bonus data');
content = content.replace(/All merit increases/g, 'All bonuses');

// 7. resetSupervisorMeritData -> resetSupervisorBonusData
content = content.replace(/export const resetSupervisorMeritData/g, 'export const resetSupervisorBonusData');

fs.writeFileSync(tailPath, content);
console.log("Done");
