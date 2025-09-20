import express, { type Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import pino from "pino";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import csrf from "csrf";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { getNotificationJobService } from "./notification-job";

// Initialize logger
export const logger = pino();

// Initialize CSRF protection
const tokens = new csrf();

type RequestWithId = Request & { requestId?: string };

const app = express();
app.set('trust proxy', 1); // Trust first proxy for proper IP detection

// Add cookie parser middleware (required for CSRF)
app.use(cookieParser());

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Global rate limiter: 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later."
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// POST route rate limiter: 20 requests per 15 minutes per stylistId/IP
export const postLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each stylistId/IP to 20 requests per windowMs
  message: {
    error: "Too many POST requests, please try again later."
  },
  keyGenerator: (req: Request & { user?: { id: string } }, res, options) => {
    // Use stylistId from session when available, else fall back to IP
    if (req.user?.id) {
      return `stylist:${req.user.id}`;
    }
    // Use the proper IP key generator for IPv6 compatibility
    return options.ipKeyGenerator!(req);
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply global rate limiter to all routes
app.use(globalLimiter);

// CSRF protection middleware
app.use((req: Request & { session?: any }, res: Response, next: NextFunction) => {
  // Skip CSRF check for GET, HEAD, OPTIONS requests and the /api/csrf endpoint itself
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || req.path === '/api/csrf') {
    return next();
  }

  // Check for CSRF token in header or body
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  
  if (!token) {
    return res.status(403).json({ error: 'CSRF token missing' });
  }

  // Validate CSRF token
  const secret = req.session?.csrfSecret;
  if (!secret || !tokens.verify(secret, token as string)) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  next();
});

// CSRF token endpoint
app.get('/api/csrf', (req: Request & { session?: any }, res: Response) => {
  // Ensure session exists
  if (!req.session) {
    return res.status(500).json({ error: 'Session not available' });
  }

  // Generate or reuse CSRF secret
  if (!req.session.csrfSecret) {
    req.session.csrfSecret = tokens.secretSync();
  }

  // Generate token
  const token = tokens.create(req.session.csrfSecret);
  res.json({ csrfToken: token });
});

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
