# Civic Teal UI Design System

## Project

**Product:** Unified City Services Mobile Application  
**Design Direction:** Civic Teal  
**Primary Platform:** Mobile  
**Design Goal:** A trustworthy, practical, modern civic-services application that feels like a real municipal product.

---

## 1. Core Design Principles

The interface must communicate:

- Trust
- Reliability
- Accessibility
- Public service
- Simplicity
- Transparency
- Community
- Efficiency

The visual language must be calm, restrained, human, and functional.

The application must **not** look like:

- An AI-generated concept
- A futuristic AI dashboard
- A SaaS template
- A crypto product
- A gaming interface
- A generic startup landing page

Every visual element should have a functional purpose.

---

## 2. Color System

### Brand

| Token | Hex | Usage |
|---|---|---|
| `primary` | `#176B68` | Primary actions, active states, selected navigation, important icons |
| `primary-dark` | `#125452` | Pressed states and stronger teal emphasis |
| `background` | `#F7F9F8` | Main application background |
| `surface` | `#FFFFFF` | Cards, sheets, forms, lists |
| `text` | `#172322` | Primary text and headings |
| `text-muted` | `#687674` | Supporting text and metadata |
| `border` | `#DCE4E2` | Subtle borders and dividers |

### Semantic Colors

| Token | Hex | Usage |
|---|---|---|
| `success` | `#287A50` | Completed, resolved, successful |
| `warning` | `#A66A25` | Pending, approaching deadline, attention |
| `error` | `#C4473F` | Errors, failures, destructive actions |
| `info` | `#356F8A` | Informational system messages |

Semantic colors must remain restrained and must never overpower the Civic Teal brand.

---

## 3. Strict Color Restrictions

Never use:

- Gradients
- Neon colors
- Glow effects
- Rainbow palettes
- Purple AI gradients
- Cyberpunk colors
- Holographic effects
- Metallic effects
- Artificial AI-style color combinations

Do not introduce new accent colors unless there is a clear functional reason.

Most of the interface should remain:

**Off-white + white + charcoal + muted gray**

Civic Teal provides the main visual hierarchy.

---

## 4. Visual Style

Use:

- Minimal but not flat
- Clean
- Human
- Institutional but modern
- Mobile-first
- Content-focused
- Spacious
- Functional
- Accessible
- Premium through restraint

Avoid:

- Excessive decoration
- Huge illustrations
- Futuristic elements
- Excessive shadows
- Excessive rounded cards
- Dense dashboards
- Random shapes
- Abstract AI visuals
- Unnecessary animations

The application should feel designed by an experienced product team.

---

## 5. Mobile-First Rules

The application is primarily mobile.

Design and test for:

- 320px
- 360px
- 375px
- 390px
- 412px
- 430px

Primary reference width: **390px**.

Do not design desktop first and simply shrink it.

Use touch-friendly controls.

Minimum touch target: **44px**.

Major navigation should use bottom navigation.

---

## 6. Layout and Spacing

Recommended spacing scale:

```text
4px
8px
12px
16px
20px
24px
32px
```

Default horizontal screen padding:

**16px**

Use 20–24px for important sections when necessary.

Do not turn every section into a separate card.

Create hierarchy using:

- Typography
- Spacing
- Background contrast
- Dividers
- Teal accents

---

## 7. Border Radius

Use moderate rounded corners.

| Element | Radius |
|---|---:|
| Small controls | 8px |
| Inputs | 10px |
| Cards | 12px |
| Large containers | 16px |
| Bottom sheets | 20px |

Avoid excessive pill-shaped components.

Use pills primarily for:

- Status badges
- Filters
- Compact categories
- Small tags

---

## 8. Shadows

Use subtle shadows only when elevation is required.

```css
box-shadow: 0 1px 3px rgba(15, 35, 32, 0.06);
```

Elevated elements may use:

```css
box-shadow: 0 4px 12px rgba(15, 35, 32, 0.08);
```

Never use:

- Colored shadows
- Teal glow
- Neon glow
- Large dramatic shadows

Many cards should rely only on surface contrast and borders.

---

## 9. Typography

Preferred fonts:

- Inter
- SF Pro
- Geist

Use one consistent typeface across the application.

### Type Scale

