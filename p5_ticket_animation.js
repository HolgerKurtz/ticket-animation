(function() {
    // --- Configuration ---
    // User can define this object *before* loading this script
    const config = window.p5AnimationConfig || {};
    const targetButtonSelector = config.targetButtonSelector || '#targetButton'; // Default CSS selector for the button
    const startEnabled = config.startEnabled || false; // Should animation be on by default? (Desktop only)

    // --- Internal IDs and Classes (to avoid conflicts) ---
    const canvasContainerId = 'p5-ticket-anim-container-xyz'; // Unique ID
    const toggleContainerClass = 'p5-ticket-toggle-container-xyz'; // Unique class
    const toggleCheckboxId = 'p5-ticket-anim-toggle-xyz'; // Unique ID

    // --- 1. Check for p5.js Library ---
    if (typeof p5 === 'undefined') {
        console.error("p5.js library is required for the ticket animation. Please include it in your HTML before this script.");
        return; // Stop execution if p5 is not found
    }

    // --- 2. Inject CSS ---
    const css = `
        #${canvasContainerId} canvas {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -1;
            pointer-events: none;
        }
        .${toggleContainerClass} {
            position: fixed;
            top: 15px;
            right: 15px;
            background-color: rgba(255, 255, 255, 0.8);
            padding: 8px 12px;
            border-radius: 5px;
            z-index: 100;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.9em;
            cursor: pointer;
            user-select: none;
        }
        .${toggleContainerClass} label {
            cursor: pointer;
        }
        /* Media Query to hide toggle on mobile */
        @media (max-width: 767px) {
            .${toggleContainerClass} {
                display: none;
            }
        }
    `;
    const styleElement = document.createElement('style');
    styleElement.type = 'text/css';
    styleElement.innerHTML = css;
    document.head.appendChild(styleElement);

    // --- 3. Create HTML Elements ---
    // Canvas Container
    const canvasContainer = document.createElement('div');
    canvasContainer.id = canvasContainerId;
    document.body.appendChild(canvasContainer); // Append to body

    // Toggle Switch Container
    const toggleContainer = document.createElement('div');
    toggleContainer.className = toggleContainerClass;
    toggleContainer.innerHTML = `
        <input type="checkbox" id="${toggleCheckboxId}" ${startEnabled ? 'checked' : ''}>
        <label for="${toggleCheckboxId}">🎟️ Magic</label>
    `;
    // Append toggle to body. It's position:fixed anyway.
    document.body.appendChild(toggleContainer);


    // --- 4. p5 Sketch Definition (Instance Mode) ---
    const sketch = (p) => {
        let tickets = [];
        const numTickets = 80;
        const baseTicketSize = 30;

        let targetButtonElement = null; // Reference to the actual DOM element
        let buttonPos = null;
        let isAttracting = false;
        let lastHoverState = false;

        const respawnDelay = 100;
        let respawnQueue = [];
        let respawnTimer = 0;

        // --- Ticket Class --- (Uses 'p.' prefix for p5 functions/vars)
        class Ticket {
           constructor(x, y) {
                this.initialPos = p.createVector(x, y);
                this.pos = p.createVector(x, y);
                this.vel = p.createVector(0, 0);
                this.acc = p.createVector(0, 0);
                this.isActive = true;
                this.isReturning = false;
                this.currentSize = baseTicketSize * 0.8;
                this.targetSize = baseTicketSize * 0.8;
                this.currentAlpha = 180;
                this.targetAlpha = 180;
                this.maxWanderSpeed = 0.8;
                this.maxAttractSpeed = 8;
                this.maxForce = 0.04;
                this.attractForceLimit = 0.6;
                this.radius = this.currentSize / 2;
                this.wanderTheta = p.random(p.TWO_PI);
                this.wanderRadius = 12;
                this.wanderDistance = 25;
                this.wanderChange = 0.2;
            }
            applyForce(force) { this.acc.add(force); }
            update() {
                if (!this.isActive) return;
                this.currentSize = p.lerp(this.currentSize, this.targetSize, 0.1);
                this.currentAlpha = p.lerp(this.currentAlpha, this.targetAlpha, 0.1);
                this.radius = this.currentSize / 2;
                if (this.isReturning) {
                    this.targetSize = baseTicketSize * 0.8;
                    this.targetAlpha = 180;
                    if (this.currentAlpha > 175) { this.isReturning = false; }
                    this.wander();
                } else if (isAttracting && buttonPos) {
                    this.targetSize = baseTicketSize;
                    this.targetAlpha = 255;
                    this.attract(buttonPos);
                    let d = p5.Vector.dist(this.pos, buttonPos);
                    if (d < this.radius * 1.5) { this.isActive = false; return; }
                } else {
                    this.targetSize = baseTicketSize * 0.8;
                    this.targetAlpha = 180;
                    this.wander();
                    this.separate(tickets);
                }
                this.vel.add(this.acc);
                let speedLimit = isAttracting ? this.maxAttractSpeed : this.maxWanderSpeed;
                this.vel.limit(speedLimit);
                this.pos.add(this.vel);
                this.acc.mult(0);
                this.checkEdges();
            }
            wander() {
                let wanderPoint = this.vel.copy().setMag(this.wanderDistance).add(this.pos);
                this.wanderTheta += p.random(-this.wanderChange, this.wanderChange);
                let displacement = p.createVector(this.wanderRadius * p.cos(this.wanderTheta), this.wanderRadius * p.sin(this.wanderTheta));
                let wanderTarget = p5.Vector.add(wanderPoint, displacement);
                this.seek(wanderTarget, this.maxWanderSpeed);
            }
            separate(otherTickets) {
                let desiredSeparation = this.radius * 2.5;
                let steer = p.createVector(0, 0); let count = 0;
                for (let other of otherTickets) {
                    if (other !== this && other.isActive && !other.isReturning) {
                        let d = p5.Vector.dist(this.pos, other.pos);
                        if ((d > 0) && (d < desiredSeparation)) {
                            let diff = p5.Vector.sub(this.pos, other.pos).normalize().div(p.max(d, 1));
                            steer.add(diff); count++;
                        }
                    }
                }
                if (count > 0) { steer.div(count); }
                if (steer.mag() > 0) {
                    steer.setMag(this.maxWanderSpeed).sub(this.vel).limit(this.maxForce * 1.5);
                    this.applyForce(steer);
                }
            }
            seek(target, maxSeekSpeed) {
                if (!target) return;
                let desired = p5.Vector.sub(target, this.pos).setMag(maxSeekSpeed);
                let steer = p5.Vector.sub(desired, this.vel).limit(this.maxForce);
                this.applyForce(steer);
            }
            attract(target) {
                if (!target) return;
                let desired = p5.Vector.sub(target, this.pos); let d = desired.mag();
                let speed = (d < 150) ? p.map(d, 0, 150, 1, this.maxAttractSpeed) : this.maxAttractSpeed;
                desired.setMag(speed);
                let steer = p5.Vector.sub(desired, this.vel).limit(this.attractForceLimit);
                this.applyForce(steer);
            }
            startReturning(randomPos = true) {
                this.isActive = true; this.isReturning = true;
                this.pos = randomPos ? p.createVector(p.random(p.width), p.random(p.height)) : this.initialPos.copy();
                this.currentSize = baseTicketSize * 0.2; this.currentAlpha = 0;
                this.targetSize = baseTicketSize * 0.8; this.targetAlpha = 180;
                this.vel = p.createVector(0,0); this.acc.mult(0);
            }
            checkEdges() {
                const margin = this.radius * 2; let steer = p.createVector(0, 0);
                if (this.pos.x < margin) steer.add(p.createVector(this.maxWanderSpeed, 0));
                if (this.pos.x > p.width - margin) steer.add(p.createVector(-this.maxWanderSpeed, 0));
                if (this.pos.y < margin) steer.add(p.createVector(0, this.maxWanderSpeed));
                if (this.pos.y > p.height - margin) steer.add(p.createVector(0, -this.maxWanderSpeed));
                if (steer.mag() > 0) {
                    steer.setMag(this.maxWanderSpeed).sub(this.vel).limit(this.maxForce * 2);
                    this.applyForce(steer);
                }
            }
            display() {
                if (!this.isActive) return;
                p.push();
                p.translate(this.pos.x, this.pos.y);
                p.rotate(this.vel.heading() + p.PI / 2);
                p.textSize(this.currentSize);
                p.textAlign(p.CENTER, p.CENTER);
                p.fill(0, this.currentAlpha); // Use fill alpha
                p.text('🎟️', 0, 0);
                p.pop();
                p.fill(255); // Reset fill
            }
        } // End Ticket Class

        // --- Instance Setup ---
        p.setup = () => {
            p.createCanvas(p.windowWidth, p.windowHeight); // Canvas is automatically parented to the container div by p5 instance mode
            p.textFont('sans-serif');

            tickets = [];
            for (let i = 0; i < numTickets; i++) {
                tickets.push(new Ticket(p.random(p.width), p.random(p.height)));
            }

            // Find the target button using the configured selector
            targetButtonElement = document.querySelector(targetButtonSelector);

            if (targetButtonElement) {
                calculateButtonPosition(); // Initial calculation
                // Add event listeners (these are normal JS listeners)
                targetButtonElement.addEventListener('mouseover', handleMouseOver);
                targetButtonElement.addEventListener('mouseout', handleMouseOut);
                // Ensure button is interactive (might be needed if parent has pointer-events: none)
                 if (getComputedStyle(targetButtonElement).pointerEvents === 'none') {
                     targetButtonElement.style.pointerEvents = 'auto';
                     console.warn(`p5 Animation: Target button "${targetButtonSelector}" had pointer-events: none. Overriding to 'auto'.`);
                 }

            } else {
                console.warn(`p5 Animation: Target button "${targetButtonSelector}" not found in the DOM.`);
            }
        };

        // --- Instance Draw ---
        p.draw = () => {
            p.clear();

            // Respawn logic
            if (!isAttracting && respawnQueue.length > 0) {
                respawnTimer += p.deltaTime;
                if (respawnTimer >= respawnDelay) {
                    respawnTimer = 0;
                    let ticketToRespawn = respawnQueue.shift();
                    if (ticketToRespawn) { ticketToRespawn.startReturning(true); }
                }
            }

            // Update and display tickets
            for (let i = tickets.length - 1; i >= 0; i--) {
                let ticket = tickets[i];
                ticket.update(); ticket.display();
                if (!ticket.isActive && !isAttracting && !respawnQueue.includes(ticket) && !ticket.isReturning) {
                     if (!respawnQueue.includes(ticket)) { respawnQueue.push(ticket); }
                }
            }

             // Queue respawns when hover stops
            if (lastHoverState && !isAttracting) {
                respawnQueue = tickets.filter(t => !t.isActive && !t.isReturning);
                p.shuffle(respawnQueue, true); // Randomize respawn order
            }
            lastHoverState = isAttracting;

            // Optional button glow
            if (isAttracting && buttonPos) {
                let glowSize = 80 + p.sin(p.frameCount * 0.05) * 10;
                let glowAlpha = 30 + p.sin(p.frameCount * 0.05) * 5;
                p.noStroke(); p.fill(255, 255, 255, glowAlpha);
                p.ellipse(buttonPos.x, buttonPos.y, glowSize, glowSize);
            }
        };

        // --- Instance Resize ---
        p.windowResized = () => {
            p.resizeCanvas(p.windowWidth, p.windowHeight);
            calculateButtonPosition(); // Recalculate on resize
        };

        // --- Helper Functions (scoped within sketch) ---
        function calculateButtonPosition() {
            if (targetButtonElement) {
                const rect = targetButtonElement.getBoundingClientRect();
                // Use p.createVector if needed for vector math, otherwise object is fine
                 buttonPos = p.createVector(
                    rect.left + rect.width / 2,
                    rect.top + rect.height / 2
                );
            } else {
                buttonPos = null;
            }
        }

        // Event Handlers modify sketch-internal state
        function handleMouseOver() {
            if (!targetButtonElement) return;
            calculateButtonPosition(); // Ensure position is fresh
            isAttracting = true;
            respawnQueue = []; // Stop respawning during attraction
            respawnTimer = 0;
            tickets.forEach(t => { if (t.isReturning) t.isReturning = false; }); // Force returning tickets to attract
        }
        function handleMouseOut() {
            if (!targetButtonElement) return;
            isAttracting = false;
            // Respawn initiation is handled in draw loop
        }

        // Cleanup function: remove event listeners when sketch is removed
        p.remove = () => {
            console.log("Removing p5 ticket animation sketch and listeners.");
            if (targetButtonElement) {
                targetButtonElement.removeEventListener('mouseover', handleMouseOver);
                targetButtonElement.removeEventListener('mouseout', handleMouseOut);
            }
             // p5 instance mode automatically removes canvas, stops loop etc.
        };

    }; // End of sketch function definition


    // --- 5. Control Logic (Instance Management) ---
    const toggleSwitch = document.getElementById(toggleCheckboxId);
    let currentSketchInstance = null;

    function startSketch() {
        // Check screen width *before* starting - don't start on mobile
        if (window.matchMedia("(max-width: 767px)").matches) {
             console.log("p5 Animation: Not starting on mobile screen size.");
             // Ensure toggle is unchecked if we prevent start
             if (toggleSwitch.checked) {
                 toggleSwitch.checked = false;
             }
             stopSketch(); // Make sure any existing instance is stopped
             return;
        }
        if (!currentSketchInstance) {
            // Pass the container ID to the p5 constructor
            currentSketchInstance = new p5(sketch, canvasContainerId);
            console.log("p5 Animation: Started.");
        }
    }

    function stopSketch() {
        if (currentSketchInstance) {
            currentSketchInstance.remove(); // Call the sketch's custom remove() + p5's cleanup
            currentSketchInstance = null;
            console.log("p5 Animation: Stopped.");
        }
        // Also clear canvas container in case remove didn't catch it fully
        const container = document.getElementById(canvasContainerId);
        if(container) container.innerHTML = '';

    }

    // Add listener to the dynamically created toggle switch
    toggleSwitch.addEventListener('change', function() {
        if (this.checked) {
            startSketch();
        } else {
            stopSketch();
        }
    });

     // Also check on resize if we need to stop/start based on width
     window.addEventListener('resize', () => {
         if (toggleSwitch.checked) { // Only auto-start/stop if toggle is checked
             if (window.matchMedia("(max-width: 767px)").matches) {
                 stopSketch(); // Stop if resizing down to mobile
             } else {
                 startSketch(); // Start if resizing up to desktop (and not already running)
             }
         }
     });


    // --- Initial State ---
    // Start sketch immediately if the toggle is checked (and not on mobile)
    if (toggleSwitch.checked) {
        // Use a small delay to ensure the rest of the page DOM might be ready
        setTimeout(startSketch, 100);
    }

})(); // End IIFE wrapper
