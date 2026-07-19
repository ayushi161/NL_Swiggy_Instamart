const PII_PATTERNS = [
  { regex: /[\w.+-]+@[\w-]+\.[a-z]{2,}/gi,          token: '[EMAIL]' },
  { regex: /(\+91[\-\s]?)?[6-9]\d{9}/g,             token: '[PHONE]' },
  { regex: /\b\d{9,16}\b/g,                          token: '[ID]'    },
];

export function scrub(reviews) {
  return reviews.map(review => {
    let scrubbedText = review.raw_text || "";
    PII_PATTERNS.forEach(({ regex, token }) => {
      scrubbedText = scrubbedText.replace(regex, token);
    });
    return { ...review, scrubbed_text: scrubbedText };
  });
}
