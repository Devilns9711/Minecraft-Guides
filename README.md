# Minecraft Guides

A fan-made, browser-based companion for **Minecraft Java Edition 26.3**. It brings five commonly used reference tools into one fast, searchable, responsive interface.

Minecraft Guides runs entirely in the browser. There is no backend, account system or database.

## Tools

| Tool | What it does |
| --- | --- |
| **Crafting Guide** | Browse and search 1,478 entries across crafting, stonecutting, cooking, smithing and special recipes, with ingredient and result icons. |
| **Brewing Guide** | Explore potion recipes, brewing paths, base potions, extended/enhanced variants, and splash or lingering forms. |
| **Enchantment Planner** | Pick an item, see its recommended enchantments, and follow the lowest-XP anvil order. Supports 23 item profiles and 43 enchantments. |
| **Villager Trades** | Search 13 villager professions and expand each profession to view trades by Novice, Apprentice, Journeyman, Expert and Master level. |
| **Portal Calculator** | Convert coordinates between the Overworld and Nether, inspect the search area for an existing portal, and check whether the frame fits the target height. Supports Java and Bedrock differences. |

## Highlights

- **Real Minecraft artwork** — 1,518 item, block, potion, chest and villager sprites are bundled locally.
- **Fast filtering** — search recipes, potions, items and professions without page reloads.
- **Minimum-XP enchanting** — the planner evaluates enchantment-book combinations and reconstructs the cheapest anvil sequence instead of using a fixed order.
- **Edition-aware portal math** — handles the 8:1 horizontal coordinate scale, Y passthrough, world-border clamping, Java/Bedrock search radii and portal build limits.
- **Responsive interface** — designed for desktop and phone, including automatic scrolling to the enchantment plan after selecting an item on smaller screens.
- **Accessible interactions** — keyboard-dismissible modals, reduced-motion support and recognizable Minecraft icons alongside labels.

## Tech Stack

- **React 18** for the interface
- **Vite 7** for development and production builds
- **Tailwind CSS 4** for styling
- **Framer Motion** for animations
- **react-scroll** for in-page navigation
- **Node.js** smoke tests using Vite's SSR renderer

## Getting Started

### Requirements

- Node.js 20.19+ or 22.12+ (required by Vite 7)
- npm

### Install and run

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173/`.

### Production build

```bash
npm run build
npm run preview
```

The production files are written to `dist/`.

### Tests

```bash
npm test
```

The smoke suite checks the icon manifest, recipe icon references, enchantment plans, portal math and server-side rendering of every major component.

## Project Structure

```text
minecraft-guides/
├── public/
│   ├── favicon.svg
│   └── icons/                 # Local Minecraft sprites
├── scripts/                   # Icon and game-data generation utilities
├── src/
│   ├── components/
│   │   ├── recipes/           # Recipe browser and recipe-type views
│   │   ├── icons/             # Item/block icon resolver
│   │   └── ...                # Guides, calculator, layout and modal UI
│   ├── data/                  # Recipes, potions, enchantments, trades and icon manifest
│   ├── lib/
│   │   ├── anvilPlan.js       # Minimum-XP enchantment planner
│   │   └── portalMath.js      # Portal coordinate and build checks
│   ├── App.jsx                # Page composition and modal state
│   ├── index.css              # Tailwind theme and shared styles
│   └── main.jsx               # Application entry point
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## Data and Assets

Game data lives in `src/data/` as JSON, making the guides easy to inspect and update without changing the UI:

- `craftingRecipes.json`
- `stonecuttingRecipes.json`
- `cookingRecipes.json`
- `smithingRecipes.json`
- `specialRecipes.json`
- `potions.json`
- `enchantments.json`
- `enchantableItems.json`
- `villagerTrades.json`
- `iconManifest.json`

Icon and data utilities are in `scripts/`:

```bash
npm run icons:manifest   # Regenerate the icon manifest
npm run icons:missing    # Download missing icons
npm run icons:wiki       # Fetch reference icons from the Minecraft Wiki
```

## Notes

- Enchantment costs use Java Edition book multipliers and assume fresh items and books with no prior work penalty.
- Armor plans default to the lower-XP set without Thorns III; Thorns is documented as an optional addition.
- The Portal Calculator shows the **ideal target** coordinate. Terrain and existing portals can change where the game actually creates or links a portal.
- This is a fan project and is not affiliated with Mojang Studios or Microsoft. Minecraft is a trademark of Mojang Studios.

## Author

Created by **DEVILNS9711**

- Portfolio: [nirmal-singh-portfolio-eight.vercel.app](https://nirmal-singh-portfolio-eight.vercel.app/)
