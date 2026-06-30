import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: List all pages
export async function GET() {
  try {
    const pages = await prisma.page.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(pages);
  } catch (error) {
    console.error('Error fetching pages:', error);
    return NextResponse.json({ error: 'Failed to fetch pages' }, { status: 500 });
  }
}

// POST: Create a new page
export async function POST(request) {
  try {
    const data = await request.json();
    const { title, slug, description, template } = data;

    if (!title || !slug) {
      return NextResponse.json({ error: 'Title and Slug are required' }, { status: 400 });
    }

    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-_]/g, '');

    // Check if slug is unique
    const existingPage = await prisma.page.findUnique({
      where: { slug: cleanSlug }
    });
    if (existingPage) {
      return NextResponse.json({ error: 'Uma página com este link/slug já existe.' }, { status: 400 });
    }

    // Default empty content
    let content = [];

    // If template is "presell", pre-populate with "Segredos do Trade" WhatsApp Presell layout
    if (template === 'presell') {
      content = [
        {
          id: 'hero-1',
          type: 'hero',
          settings: {
            badge: '🔒 Edição limitada',
            title: 'VOCÊ RECEBE O LIVRO PRIMEIRO...',
            highlightedTitle: 'E SÓ PAGA DEPOIS!🤝',
            subtitle: '100% Seguro · Atendimento Humano',
            badgeBg: 'rgba(255, 255, 255, 0.1)',
            badgeColor: '#a1a1aa',
            textColor: '#ffffff',
            bgColor: '#09090b'
          }
        },
        {
          id: 'vsl-1',
          type: 'vsl',
          settings: {
            videoType: 'vturb',
            vturbId: '6a42bd1f54f5a89ef8601746',
            scriptUrl: 'https://scripts.converteai.net/adf170ce-1438-43d2-917b-e507e4056a4d/players/6a42bd1f54f5a89ef8601746/v4/player.js',
            youtubeUrl: '',
            vimeoUrl: '',
            bgColor: '#09090b'
          }
        },
        {
          id: 'cta-1',
          type: 'button',
          settings: {
            label: 'Falar no WhatsApp',
            destinationType: 'flow', // 'flow' or 'phone'
            flowId: '', // Will be linked to a chatbot flow
            phoneNumber: '',
            whatsappText: 'Eu quero comprar o Segredos do Trade!',
            pulse: true,
            bgColor: '#25D366',
            textColor: '#ffffff'
          }
        },
        {
          id: 'features-1',
          type: 'features',
          settings: {
            title: 'Por que escolher o Segredos do Trade?',
            items: [
              { icon: 'ShieldCheck', text: 'Receba primeiro em sua casa com toda segurança.' },
              { icon: 'Lock', text: 'Pagamento facilitado na entrega (Cash on Delivery).' },
              { icon: 'BookOpen', text: 'O guia definitivo para consistência no mercado financeiro.' },
              { icon: 'TrendingUp', text: 'Estratégias validadas por grandes traders.' }
            ],
            bgColor: '#09090b',
            textColor: '#ffffff'
          }
        }
      ];
    }

    const page = await prisma.page.create({
      data: {
        title,
        slug: cleanSlug,
        description: description || '',
        status: 'DRAFT',
        content,
        facebookPixelId: '',
        facebookPixelToken: ''
      }
    });

    return NextResponse.json(page);
  } catch (error) {
    console.error('Error creating page:', error);
    return NextResponse.json({ error: 'Failed to create page' }, { status: 500 });
  }
}
