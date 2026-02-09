# Email System Implementation Guide

## Overview
This document describes the email notification system implemented for bonus approval rejections using nodemailer and internal SMTP.

## Configuration

### Environment Variables
The following environment variables have been added to `.env`:

```env
# Email Configuration (SMTP)
SMTP_HOST=smtpmail.pvschemicals.com
SMTP_PORT=25
SMTP_FROM=HR_CompensationPortal@PVSChemicals.com
FRONTEND_URL=http://localhost:5173
```

**Note:** For production, update `FRONTEND_URL` to your production frontend URL.

## System Architecture

### 1. Email Service (`src/utils/emailService.js`)
Main email utility that handles:
- SMTP transport configuration (no authentication required for internal SMTP)
- Sending rejection notification emails
- Testing email configuration

**Key Features:**
- No authentication required (internal SMTP)
- Port 25 (standard SMTP)
- Automatic HTML and plain text email formatting
- Professional email templates with company branding
- Error handling that doesn't break the approval flow

### 2. Email Flow

When an approver rejects a bonus:

1. **Level 2 rejects** → Email sent to **Level 1 approver**
2. **Level 3 rejects** → Email sent to **Level 2 approver**
3. **Level 4 rejects** → Email sent to **Level 3 approver**
4. **Level 5 rejects** → Email sent to **Level 4 approver**
5. **Level 1 rejects** → Email sent to **Supervisor** (who entered the bonus)

### 3. Email Content

Each rejection email includes:
- Employee name and ID
- Current bonus amount
- Rejecting approver name and level
- Rejection reason (if provided)
- Link to the approvals dashboard
- Professional HTML formatting

## Files Created/Modified

### New Files:
1. **`src/utils/emailService.js`** - Core email functionality
2. **`src/controllers/v2/emailTestController.js`** - Test endpoint controller
3. **`src/routes/v2/emailTestRoutes.js`** - Test endpoint routes

### Modified Files:
1. **`src/controllers/v2/employeeController.js`** - Added email sending on rejection
2. **`src/routes/v2/index.js`** - Registered email test routes
3. **`.env`** - Added email configuration variables

## Testing the Email System

### Method 1: Using the Test Endpoint

Send a POST request to test the email configuration:

```bash
POST http://localhost:4000/api/v2/email/test
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "testEmail": "your-email@pvschemicals.com"
}
```

**Using cURL:**
```bash
curl -X POST http://localhost:4000/api/v2/email/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"testEmail":"your-email@pvschemicals.com"}'
```

**Using Postman:**
1. Create a new POST request
2. URL: `http://localhost:4000/api/v2/email/test`
3. Headers: Add `Authorization: Bearer YOUR_TOKEN`
4. Body (JSON): `{"testEmail": "your-email@pvschemicals.com"}`
5. Click Send

### Method 2: Test with Actual Rejection

1. Log in as a supervisor
2. Set a bonus for an employee
3. Submit for approval
4. Log in as an approver
5. Reject the bonus
6. Check the previous approver's email inbox

## Email Template Preview

The rejection email includes:
- **Header:** Red banner with "Bonus Review Rejected"
- **Alert Box:** Yellow warning with action required message
- **Employee Information Table:**
  - Employee Name
  - Employee ID
  - Current Bonus Amount
  - Rejected By (Name and Level)
  - Rejection Reason (if provided)
- **Next Steps:** Numbered list of actions
- **CTA Button:** "Go to Approvals Dashboard" (blue button)
- **Footer:** Company information and copyright

## Troubleshooting

### Issue: Emails Not Sending

**Check:**
1. SMTP server accessibility: `smtpmail.pvschemicals.com` on port 25
2. Server has network access to SMTP server
3. Check server logs for error messages
4. Verify environment variables are loaded correctly

### Issue: Email Not Received

**Check:**
1. Recipient's email address is correct in the database
2. Check spam/junk folder
3. Verify email server logs
4. Test with the test endpoint first

### Issue: Email Formatting Issues

**Check:**
1. Recipient's email client supports HTML emails
2. If HTML doesn't render, plain text version will be shown
3. Email client's security settings

## Security Considerations

1. **Internal SMTP Only:** This configuration is for internal SMTP servers only
2. **No Authentication:** The system assumes internal SMTP doesn't require authentication
3. **Email Validation:** Basic email validation is performed before sending
4. **Error Handling:** Email failures don't break the approval process
5. **Sender Email:** Uses dedicated HR compensation portal email address

## Production Deployment Checklist

- [ ] Update `FRONTEND_URL` in `.env` to production URL
- [ ] Verify SMTP server `smtpmail.pvschemicals.com` is accessible from production server
- [ ] Test email sending from production environment
- [ ] Verify all employee email addresses are correct in database
- [ ] Monitor email sending logs for the first few days
- [ ] Set up email delivery monitoring/alerting if available

## Code Examples

### Send Rejection Email Manually (if needed)

```javascript
import { sendBonusRejectionEmail } from './utils/emailService.js';

const result = await sendBonusRejectionEmail({
  toEmail: 'manager@pvschemicals.com',
  toName: 'John Manager',
  employeeName: 'Jane Employee',
  employeeId: 'EMP001',
  currentAmount: 5000,
  rejectedBy: 'Senior Manager',
  rejectorLevel: 2,
  rejectionReason: 'Amount exceeds budget guidelines',
});

console.log(result.success ? 'Email sent!' : 'Failed to send');
```

## Support

For issues or questions:
1. Check server logs for error messages
2. Verify SMTP server connectivity
3. Contact IT support for SMTP server issues
4. Review this documentation for troubleshooting steps

## Future Enhancements (Optional)

- Add email notification for successful approvals
- Add email digest for pending approvals
- Email reminders for overdue approvals
- Email notification when all levels are approved
- Add email templates for different scenarios
- Email notification to supervisor when approval is complete
