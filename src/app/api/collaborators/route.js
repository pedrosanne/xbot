import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// Helper to authenticate requests
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

// GET: List all collaborators (users)
export async function GET() {
  const userPayload = await getAuthenticatedUser();
  if (!userPayload) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching collaborators:', error);
    return NextResponse.json({ error: 'Erro ao buscar colaboradores.' }, { status: 500 });
  }
}

// POST: Create a new collaborator
export async function POST(req) {
  const userPayload = await getAuthenticatedUser();
  if (!userPayload) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Todos os campos (nome, email, senha) são obrigatórios.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 6 caracteres.' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Este e-mail já está sendo utilizado por outro colaborador.' },
        { status: 400 }
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user
    const newUser = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      }
    });

    return NextResponse.json(newUser, { status: 201 });

  } catch (error) {
    console.error('Error creating collaborator:', error);
    return NextResponse.json(
      { error: 'Erro interno ao criar colaborador.' },
      { status: 500 }
    );
  }
}

// DELETE: Remove a collaborator
export async function DELETE(req) {
  const userPayload = await getAuthenticatedUser();
  if (!userPayload) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const collaboratorId = searchParams.get('id');

    if (!collaboratorId) {
      return NextResponse.json({ error: 'ID do colaborador não informado.' }, { status: 400 });
    }

    // Prevent self-deletion
    if (collaboratorId === userPayload.userId) {
      return NextResponse.json({ error: 'Você não pode excluir o seu próprio usuário.' }, { status: 400 });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: collaboratorId }
    });

    if (!user) {
      return NextResponse.json({ error: 'Colaborador não encontrado.' }, { status: 404 });
    }

    // Delete user
    await prisma.user.delete({
      where: { id: collaboratorId }
    });

    return NextResponse.json({ success: true, message: 'Colaborador excluído com sucesso.' });

  } catch (error) {
    console.error('Error deleting collaborator:', error);
    return NextResponse.json(
      { error: 'Erro interno ao excluir colaborador.' },
      { status: 500 }
    );
  }
}
