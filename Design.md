# HostelFlow UI/UX Design Specification

## 1. Design Vision

HostelFlow should feel like a real, professionally designed campus
product rather than an AI-generated or template-based website.

The design direction is:

-   Intentional
-   Modern
-   Product-focused
-   Visually rich without visual clutter
-   Minimal without being empty
-   Professional without feeling corporate
-   Distinctive without relying on trends
-   Accessible and responsive
-   Consistent across desktop, tablet, and mobile

### Core principle

> **Depth ≠ Decoration**

The interface must have visual depth, but that depth should come from
hierarchy, composition, spacing, contrast, typography, surfaces, and
selective elevation rather than decorative AI-style effects.

------------------------------------------------------------------------

# 2. Visual Design Principles

## 2.1 Avoid the "Vibe-Coded" Look

Do not use visual patterns simply because they are common in
AI-generated websites.

Avoid:

-   Harsh gradients
-   Rainbow color schemes
-   Purple + black AI aesthetics
-   Neon colors
-   Excessive pastel colors
-   Glassmorphism everywhere
-   Decorative blobs
-   Radial glow orbs
-   Dot-grid backgrounds
-   Sparkle icons
-   Excessive rounded cards
-   Excessive shadows
-   Decorative animated arrows
-   Excessive hover animations
-   Fake testimonials
-   Fake statistics
-   Fake logos
-   Fake user activity
-   Generic terminal/code windows
-   Generic bento layouts
-   Emoji-based UI decoration
-   Generic three-card feature sections
-   "It's not X, it's Y" AI-style copy

------------------------------------------------------------------------

# 3. Visual Depth

The website must NOT become flat after removing decorative effects.

Do not interpret minimalism as removing all visual elements.

Use depth through:

-   Surface hierarchy
-   Controlled elevation
-   Subtle shadows
-   Layered backgrounds
-   Typography hierarchy
-   Spacing
-   Contrast
-   Borders
-   Image placement
-   Scale differences
-   Overlapping elements when compositionally justified
-   Foreground/background relationships

### Shadow rules

Shadows are allowed when they communicate:

-   Elevation
-   Clickable surfaces
-   Modal hierarchy
-   Floating controls
-   Navigation hierarchy
-   Separation between important layers

Do not give every card the same shadow.

Do not use shadows as the primary visual language.

------------------------------------------------------------------------

# 4. Surface Hierarchy

Create a clear hierarchy:

``` text
Page Background
    ↓
Section Surface
    ↓
Content Surface
    ↓
Interactive Element
    ↓
Floating / Temporary Element
```

These levels can be differentiated through combinations of:

-   Background color
-   Contrast
-   Border
-   Spacing
-   Elevation
-   Typography

Do not rely on one technique everywhere.

The interface should never look like every section is sitting on the
same flat surface.

------------------------------------------------------------------------

# 5. Color System

Use a restrained, intentional palette.

The color system should support:

-   Primary brand color
-   Secondary brand color
-   Background
-   Elevated surface
-   Subtle surface
-   Primary text
-   Secondary text
-   Border
-   Success
-   Warning
-   Error
-   Informational states

### Color rules

-   Avoid rainbow UI.
-   Avoid neon colors.
-   Avoid purple/black AI aesthetics.
-   Avoid excessive pastel cards.
-   Avoid gradients unless a specific product requirement genuinely
    justifies one.
-   Use color primarily to communicate hierarchy, status, interaction,
    and brand identity.

Status colors should be meaningful:

-   Green → successful / completed / available
-   Amber → pending / attention
-   Red → error / rejected / urgent
-   Blue/brand color → informational / interactive

Do not use status colors merely for decoration.

------------------------------------------------------------------------

# 6. Typography

Typography should establish hierarchy before decorative elements do.

Use clear levels for:

-   Page title
-   Section title
-   Subsection title
-   Body text
-   Supporting text
-   Labels
-   Metadata
-   Buttons
-   Status information

Avoid automatically using:

-   Inter
-   Geist
-   Space Grotesk

Choose typography based on the product identity and readability.

Do not use huge marketing typography simply to fill space.

------------------------------------------------------------------------

# 7. Cards

Do not make everything a card.

Use cards only when content needs grouping.

Use other structures where appropriate:

-   Open layouts
-   Lists
-   Tables
-   Dividers
-   Split layouts
-   Full-width sections
-   Editorial layouts
-   Structured panels
-   Image/content compositions

### Card hierarchy

Cards should not all have:

