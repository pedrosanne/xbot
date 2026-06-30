import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import LandingPageClient from './LandingPageClient';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = await prisma.page.findUnique({
    where: { slug }
  });

  if (!page) return {};

  return {
    title: page.title,
    description: page.description,
    openGraph: {
      title: page.title,
      description: page.description,
      type: 'website',
    }
  };
}

export default async function PublicPage({ params }) {
  const { slug } = await params;
  const page = await prisma.page.findUnique({
    where: { slug }
  });

  if (!page) {
    notFound();
  }

  return (
    <LandingPageClient page={page} />
  );
}
