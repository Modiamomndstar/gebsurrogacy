import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  ogImage?: string;
  ogType?: string;
  canonical?: string;
}

const SEO = ({ 
  title, 
  description, 
  keywords, 
  ogImage = 'https://gebsurrogacyservices.com/og-image.jpg', 
  ogType = 'website',
  canonical
}: SEOProps) => {
  useEffect(() => {
    // Update Title
    document.title = `${title} | GEB Surrogacy Services`;

    // Update Description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', description);

    // Update Keywords
    if (keywords) {
      let metaKeywords = document.querySelector('meta[name="keywords"]');
      if (!metaKeywords) {
        metaKeywords = document.createElement('meta');
        metaKeywords.setAttribute('name', 'keywords');
        document.head.appendChild(metaKeywords);
      }
      metaKeywords.setAttribute('content', keywords);
    }

    // Update Open Graph tags
    const ogTags = [
      { property: 'og:title', content: `${title} | GEB Surrogacy Services` },
      { property: 'og:description', content: description },
      { property: 'og:image', content: ogImage },
      { property: 'og:type', content: ogType },
      { property: 'og:url', content: window.location.href }
    ];

    ogTags.forEach(tag => {
      let element = document.querySelector(`meta[property="${tag.property}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute('property', tag.property);
        document.head.appendChild(element);
      }
      element.setAttribute('content', tag.content);
    });

    // Update Twitter tags
    const twitterTags = [
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: `${title} | GEB Surrogacy Services` },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: ogImage }
    ];

    twitterTags.forEach(tag => {
      let element = document.querySelector(`meta[name="${tag.name}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute('name', tag.name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', tag.content);
    });

    // Update Canonical link
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.setAttribute('rel', 'canonical');
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute('href', canonical || window.location.href);

  }, [title, description, keywords, ogImage, ogType, canonical]);

  return null;
};

export default SEO;
