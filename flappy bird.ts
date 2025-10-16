<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Flappy Clone</title>
    <style>
        /* Custom CSS for a clean, retro game aesthetic */
        body {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background-color: #0b222c; /* Dark Blue/Teal background */
            font-family: 'Arial', sans-serif;
            overflow: hidden;
            flex-direction: column;
        }

        #game-container {
            position: relative;
            background-color: #70c5ce; /* Light blue sky */
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
            border-radius: 12px;
            overflow: hidden;
        }

        canvas {
            display: block;
            touch-action: manipulation; /* Important for mobile responsiveness */
        }

        /* Styling for the control panel (score and button) */
        #controls {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
            max-width: 600px;
            margin-top: 15px;
            padding: 10px 20px;
            box-sizing: border-box;
            background: #1e3f47;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        }

        #score-display {
            font-size: 2.5rem;
            color: #ffffff;
            font-weight: bold;
            text-shadow: 2px 2px #000000;
        }

        /* Button Styling */
        .game-button {
            padding: 10px 20px;
            background-color: #f7e01b; /* Yellow/Gold */
            color: #2b3940;
            border: none;
            border-radius: 8px;
            font-size: 1.2rem;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 4px 0 #c2b015;
            transition: all 0.1s;
        }

        .game-button:hover {
            background-color: #fce848;
        }

        .game-button:active {
            box-shadow: 0 1px 0 #c2b015;
            transform: translateY(3px);
        }

        /* Message Overlay (Game Over / Start) */
        #message-box {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.7);
            color: #ffffff;
            padding: 20px 40px;
            border-radius: 10px;
            text-align: center;
            z-index: 10;
            pointer-events: none; /* Allows clicks to go through when game is running */
            display: none;
            flex-direction: column;
            gap: 10px;
            width: 80%;
            max-width: 300px;
        }

        #message-box h2 {
            margin: 0 0 10px 0;
            font-size: 2.5rem;
            color: #f7e01b;
        }

        #message-box p {
            margin: 0;
            font-size: 1.2rem;
        }

        #restart-button {
            margin-top: 15px;
            pointer-events: auto;
        }

        /* Responsive adjustments */
        @media (max-width: 640px) {
            #score-display {
                font-size: 2rem;
            }
            .game-button {
                font-size: 1rem;
                padding: 8px 15px;
            }
            #controls {
                width: 95%;
            }
        }
    </style>
