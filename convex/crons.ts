import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("send cart reminders", { minutes: 30 }, internal.cartReminders.sendDue, {});

export default crons;
