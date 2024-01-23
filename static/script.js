let playerCoins = 100;
let currentBet = 0;
let handDealt = false;

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('hitBtn').disabled = true;
    document.getElementById('standBtn').disabled = true;
    document.getElementById('doubleBtn').disabled = true;
    document.getElementById('splitBtn').disabled = true;
    document.getElementById('resetBetBtn').disabled = true;
    document.getElementById('betBtn').disabled = true;
    document.getElementById('a25Btn').disabled = true;
    document.getElementById('a100Btn').disabled = true;
    document.getElementById('a500Btn').disabled = true;
    // Reset game and coins when the 'Start Game' button is clicked
    document.getElementById('start-game').addEventListener('click', function() {
        document.getElementById('resetBetBtn').disabled = false;
        document.getElementById('betBtn').disabled = false;
        checkBetButtons()
        playerCoins = 100;
        currentBet = 0;
        updateCoinsAndBetDisplay();
        updateBetAmount(0);

        // ... other start game logic ...
    });

    // Bet button event listeners
    document.getElementById('a25Btn').addEventListener('click', function() { placeBet(25); });
    document.getElementById('a100Btn').addEventListener('click', function() { placeBet(100); });
    document.getElementById('a500Btn').addEventListener('click', function() { placeBet(500); });

    // ... other event listeners ...
});

document.getElementById('resetBetBtn').addEventListener('click', function() {
    // Reset the current bet amount to 0
    currentBet = 0;
    updateCoinsAndBetDisplay();

    // Re-enable the betting buttons if they were disabled
    checkBetButtons();
});

function placeBet(amount) {
    if (playerCoins >= amount) {
        currentBet += amount;
        updateCoinsAndBetDisplay();
    } else {
        alert('Not enough coins to place this bet.');
    }
    checkBetButtons();
}

function updateCoinsAndBetDisplay() {
    document.getElementById('betAmount').innerText = currentBet + 'c';
    document.getElementById('coinsTotal').innerText = 'Coins = ' + playerCoins + 'c';
}

function checkBetButtons() {
    // Disable bet buttons if not enough coins
    document.getElementById('a25Btn').disabled = playerCoins < 25;
    document.getElementById('a100Btn').disabled = playerCoins < 100;
    document.getElementById('a500Btn').disabled = playerCoins < 500;
}

// Call this function initially to set up the correct state of bet buttons
checkBetButtons();

// Updating the bet amount
function updateBetAmount(amount) {
    document.getElementById('betAmount').innerText = amount + 'c';
}


function addBet(amount) {
    // Logic to add to the current bet
    let currentBet = parseInt(document.getElementById('betAmount').innerText);
    updateBetAmount(currentBet + amount);
}

document.getElementById('betBtn').addEventListener('click', function() {
    let betAmount = parseInt(document.getElementById('betAmount').innerText);
    if (betAmount <= playerCoins){
        playerCoins -= betAmount;  // Deduct the bet amount from player's coins
        currentBet = betAmount;    // Set the current bet
        updateCoinsAndBetDisplay();

        document.getElementById('hitBtn').disabled = false;
        document.getElementById('standBtn').disabled = false;
        document.getElementById('doubleBtn').disabled = true;
        document.getElementById('splitBtn').disabled = true;

        document.getElementById('resetBetBtn').disabled = true;
        document.getElementById('betBtn').disabled = true;
        document.getElementById('a25Btn').disabled = true;
        document.getElementById('a100Btn').disabled = true;
        document.getElementById('a500Btn').disabled = true;

        fetch('/start-game', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ bet: betAmount }),
        })
        .then(response => response.json())
        .then(data => {
            // Display the initial hands
            displayCard(data.player_hand, 'playerHand');
            displayCard(data.dealer_hand, 'dealerHand');

            // Update the total values
            document.getElementById('playerTotal').innerText = 'Player Total: ' + data.player_total;
            document.getElementById('dealerTotal').innerText = 'Dealer Total: ' + data.dealer_total;
        });
    }
    else {
        alert('not enough coins for bet');
        currentBet = 0;
        updateCoinsAndBetDisplay();
    }
});

