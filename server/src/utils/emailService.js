import nodemailer from 'nodemailer';

/**
 * Email Service for Internal SMTP
 * Configured for PVS Chemicals internal email system
 */

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtpmail.pvschemicals.com',
    port: parseInt(process.env.SMTP_PORT) || 25,
    secure: false, // true for 465, false for other ports
    auth: false, // No authentication required for internal SMTP
    tls: {
      rejectUnauthorized: false, // Accept self-signed certificates for internal use
    },
  });
};

/**
 * Send bonus rejection notification email to previous approver
 * @param {Object} params - Email parameters
 * @param {string} params.toEmail - Recipient email address
 * @param {string} params.toName - Recipient name
 * @param {string} params.employeeName - Employee whose bonus was rejected
 * @param {string} params.employeeId - Employee ID
 * @param {number} params.currentAmount - Current bonus amount
 * @param {string} params.rejectedBy - Name of the approver who rejected
 * @param {number} params.rejectorLevel - Approval level of the rejector
 * @param {string} params.rejectionReason - Reason for rejection (optional)
 * @returns {Promise<Object>} Email send result
 */
export const sendBonusRejectionEmail = async ({
  toEmail,
  toName,
  employeeName,
  employeeId,
  currentAmount,
  rejectedBy,
  rejectorLevel,
  rejectionReason = '',
}) => {
  try {
    const transporter = createTransporter();

    // Email subject
    const subject = `Bonus Review Rejected - Action Required for ${employeeName}`;

    // Email HTML body
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #d32f2f;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
          }
          .content {
            background-color: #f9f9f9;
            padding: 30px;
            border: 1px solid #ddd;
            border-top: none;
          }
          .alert-box {
            background-color: #fff3cd;
            border: 1px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
          }
          .info-table {
            width: 100%;
            margin: 20px 0;
            border-collapse: collapse;
          }
          .info-table td {
            padding: 10px;
            border-bottom: 1px solid #ddd;
          }
          .info-table td:first-child {
            font-weight: bold;
            width: 40%;
          }
          .cta-button {
            display: inline-block;
            background-color: #1976d2;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            text-align: center;
          }
          .footer {
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Bonus Review Rejected</h1>
        </div>
        <div class="content">
          <p>Dear ${toName},</p>

          <div class="alert-box">
            <strong>Action Required:</strong> A bonus review has been rejected by Level ${rejectorLevel} approver. Please review and edit the bonus amount.
          </div>

          <p>A bonus review that you previously approved has been rejected and requires your attention.</p>

          <table class="info-table">
            <tr>
              <td>Employee Name:</td>
              <td><strong>${employeeName}</strong></td>
            </tr>
            <tr>
              <td>Employee ID:</td>
              <td>${employeeId}</td>
            </tr>
            <tr>
              <td>Current Bonus Amount:</td>
              <td><strong>$${currentAmount ? currentAmount.toLocaleString() : '0'}</strong></td>
            </tr>
            <tr>
              <td>Rejected By:</td>
              <td>${rejectedBy} (Level ${rejectorLevel} Approver)</td>
            </tr>
            ${rejectionReason ? `
            <tr>
              <td>Rejection Reason:</td>
              <td>${rejectionReason}</td>
            </tr>
            ` : ''}
          </table>

          <p><strong>Next Steps:</strong></p>
          <ol>
            <li>Review the current bonus amount</li>
            <li>Edit the bonus amount as necessary</li>
            <li>Resubmit for approval</li>
          </ol>

          <center>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/PerformanceRewardsPortal/approvals" class="cta-button">
              Go to Approvals Dashboard
            </a>
          </center>

          <p style="margin-top: 30px;">If you have any questions, please contact the HR department.</p>

          <p>Best regards,<br>
          <strong>HR Compensation Portal</strong><br>
          PVS Chemicals</p>
        </div>
        <div class="footer">
          <p>This is an automated message from the HR Compensation Portal. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} PVS Chemicals. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    // Plain text version for email clients that don't support HTML
    const textBody = `
Bonus Review Rejected - Action Required

Dear ${toName},

A bonus review that you previously approved has been rejected by Level ${rejectorLevel} approver and requires your attention.

Employee Details:
- Employee Name: ${employeeName}
- Employee ID: ${employeeId}
- Current Bonus Amount: $${currentAmount ? currentAmount.toLocaleString() : '0'}
- Rejected By: ${rejectedBy} (Level ${rejectorLevel} Approver)
${rejectionReason ? `- Rejection Reason: ${rejectionReason}` : ''}

Next Steps:
1. Review the current bonus amount
2. Edit the bonus amount as necessary
3. Resubmit for approval

Please log in to the HR Compensation Portal to take action: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/PerformanceRewardsPortal/approvals

If you have any questions, please contact the HR department.

Best regards,
HR Compensation Portal
PVS Chemicals

---
This is an automated message from the HR Compensation Portal. Please do not reply to this email.
    `;

    // Send mail with defined transport object
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'HR_CompensationPortal@PVSChemicals.com',
      to: toEmail,
      subject: subject,
      text: textBody,
      html: htmlBody,
    });

    console.log('✅ Rejection email sent successfully:', info.messageId);
    return {
      success: true,
      messageId: info.messageId,
      recipient: toEmail,
    };
  } catch (error) {
    console.error('❌ Error sending rejection email:', error);
    // Don't throw error - we don't want email failures to break the approval flow
    return {
      success: false,
      error: error.message,
      recipient: toEmail,
    };
  }
};

