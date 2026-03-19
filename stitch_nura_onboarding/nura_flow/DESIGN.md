# Design System Strategy: The Serene Flow

## 1. Overview & Creative North Star: "The Digital Sanctuary"
This design system moves away from the aggressive, high-density patterns of traditional SaaS to embrace **The Digital Sanctuary**. The Creative North Star is focused on "Feed the Flow"—an editorial approach to onboarding that feels like turning the pages of a high-end wellness magazine rather than filling out a digital form.

To break the "template" look, we utilize **Intentional Asymmetry**. Instead of centering every element, we use the Spacing Scale to create dynamic tension—placing primary actions in unexpected but ergonomic positions. Overlapping elements (e.g., a numerical input slightly bleeding over a soft-edged container) create a sense of tactile depth that feels bespoke and premium.

## 2. Colors: Tonal Depth & The "No-Line" Rule
The palette is rooted in nature and prestige, using `surface` as a canvas and `primary` (Teal) and `secondary` (Emerald) as purposeful beacons.

*   **Primary (`#00464f`):** Use for high-intent actions and authoritative typography.
*   **Secondary (`#006d36`):** Reserved for "Success" states, progress indicators, and moments of user delight.
*   **The "No-Line" Rule:** 1px solid borders are strictly prohibited for sectioning. Boundaries must be defined through background color shifts. For example, a card should be `surface-container-lowest` sitting on a `surface` background. The change in hex code provides the edge, not a stroke.
*   **The "Glass & Gradient" Rule:** To provide "soul," use a subtle linear gradient on primary buttons (transitioning from `primary` to `primary-container`). For floating modals or "Next" steps, apply a `backdrop-blur` of 12px-20px using a 70% opacity version of `surface-container-lowest` to create a frosted-glass effect.

## 3. Typography: Editorial Clarity
We pair the geometric precision of **Lexend** with the approachable warmth of **Plus Jakarta Sans**.

*   **Display & Headlines (Lexend):** Used for the "Hook." These should be large (`display-lg` to `headline-sm`) to create an editorial impact. The rounded nature of Lexend mirrors the radius of our components, creating a cohesive visual language.
*   **Titles & Body (Plus Jakarta Sans):** Used for instructional text and inputs. It provides superior readability at smaller scales while maintaining a modern, premium feel.
*   **The Hierarchy Logic:** Always maintain a minimum 2-step jump in the scale between headlines and body text to ensure a clear "Signature" look.

## 4. Elevation & Depth: Tonal Layering
Traditional shadows are replaced by **Tonal Layering**. We treat the UI as stacked sheets of fine, heavy-stock paper.

*   **The Layering Principle:** Place a `surface-container-highest` element to represent an active or "pressed" state, and a `surface-container-lowest` for an elevated "floating" state.
*   **Ambient Shadows:** If a floating action button (FAB) or card requires a shadow, use the `on-surface` color at 4% opacity with a blur radius of `32px` and a Y-offset of `16px`. This mimics natural sunlight rather than a digital drop-shadow.
*   **The Ghost Border Fallback:** For accessibility in input fields, use the `outline-variant` token at 15% opacity. It should feel like a suggestion of a border, not a hard constraint.

## 5. Components: Fluidity & Negative Space

### Buttons
*   **Primary:** Uses `xl` (3rem/48px) corner radius. Height should be a minimum of `12` on the spacing scale (4rem) to feel luxurious. Use `primary` background with `on-primary` text.
*   **Secondary/Tertiary:** No background. Use `primary` text and a `surface-variant` background only on hover/active states.

### Progress Bars
*   **Sutil Flow:** Located at the absolute top of the viewport. Height should be minimal (4px). Use `surface-container-high` as the track and `secondary` (Emerald) as the fill to signal growth and well-being.

### Selective Option Cards (The "Elegance" Selector)
*   **Style:** Large containers with massive negative space (padding: `8`). 
*   **State:** Unselected items use `surface-container-low`. Selected items transition to `primary-fixed-dim` with a `secondary` (Emerald) "check" icon.
*   **Rule:** Forbid divider lines. Use `spacing-6` between cards to let the background "breathe" through.

### Numerical Inputs
*   **Clean Inputs:** Large `display-md` typography for the numbers themselves. No "box" around the number; instead, use a subtle `surface-container-highest` underline (2px) that expands when focused.

### Additional Component: The "Contextual Leaf"
*   A decorative, semi-transparent icon or shape using `secondary-container` at 20% opacity that sits in the background of onboarding screens, moving slightly as the user scrolls to reinforce the "Feed the Flow" philosophy.

## 6. Do's and Don'ts

### Do:
*   **Use White Space as a Tool:** If a screen feels "empty," don't add more elements. Increase the font size of the Headline or the padding of the buttons.
*   **Soft Transitions:** All state changes (hover, focus, selection) must have a minimum `300ms` ease-in-out transition.
*   **Text Hierarchy:** Use `on-surface-variant` for helper text to keep the focus on the `primary` content.

### Don't:
*   **Don't use 100% Black:** Always use `on-surface` (`#1a1c1a`) for text to maintain the premium, soft-contrast look.
*   **Don't use Sharp Corners:** Nothing in this system should have a radius smaller than `sm` (0.5rem).
*   **Don't Overcrowd:** Limit screens to one primary question or action. If the user has to scroll significantly, split the content into two onboarding steps.