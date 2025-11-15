# ElevenLabs Voice Demo Guide

## Overview

This demo provides a full voice-driven case interview experience using ElevenLabs TTS for AI speech and browser Web Speech API for candidate responses. The system implements a structured 10-phase case interview flow matching real consulting firm practices.

## Prerequisites

1. **Browser Requirements**
   - Use Chrome desktop (recommended)
   - Allow microphone permissions when prompted
   - Ensure audio playback is enabled

2. **Environment Setup**
   - `ELEVENLABS_API_KEY` - Your ElevenLabs API key (required for AI voice)
   - `ELEVENLABS_VOICE_ID` - Voice ID to use (optional, has default)

3. **Development Server**
   - Next.js dev server must be running: `npm run dev` or `pnpm dev`
   - Server should be accessible at `http://localhost:3000`

## Running the Demo

### 1. Start the Development Server

```bash
npm run dev
# or
pnpm dev
```

### 2. Navigate to the Demo Page

Open your browser and go to:
```
http://localhost:3000/elevenlabs-demo
```

### 3. Grant Microphone Access

When prompted, click "Allow" to give the browser access to your microphone.

## Using the Demo

### Interface Overview

The demo page displays:
- **Status**: Current system state (idle, asking, speaking, listening, analyzing)
- **Turn**: Current turn number in the conversation
- **Phase**: Current interview phase with contextual hints

### 10-Phase Interview Flow

1. **Greeting** - Welcome and set expectations
2. **Case Prompt** - Present the business situation
3. **Clarification** - Answer candidate's clarifying questions
4. **Framework** - Outline structure/framework (MECE thinking)
5. **Exploration** - Guide deeper into chosen analysis branch
6. **Quantitative Check** - Work through quantitative problems
7. **Creative Check** - Handle curveballs/edge cases
8. **Synthesis** - Synthesize findings into recommendation
9. **Closing** - Final thoughts and professional wrap-up
10. **Complete** - Interview finished with personalized feedback

### Control Buttons

#### AI Response (Blue Button)
- Click to hear the next question from the AI interviewer
- The system will speak the question using ElevenLabs TTS
- Wait for the audio to finish before responding

#### Your Response (Green Button)
- Click after the AI finishes speaking
- Speak your answer into the microphone
- The system will:
  - Capture your speech (up to 45 seconds)
  - Automatically stop after 5 seconds of silence
  - Analyze your response
  - Determine the next phase and question

### Typical Interview Flow

1. Click **AI Response** to start
2. Listen to the AI's question
3. Click **Your Response** when ready to answer
4. Speak your response clearly
5. Wait for analysis to complete
6. Repeat steps 1-5 until interview completes

## Features

### Enhanced Speech Capture
- **Continuous Mode**: Captures long responses without cutting off
- **Max Duration**: 45 seconds per response
- **Silence Detection**: Automatically stops after 5 seconds of silence
- **Fallback Handling**: Uses interim results if final transcript unavailable

### Real-Time Analysis
- Evaluates response quality and clarity
- Determines readiness to progress to next phase
- Provides contextual guidance and follow-ups

## Troubleshooting

### No Audio Playback
- Check browser volume settings
- Ensure ElevenLabs API key is configured
- Check browser console for errors

### Microphone Not Working
- Verify microphone permissions in browser settings
- Chrome: `chrome://settings/content/microphone`
- Try refreshing the page and allowing permissions again

### Empty Transcripts
- Speak clearly and at normal volume
- Ensure microphone is not muted
- Check browser console for STT errors
- Try the "Test mic STT" feature if available

### Interview Not Progressing
- Check that you're clicking "Your Response" after speaking
- Verify the Status shows "idle" before clicking buttons
- Look for phase transitions in the Phase display

## Technical Details

### API Endpoints Used
- `/api/voice-tools/interviewer` - Generates phase-aware questions
- `/api/voice-tools/analyze` - Analyzes candidate responses
- `/api/voice/tts-elevenlabs` - Text-to-speech conversion

### Demo Mode
- Uses demo case ID: `00000000-0000-0000-0000-000000000000`
- Skips authentication and database persistence
- Provides immediate feedback without server-side state

### Voice Pipeline
- **TTS**: ElevenLabs API for natural AI voice
- **STT**: Browser Web Speech API for speech recognition
- **Fallback**: Text-only mode if ElevenLabs unavailable (toggle checkbox)

## Tips for Best Experience

1. **Find a Quiet Space**: Background noise can affect speech recognition
2. **Speak Clearly**: Enunciate your responses for better transcription
3. **Natural Pauses**: Brief pauses help the system detect sentence boundaries
4. **Wait for Idle**: Always wait for status to return to "idle" before clicking
5. **Follow Phase Hints**: Use the contextual hints to guide your responses

## Case Content

The demo uses the "Summit Snacks" case:
- **Scenario**: Profit decline investigation
- **Industry**: Consumer packaged goods
- **Focus Areas**: Revenue, costs, operations, competition
- **Data**: Includes quantitative exhibits and market information
