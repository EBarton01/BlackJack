from flask import Flask, render_template, request, jsonify, session

app = Flask(__name__)
app.secret_key = 'your_very_secret_key'


import random

# Create a deck of cards
def create_deck():
    suits = ['Hearts', 'Diamonds', 'Clubs', 'Spades']
    ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King', 'Ace']
    return [{'suit': suit, 'rank': rank} for suit in suits for rank in ranks]

# Shuffle the deck
def shuffle_deck(deck):
    random.shuffle(deck)
    return deck

# Deal cards
def deal_cards(deck, number):
    return [deck.pop() for _ in range(number)]

def get_card_value(card):
    rank = card['rank']
    if rank in ['Jack', 'Queen', 'King']:
        return 10
    elif rank == 'Ace':
        return 11  # Initially treat Ace as 11
    else:
        return int(rank)  # Number cards


def calculate_hand_value(hand):
    value = sum(get_card_value(card) for card in hand)
    number_of_aces = sum(1 for card in hand if card['rank'] == 'Ace')

    # Adjust for Aces value if total is over 21
    while value > 21 and number_of_aces:
        value -= 10  # Count one Ace as 1 instead of 11
        number_of_aces -= 1

    return value




@app.route('/')
def home():
    return render_template('index.html')

def hit_card(deck, hand):
    if deck:  # Check if there are cards left in the deck
        card = deck.pop()  # Remove one card from the deck
        hand.append(card)  # Add this card to the hand
    return hand, deck



@app.route('/start-game', methods=['POST'])
def start_game():
    data = request.get_json()
    bet_amount = data.get('bet', 0)
    # Create and shuffle the deck
    deck = create_deck()
    shuffled_deck = shuffle_deck(deck)
    
    # Deal initial cards to player and dealer
    player_hand = deal_cards(shuffled_deck, 2)
    dealer_hand = deal_cards(shuffled_deck, 2)
    
    # Store the deck and hands in the session
    session['deck'] = shuffled_deck
    session['player_hand'] = player_hand
    session['dealer_hand'] = dealer_hand
    session['bet_amount'] = bet_amount

    # Send only one dealer card to the front-end initially
    initial_dealer_total = get_card_value(dealer_hand[0])
    session['dealer_hand'] = dealer_hand

    return jsonify({
        'player_hand': player_hand,
        'dealer_hand': [dealer_hand[0], {'rank': 'Hidden', 'suit': 'Hidden'}],
        'player_total': calculate_hand_value(player_hand),
        'dealer_total': initial_dealer_total
    })

@app.route('/hit', methods=['POST'])
def hit():
    deck = session.get('deck', [])
    player_hand = session.get('player_hand', [])
    dealer_hand = session.get('dealer_hand', [])  # Ensure you have the dealer's hand

    # Check if the player can hit
    if not deck or calculate_hand_value(player_hand) > 20:
        return jsonify({'error': 'Cannot hit', 'total_value': calculate_hand_value(player_hand)}), 400

    # Deal a new card
    new_card = deck.pop()
    player_hand.append(new_card)
    session['deck'] = deck
    session['player_hand'] = player_hand

    # Prepare card data for JSON response
    card_data = {'rank': new_card['rank'], 'suit': new_card['suit']}
    player_total = calculate_hand_value(player_hand)

    # Check if player busts with the new card
    if player_total > 21:
        dealer_total = calculate_hand_value(dealer_hand)  # Calculate the full dealer's total
        return jsonify({
            'new_card': {'rank': new_card['rank'], 'suit': new_card['suit']},
            'player_total': player_total,
            'dealer_hand': dealer_hand,
            'dealer_total': dealer_total,
            'result': 'Bust! You lose.'
        })

    return jsonify({
        'new_card': {'rank': new_card['rank'], 'suit': new_card['suit']},
        'player_total': player_total
    })


@app.route('/stand', methods=['POST'])
def stand():
    deck = session.get('deck', [])
    player_hand = session.get('player_hand', [])
    dealer_hand = session.get('dealer_hand', [])

    player_total = calculate_hand_value(player_hand)
    dealer_total = calculate_hand_value(dealer_hand)

    bet_amount = session.get('bet_amount', 0)
    

    # Dealer keeps hitting until  17 
    while dealer_total < 17:
        if deck:
            new_card = deck.pop()
            dealer_hand.append(new_card)
            dealer_total = calculate_hand_value(dealer_hand)
        else:
            break

    session['dealer_hand'] = dealer_hand
    session['deck'] = deck

    result, winnings = determine_game_result(player_hand, player_total, dealer_total, bet_amount)
    return jsonify({
        'dealer_hand': dealer_hand,  # Full dealer hand
        'dealer_total': dealer_total,
        'result': result,
        'winnings': winnings
    })


@app.route('/double', methods=['POST'])
def double():
    if 'deck' not in session or 'player_hand' not in session or 'bet_amount' not in session:
        return jsonify({'error': 'Game not started or already ended'}), 400

    deck = session['deck']
    player_hand = session['player_hand']
    bet_amount = session['bet_amount']

    # Double the bet
    session['bet_amount'] = bet_amount * 2

    # Deal only one card to the player
    if deck:
        new_card = deck.pop()
        player_hand.append(new_card)
        session['deck'] = deck
        session['player_hand'] = player_hand

    player_total = calculate_hand_value(player_hand)

    # Proceed to dealer's turn
    dealer_hand = session['dealer_hand']
    dealer_total = calculate_hand_value(dealer_hand)

    # Dealer keeps hitting until reaching 17 or more
    while dealer_total < 17:
        if deck:
            new_card = deck.pop()
            dealer_hand.append(new_card)
            dealer_total = calculate_hand_value(dealer_hand)
        else:
            break

    session['dealer_hand'] = dealer_hand

    result, winnings = determine_game_result(player_hand, player_total, dealer_total, session['bet_amount'])
    
    # Return the new state including the new card, updated player total, dealer's hand, and the result
    return jsonify({
        'new_card': {'rank': new_card['rank'], 'suit': new_card['suit']},
        'player_total': player_total,
        'dealer_hand': dealer_hand,
        'dealer_total': dealer_total,
        'result': result,
        'winnings': winnings
    })


def determine_game_result(player_hand, player_total, dealer_total, bet_amount):
    if player_total > 21:
        return "Bust! You lose.", 0
    elif player_total == 21 and len(player_hand) == 2:
        return "Blackjack!", int(bet_amount * 2.5)
    elif dealer_total > 21:
        return "Player wins! Dealer busts", bet_amount * 2
    elif player_total > dealer_total:
        return "Player wins!", bet_amount * 2
    elif dealer_total == player_total:
        return "Push! It's a tie.", bet_amount
    else:  # This is the case where it's a push
        return "Dealer wins!", 0


@app.route('/reset-game', methods=['POST'])
def reset_game():
    # Reset the session variables related to the game state
    session.pop('deck', None)
    session.pop('player_hand', None)
    session.pop('dealer_hand', None)
    return jsonify({'status': 'Game reset'}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000,debug=True)
