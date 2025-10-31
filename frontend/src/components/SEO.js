import React from 'react';
import { Helmet } from 'react-helmet';

const SEO = ({
  title = 'ChillBoard — Track Screen Time, Mood, and Wellness',
  description = 'ChillBoard is an AI-driven digital wellness dashboard to track screen time, detect mood locally, and get personalized Spotify recommendations.',
  url = 'https://www.chillboard.in/',
  image = '/logo512.png',
  keywords = 'digital wellness, track screen time, mood dashboard, AI mood detection, Spotify recommendations, productivity, Chrome extension',
  canonical = 'https://www.chillboard.in/'
}) => {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      <link rel="canonical" href={canonical} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="ChillBoard" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Page-specific JSON-LD (WebPage) */}
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: title,
          url,
          description
        })}
      </script>
    </Helmet>
  );
};

export default SEO;
