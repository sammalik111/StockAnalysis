class Stock:
 def __init__(self, name, prices, times):
     self.name = name
     self.prices = prices
     self.times = times
 
def max_profit(self):
    # Check if there's enough data for at least one transaction
    if not self.prices or len(self.prices) < 2:
        return 0, -1, -1  # Return 0 profit and invalid buy/sell times if no prices available

    # Initialize the bestBuy, maxProfit, and times
    best_buy_price = self.prices[0]
    max_profit = 0
    best_buy_time = 0
    best_sell_time = 0

    for i in range(1, len(self.prices)):
        current_price = self.prices[i]

        # Calculate potential profit if we sell at the current price
        current_profit = current_price - best_buy_price

        # Update maxProfit and best times if current profit is higher
        if current_profit > max_profit:
            max_profit = current_profit
            best_sell_time = i

        # Update the bestBuy price and time if we find a new lower price
        if current_price < best_buy_price:
            best_buy_price = current_price
            best_buy_time = i

    return max_profit, best_buy_time, best_sell_time

            
            
 def avg_best_buy_time(self):
     # logic for best buy time

 def avg_best_sell_time(self):
     # logic for best sell time