/**
 * Test email configuration
 * @param {string} testEmail - Email address to send test to
 * @returns {Promise<Object>} Test result
 */
export const testEmailConfiguration = async (testEmail) => {
  try {
    const transporter = createTransporter();

    // Verify SMTP connection
    await transporter.verify();
    console.log('✅ SMTP server is ready to send emails');

    // Send test email
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'HR_CompensationPortal@PVSChemicals.com',
      to: testEmail,
      subject: 'Test Email - HR Compensation Portal',
      text: 'This is a test email from the HR Compensation Portal. If you received this, the email configuration is working correctly.',
      html: '<p>This is a test email from the <strong>HR Compensation Portal</strong>.</p><p>If you received this, the email configuration is working correctly.</p>',
    });

    console.log('✅ Test email sent successfully:', info.messageId);
    return {
      success: true,
      messageId: info.messageId,
      message: 'Email configuration is working correctly',
    };
  } catch (error) {
    console.error('❌ Email configuration test failed:', error);
    return {
      success: false,
      error: error.message,
      message: 'Email configuration test failed',
    };
  }
};

export const sendNewBonusRecordEmail = async ({
  toEmail,
  toName,
  employeeName,
  employeeId,
  roleDescription = 'Approver',
}) => {
  try {
    const transporter = createTransporter();

    const subject = `New Bonus Record Added - Action Required`;

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #1976d2;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
          }
          .content {
            background-color: #f9f9f9;
            padding: 30px;
            border: 1px solid #ddd;
            border-top: none;
          }
          .alert-box {
            background-color: #e3f2fd;
            border: 1px solid #2196f3;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
          }
          .info-table {
            width: 100%;
            margin: 20px 0;
            border-collapse: collapse;
          }
          .info-table td {
            padding: 10px;
            border-bottom: 1px solid #ddd;
          }
          .info-table td:first-child {
            font-weight: bold;
            width: 40%;
          }
          .cta-button {
            display: inline-block;
            background-color: #1976d2;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            text-align: center;
          }
          .footer {
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>New Bonus Record Added</h1>
        </div>
        <div class="content">
          <p>Dear ${toName},</p>

          <div class="alert-box">
            <strong>Action Required:</strong> A new bonus record has been added. Please login to the PVS Bonus Portal to process the record.
          </div>

          <p>A new bonus record has been assigned to you as ${roleDescription}.</p>

          <table class="info-table">
            <tr>
              <td>Employee Name:</td>
              <td><strong>${employeeName}</strong></td>
            </tr>
            <tr>
              <td>Employee ID:</td>
              <td>${employeeId}</td>
            </tr>
            <tr>
              <td>Your Role:</td>
              <td>${roleDescription}</td>
            </tr>
          </table>

          <p><strong>Next Steps:</strong></p>
          <ol>
            <li>Log in to the PVS Bonus Portal</li>
            <li>Review the employee's bonus information</li>
            <li>Enter or approve the bonus amount</li>
          </ol>

          <center>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/PerformanceRewardsPortal/approvals" class="cta-button">
              Go to Approvals Dashboard
            </a>
          </center>

          <p style="margin-top: 30px;">If you have any questions, please contact the HR department.</p>

          <p>Best regards,<br>
          <strong>HR Bonus Portal</strong><br>
          PVS Chemicals</p>
        </div>
        <div class="footer">
          <p>This is an automated message from the HR Bonus Portal. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} PVS Chemicals. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    const textBody = `
New Bonus Record Added - Action Required

Dear ${toName},

A new bonus record has been assigned to you as ${roleDescription}.

Employee Details:
- Employee Name: ${employeeName}
- Employee ID: ${employeeId}
- Your Role: ${roleDescription}

Next Steps:
1. Log in to the PVS Bonus Portal
2. Review the employee's bonus information
3. Enter or approve the bonus amount

Please log in to the HR Bonus Portal to take action: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/PerformanceRewardsPortal/approvals

If you have any questions, please contact the HR department.

Best regards,
HR Bonus Portal
PVS Chemicals

---
This is an automated message from the HR Bonus Portal. Please do not reply to this email.
    `;

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'HR_BonusPortal@PVSChemicals.com',
      to: toEmail,
      subject: subject,
      text: textBody,
      html: htmlBody,
    });

    console.log('✅ New bonus record email sent successfully:', info.messageId);
    return {
      success: true,
      messageId: info.messageId,
      recipient: toEmail,
    };
  } catch (error) {
    console.error('❌ Error sending new bonus record email:', error);
    return {
      success: false,
      error: error.message,
      recipient: toEmail,
    };
  }
};