-   Identical border radius
-   Identical shadows
-   Identical padding
-   Identical background
-   Identical icon placement

Component styling should respond to content importance.

------------------------------------------------------------------------

# 8. Border Radius

Do not use large rounded corners on every component.

Use radius according to hierarchy:

-   Small radius for compact controls
-   Moderate radius for grouped content
-   Larger radius only for major surfaces where composition benefits
    from it
-   Square or near-square elements where appropriate

Avoid the generic "everything is rounded" aesthetic.

Buttons should not all become pill-shaped.

------------------------------------------------------------------------

# 9. Navigation

## Desktop

Use a clear navigation structure.

The navigation should visually establish:

-   Brand
-   Primary navigation
-   Current location
-   Important actions
-   Account controls

Avoid excessive floating navigation effects.

## Dashboard

The dashboard navigation should prioritize:

1.  Dashboard
2.  Meals
3.  Leave Requests
4.  Complaints
5.  Notices
6.  Profile
7.  Settings
8.  Logout

Use clear active-state styling rather than excessive glowing or
animation.

------------------------------------------------------------------------

# 10. Landing Page

The landing page should communicate the actual HostelFlow product
immediately.

### Hero

The hero should contain:

-   Clear product statement
-   Short supporting description
-   Primary CTA
-   Secondary CTA where useful
-   Real product imagery or meaningful product UI
-   Strong visual hierarchy

Do not use:

-   Decorative blobs
-   Random gradients
-   Fake AI illustrations
-   Excessive floating cards
-   Generic "AI-powered" messaging

### Product demonstration

Whenever possible, demonstrate the actual product.

Examples:

-   Meal booking
-   Leave request
-   Complaint submission
-   Notice viewing
-   Student dashboard

The product itself should be the visual anchor.

------------------------------------------------------------------------

# 11. Dashboard

The dashboard should feel like a real product interface, not a
collection of decorative cards.

### Recommended hierarchy

``` text
Sidebar / Navigation
        ↓
Header
        ↓
Greeting + contextual information
        ↓
Important current status
        ↓
Today's Meals / Important Tasks
        ↓
Recent Notices / Activity
        ↓
Supporting information
```

### Dashboard summary

Use compact summary components for:

-   Meals
-   Leave requests
-   Complaints
-   Notices

Do not automatically create four colorful gradient cards.

Use subtle differentiation through:

-   Typography
-   Small status indicators
-   Surface color
-   Border
-   Spacing

------------------------------------------------------------------------

# 12. Meals Interface

The meal interface should prioritize today's actionable information.

Show:

-   Yesterday
-   Today
-   Tomorrow

Each meal should clearly communicate:

-   Meal type
-   Timing
-   Booking state
-   Availability
-   Booking action

Example:

``` text
Today's Meals

Breakfast
6:00 AM – 7:00 AM
Status: Not booked

Lunch
7:00 AM – 5:00 PM
Status: Booked

Dinner
8:00 PM – 8:15 PM
Status: Booking closed
```

The interface should make status immediately understandable.

Avoid decorative food emojis.

------------------------------------------------------------------------

# 13. Forms

Forms should be functional first.

Use:

-   Clear labels
-   Appropriate field grouping
-   Strong focus states
-   Validation messages
-   Error states
-   Success states
-   Loading states
-   Clear primary actions

Avoid excessive container nesting.

Do not put every form field inside a separate card.

------------------------------------------------------------------------

# 14. Loading States

Add skeleton loaders wherever asynchronous content is fetched.

Skeletons should:

-   Match the actual content structure
-   Use restrained animation
-   Avoid excessive shimmer
-   Preserve layout dimensions
-   Prevent layout shifts

Do not use generic loading spinners for entire pages when a skeleton is
more appropriate.

------------------------------------------------------------------------

# 15. Empty States

Empty states must explain:

1.  What is currently empty
2.  Why it may be empty
3.  What the user can do next

Do not fill empty states with random illustrations or decorative emojis.

------------------------------------------------------------------------

# 16. Error States

Errors should be:

-   Clear
-   Specific
-   Actionable
-   Visually distinct
-   Non-alarming unless the issue is critical

Provide recovery actions when possible.

------------------------------------------------------------------------

# 17. Interaction Design

Interactions should feel responsive but restrained.

Use animation only when it communicates:

-   State change
-   Navigation
-   Loading
-   Feedback
-   Expansion/collapse
-   Confirmation

Avoid:

-   Constant floating animations
-   Bouncing elements
-   Animated arrows everywhere
-   Excessive scaling
-   Glowing hover states
-   Large movement on hover

