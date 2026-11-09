# Feature spec

How this was built: the features below were collected from Mealbird's **public**
website (home page, FAQ, protein calculator) on 2026-10-27, written down as a spec,
then implemented from scratch. No app binary was decompiled and no code, text, images,
recipes or branding were copied. The target formulas are the standard published ones
(Mifflin–St Jeor, g/lb protein rules).

## Parity with Mealbird's public feature list

| Mealbird feature | WeekPlate demo |
| --- | --- |
| Setup: goal, body, diet, budget, repetition; targets shown before anything else | ✅ 6-step onboarding, targets step shows the full arithmetic |
| Diets: vegetarian, vegan, pescatarian, low-carb; exclude pork / red meat / gluten / dairy / egg / nuts | ✅ |
| Rule out allergens (12) | ✅ all 14 EU allergens |
| Household: shopping list buys for everyone | ✅ named members with portion sizes |
| 7 days, each day checked against protein floor + calorie band | ✅ ±5 % band, per-day status |
| Warns how many days miss and by how much | ✅ banner on the Plan tab |
| Deliberate dish reuse (~11 dishes for 21 meals) | ✅ variety / balanced / meal-prep setting |
| Swap one meal, mark eaten out, remove a food, redo the rest of the week, change days / start day | ✅ |
| Ingredients to the gram, macros per meal, "how we compute this" | ✅ per-ingredient table |
| Your portion vs. the whole pot | ✅ |
| Prep time, batch covers several meals | ✅ plus a whole Cook tab |
| Aisle-sorted list, real pack sizes, leftovers and how long they last | ✅ |
| Food cost vs checkout total vs budget | ✅ |
| Share list as text | ✅ Web Share / clipboard, plus Print |
| Custom targets | ✅ |
| DoorDash delivery | ❌ (US only) — see ideas |
| Native iOS / Android apps, subscriptions | ❌ — this is a web app / PWA |

## Extras Mealbird doesn't list

- **Choose which meals to plan** (breakfast / soup / lunch / dinner / snack).
- **Soup course**: a ciorbă or soup as its own course, on by default. One pot covers about
  three days; when soup is its own course, soups aren't also planned as lunch or dinner.
- **English / Romanian**: every screen, recipe name and step, ingredient name and the
  shopping-list text; Romanian plurals; detected from the browser, switchable in Me.
- **Your own recipes and ingredients** (Recipes → My recipes, or "My version" on any
  built-in dish): planned, portioned, priced and shopped exactly like the built-in ones.
- **Remove a meal** from a day: the other meals grow to keep the day on target, and it
  comes off the shopping list. Swapping opens a **swipe deck of replacements** (your
  portion, whether the day still fits, cost per serving), with a list view as well.
- **Cook from what I have**: tick what's in the fridge and cupboards (Recipes → From my
  kitchen, or 🧺 on the Plan tab) and see what you can make, fewest main things to buy
  first (garnishes like garlic or herbs listed separately); or re-plan the week so it uses
  them up, fresh food first. Everything ticked stays off the shopping list.
- **Why is this dish here?** Chips under each meal, plus a "How is this week planned?"
  explainer: hard filters, per-day targets, effort (repetition, fridge life, soup pots),
  long cooks only at the weekend, taste (theme, favourites), and money.
- **Harder recipes**: easy / medium / hard with a skill setting; weekday limits use
  hands-on time, so a slow braise fits as long as you aren't stirring it, and long cooks
  (up to 5 h) are placed on Saturday or Sunday.
- **Cuisine preferences** and **max cooking time** per dish.
- **Lock** a meal so "redo the rest of the week" keeps it.
- **Cooking plan** tab: what to cook on which day, how many meals each batch covers,
  total kitchen time.
- **Pantry**: tick "already at home" and it drops out of the totals; cupboard staples
  start ticked.
- **Favourites** (come up more often) and **never suggest** for recipes; "never use"
  for single ingredients — affected meals are re-planned, everything else is kept.
- **Halal-friendly** filter (a user request on Mealbird's own reviews).
- Shared meals per household (e.g. family joins only for dinner).
- Romanian dishes; works offline, no account.
- **Exact USDA FoodData Central record per ingredient**, linked from every recipe's
  "how we compute this" table (Mealbird does the same with USDA record numbers).
- **Cuisine of the week, as a swipe game**: a Tinder-style deck of cuisine cards (each
  showing dishes that fit your diet) — swipe right for "yum", left for "nope", undo, or
  let the dice pick. The week is then built around those cuisines (every pick shows up
  at least once; locked meals are kept). Opens on "New week", from the Plan tab, and at
  the end of onboarding.
- **179 recipes across 12 cuisines**: Romanian (31), Italian incl. pizza night (18),
  Chinese (18), American burgers & comfort food (13), Mexican (12), Middle Eastern (12),
  Greek (10), Japanese (9), Indian (9), Thai (7), Korean (5), Mediterranean (4), plus 31
  everyday dishes. 31 of them are soups; 74 easy, 76 medium, 29 hard; about 7 steps each,
  with tips. All written for this app (no copied recipes).
- **Real shelf prices at five Romanian chains** (Kaufland, Lidl, Carrefour, Mega Image, Selgros — cash & carry, card needed)
  from the Competition Council's price monitor: the store's actual product and pack, a
  side-by-side total for this week's list at each store, and a "cheapest mix" option
  that splits the list by store. The planner's budget check uses the chosen store.

## Ideas for the next iterations

1. Recipe import (paste a URL or text) and AI-generated recipes (an LLM picks
   ingredients and grams, the engine still does all the arithmetic — the Mealbird approach).
2. Run the price sync weekly on the home server and let the app pick the store nearest
   to you (the sync already takes any lat/lon).
3. Quantities at home ("300 g chicken" rather than just "chicken"), and carrying this
   week's leftover packs into next week's kitchen list automatically.
4. Sync and sharing between household members (small backend, like HomeBudget).
5. Packaging: PWA install + offline service worker, then Capacitor for an Android
   APK / Play Store build.
6. Calendar export (.ics) and a Home Assistant / Telegram "tonight's dinner" ping.
