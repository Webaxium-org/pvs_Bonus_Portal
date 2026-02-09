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

export default {
  sendBonusRejectionEmail,
  testEmailConfiguration,
};
