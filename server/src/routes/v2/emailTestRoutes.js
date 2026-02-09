import { Router } from "express";
import { testEmail } from "../../controllers/v2/emailTestController.js";
import { protect } from "../../middlewares/auth.js";

const router = Router();

// Test email configuration
router.post("/test", protect, testEmail);

export default router;