// Function to display cards (simplified)
function displayCard(hand, elementId) {
    const element = document.getElementById(elementId);
    element.innerHTML = '';  // Clear existing cards
    hand.forEach(card => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card';
        if (card.rank === 'Hidden') {
            cardDiv.innerText = 'Hidden';
            // Apply additional styling or a back-of-card image if desired
        } else {
            cardDiv.innerText = card.rank + ' of ' + card.suit;
        }
        element.appendChild(cardDiv);
    });
}

// Function to display a single new card
function displayNewCard(card, elementId) {
    const element = document.getElementById(elementId);
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card';
    cardDiv.innerText = card.rank + ' of ' + card.suit;
    element.appendChild(cardDiv);
}

document.getElementById('hitBtn').addEventListener('click', function() {

    fetch('/hit', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.new_card) {
            displayNewCard(data.new_card, 'playerHand');
            document.getElementById('playerTotal').innerText = 'Player Total: ' + data.player_total;

            if (data.player_total > 21) {
                displayCard(data.dealer_hand, 'dealerHand'); // Update the dealer's hand
                document.getElementById('dealerTotal').innerText = 'Dealer Total: ' + data.dealer_total;
                
                setTimeout(() => {
                    if (data.result.includes("Player wins") || data.result.includes("Blackjack")) {
                        playerCoins += data.winnings; // Update coinsTotal for a win
                        alert(`${data.result} You won ${data.winnings}c.`);
                        updateCoinsAndBetDisplay();  // Update the display of coins and bet
                    } else {
                        alert(data.result);  // Just show "You lose" for a loss, without mentioning coins
                    }
                
                    resetGame();
                    updateCoinsAndBetDisplay();
                }, 2000);
            }
        } else {
            console.error('No new card was returned from the server');
        }
    });    
});


document.getElementById('standBtn').addEventListener('click', function() {

    // Disable hit button
    document.getElementById('hitBtn').disabled = true;
    document.getElementById('standBtn').disabled = true;
    document.getElementById('doubleBtn').disabled = true;
    document.getElementById('splitBtn').disabled = true;
    document.getElementById('resetBetBtn').disabled = true;
    document.getElementById('betBtn').disabled = true;
    document.getElementById('a25Btn').disabled = true;
    document.getElementById('a100Btn').disabled = true;
    document.getElementById('a500Btn').disabled = true;


    fetch('/stand', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => response.json())
    .then(data => {
        // Update the dealer's hand and total
        displayCard(data.dealer_hand, 'dealerHand');
        document.getElementById('dealerTotal').innerText = 'Dealer Total: ' + data.dealer_total;

        // Show the game result after a brief pause
        setTimeout(() => {
            if (data.result.includes("Player wins") || data.result.includes("Blackjack") || data.result.includes("Blackjack")) {
                playerCoins += data.winnings; // Update coinsTotal for a win
                alert(`${data.result} You won ${data.winnings}c.`);
                updateCoinsAndBetDisplay();  // Update the display of coins and bet
            } else {
                alert(data.result);  // Just show "You lose" for a loss, without mentioning coins
            }
        
            resetGame();
            updateCoinsAndBetDisplay();
        }, 2000);
    });
});

function resetGame() {
    // Clear the hands and totals
    document.getElementById('playerHand').innerHTML = '';
    document.getElementById('dealerHand').innerHTML = '';
    document.getElementById('playerTotal').innerText = 'Player Total: 0';
    document.getElementById('dealerTotal').innerText = 'Dealer Total: 0';

    // Enable betting and reset the bet amount
    updateBetAmount(0);

    // Re-enable the 'Hit' and 'Stand' buttons
    document.getElementById('hitBtn').disabled = true;
    document.getElementById('standBtn').disabled = true;
    document.getElementById('doubleBtn').disabled = true;
    document.getElementById('splitBtn').disabled = true;

    document.getElementById('resetBetBtn').disabled = false;
    document.getElementById('betBtn').disabled = false;
    checkBetButtons()

    // Optionally, send a request to reset the game state on the server
    fetch('/reset-game', { method: 'POST' })
    .then(response => {
        if (!response.ok) {
            console.error('Failed to reset the game state on the server');
        }
    });
}


