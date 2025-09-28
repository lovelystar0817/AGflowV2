import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import pino from "pino";
// ...rest of file...