import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';

import { getSiteUrl, getSupabaseAdmin } from '@/lib/supabase';
import CommunityPost from '@/components/CommunityPost';

export const revalidate = 120;

const getPost = cache(async (slug: string) => {
  const db = getSupabaseAdmin();

  const { data: post, error } = await db
    .from('community_posts')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle();

  if (error) {
    console.error(
      'Community post lookup error:',
      error
    );
    return null;
  }

  return post;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return {};
  }

  const siteUrl = getSiteUrl();
  const canonicalUrl =
    `${siteUrl}/community/${post.slug}`;

  const description =
    post.body?.slice(0, 160) ||
    post.title;

  return {
    title: post.title,
    description,

    alternates: {
      canonical: `/community/${post.slug}`,
    },

    robots: {
      index: true,
      follow: true,
    },

    openGraph: {
      title: post.title,
      description,
      type: 'article',
      url: canonicalUrl,
      publishedTime: post.created_at,
      modifiedTime:
        post.updated_at || post.created_at,
      images: Array.isArray(post.image_urls)
        ? post.image_urls
        : [],
    },
  };
}

export default async function CommunityPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    notFound();
  }

  const siteUrl = getSiteUrl();
  const pageUrl =
    `${siteUrl}/community/${post.slug}`;

  const images = Array.isArray(post.image_urls)
    ? post.image_urls
    : [];

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description:
      post.body?.slice(0, 160) ||
      post.title,
    datePublished: post.created_at,
    dateModified:
      post.updated_at || post.created_at,
    url: pageUrl,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': pageUrl,
    },
    author: {
      '@type': 'Organization',
      name: 'The Simplified Charts',
      url: siteUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: 'The Simplified Charts',
      url: siteUrl,
    },
    image: images,
  };

  return (
    <main className="container">
      <section className="section">
        <CommunityPost
          post={post}
          linkTitle={false}
          headingTag="h1"
        />
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema),
        }}
      />
    </main>
  );
}
