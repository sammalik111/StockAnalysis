from flask import render_template, request
import yfinance as yf
from prophet import Prophet
from prophet.plot import plot_plotly
from datetime import date
import pandas as pd
import plotly.io as pio
from yahoo_fin import stock_info

START = "2020-01-01"
TODAY = date.today().strftime("%Y-%m-%d")


def load_data(ticker):
    data = yf.download(ticker, START, TODAY)
    data.reset_index(inplace=True)
    return data

def generate_body_content(stock_symbol, stock_data, forecast_html, price, change):

    # Create the body content HTML
    body_html = f"""
    <section class="stock-summary">
        <div class="stock-info">
            <h1 class="stock-name">
                {stock_symbol}
            </h1>
            <div class="stock-price">
                <span class="price">${price}</span>
                <span class="change">{change}%</span>
            </div>
        </div>
    </section>

    <section>
        <h2>Stock Data for {stock_symbol}</h2>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Open</th>
                        <th>Close</th>
                        <th>Volume</th>
                    </tr>
                </thead>
                <tbody>
    """
    for index, row in stock_data.iterrows():
        body_html += f"""
        <tr>
            <td>{row['Date']}</td>
            <td>{row['Open']}</td>
            <td>{row['Close']}</td>
            <td>{row['Volume']}</td>
        </tr>
        """

    body_html += f"""
                </tbody>
            </table>
        </div>
    </section>
    <section>
        <h2>Forecast</h2>
        {forecast_html}
    </section>
    """
    return body_html


def add_class_to_html(html_content, class_name):
    # This assumes the main content you want to modify is inside a <div> tag
    # If there's no <div>, you'll need to adjust the logic accordingly
    if '<div' in html_content:
        html_content = html_content.replace('<div', f'<div class="{class_name}"')
    else:
        # Wrap the content in a <div> with the desired class if it doesn't already exist
        html_content = f'<div class="{class_name}">{html_content}</div>'
    return html_content



def stock_data(symbol, price, change):
    data = load_data(symbol)

    # Prepare the stock data table
    stock_data_html = data.to_html(index=False, classes='stock-data-table')

    # Forecast
    n_years = 1  # Example
    period = n_years * 365

    df_train = data[['Date', 'Close']]
    df_train = df_train.rename(columns={"Date": "ds", "Close": "y"})

    model = Prophet()
    model.fit(df_train)
    future = model.make_future_dataframe(periods=period)
    forecast = model.predict(future)

    fig = plot_plotly(model, forecast)
    forecast_html = pio.to_html(fig, full_html=False)
    forecast_html = add_class_to_html(forecast_html, 'forecast-chart')

    # Generate the body content HTML
    body_content = generate_body_content(symbol, data, forecast_html, price, change)

    # Render the 'stock.html' template with the injected body content
    return render_template('stock.html', body_content=body_content)
