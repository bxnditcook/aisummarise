# AI Message Assistant Plugin for Vencord

A Vencord plugin that provides advanced tools for summarizing, analyzing, and generating contextual responses to Discord messages - all without requiring external API keys.

## Features

### Advanced Message Analysis

- **Smart Summarization**: Using advanced text extraction algorithms that:
  - Identify key topics and important sentences
  - Extract representative quotes from conversations
  - Provide time and participant context for multi-message summaries
  - Adapt summarization strategy based on message length and complexity

- **Sophisticated Tone Detection**: Our highly tuned algorithm can detect 8 distinct tones:
  - Serious/formal
  - Casual/informal
  - Angry/frustrated
  - Sarcastic
  - Happy/excited
  - Sad/disappointed
  - Formal/professional
  - Questioning/uncertain

- **Contextual Reply Suggestions**: Receive 5 tailored response options for each detected tone, helping you craft the perfect reply

### Content Safety

- **Enhanced Mature Content Detection**: Highly accurate detection system for:
  - Direct matching of problematic terms
  - Pattern recognition for censored variations (f**k, s**t, etc.)
  - Identification of creative spellings and evasive formatting
  - Context-aware detection of potentially harmful content
  - Warning system for messages containing mature language

### User Experience

- **Multi-Message Selection**: Analyze individual messages or select multiple for contextual analysis
- **Intuitive UI**: Simple interface with clear visual indicators for message selection
- **Privacy-Focused**: All processing happens locally - no data sent to external services

## Installation

### Manual Installation

1. Copy the `AIMessageAssistant.tsx` and `styles.css` files to your Vencord plugins directory:
   - Windows: `%AppData%\Vencord\plugins`
   - MacOS: `~/Library/Application Support/Vencord/plugins`
   - Linux: `~/.config/Vencord/plugins`

2. Restart Discord
3. Enable the plugin in Vencord settings

## Usage

### Message Analysis

1. **Select Messages**:
   - Hover over any message to reveal the AI button (document icon)
   - Click the button to select the message
   - The button will turn blue when selected
   - Continue selecting additional messages as needed

2. **Choose Analysis Type**:
   - A modal will appear showing the number of selected messages
   - Choose "Summarize" to generate a concise summary
   - Choose "Analyze Tone" to detect tone and get reply suggestions

3. **View Results**:
   - For Summaries: Get a contextual summary with key topics and important points
   - For Tone Analysis: See the detected tone and 5 contextually appropriate reply suggestions
   - Copy any suggestion by clicking on it

### Advanced Usage Tips

- **Single Message Analysis**:
  - Short messages (<100 characters) will simply be displayed as-is
  - Longer messages will be intelligently summarized based on importance
  
- **Multi-Message Analysis**:
  - Select messages from different users to analyze conversations
  - Messages will be analyzed collectively, providing conversation context
  - Timestamps will be used to show conversation duration
  
- **Content Safety**:
  - All selected messages are scanned for mature or harmful content
  - If detected, a warning will appear at the top of the results modal
  - Analysis continues regardless, giving you full control over content

## Privacy & Data Use

This plugin **does not** send your messages to external services or APIs. All processing happens entirely locally on your device:

- **Zero External Dependencies**: No API keys or cloud services needed
- **Advanced Local Processing**: 
  - Message summarization uses sophisticated extractive algorithms with topic modeling
  - Tone detection employs a multi-layered analysis system with weighted pattern matching
  - Content safety features use context-aware detection without external filtering services
- **No Data Collection**: Messages are only processed in memory and never stored or transmitted
- **Full Transparency**: All processing code is open source and available for review

## License

This project is licensed under the GPL-3.0 License - see Vencord's license for details.

## Contributing

Feel free to submit issues or pull requests to improve the plugin.
