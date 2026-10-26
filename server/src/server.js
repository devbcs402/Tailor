import dotenv from 'dotenv';
import app from './app.js';
import { connectDB } from './config/db.js';
import { initBackupCron } from './services/cronService.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

// Connect to MongoDB and start HTTP server
const startServer = async () => {
  try {
    await connectDB();

    // Schedule automated 7-day backup cron job (runs once every 7 days; does NOT run on server restart)
    initBackupCron();

    app.listen(PORT, () => {
      console.log(`[Server] Tailor Management System running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[Server] Failed to start:', err.message);
    process.exit(1);
  }
};

startServer();