| Element | Size | Weight |
|---|---:|---:|
| Screen title | 28px / 34px | 700 |
| Section heading | 20px / 26px | 650–700 |
| Card title | 16px / 22px | 600 |
| Body | 15px / 22px | 400 |
| Secondary | 13px / 18px | 400 |
| Caption | 12px / 16px | 400 |

Avoid oversized typography and decorative fonts.

---

## 10. Buttons

### Primary

```text
Background: #176B68
Text: #FFFFFF
Radius: 10px
Minimum height: 48px
```

Use for important actions such as:

- Pay Bill
- Submit Request
- Continue
- Confirm

### Secondary

White or transparent surface with a subtle border.

```text
Border: #DCE4E2
Text: #176B68
```

### Outline

Transparent background with Civic Teal border and text.

### Destructive

Use:

```text
#C4473F
```

only for genuinely destructive actions.

Do not make every action a colored button.

---

## 11. Inputs and Forms

Inputs should use:

- White background
- `#DCE4E2` border
- 10px radius
- Minimum 48px height
- Clear labels
- Clear focus state

Focused input:

```text
Border: #176B68
```

A subtle teal focus ring is acceptable.

Never use glowing focus effects.

---

## 12. Iconography

Use one consistent line-icon system.

Preferred:

- Lucide
- Phosphor
- Similar clean outline icon system

Do not mix icon styles.

Default icon colors:

```text
#172322
#176B68
```

Use semantic colors only when they communicate meaningful state.

Avoid oversized decorative icons.

---

## 13. Bottom Navigation

Recommended navigation:

```text
Home
Services
Requests
Profile
```

Active destination:

```text
#176B68
```

Inactive:

```text
#687674
```

Keep the navigation lightweight.

Do not place colorful backgrounds behind every navigation item.

---

# 14. Home Screen

The home screen should immediately answer:

> What can I do here?

Recommended hierarchy:

1. Location / city selector
2. Greeting
3. Notification action
4. Search
5. Quick services
6. Important pending actions
7. Recent requests
8. Useful city information
9. Bottom navigation

Example:

```text
Good morning

How can we help you today?

[ Search city services ]

Quick Services

Pay Bills
Report Issue
Water
Property Tax
Certificates
Transport

My Requests

Road maintenance
In progress
```

Do not turn the home screen into a statistics-heavy dashboard.

This is a consumer mobile application.

---

# 15. Services Screen

Organize services clearly.

Possible categories:

- Payments
- Civic Issues
- Certificates
- Transport
- Utilities
- Local Information
- Emergency Services
- Nearby Services

Provide:

- Search
- Category filters
- Simple service rows
- Clear descriptions

Each service must immediately communicate what it does.

Avoid dense dashboard-style grids.

---

# 16. Civic Complaint Flow

The reporting flow should be simple.

Recommended flow:

```text
1. Select issue
2. Add location
3. Add photos
4. Describe issue
5. Review
6. Submit
```

Use a simple progress indicator.

Example categories:

- Roads & Footpaths
- Street Lights
- Garbage & Cleanliness
- Water Supply
- Drainage
- Public Spaces
- Noise
- Stray Animals
- Other

Avoid overwhelming forms.

---

# 17. Request Tracking

Request tracking is a core product feature.

Show:

- Request ID
- Category
- Location
- Description
- Submitted date
- Current status
- Assigned department
- Progress timeline

Recommended statuses:

```text
Submitted
Assigned
In Progress
Resolved
```

Use:

- Success green for completed states
- Warning amber for pending states
- Civic Teal for active progression

Prefer a clean vertical timeline over large visual progress graphics.

---

# 18. Payments

Payment screens must feel trustworthy.

Possible services:

- Electricity
- Water
- Property Tax
- Other municipal payments

Show:

- Provider
- Consumer number
- Current amount
- Due date
- Payment method
- Transaction ID
- Payment status

Primary payment action:

```text
#176B68
```

Successful payment states should be restrained.

Do not use exaggerated celebration animations.

---

# 19. Maps and Location

Maps should remain visually neutral.

Do not tint the entire map teal.

Use Civic Teal for:

- Current location
- Selected location
- Important pins
- Location actions

Use simple map markers.

Location cards should remain white.

---

# 20. Status Badges

Use compact badges.

