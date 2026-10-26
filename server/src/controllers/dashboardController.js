import { Order } from '../models/Order.js';
import { Customer } from '../models/Customer.js';

export const getDashboardSummary = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;

    // Current date in local / shop context
    const now = new Date();

    // Start and end of today in local date
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // End of next 7 days
    const next7Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59, 999);

    // Active status filter (excluding delivered and cancelled)
    const activeStatusQuery = { $in: ['pending', 'in_progress', 'ready'] };

    // 1. Total Orders for this tenant
    const totalOrders = await Order.countDocuments({ tenantId });

    // 2. Orders Due Today (due today and not yet delivered or cancelled)
    const dueTodayCount = await Order.countDocuments({
      tenantId,
      deadline: { $gte: startOfToday, $lte: endOfToday },
      status: activeStatusQuery,
    });

    // 3. Overdue Orders (deadline before today and still pending)
    const overdueCount = await Order.countDocuments({
      tenantId,
      deadline: { $lt: startOfToday },
      status: activeStatusQuery,
    });

    // 4. Pending Orders (all active orders)
    const pendingOrders = await Order.countDocuments({
      tenantId,
      status: activeStatusQuery,
    });

    // 5. Completed Orders (delivered)
    const completedOrders = await Order.countDocuments({
      tenantId,
      status: 'delivered',
    });

    // 6. Total Customers for this tenant
    const totalCustomers = await Customer.countDocuments({ tenantId, isActive: true });

    // 7. Orders Due Today list
    const dueTodayOrders = await Order.find({
      tenantId,
      deadline: { $gte: startOfToday, $lte: endOfToday },
      status: activeStatusQuery,
    })
      .sort({ deadline: 1 })
      .limit(10)
      .lean();

    // 8. Overdue Orders list
    const overdueOrders = await Order.find({
      tenantId,
      deadline: { $lt: startOfToday },
      status: activeStatusQuery,
    })
      .sort({ deadline: 1 })
      .limit(5)
      .lean();

    // 9. Upcoming Deadlines (within next 7 days, excluding today)
    const upcomingDeadlines = await Order.find({
      tenantId,
      deadline: { $gt: endOfToday, $lte: next7Days },
      status: activeStatusQuery,
    })
      .sort({ deadline: 1 })
      .limit(10)
      .lean();

    // 10. Recent Orders for this tenant
    const recentOrders = await Order.find({ tenantId })
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();

    return res.json({
      success: true,
      data: {
        counts: {
          totalOrders,
          dueTodayCount,
          overdueCount,
          pendingOrders,
          completedOrders,
          totalCustomers,
        },
        dueTodayOrders,
        overdueOrders,
        upcomingDeadlines,
        recentOrders,
      },
    });
  } catch (error) {
    next(error);
  }
};
