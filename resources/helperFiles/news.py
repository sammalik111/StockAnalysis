import asyncio
import aiohttp
import feedparser

# Fetch RSS feeds asynchronously
async def fetch_rss_feed_async(session, url):
    """Asynchronously fetch and parse an RSS feed."""
    async with session.get(url) as response:
        # Read the response text and parse it with feedparser
        response_text = await response.text()
        return feedparser.parse(response_text)

def filter_articles_by_stock(feed, stock_name, source):
    """Filter articles that mention the stock name and return only title and link."""
    filtered_articles = []
    for entry in feed.entries:
        if stock_name.lower() in entry.title.lower():
            article = {
                'title': entry.title,
                'link': entry.link,
                'stock_name': stock_name,
                'source': source
            }
            filtered_articles.append(article)
    return filtered_articles

async def get_news_async(stock_name):
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

    async with aiohttp.ClientSession() as session:
        tasks = [fetch_rss_feed_async(session, url) for url in rss_feed_urls]
        feeds = await asyncio.gather(*tasks)  # Fetch all feeds concurrently

    articles = []
    for i, feed in enumerate(feeds):
        filtered_articles = filter_articles_by_stock(feed, stock_name, rss_feed_names[i])
        articles.extend(filtered_articles)

    return articles

# Synchronous function to use the asynchronous function
def get_news(stock_name):
    return asyncio.run(get_news_async(stock_name))

# Example usage
if __name__ == "__main__":
    stock_name = "Tesla"
    articles = get_news(stock_name)
    for article in articles:
        print(f"Title: {article['title']}, Link: {article['link']}, Source: {article['source']}")