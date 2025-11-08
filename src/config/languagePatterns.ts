// Dil algılama pattern'leri - tekrar eden kodları merkezileştir

export interface LanguagePattern {
  code: string;
  patterns: RegExp[];
}

export const LANGUAGE_PATTERNS: LanguagePattern[] = [
  {
    code: 'tr',
    patterns: [
      /[çğıöşü]/,
      /\b(merhaba|selam|nasılsın|iyi|kötü|teşekkür|sağol|güle güle|hoş geldin|görüşürüz)\b/,
      /\b(ben|sen|biz|siz|onlar|benim|senin|bizim|sizin|onların)\b/,
      /\b(ve|veya|ama|çünkü|eğer|için|ile|gibi|kadar|sonra|önce)\b/
    ]
  },
  {
    code: 'en',
    patterns: [
      /\b(hello|hi|how are you|good|bad|thank you|goodbye|welcome|see you)\b/,
      /\b(i|you|we|they|my|your|our|their|me|him|her|us|them)\b/,
      /\b(and|or|but|because|if|for|with|like|than|after|before)\b/
    ]
  },
  {
    code: 'de',
    patterns: [
      /\b(hallo|guten tag|wie geht es|gut|schlecht|danke|auf wiedersehen|willkommen)\b/,
      /\b(ich|du|wir|sie|mein|dein|unser|ihr|mich|dich|uns|sie)\b/,
      /\b(und|oder|aber|weil|wenn|für|mit|wie|als|nach|vor)\b/
    ]
  },
  {
    code: 'fr',
    patterns: [
      /\b(bonjour|salut|comment allez|bien|mal|merci|au revoir|bienvenue)\b/,
      /\b(je|tu|nous|ils|mon|ton|notre|leur|moi|toi|nous|eux)\b/,
      /\b(et|ou|mais|parce que|si|pour|avec|comme|que|après|avant)\b/
    ]
  },
  {
    code: 'es',
    patterns: [
      /\b(hola|buenos días|cómo estás|bien|mal|gracias|adiós|bienvenido)\b/,
      /\b(yo|tú|nosotros|ellos|mi|tu|nuestro|su|mí|ti|nos|ellos)\b/,
      /\b(y|o|pero|porque|si|para|con|como|que|después|antes)\b/
    ]
  },
  {
    code: 'it',
    patterns: [
      /\b(ciao|buongiorno|come stai|bene|male|grazie|arrivederci|benvenuto)\b/,
      /\b(io|tu|noi|loro|mio|tuo|nostro|loro|me|te|noi|loro)\b/,
      /\b(e|o|ma|perché|se|per|con|come|che|dopo|prima)\b/
    ]
  },
  {
    code: 'nl',
    patterns: [
      /\b(hallo|goedemorgen|hoe gaat het|goed|slecht|dank je|tot ziens|welkom)\b/,
      /\b(ik|jij|wij|zij|mijn|jouw|onze|hun|mij|jou|ons|hen)\b/,
      /\b(en|of|maar|omdat|als|voor|met|zoals|dan|na|voor)\b/
    ]
  },
  {
    code: 'pl',
    patterns: [
      /\b(cześć|dzień dobry|jak się masz|dobrze|źle|dziękuję|do widzenia|witamy)\b/,
      /\b(ja|ty|my|oni|mój|twój|nasz|ich|mnie|ciebie|nas|ich)\b/,
      /\b(i|albo|ale|ponieważ|jeśli|dla|z|jak|niż|po|przed)\b/
    ]
  },
  {
    code: 'pt',
    patterns: [
      /\b(olá|bom dia|como está|bem|mal|obrigado|tchau|bem-vindo)\b/,
      /\b(eu|você|nós|eles|meu|seu|nosso|deles|mim|você|nós|eles)\b/,
      /\b(e|ou|mas|porque|se|para|com|como|que|depois|antes)\b/
    ]
  },
  {
    code: 'sv',
    patterns: [
      /\b(hej|god morgon|hur mår du|bra|dåligt|tack|hej då|välkommen)\b/,
      /\b(jag|du|vi|de|min|din|vår|deras|mig|dig|oss|dem)\b/,
      /\b(och|eller|men|eftersom|om|för|med|som|än|efter|före)\b/
    ]
  },
  {
    code: 'no',
    patterns: [
      /\b(hei|god morgen|hvordan har du det|bra|dårlig|takk|ha det|velkommen)\b/,
      /\b(jeg|du|vi|de|min|din|vår|deres|meg|deg|oss|dem)\b/,
      /\b(og|eller|men|fordi|hvis|for|med|som|enn|etter|før)\b/
    ]
  },
  {
    code: 'fi',
    patterns: [
      /\b(hei|hyvää huomenta|miten menee|hyvä|huono|kiitos|näkemiin|tervetuloa)\b/,
      /\b(minä|sinä|me|he|minun|sinun|meidän|heidän|minua|sinua|meitä|heitä)\b/,
      /\b(ja|tai|mutta|koska|jos|varten|kanssa|kuten|kuin|jälkeen|ennen)\b/
    ]
  },
  {
    code: 'da',
    patterns: [
      /\b(hej|god morgen|hvordan har du det|godt|dårligt|tak|farvel|velkommen)\b/,
      /\b(jeg|du|vi|de|min|din|vores|deres|mig|dig|os|dem)\b/,
      /\b(og|eller|men|fordi|hvis|for|med|som|end|efter|før)\b/
    ]
  }
];

