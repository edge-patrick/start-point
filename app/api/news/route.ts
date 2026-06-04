import { NextResponse } from 'next/server';
import Parser from 'rss-parser';

export const dynamic = 'force-dynamic';

type Category = 'all' | 'world' | 'slovakia';

interface RssItem extends Parser.Item {
  mediaThumbnail?: {
    $?: {
      url?: string;
    };
    url?: string;
  };
}

const parser = new Parser<Record<string, unknown>, RssItem>({
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

const isCategory = (category: string): category is Category =>
  category === 'all' || category === 'world' || category === 'slovakia';

const fallbackDate = () => new Date().toISOString();

const mapWorldItem = (item: RssItem): NewsItem => {
  const thumbnail = item.mediaThumbnail?.$?.url || item.mediaThumbnail?.url;

  return {
    title: item.title || 'No Title',
    link: item.link || '#',
    pubDate: item.pubDate || fallbackDate(),
    source: 'World',
    isoDate: item.isoDate || fallbackDate(),
    imageUrl: thumbnail,
  };
};

const mapSlovakiaItem = (item: RssItem): NewsItem => ({
  title: item.title || 'No Title',
  link: item.link || '#',
  pubDate: item.pubDate || fallbackDate(),
  source: 'Slovakia',
  isoDate: item.isoDate || fallbackDate(),
  imageUrl: item.enclosure?.url,
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'all';

  if (!isCategory(category)) {
    return NextResponse.json({ error: 'Invalid news category' }, { status: 400 });
  }

  try {
    const fetchPromises: Promise<NewsItem[]>[] = [];

    if (category === 'all' || category === 'world') {
      fetchPromises.push(
        parser.parseURL(FEEDS.world).then((feed) => feed.items.map(mapWorldItem))
      );
    }

    if (category === 'all' || category === 'slovakia') {
      fetchPromises.push(
        parser.parseURL(FEEDS.slovakia).then((feed) => feed.items.map(mapSlovakiaItem))
      );
    }

    const results = await Promise.allSettled(fetchPromises);
    const items = results.flatMap((result) =>
      result.status === 'fulfilled' ? result.value : []
    );

    if (items.length === 0 && results.some((result) => result.status === 'rejected')) {
      return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
    }

    // Sort by date descending
    items.sort((a, b) => new Date(b.isoDate).getTime() - new Date(a.isoDate).getTime());

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error fetching news:', error);
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
  }
}