/**
 * Send bonus resubmitted notification email
 * @param {Object} params - Email parameters
 * @param {string} params.toEmail - Recipient email address
 * @param {string} params.toName - Recipient name
 * @param {string} params.employeeName - Employee name
 * @param {string} params.employeeId - Employee ID
 * @param {number} params.newBonusAmount - New bonus amount
 * @param {string} params.resubmittedBy - Name of person who resubmitted
 * @param {number} params.approverLevel - Level of the recipient approver
 * @returns {Promise<Object>} Email send result
 */
export const sendBonusResubmittedEmail = async ({
  toEmail,
  toName,
  employeeName,
  employeeId,
  newBonusAmount,
  resubmittedBy,
  approverLevel,
}) => {
  try {
    const transporter = createTransporter();

    const subject = `Bonus Record Resubmitted - Review Required for ${employeeName}`;

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #ff9800;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
          }
          .content {
            background-color: #f9f9f9;
            padding: 30px;
            border: 1px solid #ddd;
            border-top: none;
          }
          .alert-box {
            background-color: #fff3e0;
            border: 1px solid #ff9800;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
          }
          .info-table {
            width: 100%;
            margin: 20px 0;
            border-collapse: collapse;
          }
          .info-table td {
            padding: 10px;
            border-bottom: 1px solid #ddd;
          }
          .info-table td:first-child {
            font-weight: bold;
            width: 40%;
          }
          .cta-button {
            display: inline-block;
            background-color: #1976d2;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            text-align: center;
          }
          .footer {
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Bonus Record Resubmitted</h1>
        </div>
        <div class="content">
          <p>Dear ${toName},</p>

          <div class="alert-box">
            <strong>Review Required:</strong> A bonus record has been resubmitted. Please login to the PVS Bonus Portal to review.
          </div>

          <p>A bonus record that was previously rejected has been resubmitted with updates and requires your review as Level ${approverLevel} approver.</p>

          <table class="info-table">
            <tr>
              <td>Employee Name:</td>
              <td><strong>${employeeName}</strong></td>
            </tr>
            <tr>
              <td>Employee ID:</td>
              <td>${employeeId}</td>
            </tr>
            <tr>
              <td>Updated Bonus Amount:</td>
              <td><strong>${newBonusAmount}</strong></td>
            </tr>
            <tr>
              <td>Resubmitted By:</td>
              <td>${resubmittedBy}</td>
            </tr>
          </table>

          <p><strong>Next Steps:</strong></p>
          <ol>
            <li>Review the updated bonus amount</li>
            <li>Approve or reject the bonus request</li>
          </ol>

          <center>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/PerformanceRewardsPortal/approvals" class="cta-button">
              Go to Approvals Dashboard
            </a>
          </center>

          <p style="margin-top: 30px;">If you have any questions, please contact the HR department.</p>

          <p>Best regards,<br>
          <strong>HR Bonus Portal</strong><br>
          PVS Chemicals</p>
        </div>
        <div class="footer">
          <p>This is an automated message from the HR Bonus Portal. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} PVS Chemicals. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    const textBody = `
Bonus Record Resubmitted - Review Required

Dear ${toName},

A bonus record that was previously rejected has been resubmitted with updates and requires your review as Level ${approverLevel} approver.

Employee Details:
- Employee Name: ${employeeName}
- Employee ID: ${employeeId}
- Updated Bonus Amount: ${newBonusAmount}
- Resubmitted By: ${resubmittedBy}

Next Steps:
1. Review the updated bonus amount
2. Approve or reject the bonus request

Please log in to the HR Bonus Portal to take action: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/PerformanceRewardsPortal/approvals

If you have any questions, please contact the HR department.

Best regards,
HR Bonus Portal
PVS Chemicals

---
This is an automated message from the HR Bonus Portal. Please do not reply to this email.
    `;

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'HR_BonusPortal@PVSChemicals.com',
      to: toEmail,
      subject: subject,
      text: textBody,
      html: htmlBody,
    });

    console.log('✅ Bonus resubmitted email sent successfully:', info.messageId);
    return {
      success: true,
      messageId: info.messageId,
      recipient: toEmail,
    };
  } catch (error) {
    console.error('❌ Error sending bonus resubmitted email:', error);
    return {
      success: false,
      error: error.message,
      recipient: toEmail,
    };
  }
};

