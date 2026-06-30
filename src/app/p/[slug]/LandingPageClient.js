'use client';

import React, { useEffect, useState } from 'react';

// Inline SVG Icons
const CheckIcon = ({ className = "h-4 w-4" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const MessageCircleIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const ShieldCheckIcon = () => (
  <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618-3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const BookOpenIcon = () => (
  <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const TrendingUpIcon = () => (
  <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const LockIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const ChevronDownIcon = ({ className = "h-4 w-4 text-zinc-400 transition-transform duration-200" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const StarIcon = () => (
  <svg className="h-3 w-3 fill-amber-400 text-amber-400" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const iconMap = {
  Check: CheckIcon,
  ShieldCheck: ShieldCheckIcon,
  Lock: LockIcon,
  BookOpen: BookOpenIcon,
  TrendingUp: TrendingUpIcon
};

export default function LandingPageClient({ page }) {
  const [activeFaq, setActiveFaq] = useState(null);

  // Initialize Meta Pixel
  useEffect(() => {
    const pixelId = page.facebookPixelId;
    if (!pixelId) return;

    // Standard Meta Pixel Integration
    /* eslint-disable */
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    
    fbq('init', pixelId);
    fbq('track', 'PageView');
    /* eslint-enable */
  }, [page.facebookPixelId]);

  // Handle CTA Click
  const handleCtaClick = (block) => {
    const { destinationType, flowId, phoneNumber, whatsappText } = block.settings;
    
    // Track Lead Event in Meta Pixel
    if (page.facebookPixelId && typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'Lead', {
        content_name: page.title,
        value: 0.00,
        currency: 'BRL'
      });
    }

    // Build Redirect URL with UTMs
    const queryParams = new URLSearchParams(window.location.search);
    queryParams.set('text', whatsappText || '');
    
    if (destinationType === 'flow' && flowId) {
      queryParams.set('flowId', flowId);
    } else if (destinationType === 'phone' && phoneNumber) {
      queryParams.set('phone', phoneNumber);
    }

    // Redirect to our tracking endpoint
    window.location.href = `/api/redirect/whatsapp?${queryParams.toString()}`;
  };

  const renderBlock = (block) => {
    switch (block.type) {
      case 'hero':
        return (
          <section 
            key={block.id} 
            className="text-center py-6 px-4 rounded-3xl mb-6"
            style={{ backgroundColor: block.settings.bgColor || '#09090b', color: block.settings.textColor || '#ffffff' }}
          >
            {block.settings.badge && (
              <span 
                className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider mb-4 border border-white/10"
                style={{ backgroundColor: block.settings.badgeBg || 'rgba(255, 255, 255, 0.1)', color: block.settings.badgeColor || '#a1a1aa' }}
              >
                <LockIcon /> {block.settings.badge}
              </span>
            )}
            <h1 className="text-3xl font-black uppercase leading-tight tracking-tight sm:text-4xl mb-4">
              {block.settings.title}{' '}
              {block.settings.highlightedTitle && (
                <span
                  className="block mt-2 rounded-xl px-3 py-1 italic text-white"
                  style={{ backgroundImage: 'linear-gradient(135deg, #059669 0%, #10B981 100%)' }}
                >
                  {block.settings.highlightedTitle}
                </span>
              )}
            </h1>
            {block.settings.subtitle && (
              <p className="text-sm font-medium text-zinc-400 mt-3">
                {block.settings.subtitle}
              </p>
            )}
          </section>
        );

      case 'vsl':
        return <VslBlock key={block.id} block={block} />;

      case 'button':
        return (
          <section key={block.id} className="my-6 px-1">
            <button
              onClick={() => handleCtaClick(block)}
              className={`group relative flex w-full items-center justify-center gap-3 rounded-2xl py-5 text-lg font-bold text-white transition-all transform active:scale-[0.98] hover:brightness-110 shadow-lg ${
                block.settings.pulse ? 'animate-pulse-cta' : ''
              }`}
              style={{
                backgroundColor: block.settings.bgColor || '#25D366',
                color: block.settings.textColor || '#ffffff',
                boxShadow: '0 10px 25px -5px rgba(37, 211, 102, 0.4)'
              }}
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-white/20">
                <MessageCircleIcon />
              </span>
              {block.settings.label || 'Falar no WhatsApp'}
            </button>
          </section>
        );

      case 'features':
        return (
          <section 
            key={block.id} 
            className="py-6 px-5 rounded-2xl mb-6 border border-zinc-800/50"
            style={{ backgroundColor: block.settings.bgColor || '#09090b', color: block.settings.textColor || '#ffffff' }}
          >
            {block.settings.title && (
              <h3 className="text-lg font-bold mb-5 text-zinc-200 border-b border-zinc-800 pb-3">
                {block.settings.title}
              </h3>
            )}
            <ul className="space-y-4">
              {block.settings.items?.map((item, idx) => {
                const IconComp = iconMap[item.icon] || CheckIcon;
                return (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-500/10 text-emerald-400">
                      <IconComp className="h-4.5 w-4.5" />
                    </span>
                    <span className="text-sm font-medium text-zinc-300 leading-relaxed">
                      {item.text}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        );

      case 'text':
        return (
          <section key={block.id} className="py-4 px-2 text-zinc-300 text-sm leading-relaxed mb-4">
            <p className="whitespace-pre-line">{block.settings.text}</p>
          </section>
        );

      case 'faq':
        return (
          <section key={block.id} className="py-6 mb-6">
            {block.settings.title && (
              <h3 className="text-xl font-bold mb-4 text-zinc-200 text-center">
                {block.settings.title}
              </h3>
            )}
            <div className="space-y-3">
              {block.settings.items?.map((item, idx) => (
                <div key={idx} className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950">
                  <button
                    onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                    className="w-full flex items-center justify-between p-4 text-left font-semibold text-sm text-zinc-200 hover:bg-zinc-900/50 transition-colors"
                  >
                    <span>{item.question}</span>
                    <ChevronDownIcon className={`h-4 w-4 text-zinc-400 transition-transform duration-200 ${activeFaq === idx ? 'rotate-180' : ''}`} />
                  </button>
                  {activeFaq === idx && (
                    <div className="p-4 pt-0 text-xs text-zinc-400 leading-relaxed border-t border-zinc-900 bg-zinc-950">
                      {item.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        );

      case 'testimonials':
        return (
          <section key={block.id} className="py-6 mb-6">
            {block.settings.title && (
              <h3 className="text-xl font-bold mb-6 text-zinc-200 text-center">
                {block.settings.title}
              </h3>
            )}
            <div className="space-y-4">
              {block.settings.items?.map((item, idx) => (
                <div key={idx} className="p-5 rounded-2xl border border-zinc-800/50 bg-zinc-900/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300 font-bold uppercase text-sm">
                      {item.name ? item.name.substring(0, 2) : 'U'}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-200">{item.name}</h4>
                      <div className="flex items-center gap-0.5 mt-0.5">
                        {[...Array(5)].map((_, i) => (
                          <StarIcon key={i} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed italic">
                    "{item.text}"
                  </p>
                </div>
              ))}
            </div>
          </section>
        );

      case 'footer':
        return (
          <footer key={block.id} className="py-8 mt-12 border-t border-zinc-800/50 text-center text-xs text-zinc-500">
            <p className="mb-3">{block.settings.copyright || `© ${new Date().getFullYear()} Todos os direitos reservados.`}</p>
            {block.settings.links && (
              <div className="flex justify-center gap-4 text-zinc-400">
                {block.settings.links.map((link, idx) => (
                  <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                    {link.label}
                  </a>
                ))}
              </div>
            )}
          </footer>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 selection:bg-emerald-500/30 selection:text-white">
      <style jsx global>{`
        @keyframes pulse-cta {
          0%, 100% { transform: scale(1); box-shadow: 0 10px 25px -5px rgba(37, 211, 102, 0.4); }
          50% { transform: scale(1.02); box-shadow: 0 15px 30px -3px rgba(37, 211, 102, 0.6); }
        }
        .animate-pulse-cta {
          animation: pulse-cta 2s infinite ease-in-out;
        }
      `}</style>

      {page.status === 'DRAFT' && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-400 px-4 py-2.5 text-center text-xs font-semibold sticky top-0 z-50 backdrop-blur-md">
          ⚠️ Modo Visualização (Rascunho) - Esta página ainda não está publicada.
        </div>
      )}

      <main className="mx-auto w-full max-w-[480px] px-5 pb-14 pt-10">
        {page.content && Array.isArray(page.content) && page.content.map(renderBlock)}
      </main>
    </div>
  );
}

// Sub-component to manage script injection for VSL
function VslBlock({ block }) {
  useEffect(() => {
    if (block.settings.videoType === 'vturb' && block.settings.vturbId && block.settings.scriptUrl) {
      const id = `vturb-player-script-${block.settings.vturbId}`;
      if (document.getElementById(id)) return;

      const s = document.createElement('script');
      s.id = id;
      s.src = block.settings.scriptUrl;
      s.async = true;
      document.head.appendChild(s);
    }
  }, [block]);

  if (block.settings.videoType === 'vturb' && block.settings.vturbId) {
    return (
      <section key={block.id} className="my-6 rounded-2xl overflow-hidden bg-black aspect-video border border-zinc-800/50">
        <div
          dangerouslySetInnerHTML={{
            __html: `<vturb-smartplayer id="vid-${block.settings.vturbId}" style="display:block;margin:0 auto;width:100%;"><div class="vturb-player-placeholder" style="position:relative;width:100%;padding:177.77777777777777% 0 0;z-index:0;background-color:black;"></div></vturb-smartplayer>`,
          }}
        />
      </section>
    );
  }

  if (block.settings.videoType === 'youtube' && block.settings.youtubeUrl) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = block.settings.youtubeUrl.match(regExp);
    const videoId = (match && match[2].length === 11) ? match[2] : null;

    return (
      <section key={block.id} className="my-6 rounded-2xl overflow-hidden aspect-video border border-zinc-800/50 bg-black">
        {videoId ? (
          <iframe
            className="w-full h-full"
            src={`https://www.youtube.com/embed/${videoId}`}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xs">
            Link do YouTube inválido
          </div>
        )}
      </section>
    );
  }

  if (block.settings.videoType === 'vimeo' && block.settings.vimeoUrl) {
    const match = block.settings.vimeoUrl.match(/vimeo\.com\/(\d+)/);
    const videoId = match ? match[1] : null;

    return (
      <section key={block.id} className="my-6 rounded-2xl overflow-hidden aspect-video border border-zinc-800/50 bg-black">
        {videoId ? (
          <iframe
            className="w-full h-full"
            src={`https://player.vimeo.com/video/${videoId}`}
            title="Vimeo video player"
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          ></iframe>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xs">
            Link do Vimeo inválido
          </div>
        )}
      </section>
    );
  }

  return null;
}
