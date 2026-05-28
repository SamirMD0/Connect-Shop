// backend/src/routes/admin.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { isAdmin, requireAdminPermission } from '../middleware/admin';
import { requireAdminMfa } from '../middleware/mfa';
import { adminAudit } from '../middleware/adminAudit';
import {
  validate,
  adminProductRules,
  adminCategoryRules,
  adminBrandRules,
  adminOrderStatusRules,
  reviewIdRules,
  reviewModerationRules,
  returnStatusRules,
  trackingRules,
  homepageSectionCreateRules,
  homepageSectionUpdateRules,
  homepageItemCreateRules,
  homepageItemUpdateRules,
  homepageSectionIdRules,
  homepageItemIdRules,
} from '../middleware/validate';
import * as adminController from '../controllers/admin.controller';
import {
  createSection,
  createSectionItem,
  deleteSection,
  deleteSectionItem,
  getAdminHomepage,
  updateSection,
  updateSectionItem,
} from '../controllers/homepage.controller';

const router = Router();

// Apply auth and admin check to all admin routes
router.use(requireAuth);
router.use(isAdmin);
router.use(requireAdminMfa);
router.use(adminAudit);

// Analytics
router.get('/analytics/monthly-revenue', requireAdminPermission('analytics'), adminController.getAnalytics);
router.get('/inventory/alerts', requireAdminPermission('products'), adminController.getInventoryAlerts);
router.get('/search', requireAdminPermission('analytics'), adminController.searchAdmin);
router.post('/uploads/image', requireAdminPermission('products'), adminController.uploadImage);

// Products
router.get('/products/export', requireAdminPermission('products'), adminController.exportProductsCsv);
router.post('/products/import', requireAdminPermission('products'), adminController.importProductsCsv);
router.post('/products', requireAdminPermission('products'), ...adminProductRules, validate, adminController.createProduct);
router.put('/products/:id', requireAdminPermission('products'), ...adminProductRules, validate, adminController.updateProduct);
router.delete('/products/:id', requireAdminPermission('products'), adminController.deleteProduct);

// Categories
router.get('/categories', requireAdminPermission('products'), adminController.listCategories);
router.post('/categories', requireAdminPermission('products'), ...adminCategoryRules, validate, adminController.createCategory);
router.put('/categories/:id', requireAdminPermission('products'), ...adminCategoryRules, validate, adminController.updateCategory);
router.delete('/categories/:id', requireAdminPermission('products'), adminController.deleteCategory);

// Brands
router.get('/brands', requireAdminPermission('products'), adminController.listBrands);
router.post('/brands', requireAdminPermission('products'), ...adminBrandRules, validate, adminController.createBrand);
router.put('/brands/:id', requireAdminPermission('products'), ...adminBrandRules, validate, adminController.updateBrand);
router.delete('/brands/:id', requireAdminPermission('products'), adminController.deleteBrand);

// Users
router.get('/users', requireAdminPermission('users'), adminController.listUsers);
router.get('/users/:id', requireAdminPermission('users'), adminController.getUserDetail);
router.put('/users/:id/role', requireAdminPermission('users'), adminController.updateUserRole);

// Orders
router.get('/orders', requireAdminPermission('orders'), adminController.listOrders);
router.get('/orders/:id', requireAdminPermission('orders'), adminController.getOrderDetail);
router.put('/orders/:id/status', requireAdminPermission('orders'), ...adminOrderStatusRules, validate, adminController.updateOrderStatus);
router.put('/orders/:id/tracking', requireAdminPermission('orders'), ...trackingRules, validate, adminController.updateOrderTracking);
router.put('/returns/:id/status', requireAdminPermission('orders'), ...returnStatusRules, validate, adminController.updateReturnRequestStatus);

// Reviews
router.get('/reviews', requireAdminPermission('reviews'), adminController.listReviews);
router.put('/reviews/:id/status', requireAdminPermission('reviews'), ...reviewModerationRules, validate, adminController.moderateReview);
router.delete('/reviews/:id', requireAdminPermission('reviews'), ...reviewIdRules, validate, adminController.deleteReview);

// Homepage CMS
router.get('/homepage', requireAdminPermission('content'), getAdminHomepage);
router.post('/homepage/sections', requireAdminPermission('content'), ...homepageSectionCreateRules, validate, createSection);
router.put('/homepage/sections/:id', requireAdminPermission('content'), ...homepageSectionUpdateRules, validate, updateSection);
router.delete('/homepage/sections/:id', requireAdminPermission('content'), ...homepageSectionIdRules, validate, deleteSection);
router.post('/homepage/sections/:id/items', requireAdminPermission('content'), ...homepageItemCreateRules, validate, createSectionItem);
router.put('/homepage/items/:id', requireAdminPermission('content'), ...homepageItemUpdateRules, validate, updateSectionItem);
router.delete('/homepage/items/:id', requireAdminPermission('content'), ...homepageItemIdRules, validate, deleteSectionItem);

// Promotions
router.get('/promotions', requireAdminPermission('marketing'), adminController.listPromotions);
router.post('/promotions', requireAdminPermission('marketing'), adminController.createPromotion);
router.put('/promotions/:id', requireAdminPermission('marketing'), adminController.updatePromotion);
router.delete('/promotions/:id', requireAdminPermission('marketing'), adminController.deletePromotion);

// Coupons
router.get('/coupons', requireAdminPermission('marketing'), adminController.listCoupons);
router.post('/coupons', requireAdminPermission('marketing'), adminController.createCoupon);
router.put('/coupons/:id', requireAdminPermission('marketing'), adminController.updateCoupon);
router.delete('/coupons/:id', requireAdminPermission('marketing'), adminController.deleteCoupon);

export default router;
