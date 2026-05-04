# todo

Ignore this file for generation, this file contains user naotes to pick up later.



## Analyse and improve project structure

This project is about the flowdash library that is being used in other applications.
Inside the project I expect extensive testing capabilities, that perform unit tests, regressions test, e2e test and performance tests.

The project is also about demonstrating all functionalities in explicit html pages, with static demo data. So we get a nice interactive demonstration of all functionality, from the singled out core functionality to complicated multifeatured dashbaords.

Can you analyse the application, describe the goals of the project and make an improvement plan. All in markdown files in the docs folder.


### High contract / color blind theme

Can you create a WCAG AAA theme, call it High Contrast;
Focus on visual pointers other than just only color.

) Contrast — the foundation (AAA = very strict)
Key rule
Text contrast (AAA): ≥ 7:1
UI components / graphics: ≥ 3:1 (AA rule, but essential)
What this means in practice
Avoid subtle color differences (e.g., light green vs light red)
Prefer dark-on-light or light-on-dark with strong luminance separation
Don’t rely on hue differences alone (red/green is especially problematic)

👉 For color-blind users, luminance contrast matters far more than color hue

2) “Use of Color” — never rely on color alone
WCAG rule (1.4.1)

Color must not be the only visual means of conveying information

Practical implications

If your UI currently does this:

❌ Red = error, Green = success
❌ Colored nodes in a graph = different types

You must add:

✔ Icons (✓, ⚠, ✖)
✔ Labels/text
✔ Patterns (striped, dotted)
✔ Shape differences (circle vs square)

👉 This is the most important rule for color blindness

3) Non-text contrast (critical for dashboards)
WCAG rule (1.4.11)
Graph elements, borders, buttons must have ≥ 3:1 contrast
Applies to:
Chart lines
Nodes in D3 graphs
Selected states
Focus outlines
Practical implication
Thin, low-contrast lines → fail
Use thicker strokes + strong contrast
4) Avoid problematic color combinations

WCAG doesn’t list specific forbidden combos, but in practice:

High-risk combinations
Red ↔ Green
Green ↔ Brown
Blue ↔ Purple (low contrast variants)
Light pastel vs light pastel
Safer patterns
Blue ↔ Orange
Dark vs Light variants
Monochrome + accents

👉 The trick: separate by brightness + shape, not just hue

5) Redundant encoding (AAA mindset)

AAA pushes toward multiple channels of distinction:

Instead of:

5 categories = 5 colors

Use:

Color + shape + label + position

Example (for your data graphs):

Source systems → squares + solid border
Transformations → circles + dashed border
Outputs → rounded rectangles + thick border
6) Focus & interaction visibility (AAA strengthens this)
Relevant rules
Focus indicators must be clearly visible
No subtle outlines
Practical
Use high-contrast focus rings
Avoid “barely visible blue glow” styles
7) Text readability (AAA extras)
No low-opacity text
Avoid text on gradients unless contrast is guaranteed
Prefer solid backgrounds
8) Testing requirement (often overlooked)

WCAG assumes validation:

You should test with:
Color blindness simulators (Deuteranopia, Protanopia, Tritanopia)
Contrast checkers (7:1 for AAA)
Concrete example (your domain: data dashboards / D3)

Instead of this:

Nodes colored red/green/blue
Thin gray edges
Selection = slightly darker color

Do this:

Nodes:
Different shapes
Strong contrast fills
Edges:
Thicker lines
Optional patterns (dashed vs solid)
Selection:
Bold outline (3–5px)
Glow or halo with high contrast
Status:
Icon + label + color
Bottom line

WCAG AAA ensures color-blind accessibility by enforcing:

High luminance contrast (7:1)
No color-only communication
Clear visual separation of UI elements
Redundant visual cues (shape, text, pattern)