// mining monitor api
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const today = new Date().toLocaleDateString('sv-SE');

  const companies = [
    "WPM (Wheaton Precious Metals)","MTA (Metalla Royalty)","FNV (Franco-Nevada)","TFPM (Triple Flag)","OR (OR Royalties)",
    "NEM (Newmont)","AEM (Agnico Eagle)","B (Barrick Mining)","KGC (Kinross Gold)","LUG (Lundin Gold)",
    "AGI (Alamos Gold)","EDV (Endeavour Mining)","EQX (Equinox Gold)","BTG (B2Gold)","ARIS (Aris Mining)",
    "FVI (Fortuna Silver)","FRES (Fresnillo)","PAAS (Pan American Silver)","HL (Hecla Mining)","CDE (Coeur Mining)",
    "AG (First Majestic Silver)","AYA (Aya Gold)","EXK (Endeavour Silver)","SVM (Silvercorp Metals)",
    "MSA (Mineros SA)","MKO (Mako Mining)","ITR (Integra Resources)","MIN (Minera Alamos)","JAG (Jaguar Mining)",
    "HMY (Heliostar Metals)","ALTN (Altyngold)","SBI (Serabi Gold)","LCA (Luca Mining)","TAGO (Contango ORE)",
    "MMY (Monument Mining)","ORV (Orvana Minerals)","SOMA (Soma Gold)","CERT (Cerrado Gold)","AGLD (Austral Gold)",
    "LIO (Lion One Metals)","SAM (Starcore International)",
    "THX (Thor Explorations)","GAU (Galiano Gold)","STGO (Steppe Gold)","GGX (Golconda Gold)","MJS (Majestic Gold)",
    "USA (Americas Gold and Silver)","ASM (Avino Silver)","GGD (GoGold Resources)","SCZ (Santacruz Silver)",
    "APM (Andean Precious Metals)","GSVR (Guanajuato Silver)","SM (Sierra Madre Gold)","AGX (Silver X Mining)",
    "IPT (Impact Silver)","SSV (Southern Silver Exploration)",
    "SKE (Skeena Resources)","ABRA (Abrasilver)","VZLA (Vizsla Silver)","HSLV (Highlander Silver)",
    "SLVR (Silver Tiger Metals)","DV (Dolly Varden Silver)","CDPR (Cerro de Pasco Resources)","SICO (Silverco Mining)",
    "SVRS (Silver Storm Mining)","BNKR (Bunker Hill Mining)","AAG (Aftermath Silver)","AGMR (Silver Mountain Resources)",
    "APGO (Apollo Silver)","KLD (Kenorland Minerals)","SVE (Silverton Metals)","GRSL (GR Silver Mining)",
    "EXN (Excellon Resources)","KUYA (Kuya Silver)","OCG (Outcrop Silver)","KTN (Kootenay Silver)",
    "AGA (Silver47 Exploration)","DEF (Defiance Silver)","SGD (Snowline Gold)","IAU (I-80 Gold)",
    "ITH (International Tower Hill)","TLG (Troilus Gold)","FF (First Mining Gold)","LGD (Liberty Gold)",
    "WRLG (West Red Lake Gold)","BYN (Banyan Gold)","TUD (Tudor Gold)","ERD (Erdene Resource)",
    "NEX (NexGold Mining)","CBR (Cabral Gold)","TSK (Talisker Resources)","CKG (Chesapeake Gold)",
    "RVG (Revival Gold)","BOGO (Borealis Mining)","LG (Lahontan Gold)","GGO (Galleon Gold)",
    "BLG (Blue Lagoon Resources)","NOM (Norsemont Mining)","RTG (RTG Mining)","JZR (JZR Gold)",
    "CCJ (Cameco)","UEC (Uranium Energy)","PDN (Paladin Energy)","UUUU (Energy Fuels)","URG (Ur-Energy)","EU (enCore Energy)",
    "NXE (NexGen Energy)","DNN (Denison Mines)","ISO (IsoEnergy)","GLO (Global Atomic)","LAM (Laramide Resources)",
    "AEC (Anfield Energy)","FSY (Forsys Metals)","WUC (Western Uranium)","BSK (Blue Sky Uranium)",
    "SASK (Atha Energy)","CVV (Canalaska Uranium)","FUU (F3 Uranium)","DMX (District Metals)",
    "SYH (Skyharbour Resources)","PUR (Premier American Uranium)","COSA (Cosa Resources)",
    "PTU (Purepoint Uranium)","AERO (Aero Energy)"
  ].join(', ');

  const prompt = `You are a mining news analyst. Today is ${today}.

Search juniorminingnetwork.com and ceo.ca and general mining news for the LATEST news (today or this week) for ONLY these companies: ${companies}

Return a JSON array only. No explanation, no markdown. Each item:
{"ticker":"GRSL","name":"GR Silver Mining","cat":"developer","headline":"...","summary":"...","type":"Permitting","date":"${today}","url":""}

Types: Drilling, Production, Permitting, Financing, M&A, Results, Corporate, Exploration
Only include companies with actual news. Return [] if nothing found.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    let text = '';
    let messages = [{ role: 'user', content: prompt }];
    let current = data;

    while (current.stop_reason === 'tool_use') {
      const toolResults = (current.content || [])
        .filter(b => b.type === 'tool_use')
        .map(b => ({ type: 'tool_result', tool_use_id: b.id, content: 'Search executed.' }));

      messages = [...messages, { role: 'assistant', content: current.content }, { role: 'user', content: toolResults }];

      const next = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'web-search-2025-03-05'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 8000,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages
        })
      });
      current = await next.json();
    }

    for (const block of current.content || []) {
      if (block.type === 'text') text += block.text;
    }

    const match = text.replace(/```json|```/g, '').match(/\[[\s\S]*\]/);
    const articles = match ? JSON.parse(match[0]) : [];

    return res.status(200).json({ articles, date: today });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
