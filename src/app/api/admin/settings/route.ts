import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyStaffSession } from '@/lib/auth/staff';
import type { Database } from '@/lib/types/database';
import { z } from 'zod';

type RestaurantUpdate = Database['public']['Tables']['restaurants']['Update'];

const updateSettingsSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  tagline: z.string().max(150).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  brandColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  address: z.string().max(250).optional().nullable(),
  city: z.string().max(50).optional(),
  state: z.string().max(50).optional(),
  pincode: z.string().max(10).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable(),
  gstin: z.string().max(15).optional().nullable(),
  fssaiLicense: z.string().max(30).optional().nullable(),
  upiId: z.string().min(3).max(50).optional(),
  upiName: z.string().min(1).max(100).optional(),
  isTaxInclusive: z.boolean().optional(),
  defaultTaxRate: z.number().optional(),
  isServiceChargeEnabled: z.boolean().optional(),
  serviceChargeRate: z.number().nonnegative().optional(),
  isGatewayEnabled: z.boolean().optional(),
  gatewayProvider: z.enum(['razorpay', 'cashfree']).optional(),
  gatewayKeyId: z.string().max(100).optional().nullable(),
  gatewayKeySecret: z.string().max(100).optional().nullable(),
  gatewayWebhookSecret: z.string().max(100).optional().nullable(),
});

export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyStaffSession(['owner', 'manager']);
    if (auth.error || !auth.data) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const json = await request.json();
    const result = updateSettingsSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid settings input', details: result.error.flatten() }, { status: 400 });
    }

    const val = result.data;
    const supabase = await createClient();

    const updatePayload: RestaurantUpdate = {
      updated_at: new Date().toISOString(),
    };

    if (val.name !== undefined) updatePayload.name = val.name;
    if (val.tagline !== undefined) updatePayload.tagline = val.tagline;
    if (val.description !== undefined) updatePayload.description = val.description;
    if (val.brandColor !== undefined) updatePayload.brand_color = val.brandColor;
    if (val.address !== undefined) updatePayload.address = val.address;
    if (val.city !== undefined) updatePayload.city = val.city;
    if (val.state !== undefined) updatePayload.state = val.state;
    if (val.pincode !== undefined) updatePayload.pincode = val.pincode;
    if (val.phone !== undefined) updatePayload.phone = val.phone;
    if (val.email !== undefined) updatePayload.email = val.email;
    if (val.gstin !== undefined) updatePayload.gstin = val.gstin;
    if (val.fssaiLicense !== undefined) updatePayload.fssai_license = val.fssaiLicense;
    if (val.upiId !== undefined) updatePayload.upi_id = val.upiId;
    if (val.upiName !== undefined) updatePayload.upi_name = val.upiName;
    if (val.isTaxInclusive !== undefined) updatePayload.is_tax_inclusive = val.isTaxInclusive;
    if (val.defaultTaxRate !== undefined) updatePayload.default_tax_rate = val.defaultTaxRate;
    if (val.isServiceChargeEnabled !== undefined) updatePayload.is_service_charge_enabled = val.isServiceChargeEnabled;
    if (val.serviceChargeRate !== undefined) updatePayload.service_charge_rate = val.serviceChargeRate;
    if (val.isGatewayEnabled !== undefined) updatePayload.is_gateway_enabled = val.isGatewayEnabled;
    if (val.gatewayProvider !== undefined) updatePayload.gateway_provider = val.gatewayProvider;
    if (val.gatewayKeyId !== undefined) updatePayload.gateway_key_id = val.gatewayKeyId;
    if (val.gatewayKeySecret !== undefined) updatePayload.gateway_key_secret = val.gatewayKeySecret;
    if (val.gatewayWebhookSecret !== undefined) updatePayload.gateway_webhook_secret = val.gatewayWebhookSecret;

    const { data: updatedRestaurant, error } = await supabase
      .from('restaurants')
      .update(updatePayload)
      .eq('id', auth.data.restaurantId)
      .select('*')
      .single();

    if (error || !updatedRestaurant) {
      throw new Error(`Failed to update restaurant settings: ${error?.message}`);
    }

    return NextResponse.json({ success: true, restaurant: updatedRestaurant });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Settings update failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
