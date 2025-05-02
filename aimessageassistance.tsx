import { webpack } from "@webpack";
import { Devs } from "@utils/constants";
import { definePlugin, types } from "@utils/types";
import { findStoreLazy, findByPropsLazy } from "@webpack";
import { addButton, removeButton } from "@api/MessageActions";
import { React, FluxDispatcher } from "@webpack/common";
import "./styles.css";

// For TypeScript type checking - these will be provided by Vencord at runtime

// Define lazy-loaded Discord stores and modules
const MessageStore = findStoreLazy("MessageStore");
const ChannelStore = findStoreLazy("ChannelStore");
const UserStore = findStoreLazy("UserStore");

// Enhanced list of words to flag for mature content
const MATURE_WORDS = [
    // Racial/ethnic slurs
    "nigga", "nigger", "kike", "chink", "spic", "wetback", "gook", "towelhead", "fairy", "twink", "gender-bender", "crossdresser",
    // Ableist slurs
    "retard", "spaz", "tard", "mongoloid", 
    // Sexual/explicit content
    "clit", "tits", "boobs", "titty", "milf", "daddy kink", "bdsm", "sex", "sext", "69",
    "deepthroat", "hentai", "porn", "porno", "porns", "threesome", "orgy", 
    "rawdog", "nut", "squirt", "moan", "fucktoy", "nudes",
    "onlyfans", "nsfw", "incest"", "creampie", "splooge",
    "boobjob", "dildo", "vibrator", "orgasm",
    // Homophobic/transphobic slurs
    "faggot", "dyke", "tranny", "fag", "homo", "queer",
    // Misogynistic terms
    "slut", "whore", "bitch", "hoe", 
    // Other offensive language
    "an hero", "rope", "hang myself", "die alone", "unalive", "noose", 
    "i want to die", "i hate myself", "jump off", "self harm", "cutting", 
    "wrist slit", "burn myself", "drink bleach"
];

interface AIMASettings {
    selectedMessages: string[];
    isSelecting: boolean;
}

// Enhanced function to detect mature content with context awareness
function containsMatureContent(text: string): boolean {
    if (!text) return false;
    
    const lowerText = text.toLowerCase();
    
    // Check for exact matches
    const exactMatches = MATURE_WORDS.some(word => {
        // Create regex to match word boundaries (so we don't match "class" when looking for "ass")
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        return regex.test(lowerText);
    });
    
    if (exactMatches) return true;
    
    // Check for potential censored words (like f**k, s**t, etc.)
    const censoredRegex = /\b[a-z]+\*+[a-z]*\b|\b[a-z]*\*+[a-z]+\b/i;
    if (censoredRegex.test(lowerText)) return true;
    
    // Check for creative spellings of offensive words
    const creativeSpellings = [
        /\bf+\s*[^a-z]*\s*[ck]+\s*[^a-z]*\s*u*\s*[^a-z]*\s*k+/i, // variations of "fuck"
        /\bs+\s*[^a-z]*\s*h+\s*[^a-z]*\s*[i!1]+\s*[^a-z]*\s*t+/i, // variations of "shit"
        /\bb+\s*[^a-z]*\s*[i!1]+\s*[^a-z]*\s*t+\s*[^a-z]*\s*c+\s*h+/i, // variations of "bitch"
        /\bc+\s*[^a-z]*\s*u+\s*[^a-z]*\s*n+\s*[^a-z]*\s*t+/i, // variations of "cunt"
    ];
    
    if (creativeSpellings.some(regex => regex.test(lowerText))) return true;
    
    // Context-aware checks for potentially harmful content
    const harmfulPatterns = [
        /kill (?:your|ur)self/i,
        /commit suicide/i,
        /(?:cp|child porn)/i,
        /r+\s*[a@4]+\s*p+\s*[e3]+/i, // variations of "rape"
    ];
    
    return harmfulPatterns.some(pattern => pattern.test(lowerText));
}

