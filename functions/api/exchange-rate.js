export async function onRequest(context) {
  try {
    const res = await fetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=IDR,AUD,SGD,HKD,MYR');
    if (!res.ok) throw new Error('upstream error');
    const data = await res.json();

    const { IDR, AUD, SGD, HKD, MYR } = data.rates;

    const rates = {
      USD: Math.round(IDR - 500),
      AUD: Math.round(IDR / AUD - 370),
      SGD: Math.round(IDR / SGD - 380),
      HKD: Math.round(IDR / HKD - 200),
      MYR: Math.round(IDR / MYR - 480),
    };

    return new Response(JSON.stringify({ date: data.date, rates }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'fetch failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
