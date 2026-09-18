import type { Request, Response } from "express";
import mongoose from "mongoose";

export function live(_req: Request, res: Response): void {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}

export function ready(_req: Request, res: Response): void {
  const databaseConnected = mongoose.connection.readyState === 1;

  if (!databaseConnected) {
    res.status(503).json({
      status: "not_ready",
      database: "disconnected",
    });
    return;
  }

  res.status(200).json({
    status: "ready",
    database: "connected",
    timestamp: new Date().toISOString(),
  });
}