// Common stop words to exclude from keyword analysis
const STOP_WORDS = new Set([
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't", 
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can't", 
    "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during", 
    "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't", "have", "haven't", "having", "he", 
    "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself", "him", "himself", "his", "how", "how's", 
    "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself", "let's", 
    "me", "more", "most", "mustn't", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", 
    "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she", "she'd", "she'll", 
    "she's", "should", "shouldn't", "so", "some", "such", "than", "that", "that's", "the", "their", "theirs", "them", 
    "themselves", "then", "there", "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this", 
    "those", "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're", 
    "we've", "were", "weren't", "what", "what's", "when", "when's", "where", "where's", "which", "while", "who", 
    "who's", "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", 
    "you've", "your", "yours", "yourself", "yourselves"
]);

// Function to extract topics/keywords from a text
function extractTopics(text: string, count = 5): string[] {
    if (!text) return [];
    
    // Tokenize text into words
    const words = text.toLowerCase()
        .replace(/[^\w\s]/g, '')  // Remove punctuation
        .split(/\s+/)              // Split on whitespace
        .filter(word => 
            word.length > 2 &&    // Skip very short words
            !STOP_WORDS.has(word) // Skip common stop words
        );
    
    // Count word frequencies
    const wordCounts: Record<string, number> = {};
    for (const word of words) {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
    
    // Sort by frequency
    return Object.entries(wordCounts)
        .sort((a, b) => b[1] - a[1])  // Sort by count (descending)
        .slice(0, count)               // Take top N
        .map(entry => entry[0]);       // Return just the words
}

// Calculate the importance score of a sentence
function getSentenceScore(sentence: string, topicWords: string[]): number {
    if (!sentence || !sentence.trim()) return 0;
    
    // Clean the sentence
    const cleanSentence = sentence.toLowerCase();
    
    // Check for topic words
    let score = 0;
    for (const topic of topicWords) {
        if (cleanSentence.includes(topic)) {
            score += 1;
        }
    }
    
    // Boost score for sentences with:
    
    // 1. Mentions of dates, time, or numbers (potentially important facts)
    if (/\b\d+\b|today|tomorrow|yesterday|week|month|year|time/i.test(cleanSentence)) {
        score += 0.5;
    }
    
    // 2. Question or exclamation (likely important)
    if (/\?|!/g.test(sentence)) {
        score += 0.5;
    }
    
    // 3. Contains importance markers
    if (/\b(important|critical|key|main|significant|crucial|essential|vital)\b/i.test(cleanSentence)) {
        score += 1;
    }
    
    // Normalize by length (to prevent very long sentences from dominating)
    const wordCount = sentence.split(/\s+/).length;
    if (wordCount > 20) {
        score = score / (wordCount / 10); // Penalize very long sentences
    }
    
    return score;
}

// Advanced summary generator without using external APIs
function generateSummary(messages: any[]): string {
    if (messages.length === 0) return "No messages to summarize.";
    
    // Get basic metadata
    const authors = new Set(messages.map(m => m.author?.username || "Unknown").filter(Boolean));
    const messageCount = messages.length;
    const firstTimestamp = messages[0]?.timestamp;
    const lastTimestamp = messages[messages.length - 1]?.timestamp;
    const timeSpan = firstTimestamp && lastTimestamp 
        ? Math.floor((lastTimestamp - firstTimestamp) / (1000 * 60)) // minutes
        : null;
    
    // For a single message
    if (messages.length === 1) {
        const content = messages[0].content || "";
        
        // For short messages, just return them as is
        if (content.length < 100) return content;
        
        // For longer messages, do extractive summarization
        const sentences = content
            .split(/[.!?]+/)
            .map(s => s.trim())
            .filter(s => s.length > 10); // Filter out short fragments
        
        if (sentences.length <= 3) return content;
        
        // Extract important topics/keywords
        const topicWords = extractTopics(content);
        
        // Score sentences
        const scoredSentences = sentences.map(sentence => ({
            text: sentence,
            score: getSentenceScore(sentence, topicWords)
        }));
        
        // Sort by score
        scoredSentences.sort((a, b) => b.score - a.score);
        
        // Take top 3 sentences or 30% of the message, whichever is shorter
        const topSentenceCount = Math.min(3, Math.ceil(sentences.length * 0.3));
        
        // If message is very long, ensure we include the first sentence for context
        let selectedSentences = scoredSentences.slice(0, topSentenceCount);
        
        // Always include first sentence for context if it's not already included
        const firstSentenceIncluded = selectedSentences.some(s => s.text === sentences[0]);
        if (!firstSentenceIncluded && sentences[0] && sentences[0].length > 10) {
            selectedSentences.push({ text: sentences[0], score: 0 });
        }
        
        // Sort by original position in text for readability
        selectedSentences.sort((a, b) => 
            sentences.indexOf(a.text) - sentences.indexOf(b.text)
        );
        
        // Format with ellipses
        return selectedSentences
            .map(s => s.text)
            .join('... ') + '.';
    }
    
    // For multiple messages
    
    // Combine all message content
    const allContent = messages
        .map(m => m.content || "")
        .join(' ');
    
    // Extract topics
    const topicWords = extractTopics(allContent, 8);
    
    // Find representative messages (up to 3)
    const scoredMessages = messages
        .filter(m => m.content && m.content.length > 10)
        .map(message => ({
            author: message.author?.username || "Unknown",
            content: message.content,
            score: getSentenceScore(message.content, topicWords)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
    
    // Format the summary
    let summary = `Conversation with ${messageCount} messages between ${Array.from(authors).join(", ")}`;
    
    // Add timespan if available
    if (timeSpan !== null) {
        summary += timeSpan < 60
            ? ` (spanning ${timeSpan} minutes)`
            : ` (spanning ${Math.floor(timeSpan / 60)} hours ${timeSpan % 60} minutes)`;
    }
    
    // Add topic information
    if (topicWords.length > 0) {
        summary += `\n\nMain topics: ${topicWords.slice(0, 5).join(', ')}`;
    }
    
    // Add key messages
    if (scoredMessages.length > 0) {
        summary += "\n\nKey points:";
        scoredMessages.forEach(msg => {
            // Truncate very long messages
            const content = msg.content.length > 100 
                ? msg.content.substring(0, 100) + '...' 
                : msg.content;
            summary += `\n• ${msg.author}: "${content}"`;
        });
    }
    
    return summary;
}

// Enhanced tone analysis data
const tonePatterns = {
    // Serious/formal tone indicators
    "serious": {
        keywords: [
            "important", "seriously", "critical", "urgent", "attention", "priority",
            "concern", "crucial", "essential", "significant", "immediate", "formal", 
            "official", "regarding", "matter", "issue", "request", "required", "necessary"
        ],
        patterns: [
            /\b(?:I|we) (?:need|require|request|demand|insist|must|should)/i,
            /\b(?:please (?:ensure|confirm|advise|note|address|consider))/i,
            /\bdue to the (?:importance|urgency|nature|sensitivity)/i,
            /\bas (?:discussed|mentioned|agreed|requested|stipulated)/i,
            /\bdeadline\b|\bby the end of\b|\bas soon as possible\b|\bexpected\b/i
        ],
        punctuationPatterns: [
            text => (text.match(/\./g) || []).length > (text.length / 40) // High density of periods
        ],
        negativeIndicators: [
            "lol", "haha", "lmao", "rofl", "xd", "lmfao", "jk",
            /\b(?:omg|wtf|smh|fyi|btw|imo|tbh|ngl)\b/i // Casual abbreviations
        ]
    },
    
    // Casual/informal tone indicators
    "casual": {
        keywords: [
            "lol", "haha", "jk", "cool", "nice", "hey", "yo", "sup", "yeah", "nah",
            "awesome", "btw", "tbh", "imo", "tho", "u", "ur", "r", "y", "k", "thx", 
            "gonna", "wanna", "dunno", "kinda", "sorta", "cuz"
        ],
        patterns: [
            /\b(?:what's up|how's it going|how're you|how ya|what's good)\b/i,
            /\b(?:gonna|wanna|gotta|dunno|gimme|lemme|y'all|ain't)\b/i,
            /\bcool+\b|\bsounds good\b|\bno worries\b|\bno prob\b/i,
            /\b(?:u|r|ur|y)\b/i, // Shortened words
            /\b(?:imo|tbh|btw|fyi|ngl|idk|idc|iirc|afaik|rn|ofc|bc|w\/|w\/o)\b/i // Abbreviations
        ],
        punctuationPatterns: [
            text => (text.match(/!/g) || []).length > 0, // Exclamation marks
            text => (text.match(/\.\.\./g) || []).length > 0, // Ellipses indicate casual
            text => text.replace(/[^\w\s]/g, '').length < text.length * 0.95 // Low punctuation density
        ],
        negativeIndicators: [
            "sincerely", "regards", "dear", "respectfully", "formally", "officially", 
            "inform", "advise", "pursuant", "accordance", "hereby"
        ]
    },
    
    // Angry/frustrated tone indicators
    "angry": {
        keywords: [
            "angry", "mad", "upset", "wtf", "pissed", "annoyed", "irritated", "frustrated",
            "furious", "outrageous", "ridiculous", "absurd", "unacceptable", "terrible",
            "awful", "stupid", "idiotic", "incompetent", "sick of", "fed up", "tired of"
        ],
        patterns: [
            /\b(?:can't believe|sick (?:of|and tired)|fed up|had enough|so tired of)\b/i,
            /\b(?:wtf|wth|bs|bullshit|fuck|fucking|shit|crap|damn|goddamn|omfg)\b/i,
            /\b(?:never|always|every single time|constantly|repeatedly)\b.*(?:problem|issue|mistake|error|fail)/i,
            /\bthis is (?:ridiculous|outrageous|unacceptable|pathetic|absurd)\b/i,
            /!{2,}|\?{2,}/ // Multiple exclamation/question marks
        ],
        punctuationPatterns: [
            text => (text.match(/!/g) || []).length > (text.match(/\./g) || []).length * 2,
            text => text.toUpperCase() === text && text.length > 10 // ALL CAPS for longer text
        ],
        negativeIndicators: [
            "haha", "lol", "please", "thanks", "thank you", "appreciate", "grateful"
        ]
    },
    
    // Sarcastic tone indicators
    "sarcastic": {
        keywords: [
            "yeah right", "sure thing", "whatever", "oh really", "totally", "clearly",
            "brilliant", "genius", "bravo", "congratulations", "sure"
        ],
        patterns: [
            /\b(?:oh (?:really|wow|great|sure|totally))\b/i,
            /\b(?:wow|gee|great|fantastic|amazing|brilliant|genius|impressive)(?:\s*,\s*(?:good job|nice work|way to go|thanks))?\b/i,
            /\b(?:just what (?:I|we) needed)\b/i,
            /\b(?:because that (?:makes sense|works so well|always works|helps))\b/i,
            /\b(?:riiiight|suuuure|yeaaah|totally)\b/i, // Elongated words
            /I'm (?:sooo|soooo) (?:impressed|happy|thrilled|excited)/i
        ],
        punctuationPatterns: [
            text => (text.match(/\"/g) || []).length > 1, // Quotation marks often indicate sarcasm
            text => text.includes("...") // Ellipses can indicate sarcasm
        ],
        negativeIndicators: [
            "please", "help", "serious", "honestly", "truly", "sincerely"
        ]
    },
    
    // Happy/excited tone indicators  
    "happy": {
        keywords: [
            "happy", "glad", "excited", "yay", "woohoo", "awesome", "great", "amazing",
            "wonderful", "fantastic", "excellent", "thrilled", "delighted", "love", "joy",
            "celebration", "congratulations", "congrats", "proud", "pleasure", "grateful", "blessed"
        ],
        patterns: [
            /\b(?:so happy|so excited|can't wait|looking forward|really excited)\b/i,
            /\b(?:great news|good news|wonderful|fantastic|amazing|excellent)\b/i,
            /\b(?:thanks|thank you|appreciate).*(?:so much|a lot|greatly|really)\b/i,
            /\b(?:love|enjoy|like).*(?:so much|a lot|greatly|really)\b/i,
            /\b(?:woo+|yay+|yes+|awesome+)!*/i
        ],
        punctuationPatterns: [
            text => (text.match(/!/g) || []).length > (text.length / 80), // High density of exclamation marks
            text => (text.match(/\?/g) || []).length === 0 && text.length > 20 // Lack of question marks in longer text
        ],
        negativeIndicators: [
            "unfortunately", "sadly", "regret", "sorry", "disappointed", "upset", "angry"
        ]
    },
    
    // Sad/disappointed tone indicators
    "sad": {
        keywords: [
            "sad", "disappointed", "sorry", "unfortunately", "regret", "upset", "heartbroken",
            "depressed", "unhappy", "miserable", "devastated", "hurt", "painful", "missing",
            "lonely", "alone", "lost", "hopeless", "grief", "tragic", "despair"
        ],
        patterns: [
            /\b(?:I'm|I am|feeling|feel).*(?:sad|sorry|upset|down|blue|depressed)\b/i,
            /\b(?:unfortunately|sadly|regrettably)\b/i,
            /\b(?:miss|missing|missed)\b.*(?:you|him|her|them)\b/i,
            /\b(?:bad news|not good|didn't work out)\b/i,
            /\b(?:wish).*(?:could|would have|had)\b/i
        ],
        punctuationPatterns: [
            text => (text.match(/\.\.\./g) || []).length > 0, // Ellipses can indicate sadness
            text => text.split(/[.!?]+/).filter(s => s.trim().length > 0).length < text.length / 40 // Longer sentences
        ],
        negativeIndicators: [
            "happy", "excited", "great", "awesome", "excellent", "yay", "woohoo", "fantastic"
        ]
    },
    
    // Formal/professional tone indicators
    "formal": {
        keywords: [
            "formally", "professional", "sincerely", "regards", "respectfully", "esteemed",
            "dear", "honorable", "pursuant", "accordance", "hereby", "therein", "aforementioned",
            "hereby", "thus", "therefore", "consequently", "furthermore", "moreover", "subsequently"
        ],
        patterns: [
            /\b(?:I|We) (?:would like to|wish to|am writing to|are writing to)\b/i,
            /\b(?:please (?:find|see|note|be advised|be informed))\b/i,
            /\b(?:as per|with reference to|with regard to|regarding|concerning)\b/i,
            /\b(?:thus|therefore|consequently|furthermore|moreover|nevertheless|subsequently)\b/i,
            /(?:^|\n)(?:Dear|To Whom It May Concern|Respected|Esteemed|Greetings)\b/i
        ],
        punctuationPatterns: [
            text => {
                const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
                return sentences.length > 0 && 
                       sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length > 15; // Longer average sentence length
            }
        ],
        negativeIndicators: [
            "lol", "haha", "hey", "yo", "sup", "cool", "awesome", "btw", "imo", "tbh"
        ]
    },
    
    // Questioning/uncertain tone indicators
    "questioning": {
        keywords: [
            "wondering", "curious", "question", "confused", "unsure", "uncertain", "unclear",
            "perhaps", "maybe", "possibly", "might", "could", "would", "should", "doubt"
        ],
        patterns: [
            /\b(?:I|we) (?:was|am|were|are) (?:wondering|curious|unsure|confused)\b/i,
            /\b(?:do you know|do you think|have you seen|could you tell|would you mind)\b/i,
            /\b(?:I'm not sure|not certain|don't know|isn't clear)\b/i,
            /\b(?:what|why|how|when|where|who|which|whose)\b.*\?/i,
            /\b(?:perhaps|maybe|possibly|presumably|seemingly|apparently)\b/i
        ],
        punctuationPatterns: [
            text => (text.match(/\?/g) || []).length > 0, // Any question marks
            text => text.endsWith("?")
        ],
        negativeIndicators: [
            "definitely", "absolutely", "certainly", "without doubt", "undoubtedly", "clearly"
        ]
    }
};

// Calculate tone score with sophisticated weighting
function calculateToneScore(text: string, toneType: string): number {
    if (!text) return 0;
    
    const toneData = tonePatterns[toneType];
    if (!toneData) return 0;
    
    const lowerText = text.toLowerCase();
    let score = 0;
    
    // Check keywords (1 point each)
    toneData.keywords.forEach(keyword => {
        // Use word boundary check for multi-word phrases
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = lowerText.match(regex);
        if (matches) {
            score += matches.length;
        }
    });
    
    // Check patterns (2 points each)
    toneData.patterns.forEach(pattern => {
        const matches = lowerText.match(pattern);
        if (matches) {
            score += matches.length * 2;
        }
    });
    
    // Check punctuation patterns (1.5 points each)
    toneData.punctuationPatterns.forEach(checker => {
        if (checker(lowerText)) {
            score += 1.5;
        }
    });
    
    // Deduct points for negative indicators (1 point each)
    if (toneData.negativeIndicators) {
        toneData.negativeIndicators.forEach(negativeIndicator => {
            if (typeof negativeIndicator === 'string') {
                const regex = new RegExp(`\\b${negativeIndicator}\\b`, 'gi');
                const matches = lowerText.match(regex);
                if (matches) {
                    score -= matches.length;
                }
            } else if (negativeIndicator instanceof RegExp) {
                const matches = lowerText.match(negativeIndicator);
                if (matches) {
                    score -= matches.length;
                }
            }
        });
    }
    
    // Normalize by text length for fair comparison
    const normalizedScore = Math.max(0, score) / Math.sqrt(text.length / 50);
    
    return normalizedScore;
}

// Enhanced tone detector that checks for multiple potential tones
function detectTone(messages: any[]): string {
    if (messages.length === 0) return "neutral";
    
    // Combine all messages into a single text
    const combinedText = messages.map(m => m.content || "").join(" ");
    
    if (!combinedText.trim()) return "neutral";
    
    // Calculate scores for each tone
    const toneScores = Object.keys(tonePatterns).map(tone => ({
        tone,
        score: calculateToneScore(combinedText, tone)
    }));
    
    // Sort by score descending
    toneScores.sort((a, b) => b.score - a.score);
    
    // Check if top tone is significantly higher than the second (by at least 20%)
    if (toneScores.length > 1 && 
        toneScores[0].score > 0 && 
        toneScores[0].score > toneScores[1].score * 1.2) {
        return toneScores[0].tone;
    }
    
    // If scores are close or no clear winner, look at additional factors:
    
    // 1. Message structure and patterns
    const messageCount = messages.length;
    const avgMessageLength = combinedText.length / messageCount;
    
    // Short rapid-fire messages often indicate casual tone
    if (messageCount > 3 && avgMessageLength < 10) {
        return "casual";
    }
    
    // Single very long message often indicates formal/serious tone
    if (messageCount === 1 && combinedText.length > 200) {
        return toneScores.findIndex(t => t.tone === "formal") >= 0 ? 
               "formal" : "serious";
    }
    
    // 2. Check for questions
    const questionCount = (combinedText.match(/\?/g) || []).length;
    if (questionCount > messageCount * 0.5) {
        return "questioning";
    }
    
    // 3. Check for emojis/emoticons
    const emojiCount = (combinedText.match(/[\p{Emoji}]/gu) || []).length;
    const emoticonCount = (combinedText.match(/[:;]-?[()DP]/g) || []).length;
    
    if ((emojiCount + emoticonCount) > messageCount) {
        // Many happy emojis
        if (combinedText.match(/[\u{1F600}-\u{1F64F}]/gu)) {
            return "happy";
        }
        // Many sad emojis
        if (combinedText.match(/[\u{1F614}-\u{1F62D}]/gu)) {
            return "sad";
        }
    }
    
    // 4. ALL CAPS text check
    const capsLockText = combinedText.replace(/[^A-Za-z]/g, '');
    if (capsLockText.length > 20 && 
        capsLockText.toUpperCase() === capsLockText) {
        return "angry";
    }
    
    // If all else fails, return the highest scoring tone or default to neutral
    return toneScores[0].score > 0 ? toneScores[0].tone : "neutral";
}

// Generate appropriate reply suggestions based on tone
function generateReplySuggestions(tone: string): string[] {
    const suggestions = {
        // Serious/formal tone replies
        "serious": [
            "I understand the importance of this matter and will prioritize it accordingly.",
            "Thank you for bringing this to my attention. I'll address this with the seriousness it deserves.",
            "I acknowledge the significance of this issue and will respond appropriately.",
            "I recognize the urgency here and will take immediate action.",
            "I appreciate you highlighting this critical matter. I'll focus on resolving it promptly."
        ],
        
        // Casual/informal tone replies
        "casual": [
            "Cool, sounds good to me! 👍",
            "Awesome, I'm totally on board with that!",
            "Yeah, that works for me! No worries.",
            "Sure thing! Let's do it.",
            "Haha, nice one! I'm in."
        ],
        
        // Angry/frustrated tone replies
        "angry": [
            "I understand you're frustrated. Let's work through this together to find a solution.",
            "I can see this is upsetting. I'd like to help resolve this situation if possible.",
            "I recognize your concerns and take them seriously. Let's address these issues directly.",
            "I appreciate you sharing your frustration. What specific steps would help improve things?",
            "I'm sorry this has been difficult. Let me know what I can do to help address your concerns."
        ],
        
        // Sarcastic tone replies
        "sarcastic": [
            "I see what you did there! Clever point.",
            "Touché! You make an interesting observation.",
            "Ah, I appreciate the nuance in your message.",
            "I caught that subtle point! Well played.",
            "Noted with appropriate irony! But seriously, let's discuss this further."
        ],
        
        // Happy/excited tone replies
        "happy": [
            "That's fantastic news! I'm really happy for you!",
            "Wow, that's awesome! Congratulations! 🎉",
            "I'm so happy to hear that! Thanks for sharing the good news!",
            "That's wonderful! I'm excited for you!",
            "Great news! This definitely brightens my day too!"
        ],
        
        // Sad/disappointed tone replies
        "sad": [
            "I'm really sorry to hear that. Please let me know if there's anything I can do.",
            "That sounds difficult to deal with. I'm here to listen if you need to talk more.",
            "I understand this is disappointing. It's okay to feel that way.",
            "I'm sorry you're going through this. Your feelings are completely valid.",
            "This must be challenging for you. I'm here to support you however I can."
        ],
        
        // Formal/professional tone replies
        "formal": [
            "Thank you for your correspondence. I have noted your points and will respond accordingly.",
            "I appreciate you bringing this matter to my attention. I will provide a comprehensive response shortly.",
            "Thank you for your message. I will address each point raised and revert with appropriate information.",
            "I acknowledge receipt of your communication and will proceed as requested.",
            "Thank you for sharing this information. I will take appropriate action based on your input."
        ],
        
        // Questioning/uncertain tone replies
        "questioning": [
            "That's a great question. Let me find the specific information you need.",
            "I'd be happy to clarify this for you. Here's what I know about that topic...",
            "You raise an interesting point. My understanding is that...",
            "I can see why you're asking about this. The key considerations are...",
            "Let me help address your questions. Based on the available information..."
        ],
        
        // Neutral tone replies (default)
        "neutral": [
            "Thanks for letting me know. I appreciate the update.",
            "I understand. Thank you for sharing this information.",
            "I see your point. That makes sense.",
            "Thank you for your message. I've noted the details you've shared.",
            "I appreciate your input on this matter."
        ]
    };
    
    // Return suggestions for the detected tone, or neutral if tone not found
    return suggestions[tone] || suggestions["neutral"];
}

export default definePlugin({
    name: "AIMessageAssistant",
    description: "Adds tools for summarizing, rephrasing, or analyzing message content without external APIs",
    authors: [{ name: "Vencord User", id: 0n }], // Replace with your own info in production
    dependencies: ["MessageAccessories"],
    
    settings: {
        selectedMessages: [],
        isSelecting: false
    } as AIMASettings,
    
    // Plugin lifecycle methods
    start() {
        // Add the AI button to messages
        this.addAIButton();
    },
    
    stop() {
        // Remove the AI button from messages
        removeButton("aima-button");
    },
    
    // Add AI button to Discord messages
    addAIButton() {
        const AIMButton = ({ message }) => {
            const isSelected = this.settings.selectedMessages.includes(message.id);
            const buttonClass = `aima-button ${isSelected ? 'aima-selected' : ''}`;
            
            return (
                <div 
                    className={buttonClass}
                    onClick={(e) => {
                        e.stopPropagation();
                        this.handleMessageClick(message);
                    }}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path 
                            d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-8.5 10.5h-3v-3h3v3zm3.5 3.5h-7v-1h7v1zm0-4.5h-3v-3h3v3zm3.5 4.5h-2v-1h2v1zm0-4.5h-2v-3h2v3z"
                            fill="currentColor"
                        />
                    </svg>
                </div>
            );
        };
        
        addButton("aima-button", AIMButton);
    },
    
    // Handle message click
    handleMessageClick(message) {
        if (!this.settings.isSelecting) {
            // First message selected - start selection mode
            this.settings.isSelecting = true;
            this.settings.selectedMessages = [message.id];
            this.showSelectionUI();
        } else {
            // Already in selection mode
            const index = this.settings.selectedMessages.indexOf(message.id);
            
            if (index === -1) {
                // Add to selection
                this.settings.selectedMessages.push(message.id);
            } else {
                // Remove from selection
                this.settings.selectedMessages.splice(index, 1);
                
                // If no messages left, cancel selection mode
                if (this.settings.selectedMessages.length === 0) {
                    this.cancelSelection();
                    return;
                }
            }
            
            // Update selection UI
            this.updateSelectionUI();
        }
    },
    
    // Show the selection UI
    showSelectionUI() {
        const SelectionModal = webpack.getByProps("openModal", "closeAllModals");
        
        SelectionModal.openModal(props => (
            <div className="aima-selection-modal">
                <h2>{this.settings.selectedMessages.length} Messages Selected</h2>
                <div className="aima-actions">
                    <button 
                        className="aima-summarize-btn"
                        onClick={() => this.summarizeSelectedMessages()}
                    >
                        Summarize
                    </button>
                    <button 
                        className="aima-analyze-btn"
                        onClick={() => this.analyzeSelectedMessages()}
                    >
                        Analyze Tone
                    </button>
                    <button 
                        className="aima-cancel-btn"
                        onClick={() => this.cancelSelection()}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        ));
    },
    
    // Update the selection UI
    updateSelectionUI() {
        // Close previous modal and open an updated one
        const modalModule = webpack.getByProps("openModal", "closeAllModals");
        modalModule.closeAllModals();
        this.showSelectionUI();
    },
    
    // Cancel selection mode
    cancelSelection() {
        this.settings.isSelecting = false;
        this.settings.selectedMessages = [];
        webpack.getByProps("openModal", "closeAllModals").closeAllModals();
    },
    
    // Get message objects from IDs
    getSelectedMessageObjects() {
        const messages: any[] = [];
        for (const messageId of this.settings.selectedMessages) {
            const channelId = this.getChannelIdForMessage(messageId);
            if (channelId) {
                const message = MessageStore.getMessage(channelId, messageId);
                if (message) messages.push(message);
            }
        }
        return messages;
    },
    
    // Helper to find channel ID for a message
    getChannelIdForMessage(messageId) {
        // This is a simplification, ideally we would have a more direct way to get this
        const channels = ChannelStore.getAllChannels();
        for (const channelId in channels) {
            const message = MessageStore.getMessage(channelId, messageId);
            if (message) return channelId;
        }
        return null;
    },
    
    // Summarize selected messages
    summarizeSelectedMessages() {
        const messages = this.getSelectedMessageObjects();
        
        // Check for mature content
        const hasMatureContent = messages.some(msg => 
            containsMatureContent(msg.content || "")
        );
        
        // Generate summary
        const summary = generateSummary(messages);
        
        // Show the summary in a modal
        this.showResultModal("Summary", summary, hasMatureContent);
        
        // Reset selection
        this.cancelSelection();
    },
    
    // Analyze tone of selected messages
    analyzeSelectedMessages() {
        const messages = this.getSelectedMessageObjects();
        
        // Check for mature content
        const hasMatureContent = messages.some(msg => 
            containsMatureContent(msg.content || "")
        );
        
        // Detect tone
        const tone = detectTone(messages);
        
        // Generate reply suggestions
        const suggestions = generateReplySuggestions(tone);
        
        // Format results
        const result = `
            <h3>Detected Tone: ${tone.charAt(0).toUpperCase() + tone.slice(1)}</h3>
            <h4>Suggested Replies:</h4>
            <ul>
                ${suggestions.map(s => `<li>${s}</li>`).join('')}
            </ul>
        `;
        
        // Show the analysis in a modal
        this.showResultModal("Tone Analysis", result, hasMatureContent, true);
        
        // Reset selection
        this.cancelSelection();
    },
    
    // Show result modal
    showResultModal(title, content, hasMatureContent, isHTML = false) {
        const modalModule = webpack.getByProps("openModal", "closeAllModals");
        
        modalModule.openModal(props => (
            <div className="aima-result-modal">
                <h2>{title}</h2>
                {hasMatureContent && (
                    <div className="aima-mature-warning">
                        ⚠️ Selected content contains mature language
                    </div>
                )}
                <div className="aima-result-content">
                    {isHTML ? (
                        <div dangerouslySetInnerHTML={{ __html: content }} />
                    ) : (
                        <p>{content}</p>
                    )}
                </div>
                <div className="aima-result-actions">
                    <button 
                        className="aima-close-btn"
                        onClick={() => modalModule.closeAllModals()}
                    >
                        Close
                    </button>
                </div>
            </div>
        ));
    }
});
