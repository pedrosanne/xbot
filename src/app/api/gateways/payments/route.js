import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

async function getAuthenticatedUser() {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get('session');
    const token = cookie ? cookie.value : null;
    if (!token) return null;
    return await verifyToken(token);
  } catch (e) {
    return null;
  }
}

// GET: Fetch recent payments
export async function GET() {
  const userPayload = await getAuthenticatedUser();
  if (!userPayload) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  try {
    const payments = await prisma.payment.findMany({
      include: {
        gateway: {
          select: {
            name: true,
            type: true
          }
        },
        contact: {
          select: {
            name: true,
            profileName: true,
            clientPhone: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: 'Erro ao buscar pagamentos.' }, { status: 500 });
  }
}
