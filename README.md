# p5.js Ticket Background Animation

A simple, self-contained JavaScript script to add a dynamic background animation to any webpage using the p5.js library. It features wandering ticket emojis ('🎟️') that are attracted to a specific button when the user hovers over it.

This animation is designed to subtly suggest audience attraction or ticket sales when interacting with a call-to-action, like a "Contact" button.

## Features

*   **Dynamic Background:** Creates a fullscreen p5.js canvas positioned behind your website content.
*   **Wandering Emojis:** Displays a configurable number of ticket emojis moving smoothly around the screen.
*   **Collision Avoidance:** Emojis gently steer away from each other.
*   **Button Attraction:** When a user hovers over a designated button (configurable via CSS selector), all emojis accelerate towards it.
*   **"Sale" Effect:** Emojis disappear upon reaching the target button, simulating a conversion/sale.
*   **Regeneration:** Emojis gradually reappear and resume wandering when the mouse leaves the button.
*   **Activation Toggle:** Includes an optional toggle switch (visible on desktop only) to enable/disable the animation.
*   **Self-Contained:** The single JavaScript file injects necessary CSS and creates required HTML elements dynamically.
*   **Configurable:** Easily set the target button and default activation state.
*   **Mobile Friendly:** Automatically hides the toggle and disables the animation on screens narrower than 768px.

## Demo

*(You can add a link to a live demo or include a GIF here if available)*

When enabled (via the toggle on desktop), you'll see faded ticket emojis wandering in the background. Hovering over the designated "target" button (e.g., a "Contact" button) makes the emojis become brighter and quickly converge on the button, disappearing upon arrival. Moving the mouse away causes them to gradually fade back in and resume wandering.

## Prerequisites

*   **p5.js Library:** This script **requires** the p5.js library (version 1.11.1 or compatible) to be included in your HTML *before* this script.

## Installation & Usage

1.  **Get the Script:** Download or copy the `p5_ticket_animation.js` file.
2.  **Place the Script:** Put the `p5_ticket_animation.js` file in your website's JavaScript directory (e.g., `/js/`, `/static/js/`, etc.).
3.  **Include in HTML:** Add the following script tags to your main HTML file (e.g., `index.html` or your base template), preferably near the end of the `<body>` tag or in the `<head>` with `defer`.

    ```html
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Website</title>
        <!-- Your other CSS files -->

        <!-- 1. Include p5.js Library FIRST -->
        <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.11.1/p5.js"></script>

        <!-- 2. (Optional) Configure the animation - See Configuration section below -->
        <script>
            window.p5AnimationConfig = {
                targetButtonSelector: '#your-contact-button-id', // IMPORTANT: Change this!
                // startEnabled: false // Default is false, uncomment and set true to start enabled on desktop
            };
        </script>

        <!-- 3. Include the animation script - Use 'defer' if in <head> -->
        <!--    Adjust the 'src' path based on where you placed the file -->
        <script src="/js/p5_ticket_animation.js" defer></script>

    </head>
    <body>
        <!-- Your website content -->
        <h1>Welcome</h1>
        <p>Some content here...</p>

        <!-- IMPORTANT: The target button must exist in your HTML! -->
        <button id="your-contact-button-id">Contact Us</button>

        <p>More content...</p>

        <!-- Your other website scripts -->
    </body>
    </html>
    ```

    *   **Important:** Make sure the path in `src="/js/p5_ticket_animation.js"` correctly points to where you saved the script file.
    *   **Important:** Ensure the button you want the tickets to fly towards exists in the HTML and has an ID (or a unique CSS selector) that you can use for configuration.

## Configuration

You can customize the animation's behavior by defining a `window.p5AnimationConfig` object in a `<script>` tag placed **before** you include `p5_ticket_animation.js`.

```javascript
<script>
    window.p5AnimationConfig = {
      /**
       * REQUIRED: CSS selector for the HTML button element that the tickets
       * should fly towards on hover.
       * Default: '#targetButton'
       * Example: '#contact-btn', '.my-special-button'
       */
      targetButtonSelector: '#your-contact-button-id',

      /**
       * OPTIONAL: Set to true if you want the animation to be enabled
       * by default when the page loads on desktop screens.
       * The toggle switch will be checked accordingly.
       * Default: false
       */
      startEnabled: false
    };
</script>
```

targetButtonSelector: (Required) A CSS selector string that uniquely identifies the button element you want the tickets to target. If this button doesn't exist in the HTML when the script runs, the attraction behavior won't work.

startEnabled: (Optional) Set to true to have the animation active immediately on page load (only applies to desktop screens). Defaults to false.

## How It Works (Briefly)
The script runs inside an IIFE (Immediately Invoked Function Expression) to avoid polluting the global scope.

- It first checks if the p5 object exists (from the p5.js library).
- It dynamically creates a <style> tag and injects the necessary CSS rules into the document's <head>. This includes styles for the canvas container and the toggle switch (and the media query to hide the toggle on mobile).
- It dynamically creates the <div> container for the p5 canvas and the <div> for the toggle switch and appends them to the <body>.
- The core animation logic (including the Ticket class and p5 setup/draw functions) is wrapped in a p5.js "instance mode" function.
- Control logic manages creating (new p5(...)) and removing (currentSketchInstance.remove()) the p5 sketch instance based on the toggle switch state and screen width.
- Event listeners are added to the specified target button (mouseover, mouseout) and the toggle switch (change).
- A resize listener on the window helps manage the animation state when switching between mobile and desktop views.

## Notes & Considerations

- Mobile Behavior: The activation toggle switch is hidden (display: none;) on screens narrower than 768px using a CSS media query. The animation script also checks the screen width and will not start (or will stop if running) on these smaller screens.
- Target Button: The HTML element specified by targetButtonSelector must exist in the DOM when the script runs. The script attempts to ensure the button can receive mouse events (pointer-events: auto), but complex CSS on parent elements could potentially interfere.
- Performance: While optimized, running complex animations with many elements can still impact performance on less powerful devices. The number of tickets (numTickets) is currently set internally within the script but could be made configurable if needed.
- Dependencies: This script absolutely depends on the p5.js library being loaded first.
