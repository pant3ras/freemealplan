import type { Cuisine, Text } from './types';

/** Card art for the cuisine swipe deck: an emoji, a one-line pitch and two gradient colours. */
export const CUISINE_INFO: Record<Cuisine, { emoji: string; tagline: Text; from: string; to: string }> = {
  Romanian: {
    emoji: '🥬',
    tagline: { en: 'Sarmale, ciorbă and mămăligă — bunica approved', ro: 'Sarmale, ciorbe și mămăligă — aprobate de bunica' },
    from: '#1d4e89',
    to: '#c8102e',
  },
  Italian: { emoji: '🍕', tagline: { en: 'Pizza night, pasta and a proper carbonara', ro: 'Seară de pizza, paste și o carbonara ca la carte' }, from: '#1f7a3f', to: '#c8102e' },
  American: {
    emoji: '🍔',
    tagline: { en: 'Smash burgers, cheesesteaks and loaded potatoes', ro: 'Smash burgeri, cheesesteak și cartofi umpluți' },
    from: '#23395b',
    to: '#b22234',
  },
  Mexican: { emoji: '🌮', tagline: { en: 'Tacos, burrito bowls and quesadillas', ro: 'Tacos, burrito bowl și quesadillas' }, from: '#0b6e4f', to: '#d1495b' },
  Chinese: { emoji: '🥡', tagline: { en: 'Takeaway favourites, made better at home', ro: 'Preferatele de la takeaway, mai bune făcute acasă' }, from: '#9e1b1b', to: '#e8a317' },
  Japanese: { emoji: '🍣', tagline: { en: 'Ramen, teriyaki and poke bowls', ro: 'Ramen, teriyaki și poke bowls' }, from: '#2b2d42', to: '#d62828' },
  Thai: { emoji: '🍜', tagline: { en: 'Pad thai, coconut curry and holy-basil heat', ro: 'Pad thai, curry cu cocos și busuioc iute' }, from: '#0f4c81', to: '#2a9d8f' },
  Korean: { emoji: '🍲', tagline: { en: 'Bibimbap, bulgogi and sticky chicken', ro: 'Bibimbap, bulgogi și pui lipicios' }, from: '#003478', to: '#c60c30' },
  Indian: { emoji: '🍛', tagline: { en: 'Butter chicken, biryani and dal', ro: 'Butter chicken, biryani și dal' }, from: '#ff9933', to: '#138808' },
  Greek: { emoji: '🥙', tagline: { en: 'Souvlaki, tzatziki and lemony traybakes', ro: 'Souvlaki, tzatziki și tăvi cu lămâie' }, from: '#0d5eaf', to: '#5fa8d3' },
  'Middle Eastern': { emoji: '🧆', tagline: { en: 'Shawarma, falafel and shakshuka', ro: 'Shaorma, falafel și shakshuka' }, from: '#7b2d26', to: '#d4a373' },
  Mediterranean: { emoji: '🫒', tagline: { en: 'Fish, olive oil and sunny salads', ro: 'Pește, ulei de măsline și salate însorite' }, from: '#2a6f97', to: '#a3b18a' },
  Classic: { emoji: '🍳', tagline: { en: 'Everyday breakfasts, soups and snacks', ro: 'Mic dejun, supe și gustări de zi cu zi' }, from: '#6c584c', to: '#a98467' },
};