/**
 * Send final approval notification email to supervisors/leaders
 * @param {Object} params - Email parameters
 * @param {string} params.toEmail - Recipient email address
 * @param {string} params.toName - Recipient name
 * @param {Array} params.employeeNames - Array of employee names (for batch notification)
 * @param {string} params.singleEmployeeName - Single employee name (for individual notification)
 * @returns {Promise<Object>} Email send result
 */
export const sendFinalApprovalEmail = async ({
  toEmail,
  toName,
  employeeNames = [],
  singleEmployeeName = null,
}) => {
  try {
    const transporter = createTransporter();

    const isBatch = employeeNames.length > 1;
    const subject = isBatch
      ? `Some of Your Bonus Requests for Your Team Have Been Finalized`
      : `Bonus Request Finalized for ${singleEmployeeName || employeeNames[0]}`;

    const employeeList = isBatch
      ? employeeNames.map(name => `<li>${name}</li>`).join('')
      : `<strong>${singleEmployeeName || employeeNames[0]}</strong>`;

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #4caf50;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
          }
          .content {
            background-color: #f9f9f9;
            padding: 30px;
            border: 1px solid #ddd;
            border-top: none;
          }
          .alert-box {
            background-color: #e8f5e9;
            border: 1px solid #4caf50;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
          }
          .cta-button {
            display: inline-block;
            background-color: #1976d2;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            text-align: center;
          }
          .footer {
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 12px;
          }
          ul {
            line-height: 1.8;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Bonus Requests Finalized</h1>
        </div>
        <div class="content">
          <p>Dear ${toName},</p>

          <div class="alert-box">
            <strong>Good News!</strong> Some of your bonus requests for your team have been finalized. You may now share the information with your team.
          </div>

          <p>${isBatch
        ? `All bonus requests for the following employees have received final approval:`
        : `The bonus request for ${employeeList} has received final approval.`}</p>

          ${isBatch ? `<ul>${employeeList}</ul>` : ''}

          <p><strong>Next Steps:</strong></p>
          <ol>
            <li>Log in to the PVS Bonus Portal to review the final data</li>
            <li>Share the bonus information with your team members</li>
          </ol>

          <center>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/PerformanceRewardsPortal/approvals" class="cta-button">
              Go to Approvals Dashboard
            </a>
          </center>

          <p style="margin-top: 30px;">If you have any questions, please contact the HR department.</p>

          <p>Best regards,<br>
          <strong>HR Bonus Portal</strong><br>
          PVS Chemicals</p>
        </div>
        <div class="footer">
          <p>This is an automated message from the HR Bonus Portal. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} PVS Chemicals. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    const employeeListText = isBatch
      ? employeeNames.map(name => `- ${name}`).join('\n')
      : `${singleEmployeeName || employeeNames[0]}`;

    const textBody = `
Bonus Requests Finalized

Dear ${toName},

Some of your bonus requests for your team have been finalized. You may now share the information with your team.

${isBatch ? 'Employees:' : 'Employee:'}
${employeeListText}

Next Steps:
1. Log in to the PVS Bonus Portal to review the final data
2. Share the bonus information with your team members

Please log in to the HR Bonus Portal: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/PerformanceRewardsPortal/approvals

If you have any questions, please contact the HR department.

Best regards,
HR Bonus Portal
PVS Chemicals

---
This is an automated message from the HR Bonus Portal. Please do not reply to this email.
    `;

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'HR_BonusPortal@PVSChemicals.com',
      to: toEmail,
      subject: subject,
      text: textBody,
      html: htmlBody,
    });

    console.log('✅ Final approval email sent successfully:', info.messageId);
    return {
      success: true,
      messageId: info.messageId,
      recipient: toEmail,
    };
  } catch (error) {
    console.error('❌ Error sending final approval email:', error);
    return {
      success: false,
      error: error.message,
      recipient: toEmail,
    };
  }
};