</head>
<body>
    <div id="game-container">
        <!-- Canvas is where the game is rendered -->
        <canvas id="gameCanvas"></canvas>

        <!-- Message Box for Start/Game Over -->
        <div id="message-box">
            <h2 id="status-title">FLAPPY CLONE</h2>
            <p id="status-message">Click 'Start' or tap to play!</p>
            <p id="final-score" style="display:none;"></p>
            <button id="restart-button" class="game-button">Start Game</button>
        </div>
    </div>
    <div id="controls">
        <span id="score-display">Score: 0</span>
        <!-- Note: The main interaction is clicking the canvas or pressing space -->
    </div>

    <script>
        // --- GAME CONSTANTS ---
        const CANVAS_WIDTH = 480;
        const CANVAS_HEIGHT = 640;
        const BIRD_SIZE = 30;
        const PIPE_WIDTH = 60;
        const GAP_HEIGHT = 150;
        const GROUND_HEIGHT = 50;

        // --- PHYSICS CONSTANTS ---
        const GRAVITY = 0.8;
        const JUMP_VELOCITY = -12;
        const PIPE_SPEED = 3;

        // --- HTML ELEMENTS ---
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const scoreDisplay = document.getElementById('score-display');
        const messageBox = document.getElementById('message-box');
        const statusTitle = document.getElementById('status-title');
        const statusMessage = document.getElementById('status-message');
        const finalScoreElement = document.getElementById('final-score');
        const restartButton = document.getElementById('restart-button');

        // --- GAME VARIABLES ---
        let bird;
        let pipes = [];
        let score = 0;
        let gameActive = false;
        let animationFrameId;
        let lastPipeTime = 0;
        const pipeSpawnInterval = 1500; // milliseconds

        // --- UTILITY FUNCTIONS ---

        /**
         * Converts a color to a slightly darker shade for the border effect.
         * @param {string} hex - The original hex color (e.g., "#FF0000").
         * @param {number} percent - Percentage to darken (e.g., 20 for 20% darker).
         * @returns {string} The darkened hex color.
         */
        function darkenColor(hex, percent) {
            let r = parseInt(hex.substring(1, 3), 16);
            let g = parseInt(hex.substring(3, 5), 16);
            let b = parseInt(hex.substring(5, 7), 16);

            r = Math.floor(r * (100 - percent) / 100);
            g = Math.floor(g * (100 - percent) / 100);
            b = Math.floor(b * (100 - percent) / 100);

            r = Math.min(255, Math.max(0, r));
            g = Math.min(255, Math.max(0, g));
            b = Math.min(255, Math.max(0, b));

            return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        }

        // --- GAME OBJECTS ---

        class Bird {
            constructor() {
                this.x = 80;
                this.y = CANVAS_HEIGHT / 2 - BIRD_SIZE / 2;
                this.dy = 0; // Vertical velocity
                this.color = '#f7e01b'; // Yellow
                this.borderColor = darkenColor(this.color, 25);
                this.tilt = 0; // Rotation angle
            }

            // Applies gravity and updates position
            update() {
                this.dy += GRAVITY;
                this.y += this.dy;

                // Adjust tilt based on velocity for visual feedback
                this.tilt = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, this.dy * 0.04));

                // Prevent falling through the ground
                if (this.y + BIRD_SIZE > CANVAS_HEIGHT - GROUND_HEIGHT) {
                    this.y = CANVAS_HEIGHT - GROUND_HEIGHT - BIRD_SIZE;
                    this.dy = 0;
                    if (gameActive) endGame();
                }
                // Prevent flying off the top
                if (this.y < 0) {
                    this.y = 0;
                    this.dy = 0;
                }
            }

            // Makes the bird jump
            flap() {
                if (!gameActive) return;
                this.dy = JUMP_VELOCITY;
            }

            draw() {
                ctx.save();
                ctx.translate(this.x + BIRD_SIZE / 2, this.y + BIRD_SIZE / 2);
                ctx.rotate(this.tilt);

                // Body (circle or rounded rectangle)
                ctx.beginPath();
                ctx.arc(0, 0, BIRD_SIZE / 2, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();

                // Beak (triangle)
                ctx.beginPath();
                ctx.moveTo(BIRD_SIZE / 2, 0);
                ctx.lineTo(BIRD_SIZE / 2 + 10, -5);
                ctx.lineTo(BIRD_SIZE / 2 + 10, 5);
                ctx.fillStyle = '#ff9900'; // Orange
                ctx.fill();

                // Eye
                ctx.beginPath();
                ctx.arc(BIRD_SIZE * 0.1, -BIRD_SIZE * 0.2, 3, 0, Math.PI * 2);
                ctx.fillStyle = 'black';
                ctx.fill();

                // Outline
                ctx.strokeStyle = this.borderColor;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(0, 0, BIRD_SIZE / 2, 0, Math.PI * 2);
                ctx.stroke();

                ctx.restore();
            }
        }

        class Pipe {
            constructor(x, gapY) {
                this.x = x;
                this.gapY = gapY; // Y position of the center of the gap
                this.scored = false;
                this.color = '#72be29'; // Green pipe
                this.borderColor = darkenColor(this.color, 25);
            }

            update() {
                this.x -= PIPE_SPEED;
            }

            draw() {
                const topPipeHeight = this.gapY - GAP_HEIGHT / 2;
                const bottomPipeY = this.gapY + GAP_HEIGHT / 2;

                // Function to draw a single pipe section with borders
                const drawPipeSection = (y, h) => {
                    ctx.fillStyle = this.color;
                    ctx.strokeStyle = this.borderColor;
                    ctx.lineWidth = 4;
                    // Main body
                    ctx.fillRect(this.x, y, PIPE_WIDTH, h);
                    ctx.strokeRect(this.x, y, PIPE_WIDTH, h);
                    // Cap (slightly wider)
                    const capHeight = 30;
                    const capWidth = PIPE_WIDTH + 8;
                    const capX = this.x - 4;
                    let capY = y;

                    if (y === 0) { // Top pipe cap is at the bottom of the section
                        capY = h - capHeight;
                    }

                    ctx.fillRect(capX, y === 0 ? h - capHeight : y, capWidth, capHeight);
                    ctx.strokeRect(capX, y === 0 ? h - capHeight : y, capWidth, capHeight);
                };

                // Draw Top Pipe
                drawPipeSection(0, topPipeHeight);

                // Draw Bottom Pipe (height goes from bottomPipeY to the ground)
                drawPipeSection(bottomPipeY, CANVAS_HEIGHT - GROUND_HEIGHT - bottomPipeY);
            }
        }

        // --- GAME LOGIC FUNCTIONS ---

        // Resizes the canvas to standard dimensions and ensures it is rendered sharp
        function setupCanvas() {
            canvas.width = CANVAS_WIDTH;
            canvas.height = CANVAS_HEIGHT;
            canvas.style.width = '100%';
            canvas.style.maxWidth = CANVAS_WIDTH + 'px';
            canvas.style.height = 'auto';

            // Handle high-density screens if needed, but keeping it simple for Flappy Bird style.
            ctx.imageSmoothingEnabled = false;
        }

        // Draws the static elements (Ground and Background)
        function drawStaticElements() {
            // Draw Ground
            ctx.fillStyle = '#d2b48c'; // Brown-ish ground
            ctx.fillRect(0, CANVAS_HEIGHT - GROUND_HEIGHT, CANVAS_WIDTH, GROUND_HEIGHT);
            ctx.strokeStyle = '#a08560';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(0, CANVAS_HEIGHT - GROUND_HEIGHT);
            ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_HEIGHT);
            ctx.stroke();
        }

        // Checks for collision between the bird and any pipes
        function checkCollision() {
            // Check pipe collisions
            for (const pipe of pipes) {
                const pipeTopHeight = pipe.gapY - GAP_HEIGHT / 2;
                const pipeBottomY = pipe.gapY + GAP_HEIGHT / 2;

                // Bird bounding box
                const bx1 = bird.x;
                const by1 = bird.y;
                const bx2 = bird.x + BIRD_SIZE;
                const by2 = bird.y + BIRD_SIZE;

                // Pipe bounding box
                const px1 = pipe.x;
                const px2 = pipe.x + PIPE_WIDTH;

                // Check X-overlap
                if (bx2 > px1 && bx1 < px2) {
                    // Check Y-overlap (Top pipe collision OR Bottom pipe collision)
                    if (by1 < pipeTopHeight || by2 > pipeBottomY) {
                        return true; // Collision detected!
                    }
                }
            }
            return false;
        }

        // Handles scoring logic
        function updateScore() {
            for (const pipe of pipes) {
                // If the bird is past the pipe's center and hasn't scored yet
                if (bird.x > pipe.x + PIPE_WIDTH / 2 && !pipe.scored) {
                    score++;
                    pipe.scored = true;
                    scoreDisplay.textContent = `Score: ${score}`;
                }
            }
        }

        // Spawns a new pipe with a random gap height
        function spawnPipe(timestamp) {
            if (timestamp - lastPipeTime > pipeSpawnInterval) {
                // Generate a random Y position for the gap center
                // Ensure the gap is not too close to the top or ground
                const minGapY = 50 + GAP_HEIGHT / 2;
                const maxGapY = CANVAS_HEIGHT - GROUND_HEIGHT - 50 - GAP_HEIGHT / 2;
                const randomGapY = Math.random() * (maxGapY - minGapY) + minGapY;

                pipes.push(new Pipe(CANVAS_WIDTH, randomGapY));
                lastPipeTime = timestamp;
            }
        }

        // --- GAME FLOW FUNCTIONS ---

        // The main game update and rendering loop
        function gameLoop(timestamp) {
            if (!gameActive) {
                return;
            }

            // 1. Update Game State
            bird.update();
            spawnPipe(timestamp);

            // Update pipes and clean up off-screen pipes
            pipes.forEach(pipe => pipe.update());
            pipes = pipes.filter(pipe => pipe.x + PIPE_WIDTH > 0);

            // 2. Collision and Scoring
            if (checkCollision()) {
                endGame();
                return;
            }
            updateScore();

            // 3. Clear and Redraw
            ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            drawStaticElements();
            pipes.forEach(pipe => pipe.draw());
            bird.draw();

            // 4. Loop
            animationFrameId = requestAnimationFrame(gameLoop);
        }

        function startGame() {
            if (gameActive) return;

            // Reset game state
            pipes = [];
            score = 0;
            bird = new Bird();
            scoreDisplay.textContent = `Score: 0`;
            gameActive = true;

            // Hide message box
            messageBox.style.display = 'none';
            messageBox.style.pointerEvents = 'none';

            // Start loop
            lastPipeTime = performance.now(); // Initialize pipe timing
            animationFrameId = requestAnimationFrame(gameLoop);
        }

        function endGame() {
            gameActive = false;
            cancelAnimationFrame(animationFrameId);

            statusTitle.textContent = "GAME OVER";
            statusMessage.textContent = "You hit the ground or a pipe!";
            finalScoreElement.style.display = 'block';
            finalScoreElement.textContent = `Final Score: ${score}`;
            restartButton.textContent = "Play Again";

            // Show message box
            messageBox.style.display = 'flex';
            messageBox.style.pointerEvents = 'auto';
        }

        function init() {
            setupCanvas();
            // Draw initial state
            ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            drawStaticElements();
            
            // Show start screen
            statusTitle.textContent = "FLAPPY CLONE";
            statusMessage.textContent = "Click 'Start' or press SPACE to fly!";
            finalScoreElement.style.display = 'none';
            restartButton.textContent = "Start Game";
            messageBox.style.display = 'flex';
            messageBox.style.pointerEvents = 'auto';

            // Initialize a bird object just for drawing the start screen
            bird = new Bird();
            bird.draw();
        }

        // --- EVENT LISTENERS ---

        // Main input for jumping (Click/Tap)
        function handleInput() {
            if (!gameActive) {
                startGame();
            } else {
                bird.flap();
            }
        }

        // Mouse click on the container/canvas
        canvas.addEventListener('mousedown', (e) => {
            // Check if click originated from inside the message box's button
            if (messageBox.contains(e.target) && e.target.id !== 'restart-button') {
                return; // Ignore clicks that fall inside the overlay but outside the button
            }
            handleInput();
        });

        // Touch input for mobile
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevent scrolling/zooming
            handleInput();
        }, { passive: false });

        // Keyboard input (Spacebar)
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault(); // Prevent default scroll action
                handleInput();
            }
        });

        // Restart button handler
        restartButton.addEventListener('click', startGame);

        // Start the game initialization when the page loads
        window.onload = init;
    </script>
</body>
</html>
