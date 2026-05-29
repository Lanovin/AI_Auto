import { NextResponse } from 'next/server';
import { getGarageCars, addGarageCar, type GarageCarInput } from '@/lib/supabase/user-data';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nepřihlášen' }, { status: 401 });
  }

  const cars = await getGarageCars();
  return NextResponse.json({ cars });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nepřihlášen' }, { status: 401 });
  }

  let body: Partial<GarageCarInput>;
  try {
    body = await request.json() as Partial<GarageCarInput>;
  } catch {
    return NextResponse.json({ error: 'Neplatný JSON.' }, { status: 400 });
  }

  if (!body.brand || !body.model || !body.year) {
    return NextResponse.json(
      { error: 'Povinná pole: brand, model, year.' },
      { status: 400 }
    );
  }

  const car = await addGarageCar({
    brand: String(body.brand),
    model: String(body.model),
    year: Number(body.year),
    mileage: body.mileage != null ? Number(body.mileage) : undefined,
    fuel: body.fuel ? String(body.fuel) : undefined,
    transmission: body.transmission ? String(body.transmission) : undefined,
    vin: body.vin ? String(body.vin) : undefined,
    trim_version: body.trim_version ? String(body.trim_version) : undefined,
    engine_capacity: body.engine_capacity != null ? Number(body.engine_capacity) : undefined,
    power_kw: body.power_kw != null ? Number(body.power_kw) : undefined,
    color: body.color ? String(body.color) : undefined,
    body_type: body.body_type ? String(body.body_type) : undefined,
    equipment: Array.isArray(body.equipment) ? body.equipment : [],
    notes: body.notes ? String(body.notes) : undefined,
  });

  if (!car) {
    return NextResponse.json({ error: 'Nepodařilo se uložit auto.' }, { status: 500 });
  }

  return NextResponse.json({ car }, { status: 201 });
}
