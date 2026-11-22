import { z } from 'zod';

const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
export const uuidSchema = z.string().regex(uuidRegex, 'Invalid UUID format');

export const orderItemAddonSchema = z.object({
  addonItemId: uuidSchema.optional(),
  name: z.string().min(1, 'Addon name is required'),
  price: z.number().min(0, 'Addon price cannot be negative'),
});

export const orderItemSchema = z.object({
  menuItemId: uuidSchema,
  variantId: uuidSchema.optional().nullable(),
  name: z.string().min(1, 'Item name is required'),
  variantName: z.string().optional().nullable(),
  unitPrice: z.number().min(0, 'Unit price cannot be negative'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  taxRate: z.number().min(0).default(5),
  cookingRequest: z.string().max(250).optional().nullable(),
  addons: z.array(orderItemAddonSchema).default([]),
});

export const placeOrderSchema = z.object({
  restaurantId: uuidSchema,
  tableId: uuidSchema,
  tableSessionId: uuidSchema.optional().nullable(),
  tableToken: z.string().min(1, 'Table token is required'),
  customerNote: z.string().max(500).optional().nullable(),
  idempotencyKey: z.string().min(8, 'Idempotency key required'),
  items: z.array(orderItemSchema).min(1, 'At least one item is required to place an order'),
});

export const serviceRequestSchema = z.object({
  restaurantId: uuidSchema,
  tableId: uuidSchema,
  tableSessionId: uuidSchema.optional().nullable(),
  tableToken: z.string().min(1, 'Table token is required'),
  type: z.enum(['call_waiter', 'request_bill']),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['new', 'cooking', 'ready', 'served', 'cancelled']),
  cancellationReason: z.string().max(300).optional().nullable(),
});

export const toggleStockSchema = z.object({
  isAvailable: z.boolean(),
});
