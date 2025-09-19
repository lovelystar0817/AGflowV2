import express, { type Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import pino from "pino";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { getNotificationJobService } from "./notification-job";

// Initialize logger
export const logger = pino();

type RequestWithId = Request & { requestId?: string };

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request ID and logging middleware
app.use((req: RequestWithId, res: Response, next: NextFunction) => {
  const requestId = uuidv4();
  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  logger.info(
    { requestId, method: req.method, path: req.path },
    "Request received",
  );
  next();
});

app.use((req: RequestWithId, res: Response, next: NextFunction) => {
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
      const logPayload: Record<string, unknown> = {
        requestId: req.requestId,
        method: req.method,
        path,
        statusCode: res.statusCode,
        durationMs: duration,
      };

      if (capturedJsonResponse) {
        const serializedResponse = JSON.stringify(capturedJsonResponse);
        logPayload.responseBody =
          serializedResponse.length > 500
            ? `${serializedResponse.slice(0, 497)}…`
            : serializedResponse;
      }

      logger.info(logPayload, "Request completed");
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use(
    (
      err: unknown,
      req: RequestWithId,
      res: Response,
      _next: NextFunction,
    ) => {
      logger.error(
        { requestId: req.requestId, path: req.path, err },
        "Unhandled error",
      );
      res
        .status(500)
        .json({ error: "Internal error", requestId: req.requestId });
    },
  );

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
    logger.info({ port }, "Server listening");

    // Start the notification job service for background email processing
    const notificationJobService = getNotificationJobService();
    notificationJobService.start();
    logger.info(
      "Notification job service started - processing notifications every hour",
    );
  });
})();