/**
 * Send bonus modified notification email
 * @param {Object} params - Email parameters
 * @param {string} params.toEmail - Recipient email address
 * @param {string} params.toName - Recipient name
 * @param {string} params.employeeName - Employee name
 * @param {string} params.employeeId - Employee ID
 * @param {number} params.modifiedAmount - Modified bonus amount
 * @param {string} params.modifiedBy - Name of person who modified
 * @param {number} params.approverLevel - Level of the recipient approver
 * @returns {Promise<Object>} Email send result
 */
export const sendBonusModifiedEmail = async ({
  toEmail,
  toName,
  employeeName,
  employeeId,
  modifiedAmount,
  modifiedBy,
  approverLevel,
}) => {
  try {
    const transporter = createTransporter();

    const subject = `Bonus Request Modified - Review Required for ${employeeName}`;

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #9c27b0;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
          }
          .content {
            background-color: #f9f9f9;
            padding: 30px;
            border: 1px solid #ddd;
            border-top: none;
          }
          .alert-box {
            background-color: #f3e5f5;
            border: 1px solid #9c27b0;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
          }
          .info-table {
            width: 100%;
            margin: 20px 0;
            border-collapse: collapse;
          }
          .info-table td {
            padding: 10px;
            border-bottom: 1px solid #ddd;
          }
          .info-table td:first-child {
            font-weight: bold;
            width: 40%;
          }
          .cta-button {
            display: inline-block;
            background-color: #1976d2;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            text-align: center;
          }
          .footer {
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Bonus Request Modified</h1>
        </div>
        <div class="content">
          <p>Dear ${toName},</p>

          <div class="alert-box">
            <strong>Review Required:</strong> A bonus request has been modified and sent on to the next approval tier. Please login to the PVS Bonus Portal to review.
          </div>

          <p>A bonus request has been modified by a previous approver and is now ready for your review as Level ${approverLevel} approver.</p>

          <table class="info-table">
            <tr>
              <td>Employee Name:</td>
              <td><strong>${employeeName}</strong></td>
            </tr>
            <tr>
              <td>Employee ID:</td>
              <td>${employeeId}</td>
            </tr>
            <tr>
              <td>Modified Bonus Amount:</td>
              <td><strong>${modifiedAmount}</strong></td>
            </tr>
            <tr>
              <td>Modified By:</td>
              <td>${modifiedBy}</td>
            </tr>
          </table>

          <p><strong>Next Steps:</strong></p>
          <ol>
            <li>Review the modified bonus amount</li>
            <li>Approve, modify, or reject the bonus request</li>
          </ol>

          <center>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/PerformanceRewardsPortal/approvals" class="cta-button">
              Go to Approvals Dashboard
            </a>
          </center>

          <p style="margin-top: 30px;">If you have any questions, please contact the HR department.</p>

          <p>Best regards,<br>
          <strong>HR Bonus Portal</strong><br>
          PVS Chemicals</p>
        </div>
        <div class="footer">
          <p>This is an automated message from the HR Bonus Portal. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} PVS Chemicals. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    const textBody = `
Bonus Request Modified - Review Required

Dear ${toName},

A bonus request has been modified by a previous approver and is now ready for your review as Level ${approverLevel} approver.

Employee Details:
- Employee Name: ${employeeName}
- Employee ID: ${employeeId}
- Modified Bonus Amount: ${modifiedAmount}
- Modified By: ${modifiedBy}

Next Steps:
1. Review the modified bonus amount
2. Approve, modify, or reject the bonus request

Please log in to the HR Bonus Portal to take action: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/PerformanceRewardsPortal/approvals

If you have any questions, please contact the HR department.

Best regards,
HR Bonus Portal
PVS Chemicals

---
This is an automated message from the HR Bonus Portal. Please do not reply to this email.
    `;

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'HR_BonusPortal@PVSChemicals.com',
      to: toEmail,
      subject: subject,
      text: textBody,
      html: htmlBody,
    });

    console.log('✅ Bonus modified email sent successfully:', info.messageId);
    return {
      success: true,
      messageId: info.messageId,
      recipient: toEmail,
    };
  } catch (error) {
    console.error('❌ Error sending bonus modified email:', error);
    return {
      success: false,
      error: error.message,
      recipient: toEmail,
    };
  }
};

