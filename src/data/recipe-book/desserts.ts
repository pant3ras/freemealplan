import { def } from '../recipe-kit';
import type { Recipe } from '../types';

/*
 * Desserts, filed under the afternoon snack slot. Two kinds:
 * make-ahead trays cooked on a Sunday that keep for several days, and quick weeknight puddings.
 * Grams are for one standard serving: one square, one bar or one jar.
 */
export const DESSERTS: Recipe[] = [
  // ───────────────────────── Make-ahead (Sunday, keeps for days) ─────────────────────────
  def({
    id: 'apple-oat-crumble-squares',
    emoji: '🍎',
    slots: ['snack'],
    cuisine: 'Classic',
    minutes: 60,
    active: 20,
    difficulty: 'medium',
    keepsDays: 5,
    name: { en: 'Apple and oat crumble squares', ro: 'Pătrățele cu mere și crumble de ovăz' },
    lines: [['apple', 75], ['oats', 11], ['flour', 3], ['butter', 22], ['sugar', 10], ['honey', 5]],
    extras: [{ en: 'a pinch of salt', ro: 'un vârf de cuțit de sare' }],
    steps: {
      en: [
        'Heat the oven to 180 °C and line a square tin, about 20 cm, with baking paper.',
        'Rub the cold butter (about 1½ tbsp, 22 g) into the flour, oats and sugar (about 2½ tsp, 10 g) with your fingertips until it forms crumbly clumps the size of peas. Press two-thirds of it evenly into the tin and bake for 15 minutes.',
        'Peel, core and thinly slice the apples. Toss them with ¾ tsp (5 g) honey and a pinch of salt and spread them evenly over the baked base.',
        'Scatter the rest of the crumble over the apples and press it down lightly; do not compact it.',
        'Bake for 30–35 minutes until the top is golden and a knife slides easily into the apple.',
        'Cool completely in the tin, at least an hour, then cut into 8 squares. Keep in an airtight tin in the fridge.',
      ],
      ro: [
        'Încălzește cuptorul la 180 °C și tapetează o tavă pătrată, de circa 20 cm, cu hârtie de copt.',
        'Freacă untul rece (circa 1½ linguri, 22 g) în făină, ovăz și zahăr (circa 2½ lingurițe, 10 g) cu vârfurile degetelor, până se formează grămăjoare sfărâmicioase cât boabele de mazăre. Presează două treimi din amestec uniform în tavă și coace 15 minute.',
        'Curăță merele de cotor și taie-le subțiri. Amestecă-le cu ¾ linguriță (5 g) miere și un vârf de cuțit de sare și întinde-le uniform peste baza coaptă.',
        'Presară restul de crumble peste mere și apasă-l ușor; nu-l tasa.',
        'Coace 30–35 de minute, până când partea de sus e aurie și cuțitul intră ușor în măr.',
        'Lasă să se răcească complet în tavă, cel puțin o oră, apoi taie-l în 8 pătrățele. Păstrează-le într-o cutie ermetică la frigider.',
      ],
    },
  }),
  def({
    id: 'yogurt-cheesecake-jars',
    emoji: '🫙',
    slots: ['snack'],
    cuisine: 'Classic',
    minutes: 250,
    active: 20,
    difficulty: 'easy',
    keepsDays: 3,
    name: { en: 'No-bake yogurt cheesecake jars with berries', ro: 'Cheesecake fără coacere în borcane, cu iaurt și fructe de pădure' },
    lines: [['greek-yogurt', 60], ['cottage-cheese', 70], ['honey', 8], ['oats', 15], ['butter', 8], ['frozen-berries', 60], ['lemon', 10]],
    extras: [{ en: 'a little extra honey for the berries, if you like it sweeter', ro: 'puțină miere în plus pentru fructe, dacă vrei mai dulce' }],
    steps: {
      en: [
        'Melt the butter (about 1½ tsp, 8 g), stir in the oats and ½ tsp (4 g) of the honey, and press a layer of this base into the bottom of a small jar.',
        'Blend the cottage cheese with the yogurt, the grated zest and 2 tsp (10 ml) juice of the lemon and the rest of the honey (about ½ tsp, 4 g) until completely smooth.',
        'Spoon the cream over the base and smooth the top.',
        'Warm the berries in a small pan for 3 minutes until juicy, stirring in a little extra honey if you like them sweeter, then let them cool to room temperature.',
        'Spoon the berries over the cream and chill for at least 4 hours, or overnight. Keeps 3 days in the fridge, so the berries can wait until serving.',
      ],
      ro: [
        'Topește untul (circa 1½ linguriță, 8 g), amestecă ovăzul și ½ linguriță (4 g) de miere și apasă un strat din acest fundament în fundul unui borcănel.',
        'Mixează brânza de vaci cu iaurtul, coaja rasă și 2 lingurițe (10 ml) suc de lămâie și restul de miere (circa ½ linguriță, 4 g) până devine perfect netedă.',
        'Pune crema peste fundament și netezește-o deasupra.',
        'Încălzește fructele de pădure într-o cratiță mică, timp de 3 minute, până devin zemoase, amestecând puțină miere în plus dacă vrei mai dulce, apoi lasă-le să ajungă la temperatura camerei.',
        'Pune fructele peste cremă și răcește cel puțin 4 ore sau peste noapte. Se păstrează 3 zile la frigider, deci fructele pot aștepta până la servire.',
      ],
    },
  }),
  def({
    id: 'banana-peanut-oat-bars',
    emoji: '🍌',
    slots: ['snack'],
    cuisine: 'Classic',
    minutes: 40,
    active: 15,
    difficulty: 'easy',
    keepsDays: 5,
    name: { en: 'Banana and peanut butter oat bars', ro: 'Batoane cu banană, unt de arahide și ovăz' },
    lines: [['banana', 30], ['oats', 20], ['peanut-butter', 15], ['honey', 5]],
    extras: [{ en: 'a pinch of salt', ro: 'un vârf de cuțit de sare' }],
    steps: {
      en: [
        'Heat the oven to 170 °C and line a small tin, about 20 cm square, with baking paper.',
        'Mash the bananas with a fork until almost smooth, then stir in 1 tbsp (15 g) peanut butter, ¾ tsp (5 g) honey and a pinch of salt.',
        'Fold in the oats until every flake is coated and the mixture holds together when pressed.',
        'Press it firmly into the tin, levelling the top with the back of a spoon.',
        'Bake for 25–30 minutes until the edges are set and golden; the middle should still feel slightly soft.',
        'Cool completely in the tin, then cut into 8 bars. Keeps 5 days in an airtight tin.',
      ],
      ro: [
        'Încălzește cuptorul la 170 °C și tapetează o tavă mică, pătrată, de circa 20 cm, cu hârtie de copt.',
        'Zdrobește bananele cu o furculiță până devin aproape netede, apoi amestecă 1 lingură (15 g) unt de arahide, ¾ linguriță (5 g) miere și un vârf de cuțit de sare.',
        'Adaugă ovăzul și amestecă până când fiecare fulg e acoperit și compoziția se lipește când o apeși.',
        'Apasă ferm în tavă și netezește deasupra cu dosul unei linguri.',
        'Coace 25–30 de minute, până când marginile sunt fixate și aurii; mijlocul trebuie să rămână ușor moale.',
        'Lasă să se răcească complet în tavă, apoi taie 8 batoane. Se păstrează 5 zile într-o cutie ermetică.',
      ],
    },
  }),

  // ───────────────────────── Weeknight (quick, 20 minutes or less) ─────────────────────────
  def({
    id: 'banana-nice-cream',
    emoji: '🍨',
    slots: ['snack'],
    cuisine: 'Classic',
    minutes: 10,
    active: 5,
    difficulty: 'easy',
    keepsDays: 1,
    name: { en: 'Banana ice cream with peanut butter', ro: 'Înghețată din banană cu unt de arahide' },
    lines: [['banana', 150], ['skyr', 60], ['peanut-butter', 15]],
    extras: [{ en: 'slice the banana and freeze it overnight, so it is ready in the evening', ro: 'taie banana felii și pune-le la congelator peste noapte, ca să fie gata seara' }],
    steps: {
      en: [
        'Blend the frozen banana slices in a food processor or with a strong hand blender, stopping to scrape down the sides, until they turn creamy like soft ice cream.',
        'Add the skyr and blend for another 30 seconds to make it smoother.',
        'Swirl in 1 tbsp (15 g) peanut butter and eat straight away, or freeze for an hour if you want it firmer.',
      ],
      ro: [
        'Mixează feliile de banană congelate într-un robot sau cu un mixer puternic, oprindu-te să răzuiești pereții, până devin cremoase ca înghețata moale.',
        'Adaugă skyr-ul și mixează încă 30 de secunde, ca să iasă mai fin.',
        'Încorporează 1 lingură (15 g) unt de arahide în dungi și mănâncă imediat, sau pune la congelator o oră dacă vrei mai fermă.',
      ],
    },
  }),
  def({
    id: 'baked-apple-oats',
    emoji: '🍏',
    slots: ['snack'],
    cuisine: 'Classic',
    minutes: 25,
    active: 8,
    difficulty: 'easy',
    keepsDays: 1,
    name: { en: 'Baked apple with honey oat topping', ro: 'Măr copt cu ovăz și miere' },
    lines: [['apple', 180], ['oats', 15], ['honey', 14], ['butter', 5]],
    extras: [{ en: 'a pinch of ground ginger (optional)', ro: 'un vârf de cuțit de ghimbir pudră (opțional)' }],
    steps: {
      en: [
        'Heat the oven to 180 °C. Core the apple without cutting through the bottom and set it in a small oven dish.',
        'Mix the oats, 2 tsp (14 g) honey, 1 tsp (5 g) butter and ginger, then pack the mixture into the hole and over the top of the apple.',
        'Pour two tablespoons of water into the dish, cover with foil and bake for 20 minutes until the apple is soft when pierced with a knife.',
        'Take off the foil for the last 10 minutes so the topping crisps. Eat warm.',
      ],
      ro: [
        'Încălzește cuptorul la 180 °C. Scoate cotorul mărului fără să tai până jos și pune-l într-un vas mic de cuptor.',
        'Amestecă ovăzul, 2 lingurițe (14 g) miere, 1 linguriță (5 g) unt și ghimbirul, apoi umple cu amestecul gaura și presară-l peste măr.',
        'Toarnă două linguri de apă în vas, acoperă cu folie de aluminiu și coace 20 de minute, până când mărul e moale la înțepat cu cuțitul.',
        'Scoate folia ultimele 10 minute, ca să se crocanteze topping-ul. Servește cald.',
      ],
    },
  }),
  def({
    id: 'stovetop-lemon-pudding',
    emoji: '🍋',
    slots: ['snack'],
    cuisine: 'Classic',
    minutes: 75,
    active: 12,
    difficulty: 'easy',
    keepsDays: 2,
    name: { en: 'Stovetop lemon pudding', ro: 'Budincă de lămâie făcută în cratiță' },
    lines: [['milk', 150], ['sugar', 15], ['cornstarch', 6], ['lemon', 30]],
    extras: [{ en: 'a pinch of salt', ro: 'un vârf de cuțit de sare' }],
    steps: {
      en: [
        'Whisk the cornstarch (¾ tbsp, 6 g) and sugar (about 1¼ tbsp, 15 g) with 3 tablespoons (45 ml) of the cold milk until completely smooth, with no lumps.',
        'Heat the rest of the milk (about 105 ml) in a small pan until steaming, then whisk in the cornstarch mixture and a pinch of salt.',
        'Keep whisking over low-medium heat for about 2 minutes, until the pudding comes to a gentle boil, thickens and coats the back of a spoon.',
        'Take it off the heat and stir in the grated lemon zest and about 2 tbsp (30 ml) of juice to taste.',
        'Pour into a glass or bowl, press cling film onto the surface and chill for at least an hour.',
      ],
      ro: [
        'Bate amidonul de porumb (¾ lingură, 6 g) și zahărul (circa 1¼ lingură, 15 g) cu 3 linguri (45 ml) lapte rece, până devin complet netede, fără cocoloașe.',
        'Încălzește restul de lapte (circa 105 ml) într-o cratiță mică până aburește, apoi adaugă amestecul de amidon și un vârf de cuțit de sare, bătând continuu.',
        'Continuă să bați la foc mic spre mediu, circa 2 minute, până budinca fierbe ușor, se îngroașă și acoperă dosul lingurii.',
        'Ia de pe foc și amestecă coaja rasă de lămâie și circa 2 linguri (30 ml) de suc, după gust.',
        'Toarnă într-un pahar sau bol, lipește folie pe suprafață și răcește cel puțin o oră.',
      ],
    },
  }),
];
