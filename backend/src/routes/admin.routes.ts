// backend/src/routes/admin.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { isAdmin } from '../middleware/admin';
import { requireAdminMfa } from '../middleware/mfa';
import { adminAudit } from '../middleware/adminAudit';
import { validate, adminProductRules, adminCategoryRules, adminOrderStatusRules } from '../middleware/validate';
import * as adminController from '../controllers/admin.controller';

const router = Router();

// Apply auth and admin check to all admin routes
router.use(requireAuth);
router.use(isAdmin);
router.use(requireAdminMfa);
router.use(adminAudit);

// Analytics
router.get('/analytics/monthly-revenue', adminController.getAnalytics);

// Products
router.post('/products', ...adminProductRules, validate, adminController.createProduct);
router.put('/products/:id', ...adminProductRules, validate, adminController.updateProduct);
router.delete('/products/:id', adminController.deleteProduct);

// Categories
router.post('/categories', ...adminCategoryRules, validate, adminController.createCategory);
router.put('/categories/:id', ...adminCategoryRules, validate, adminController.updateCategory);
router.delete('/categories/:id', adminController.deleteCategory);

// Users
router.get('/users', adminController.listUsers);

// Orders
router.get('/orders', adminController.listOrders);
router.put('/orders/:id/status', ...adminOrderStatusRules, validate, adminController.updateOrderStatus);

export default router;