/**
 * Send notification email to a previous approver when a subsequent approver modifies the record
 * @param {Object} params - Email parameters
 * @param {string} params.toEmail - Recipient email address
 * @param {string} params.toName - Recipient name
 * @param {string} params.employeeName - Employee name
 * @param {string} params.employeeId - Employee ID
 * @param {number} params.modifiedAmount - Modified bonus amount
 * @param {string} params.modifiedBy - Name of person who modified
 * @returns {Promise<Object>} Email send result
 */
export const sendBonusModifiedDownstreamEmail = async ({
  toEmail,
  toName,
  employeeName,
  employeeId,
  modifiedAmount,
  modifiedBy,
}) => {
  try {
    const transporter = createTransporter();

    const subject = `Notification: Bonus Record Modified for ${employeeName}`;

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #607d8b;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
          }
          .content {
            background-color: #f9f9f9;
            padding: 30px;
            border: 1px solid #ddd;
            border-top: none;
          }
          .info-table {
            width: 100%;
            margin: 20px 0;
            border-collapse: collapse;
          }
          .info-table td {
            padding: 10px;
            border-bottom: 1px solid #ddd;
          }
          .info-table td:first-child {
            font-weight: bold;
            width: 40%;
          }
          .footer {
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Bonus Record Modified</h1>
        </div>
        <div class="content">
          <p>Dear ${toName},</p>

          <p>This is a notification that a bonus record you previously approved has been modified by a subsequent reviewer.</p>

          <table class="info-table">
            <tr>
              <td>Employee Name:</td>
              <td><strong>${employeeName}</strong></td>
            </tr>
            <tr>
              <td>Employee ID:</td>
              <td>${employeeId}</td>
            </tr>
            <tr>
              <td>New Bonus Amount:</td>
              <td><strong>${modifiedAmount}</strong></td>
            </tr>
            <tr>
              <td>Modified By:</td>
              <td>${modifiedBy}</td>
            </tr>
          </table>

          <p>No action is required from your side at this time. This email is for your information only.</p>

          <p style="margin-top: 30px;">Best regards,<br>
          <strong>HR Bonus Portal</strong><br>
          PVS Chemicals</p>
        </div>
        <div class="footer">
          <p>This is an automated message from the HR Bonus Portal. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} PVS Chemicals. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    const textBody = `
Notification: Bonus Record Modified

Dear ${toName},

This is a notification that a bonus record you previously approved has been modified by a subsequent reviewer.

Employee Details:
- Employee Name: ${employeeName}
- Employee ID: ${employeeId}
- New Bonus Amount: ${modifiedAmount}
- Modified By: ${modifiedBy}

No action is required from your side at this time. This email is for your information only.

Best regards,
HR Bonus Portal
PVS Chemicals

---
This is an automated message from the HR Bonus Portal. Please do not reply to this email.
    `;

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'HR_BonusPortal@PVSChemicals.com',
      to: toEmail,
      subject: subject,
      text: textBody,
      html: htmlBody,
    });

    console.log('✅ Downstream modification email sent successfully:', info.messageId);
    return {
      success: true,
      messageId: info.messageId,
      recipient: toEmail,
    };
  } catch (error) {
    console.error('❌ Error sending downstream modification email:', error);
    return {
      success: false,
      error: error.message,
      recipient: toEmail,
    };
  }
};

// Maintain backward compatibility
export const sendBonusRejectionEmail = sendBonusRejectionEmail;


export default {
  sendBonusRejectionEmail,
  sendNewBonusRecordEmail,
  sendBonusResubmittedEmail,
  sendFinalApprovalEmail,
  sendBonusModifiedEmail,
  sendBonusModifiedDownstreamEmail,
  testEmailConfiguration,
};
