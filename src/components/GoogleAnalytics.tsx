import Script from "next/script";

export default function GoogleAnalytics({ gaId }: { gaId?: string }) {
  const id = gaId || process.env.NEXT_PUBLIC_GA_ID || "G-J9PFHEC6T4";

  return (
    <>
      <Script
        id="google-gtag-script"
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="lazyOnload"
      />
      <Script
        id="google-consent-and-gtag"
        strategy="lazyOnload"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}

            // 1. Esclusione Amministratore da Google Analytics
            var isAdmin = false;
            try {
              if (window.location.pathname.indexOf('/admin') === 0 || localStorage.getItem('fbh_admin_device') === '1') {
                isAdmin = true;
              } else {
                for (var i = 0; i < localStorage.length; i++) {
                  var k = localStorage.key(i);
                  if (k && (k.indexOf('sb-') === 0 || k.indexOf('supabase') !== -1)) {
                    var v = localStorage.getItem(k) || '';
                    if (v.toLowerCase().indexOf('mrtrrt67') !== -1) {
                      isAdmin = true;
                      localStorage.setItem('fbh_admin_device', '1');
                      break;
                    }
                  }
                }
              }
            } catch(e) {}

            if (isAdmin) {
              // Disabilita completamente il tracciamento GA4 per questa proprietà
              window['ga-disable-${id}'] = true;
            } else {
              var savedConsent = null;
              try {
                savedConsent = localStorage.getItem('fbh_cookie_consent');
              } catch(e) {}

              var consentState = (savedConsent === 'accepted') ? 'granted' : 'denied';

              gtag('consent', 'default', {
                'analytics_storage': consentState,
                'ad_storage': 'denied',
                'ad_user_data': 'denied',
                'ad_personalization': 'denied',
                'wait_for_update': 500
              });

              gtag('js', new Date());
              gtag('config', '${id}', {
                page_path: window.location.pathname,
              });
            }
          `,
        }}
      />
    </>
  );
}
