// backend/src/routes/admin.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { isAdmin, requireAdminPermission } from '../middleware/admin';
import { requireAdminMfa, requireFreshAdminMfa } from '../middleware/mfa';
import { adminAudit } from '../middleware/adminAudit';
import {
  adminMutationLimiter,
  adminReadLimiter,
  sensitiveAdminActionLimiter,
  uploadLimiter,
} from '../middleware/rateLimiter';
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
  orderIdRules,
  homepageSectionCreateRules,
  homepageSectionUpdateRules,
  homepageItemCreateRules,
  homepageItemUpdateRules,
  homepageBlockCreateRules,
  homepageBlockUpdateRules,
  homepageBlockIdRules,
  homepageSectionIdRules,
  homepageItemIdRules,
  homepageBrandProductSectionCreateRules,
  homepageBrandProductSectionUpdateRules,
  homepageBrandProductSectionIdRules,
  homepageCategoryProductSectionCreateRules,
  homepageCategoryProductSectionUpdateRules,
  homepageCategoryProductSectionIdRules,
} from '../middleware/validate';
import * as adminController from '../controllers/admin.controller';
import * as adminSecurityController from '../controllers/adminSecurity.controller';
import {
  createBlock,
  createBrandProductSection,
  createCategoryProductSection,
  createSection,
  createSectionItem,
  deleteBlock,
  deleteBrandProductSection,
  deleteCategoryProductSection,
  deleteSection,
  deleteSectionItem,
  getAdminBlocks,
  getAdminBrandProductSections,
  getAdminCategoryProductSections,
  getAdminHomepage,
  moveBlockDown,
  moveBlockUp,
  moveBrandProductSectionDown,
  moveBrandProductSectionUp,
  moveCategoryProductSectionDown,
  moveCategoryProductSectionUp,
  resetBlocksToDefaults,
  updateBlock,
  updateBrandProductSection,
  updateCategoryProductSection,
  updateSection,
  updateSectionItem,
} from '../controllers/homepage.controller';

const router = Router();

// Apply auth and admin check to all admin routes
router.use(requireAuth);
router.use(isAdmin);
router.use(requireAdminMfa);
router.use(adminReadLimiter);
router.use(adminMutationLimiter);
router.use((req, res, next) => {
  if (req.method === 'POST' && req.path === '/uploads/image') {
    uploadLimiter(req, res, next);
    return;
  }

  next();
});
router.use(adminAudit);

// Analytics
router.get('/analytics/monthly-revenue', requireAdminPermission('analytics'), adminController.getAnalytics);
router.get('/inventory/alerts', requireAdminPermission('products'), adminController.getInventoryAlerts);
router.get('/search', requireAdminPermission('analytics'), adminController.searchAdmin);
router.post('/uploads/image', requireAdminPermission('products'), adminController.uploadImage);

// Security monitoring
router.get('/security/health', requireAdminPermission('security'), adminSecurityController.getSecurityHealth);
router.get('/security/events', requireAdminPermission('security'), adminSecurityController.getSecurityEvents);
router.get('/security/alerts', requireAdminPermission('security'), adminSecurityController.getSecurityAlertsController);

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
router.get('/users', requireAdminPermission('customers'), adminController.listUsers);
router.get('/users/:id', requireAdminPermission('customers'), adminController.getUserDetail);
router.put(
  '/users/:id/role',
  requireAdminPermission('admin_roles'),
  sensitiveAdminActionLimiter,
  requireFreshAdminMfa(10),
  adminController.updateUserRole
);

// Orders
router.get('/orders', requireAdminPermission('orders'), adminController.listOrders);
router.get('/orders/:id', requireAdminPermission('orders'), ...orderIdRules, validate, adminController.getOrderDetail);
router.put('/orders/:id/status', requireAdminPermission('orders'), ...adminOrderStatusRules, validate, adminController.updateOrderStatus);
router.put('/orders/:id/tracking', requireAdminPermission('orders'), ...trackingRules, validate, adminController.updateOrderTracking);
router.put('/returns/:id/status', requireAdminPermission('orders'), ...returnStatusRules, validate, adminController.updateReturnRequestStatus);

