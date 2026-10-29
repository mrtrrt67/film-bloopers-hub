import Script from "next/script";

export default function GoogleAnalytics({ gaId }: { gaId?: string }) {
  const id = gaId || process.env.NEXT_PUBLIC_GA_ID || "G-J9PFHEC6T4";

  return (
    <>
      <Script
        id="google-gtag-script"
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script
        id="google-consent-and-gtag"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}

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
          `,
        }}
      />
    </>
  );
}
