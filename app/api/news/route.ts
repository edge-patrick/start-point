import { NextResponse } from 'next/server';
import Parser from 'rss-parser';

export const dynamic = 'force-dynamic';

const parser = new Parser({
  customFields: {
    item: [['media:thumbnail', 'mediaThumbnail']],
  },
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
  },
});

const FEEDS = {
  world: 'https://feeds.bbci.co.uk/news/world/rss.xml',
  slovakia: 'https://spectator.sme.sk/rss',
};

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: 'World' | 'Slovakia';
  isoDate: string;
  imageUrl?: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'all';

  let items: NewsItem[] = [];

  try {
    const fetchPromises = [];

    if (category === 'all' || category === 'world') {
      fetchPromises.push(
        parser.parseURL(FEEDS.world).then((feed) =>
          feed.items.map((item: any) => {
            // BBC uses media:thumbnail
            const thumbnail = item.mediaThumbnail?.$?.url || item.mediaThumbnail?.url;
            return {
              title: item.title || 'No Title',
              link: item.link || '#',
              pubDate: item.pubDate || new Date().toISOString(),
              source: 'World' as const,
              isoDate: item.isoDate || new Date().toISOString(),
              imageUrl: thumbnail,
            };
          })
        )
      );
    }

    if (category === 'all' || category === 'slovakia') {
      fetchPromises.push(
        parser.parseURL(FEEDS.slovakia).then((feed) =>
          feed.items.map((item: any) => {
            // Slovak Spectator uses enclosure
            const enclosure = item.enclosure?.url;
            return {
              title: item.title || 'No Title',
              link: item.link || '#',
              pubDate: item.pubDate || new Date().toISOString(),
              source: 'Slovakia' as const,
              isoDate: item.isoDate || new Date().toISOString(),
              imageUrl: enclosure,
            };
          })
        )
      );
    }

    const results = await Promise.all(fetchPromises);
    items = results.flat();

    // Sort by date descending
    items.sort((a, b) => new Date(b.isoDate).getTime() - new Date(a.isoDate).getTime());

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error fetching news:', error);
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
  }
}
