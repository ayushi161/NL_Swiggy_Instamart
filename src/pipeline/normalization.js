const FRICTION_ANCHORS = ['expired', 'fake', 'seal', 'return', 'cosmetic', 'beauty', 'baby', 'pet'];

function passesLengthFilter(review) {
  if (!review || !review.raw_text) return false;
  const words = review.raw_text.trim().split(/\s+/);
  if (words.length >= 8) return true;

  // Conditional bypass: preserve short reviews containing critical friction anchor roots
  const lowerText = review.raw_text.toLowerCase();
  return FRICTION_ANCHORS.some(anchor => lowerText.includes(anchor));
}

function passesLanguageFilter(review) {
  if (!review || !review.raw_text) return false;
  const text = review.raw_text;
  
  // Reject non-ASCII dominant text
  const nonAsciiCount = (text.match(/[^\x00-\x7F]/g) || []).length;
  const nonAsciiRatio = nonAsciiCount / text.length;
  if (nonAsciiRatio > 0.3) return false;

  // Reject heavy emoji density (> 20% of characters are emoji)
  const emojiPattern = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  const emojiCount = (text.match(emojiPattern) || []).length;
  if (text.length > 0 && (emojiCount / text.length > 0.2)) return false;

  return true;
}

const STRIP_FIELDS = ['userName', 'userImage', 'reviewCreatedVersion', 'replyContent', 'repliedAt'];

function sanitizePayload(review) {
  const sanitized = { ...review };
  STRIP_FIELDS.forEach(field => delete sanitized[field]);
  return sanitized;
}

export function normalize(reviews) {
  return reviews
    .filter(passesLengthFilter)
    .filter(passesLanguageFilter)
    .map(sanitizePayload);
}
