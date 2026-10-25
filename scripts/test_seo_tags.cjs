async function check() {
  const res = await fetch('https://filmbloopers.online');
  const html = await res.text();
  
  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]*>/i);
  const twitterImage = html.match(/<meta[^>]+name=["']twitter:image["'][^>]*>/i);
  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i);
  const jsonLd = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  
  console.log('OG Image tag:', ogImage ? ogImage[0] : 'None');
  console.log('Twitter Image tag:', twitterImage ? twitterImage[0] : 'None');
  console.log('Canonical tag:', canonical ? canonical[0] : 'None');
  console.log('JSON-LD scripts found:', jsonLd ? jsonLd.length : 0);
  if (jsonLd) {
    jsonLd.forEach((s, i) => console.log(`Script ${i+1}:`, s.slice(0, 150) + '...'));
  }
}

check();
