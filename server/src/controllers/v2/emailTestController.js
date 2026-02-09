import { testEmailConfiguration } from "../../utils/emailService.js";
import AppError from "../../utils/appError.js";

// @desc    Test email configuration
// @route   POST /api/v2/email/test
// @access  Private (Admin only)
export const testEmail = async (req, res, next) => {
  try {
    const { testEmail } = req.body;

    if (!testEmail) {
      return next(new AppError("Please provide a test email address", 400));
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      return next(new AppError("Please provide a valid email address", 400));
    }

    const result = await testEmailConfiguration(testEmail);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: "Test email sent successfully. Please check your inbox.",
        data: {
          messageId: result.messageId,
          recipient: testEmail,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to send test email",
        error: result.error,
      });
    }
  } catch (error) {
    next(error);
  }
};

export default { testEmail };
