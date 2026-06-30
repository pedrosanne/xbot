import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Retrieve a single page
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const page = await prisma.page.findUnique({
      where: { id }
    });

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    return NextResponse.json(page);
  } catch (error) {
    console.error('Error fetching page:', error);
    return NextResponse.json({ error: 'Failed to fetch page' }, { status: 500 });
  }
}

// PUT: Update a page
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const data = await request.json();
    const { title, slug, description, status, content, facebookPixelId, facebookPixelToken } = data;

    // Validate page existence
    const existingPage = await prisma.page.findUnique({
      where: { id }
    });
    if (!existingPage) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // Check slug uniqueness if changed
    let cleanSlug = undefined;
    if (slug) {
      cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-_]/g, '');
      if (cleanSlug !== existingPage.slug) {
        const slugConflict = await prisma.page.findUnique({
          where: { slug: cleanSlug }
        });
        if (slugConflict) {
          return NextResponse.json({ error: 'Uma página com este link/slug já existe.' }, { status: 400 });
        }
      }
    }

    const updatedPage = await prisma.page.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(cleanSlug !== undefined && { slug: cleanSlug }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(content !== undefined && { content }),
        ...(facebookPixelId !== undefined && { facebookPixelId }),
        ...(facebookPixelToken !== undefined && { facebookPixelToken })
      }
    });

    return NextResponse.json(updatedPage);
  } catch (error) {
    console.error('Error updating page:', error);
    return NextResponse.json({ error: 'Failed to update page' }, { status: 500 });
  }
}

// DELETE: Delete a page
export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    const existingPage = await prisma.page.findUnique({
      where: { id }
    });
    if (!existingPage) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    await prisma.page.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Page deleted successfully' });
  } catch (error) {
    console.error('Error deleting page:', error);
    return NextResponse.json({ error: 'Failed to delete page' }, { status: 500 });
  }
}
