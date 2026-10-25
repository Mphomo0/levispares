import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("send cart reminders", { minutes: 30 }, internal.cartReminders.sendDue, {});

crons.interval("send back-in-stock alerts", { hours: 1 }, internal.stockAlerts.sendDue, {});

export default crons;
