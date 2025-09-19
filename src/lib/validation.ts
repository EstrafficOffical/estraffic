// src/lib/validation.ts
import { z } from "zod";

export const clickQuerySchema = z.object({
  offer_id: z.string().min(1, "offer_id required"),
  click_id: z.string().max(128).optional(),
  sub1: z.string().max(128).optional(),
  sub2: z.string().max(128).optional(),
  sub3: z.string().max(128).optional(),
  sub4: z.string().max(128).optional(),
  sub5: z.string().max(128).optional(),
});

export const postbackSchema = z.object({
  secret: z.string().optional(),
  offer_id: z.string().min(1, "offer_id required"),
  click_id: z.string().max(128).optional(),
  tx_id: z.string().min(1, "tx_id required"),
  event: z.enum(["REG", "DEP", "REBILL", "SALE", "LEAD"]),
  amount: z.coerce.number().optional(),
  currency: z.string().max(10).optional(),
  sub1: z.string().max(128).optional(),
  sub2: z.string().max(128).optional(),
  sub3: z.string().max(128).optional(),
  sub4: z.string().max(128).optional(),
  sub5: z.string().max(128).optional(),
});