// Reviews
router.get('/reviews', requireAdminPermission('reviews'), adminController.listReviews);
router.put('/reviews/:id/status', requireAdminPermission('reviews'), ...reviewModerationRules, validate, adminController.moderateReview);
router.delete('/reviews/:id', requireAdminPermission('reviews'), ...reviewIdRules, validate, adminController.deleteReview);

// Homepage CMS
router.get('/homepage', requireAdminPermission('homepage'), getAdminHomepage);
router.get('/homepage/blocks', requireAdminPermission('homepage'), getAdminBlocks);
router.post('/homepage/blocks', requireAdminPermission('homepage'), ...homepageBlockCreateRules, validate, createBlock);
router.post('/homepage/blocks/reset-defaults', requireAdminPermission('homepage'), resetBlocksToDefaults);
router.put('/homepage/blocks/:id', requireAdminPermission('homepage'), ...homepageBlockUpdateRules, validate, updateBlock);
router.delete('/homepage/blocks/:id', requireAdminPermission('homepage'), ...homepageBlockIdRules, validate, deleteBlock);
router.post('/homepage/blocks/:id/move-up', requireAdminPermission('homepage'), ...homepageBlockIdRules, validate, moveBlockUp);
router.post('/homepage/blocks/:id/move-down', requireAdminPermission('homepage'), ...homepageBlockIdRules, validate, moveBlockDown);
router.get('/homepage/brand-product-sections', requireAdminPermission('homepage'), getAdminBrandProductSections);
router.post('/homepage/brand-product-sections', requireAdminPermission('homepage'), ...homepageBrandProductSectionCreateRules, validate, createBrandProductSection);
router.put('/homepage/brand-product-sections/:id', requireAdminPermission('homepage'), ...homepageBrandProductSectionUpdateRules, validate, updateBrandProductSection);
router.delete('/homepage/brand-product-sections/:id', requireAdminPermission('homepage'), ...homepageBrandProductSectionIdRules, validate, deleteBrandProductSection);
router.post('/homepage/brand-product-sections/:id/move-up', requireAdminPermission('homepage'), ...homepageBrandProductSectionIdRules, validate, moveBrandProductSectionUp);
router.post('/homepage/brand-product-sections/:id/move-down', requireAdminPermission('homepage'), ...homepageBrandProductSectionIdRules, validate, moveBrandProductSectionDown);
router.get('/homepage/category-product-sections', requireAdminPermission('homepage'), getAdminCategoryProductSections);
router.post('/homepage/category-product-sections', requireAdminPermission('homepage'), ...homepageCategoryProductSectionCreateRules, validate, createCategoryProductSection);
router.put('/homepage/category-product-sections/:id', requireAdminPermission('homepage'), ...homepageCategoryProductSectionUpdateRules, validate, updateCategoryProductSection);
router.delete('/homepage/category-product-sections/:id', requireAdminPermission('homepage'), ...homepageCategoryProductSectionIdRules, validate, deleteCategoryProductSection);
router.post('/homepage/category-product-sections/:id/move-up', requireAdminPermission('homepage'), ...homepageCategoryProductSectionIdRules, validate, moveCategoryProductSectionUp);
router.post('/homepage/category-product-sections/:id/move-down', requireAdminPermission('homepage'), ...homepageCategoryProductSectionIdRules, validate, moveCategoryProductSectionDown);
router.post('/homepage/sections', requireAdminPermission('homepage'), ...homepageSectionCreateRules, validate, createSection);
router.put('/homepage/sections/:id', requireAdminPermission('homepage'), ...homepageSectionUpdateRules, validate, updateSection);
router.delete('/homepage/sections/:id', requireAdminPermission('homepage'), ...homepageSectionIdRules, validate, deleteSection);
router.post('/homepage/sections/:id/items', requireAdminPermission('homepage'), ...homepageItemCreateRules, validate, createSectionItem);
router.put('/homepage/items/:id', requireAdminPermission('homepage'), ...homepageItemUpdateRules, validate, updateSectionItem);
router.delete('/homepage/items/:id', requireAdminPermission('homepage'), ...homepageItemIdRules, validate, deleteSectionItem);

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
