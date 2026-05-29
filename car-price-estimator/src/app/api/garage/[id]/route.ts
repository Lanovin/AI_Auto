import { NextResponse } from 'next/server';
import { updateGarageCar, deleteGarageCar, type GarageCarInput } from '@/lib/supabase/user-data';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nepřihlášen' }, { status: 401 });
  }

  const { id } = await params;
  let body: Partial<GarageCarInput>;
  try {
    body = await request.json() as Partial<GarageCarInput>;
  } catch {
    return NextResponse.json({ error: 'Neplatný JSON.' }, { status: 400 });
  }

  const car = await updateGarageCar(id, body);
  if (!car) {
    return NextResponse.json({ error: 'Auto nenalezeno nebo chyba při uložení.' }, { status: 404 });
  }

  return NextResponse.json({ car });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nepřihlášen' }, { status: 401 });
  }

  const { id } = await params;
  const ok = await deleteGarageCar(id);
  if (!ok) {
    return NextResponse.json({ error: 'Auto nenalezeno nebo chyba při mazání.' }, { status: 404 });
  }

  return NextResponse.json({ deleted: id });
}
