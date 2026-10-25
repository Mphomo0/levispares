import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("send cart reminders", { minutes: 30 }, internal.cartReminders.sendDue, {});

crons.interval("send back-in-stock alerts", { hours: 1 }, internal.stockAlerts.sendDue, {});

// 06:00 UTC is 08:00 in South Africa.
crons.daily("email low stock report", { hourUTC: 6, minuteUTC: 0 }, internal.adminTools.sendLowStockReport, {});

export default crons;