### In Progress

```text
Background: very light amber
Text: #A66A25
```

### Resolved

```text
Background: very light green
Text: #287A50
```

### Submitted

```text
Background: very light teal
Text: #176B68
```

### Failed

```text
Background: very light red
Text: #C4473F
```

Never use highly saturated status backgrounds.

Color must not be the only way status is communicated. Always include text.

---

# 21. Illustrations

Illustrations are optional.

If used, they must be:

- Minimal
- Flat
- Human
- Civic
- Local
- Subtle

Avoid:

- AI-generated abstract landscapes
- 3D illustrations
- Isometric tech graphics
- Glowing cities
- Futuristic holograms

Illustrations may appear on:

- Splash
- Onboarding
- Empty states

Do not use illustrations on every screen.

---

# 22. Empty States

Empty states should be functional.

Example:

```text
No requests yet

Your submitted complaints and service requests
will appear here.

[ Explore Services ]
```

Illustrations are optional.

---

# 23. Loading States

Use simple skeleton loaders.

Use neutral gray skeletons.

Never use:

- Glowing loaders
- Rainbow loaders
- Animated gradients
- Futuristic loading effects

---

# 24. Animation

Animations should be subtle and functional.

Allowed:

- Screen transitions
- Button press feedback
- Bottom-sheet movement
- Checkbox transitions
- Progress changes
- Toast appearance
- Skeleton loading

Recommended duration:

**150–300ms**

Use natural easing.

Do not animate everything.

Never use:

- Floating decorative elements
- Bouncing cards
- Excessive parallax
- Glowing animations
- Particle effects

---

# 25. Accessibility

Accessibility is mandatory.

Maintain strong contrast.

Never communicate meaning through color alone.

Use readable font sizes.

Maintain minimum 44px touch targets.

Forms must have clear labels.

Errors must explain:

1. What went wrong
2. How the user can fix it

---

# 26. Design Consistency

Every screen must look like part of the same application.

Maintain:

- Same spacing system
- Same typography
- Same iconography
- Same radius system
- Same border treatment
- Same button system
- Same semantic colors
- Same navigation
- Same interaction patterns

Do not create a separate visual style for individual screens.

---

# 27. Anti-AI Design Rules

The application must NOT look AI-generated.

Strictly avoid:

- Purple + blue gradients
- Neon teal
- Glowing cards
- Excessive glassmorphism
- Floating blobs
- Random decorative shapes
- Excessive rounded rectangles
- Huge hero typography
- Futuristic dashboards
- Excessive animations
- Fake 3D objects
- Overly polished concept visuals
- Unnecessary charts
- Decorative AI sparkles
- "Magic" buttons
- Gradient text

When choosing between visual impressiveness and practical believability:

**Always choose practical believability.**

---

# 28. Brand Personality

The application should feel:

- Reliable
- Calm
- Helpful
- Local
- Transparent
- Modern
- Human
- Efficient

It should not feel:

- Futuristic
- Luxury
- Gaming
- Experimental
- Cyberpunk
- AI-heavy
- Corporate SaaS
- Social media

---

# 29. Responsive Behavior

Primary target:

**Mobile**

Supported widths:

```text
320px
360px
375px
390px
412px
430px
```

Tablet and desktop may use expanded layouts, but mobile remains the source of truth.

Do not simply stretch mobile components across desktop.

---

# 30. Implementation Rules

For every new screen or feature:

1. Follow this Civic Teal design system.
2. Reuse existing components.
3. Reuse existing spacing.
4. Reuse existing typography.
5. Reuse existing colors.
6. Reuse existing interaction patterns.
7. Do not invent a new visual language.
8. Do not introduce new accent colors without a functional reason.
9. Do not add unnecessary decorative elements.
10. Preserve the overall civic identity.

Do not rewrite or redesign existing components unless the current implementation conflicts with this design system.

---

# Final Design Target

The finished product should look like:

> A modern, trustworthy municipal service application designed for everyday citizens.

It should feel polished enough for a hackathon demonstration while remaining believable enough to become a real production product.

The visual identity is:

**Civic Teal + Off-white + White + Charcoal + restrained semantic colors**

No gradients.  
No neon.  
No AI aesthetics.  
No unnecessary effects.  
No visual clutter.
