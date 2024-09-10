import feedparser

def fetch_rss_feed(url):
    """Fetch and parse RSS feed."""
    return feedparser.parse(url)

def filter_articles_by_stock(feed, stock_name, source):
    """Filter articles that mention the stock name and return only title and link."""
    filtered_articles = []
    for entry in feed.entries:
        # Check if the stock name exists in title
        if stock_name.lower() in entry.title.lower():
            article = {
                'title': entry.title,
                'link': entry.link,
                'stock_name': stock_name,
                'source': source
            }
            filtered_articles.append(article)
    
    return filtered_articles

def get_news(stock_name):
    rss_feed_names = [
        'MarketWatch',
        'Business Insider',
        'Wall Street Journal',
        'Seeking Alpha',
        'CNBC',
        'Financial Times',
        'Yahoo Finance'
    ]
    rss_feed_urls = [
        'https://www.marketwatch.com/rss/topstories',
        'https://www.businessinsider.com/rss',
        'https://www.wsj.com/xml/rss/3_7085.xml',
        'https://seekingalpha.com/feed.xml',
        'https://www.cnbc.com/id/100003114/device/rss/rss.html',
        'https://www.ft.com/?format=rss',
        'https://finance.yahoo.com/rss/'
    ]

    articles = []
    for i in range(len(rss_feed_urls)):
        feed = fetch_rss_feed(rss_feed_urls[i])
        articles.extend(filter_articles_by_stock(feed, stock_name, rss_feed_names[i]))
    
    return articles


