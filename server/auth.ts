import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage-instance";
import { User as SelectUser, insertStylistSchema } from "@shared/schema";
import csrf from "csrf";

// Security helper to remove sensitive data from user responses
function sanitizeUser(user: SelectUser) {
  const { passwordHash, ...sanitizedUser } = user;
  return sanitizedUser;
}

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // Initialize CSRF protection for auth routes
  const tokens = new csrf();

  // Helper function to validate CSRF tokens in auth routes
  const validateCSRF = (req: Request & { session?: any }, res: Response): boolean => {
    const token = req.headers['x-csrf-token'] || req.body._csrf;
    
    if (!token) {
      res.status(403).json({ error: 'CSRF token missing' });
      return false;
    }

    if (!req.session?.csrfSecret) {
      res.status(403).json({ error: 'Invalid CSRF token' });
      return false;
    }

    if (!tokens.verify(req.session.csrfSecret, token as string)) {
      res.status(403).json({ error: 'Invalid CSRF token' });
      return false;
    }

    return true;
  };
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
      const user = await storage.getUserByUsername(email);
      if (!user || !(await comparePasswords(password, user.passwordHash))) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      // Validate CSRF token first
      if (!validateCSRF(req, res)) return;

      // Validate the request body
      const validatedData = insertStylistSchema.parse(req.body);
      
      const existingUser = await storage.getUserByUsername(validatedData.email);
      if (existingUser) {
        return res.status(400).send("Email already exists");
      }

      const user = await storage.createUser({
        email: validatedData.email,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        businessName: validatedData.businessName,
        password: await hashPassword(validatedData.password),
        showPhone: false,
        portfolioPhotos: [],
        themeId: 1,
        appSlug: `${validatedData.firstName.toLowerCase()}-${validatedData.lastName.toLowerCase()}`,
      });

      // Remove passwordHash from response for security
      const { passwordHash, ...userResponse } = user;

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(userResponse);
      });
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        // Zod validation error
        return res.status(400).json({ error: "Validation failed", details: error });
      }
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    // Validate CSRF token first
    if (!validateCSRF(req, res)) return;

    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(400).json({ error: info?.message || "Invalid credentials" });
      
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(200).json(sanitizeUser(user));
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    // Validate CSRF token first
    if (!validateCSRF(req, res)) return;

    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(sanitizeUser(req.user!));
  });
}