### Hover

Hover feedback should generally be subtle:

-   Slight surface change
-   Border change
-   Small elevation change
-   Color transition

Do not make components jump or dramatically scale.

------------------------------------------------------------------------

# 18. Real Product Content

Never invent:

-   Testimonials
-   Reviews
-   Companies
-   User counts
-   Statistics
-   Activity
-   Certifications
-   Partnerships
-   User identities

If real data is unavailable, remove the section or provide a truthful
empty state.

------------------------------------------------------------------------

# 19. Privacy and Legal

If HostelFlow collects user information, provide:

-   Privacy Policy
-   Terms of Service

Content must reflect actual application behavior.

Do not invent legal claims or data practices.

------------------------------------------------------------------------

# 20. Responsive Design

The UI must be intentionally designed for:

-   320px
-   360px
-   390px
-   412px
-   430px
-   Tablet
-   Desktop
-   Large desktop

Do not simply shrink the desktop UI.

Mobile should have its own hierarchy.

### Mobile principles

-   Prioritize primary actions
-   Reduce secondary information
-   Use appropriate bottom navigation or compact navigation where
    justified
-   Maintain readable typography
-   Avoid horizontal overflow
-   Keep touch targets accessible
-   Preserve visual hierarchy

------------------------------------------------------------------------

# 21. Mobile Product Experience

The mobile UI should resemble a polished consumer product.

Example structure:

``` text
Header
    ↓
Greeting / Context
    ↓
Today's important information
    ↓
Quick actions
    ↓
Recent activity
    ↓
Secondary information
```

Avoid compressing the entire desktop dashboard into a narrow screen.

------------------------------------------------------------------------

# 22. Accessibility

Maintain:

-   Strong color contrast
-   Visible focus states
-   Keyboard accessibility
-   Semantic HTML
-   Accessible labels
-   Appropriate touch target sizes
-   Meaningful status indicators
-   Reduced-motion compatibility

Do not communicate important information through color alone.

------------------------------------------------------------------------

# 23. Content Design

Use direct, specific language.

Avoid AI-style marketing phrases such as:

-   "It's not X, it's Y"
-   "Revolutionize your..."
-   "The future of..."
-   "Powered by cutting-edge AI..."
-   "Seamless experience..."
-   "Unlock..."
-   "Transform..."
-   "Supercharge..."

Write product copy based on what HostelFlow actually does.

------------------------------------------------------------------------

# 24. Visual Composition

Every page needs a clear visual anchor.

A visual anchor can be:

-   Real product interface
-   Important data
-   Strong typography
-   Meaningful image
-   Important action
-   Content section

Do not add decoration just because an area feels empty.

If a section feels empty, first improve:

-   Layout
-   Spacing
-   Typography
-   Content hierarchy
-   Image placement
-   Component proportions
-   Surface contrast

------------------------------------------------------------------------

# 25. Design Quality Test

After implementation, inspect every route.

Ask:

### Hierarchy

Can I immediately identify the most important information?

### Depth

Does the interface have visual depth without relying on trendy effects?

### Composition

Does the page feel intentionally composed?

### Content

Is the content useful and truthful?

### Interaction

Do interactions communicate state without excessive animation?

### Consistency

Do components feel like one product?

### Responsiveness

Does the layout remain intentional at every breakpoint?

### AI/Vibe-code test

Ask:

> "If I removed the branding, would this still look like a generic
> AI-generated website?"

If the answer is yes, redesign the affected section.

------------------------------------------------------------------------

# 26. Final Acceptance Criteria

The redesign is complete only when:

-   Existing functionality still works.
-   Existing APIs remain functional.
-   Existing authentication remains functional.
-   Existing database behavior remains unchanged.
-   Existing routes remain functional.
-   All major pages have been audited.
-   Mobile and desktop layouts are intentionally designed.
-   Visual hierarchy is strong.
-   The interface has controlled depth.
-   Shadows are selective.
-   Cards are not overused.
-   Decorative AI patterns are removed.
-   Real product functionality is visually prioritized.
-   Loading states exist where needed.
-   Empty states are intentional.
-   Error states are actionable.
-   Typography is consistent.
-   Colors are restrained.
-   Accessibility is preserved.
-   No fake content has been introduced.

## Final Design Principle

> **Design the interface around the product, not around a collection of
> fashionable UI patterns.**

The final result should look like a product that was deliberately
designed by a strong product designer, with enough visual depth and
personality to feel premium, while remaining practical, usable, and
authentic.
