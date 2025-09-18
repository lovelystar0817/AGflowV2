import express, { type Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import pino from "pino";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { getNotificationJobService } from "./notification-job";

// Initialize logger
export const logger = pino();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request ID and logging middleware
app.use((req: any, res, next) => {
  req.requestId = uuidv4();
  res.setHeader("x-request-id", req.requestId);
  logger.info({ requestId: req.requestId, path: req.path }, "Request received");
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, req: any, res: Response, next: NextFunction) => {
    logger.error({ requestId: req.requestId, path: req.path, err }, "Unhandled error");
    res.status(500).json({ error: "Internal error", requestId: req.requestId });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Start the notification job service for background email processing
    const notificationJobService = getNotificationJobService();
    notificationJobService.start();
    log("Notification job service started - processing notifications every hour");
  });
})();
