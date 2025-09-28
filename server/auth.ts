import passport from "passport";
console.log('SESSION_SECRET:', process.env.SESSION_SECRET);
console.log('SESSION_SECRET:', process.env.SESSION_SECRET);
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response } from "express";
import session from "express-session";
// ...rest of file...